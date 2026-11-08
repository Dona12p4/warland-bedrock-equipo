import {world,system,GameMode,EntitySwingSource,EquipmentSlot} from '@minecraft/server';
import {WEAPONS,UNARMED,chargeAt,chargedDamage,nativeBase} from './java-combat-rules.js';
import {createCombatVisuals} from './java-combat-visuals.js';
// Keep the engine's mitigation, durability, drops, sounds, hurt immunity and
// protection events. Never heal damage back or apply a duplicate primary hit.
export function registerJavaCombat({ready=()=>true,sameTeam=()=>false,canAttack=()=>true}={}){
 const state=new Map(),hits=new Map(),sweeping=new Set();
 const visuals=createCombatVisuals();
 const visualErrors=new Set();
 const held=p=>p.getComponent('minecraft:inventory')?.container?.getItem(p.selectedSlotIndex);
 const level=(item,name)=>item?.getComponent('minecraft:enchantable')?.getEnchantment(name)?.level??0;
 const effect=(p,name)=>{const e=p.getEffect(name);return e?e.amplifier+1:0;};
 function snapshot(p,item=held(p)){
  const signature=p.selectedSlotIndex+':'+(item?.typeId??'air');let s=state.get(p.id);
  if(!s){s={signature,last:-1000,lastReset:-1};state.set(p.id,s);}
  else if(s.signature!==signature){s.signature=signature;s.last=system.currentTick;}
  return {s,item,weapon:WEAPONS[item?.typeId]??UNARMED};
 }
 function reset(p){const {s}=snapshot(p);if(s.lastReset!==system.currentTick){s.previousLast=s.last;s.last=s.lastReset=system.currentTick;}}
 const lastAttack=s=>s.lastReset===system.currentTick?s.previousLast:s.last;
 function enchantment(p,item,target,java){
  const family=target.getComponent('minecraft:type_family');
  const sharp=level(item,'sharpness'),smite=level(item,'smite'),bane=level(item,'bane_of_arthropods');
  return (sharp?(java ? .5*sharp+.5 : 1.25*sharp):0)+(family?.hasTypeFamily('undead')?2.5*smite:0)+(family?.hasTypeFamily('arthropod')?2.5*bane:0);
 }
 function supported(item){return !item||!!WEAPONS[item.typeId]||(item.typeId.startsWith('minecraft:')&&!item.typeId.endsWith('_spear'));}
 function visible(p,e){const a=p.getHeadLocation(),b=e.getHeadLocation(),dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=Math.hypot(dx,dy,dz);return len<.01||!p.dimension.getBlockFromRay(a,{x:dx/len,y:dy/len,z:dz/len},{maxDistance:len,includePassableBlocks:false,includeLiquidBlocks:false});}
 world.beforeEvents.entityHurt.subscribe(e=>{
  const p=e.damageSource.damagingEntity;if(!ready()||e.cancel||e.damage<=0||e.damageSource.cause!=='entityAttack'||p?.typeId!=='minecraft:player'||sweeping.has(p.id))return;
  if([GameMode.Creative,GameMode.Spectator].includes(p.getGameMode()))return;
  const {s,item,weapon}=snapshot(p);if(!supported(item))return;
  const charge=chargeAt(system.currentTick-lastAttack(s),weapon.speed),velocity=p.getVelocity();
  const falling=!p.isOnGround&&p.isFalling&&velocity.y<0&&!p.isClimbing&&!p.isInWater&&!effect(p,'blindness')&&!p.getComponent('minecraft:riding');
  const critical=charge>.9&&falling&&!p.isSprinting;
  const strengthLevel=effect(p,'strength'),weaknessLevel=effect(p,'weakness'),strength=strengthLevel*3,weakness=weaknessLevel*4;
  const raw=chargedDamage(weapon.damage+strength-weakness,enchantment(p,item,e.hurtEntity,true),charge,critical);
  let native=nativeBase(item);for(let i=0;i<strengthLevel;i++)native=native*1.3+1;for(let i=0;i<weaknessLevel;i++)native=native*.8-.5;
  const baseline=Math.max(.001,Math.max(0,native)*(falling?1.5:1)+enchantment(p,item,e.hurtEntity,false));
  // This event is AFTER native armor/resistance. Scale its result, never
  // replace it with unmitigated Java damage (which would bypass armor).
  e.damage=Math.max(0,e.damage*(raw/baseline));
  hits.set(p.id+':'+e.hurtEntity.id,{tick:system.currentTick,charge,critical,tool:weapon.tool,sprint:p.isSprinting,onGround:p.isOnGround,walking:Math.hypot(velocity.x,velocity.z)<.16});
 });
 world.afterEvents.entityHurt.subscribe(e=>{
  const p=e.damageSource.damagingEntity;if(!p||sweeping.has(p.id)||e.damageSource.cause!=='entityAttack'||e.damage<=0)return;
  const key=p.id+':'+e.hurtEntity.id,hit=hits.get(key);hits.delete(key);if(!hit||hit.tick!==system.currentTick)return;
  if(hit.charge<=.9||hit.critical||hit.sprint||!hit.onGround||!hit.walking||hit.tool!=='sword')return;
  const primary=e.hurtEntity,dim=p.dimension,origin=primary.location,view=p.getViewDirection();
  try{dim.spawnParticle('warland:java_sweep',{x:p.location.x+view.x*1.5,y:p.location.y+.8,z:p.location.z+view.z*1.5});}catch{}
  // Query only on confirmed charged hits. Bound cost without a global entity loop.
  const targets=dim.getEntities({location:origin,maxDistance:2.1,closest:24});
  sweeping.add(p.id);
  try{for(const target of targets){
   if(!target.isValid||target.id===p.id||target.id===primary.id||!target.getComponent('minecraft:health')||sameTeam(p,target))continue;
   const tame=target.getComponent('minecraft:tameable');if(tame?.tamedToPlayerId===p.id)continue;
   const dx=target.location.x-p.location.x,dz=target.location.z-p.location.z;
   if(Math.hypot(dx,dz)>3||Math.abs(target.location.y-origin.y)>.75||dx*view.x+dz*view.z<0||!visible(p,target))continue;
   // entityAttack passes WARLAND's existing sanctuary/parcel handlers.
   target.applyDamage(1,{cause:'entityAttack',damagingEntity:p});
  }}finally{sweeping.delete(p.id);}
 });
 world.afterEvents.entityHitEntity.subscribe(({damagingEntity:p,hitEntity:target})=>{
  if(p?.typeId!=='minecraft:player'||!ready())return;
  const {item,s,weapon}=snapshot(p),charge=chargeAt(system.currentTick-lastAttack(s),weapon.speed);
  // Native shield cooldown; preserve the vanilla shield and inventory exactly.
  if(weapon.tool==='axe'&&charge>.9&&target.typeId==='minecraft:player'&&target.isSneaking&&canAttack(p,target)){
   const eq=target.getComponent('minecraft:equippable'),shield=[eq?.getEquipment(EquipmentSlot.Offhand),eq?.getEquipment(EquipmentSlot.Mainhand)].find(i=>i?.typeId==='minecraft:shield');
   const v=target.getViewDirection(),dx=p.location.x-target.location.x,dz=p.location.z-target.location.z;
   if(shield?.typeId==='minecraft:shield'&&v.x*dx+v.z*dz>0&&visible(p,target)&&(p.isSprinting||Math.random()<.25+.05*level(item,'efficiency')))target.startItemCooldown('minecraft:shield',100);
  }
  if(supported(item))reset(p);
 });
 world.afterEvents.playerSwingStart.subscribe(({player,swingSource})=>{if(swingSource===EntitySwingSource.Attack&&supported(held(player)))reset(player);});
 // Visuals use the same clock, only publish during recovery, and never use
 // the actionbar. Title ownership is coordinated with the cached personal HUD
 // and the global death animation, which always has priority.
 system.runInterval(()=>{for(const p of world.getAllPlayers())try{visuals.update(p,snapshot(p),ready());}catch(error){if(!visualErrors.has(p.id)){visualErrors.add(p.id);console.warn('[WARLAND_COMBAT_VISUAL_ERROR] '+String(error));}}for(const [k,h]of hits)if(system.currentTick-h.tick>2)hits.delete(k);},2);
 world.afterEvents.playerLeave.subscribe(({playerId})=>{state.delete(playerId);visuals.forget(playerId);visualErrors.delete(playerId);for(const key of hits.keys())if(key.startsWith(playerId+':'))hits.delete(key);});
 return {state};
}
