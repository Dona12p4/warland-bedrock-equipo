import {world,system,ItemStack} from '@minecraft/server';
import {survivalConfig as cfg} from './umbral-survival-config.js';
import {COMPASS,isCompass,compassFrame,compassType} from './umbral-compass-policy.js';
import {inRiftDimension} from './umbral-rift-policy.js';
const STAMP='warland:compass_visit',DELIVERED='warland:compass_given_visit';
export function installCompass({getVisit,canJoin=()=>true}){
 const fullNotice=new Map(),lastHint=new Map();let nextDelivery=0;
 const inventory=p=>p.getComponent('minecraft:inventory')?.container;
 function provide(p,manual=false){
  const visit=getVisit();if(!inRiftDimension(p)||!canJoin(p)||visit.phase==='idle')return false;
  const c=inventory(p);if(!c)return false;
  for(let i=0;i<c.size;i++)if(isCompass(c.getItem(i)?.typeId)){
   p.setDynamicProperty(DELIVERED,visit.serial);return true;
  }
  if(!manual&&p.getDynamicProperty(DELIVERED)===visit.serial)return false;
  const item=new ItemStack(COMPASS);item.setDynamicProperty(STAMP,visit.serial);
  if(c.addItem(item)){
   if(manual||fullNotice.get(p.id)!==visit.serial){p.sendMessage('§7Libera un hueco para la brújula.');fullNotice.set(p.id,visit.serial);}return false;
  }
  p.setDynamicProperty(DELIVERED,visit.serial);fullNotice.delete(p.id);return true;
 }
 function update(p,visit){
  const c=inventory(p);if(!c)return;
  const slot=p.selectedSlotIndex,item=c.getItem(slot);if(!isCompass(item?.typeId))return;
  const here=inRiftDimension(p)&&canJoin(p),active=here&&visit.phase==='active';
  if(system.currentTick-(lastHint.get(p.id)??-100)>19){
   let hint='Brújula del Umbral · Solo funciona dentro';
   if(here&&!active)hint='Brújula · Preparando la salida…';
   if(active){const angle=compassFrame(p.location,p.getRotation().y,visit.position,8),arrows=['↑','↗','→','↘','↓','↙','←','↖'];const distance=Math.hypot(p.location.x-visit.position.x,p.location.z-visit.position.z);hint='Grieta '+arrows[angle]+' · '+(distance<12?'Muy cerca':distance<64?'Cerca':'Lejos');}
   p.onScreenDisplay?.setActionBar('§e'+hint);lastHint.set(p.id,system.currentTick);
  }
  const frame=active?compassFrame(p.location,p.getRotation().y,visit.position,cfg.compassFrames):null;
  const type=compassType(frame),serial=active?visit.serial:0;
  if(item.typeId===type&&item.getDynamicProperty(STAMP)===serial)return;
  const next=new ItemStack(type);next.nameTag=item.nameTag;next.keepOnDeath=item.keepOnDeath;next.lockMode=item.lockMode;
  next.setLore(item.getLore());
  for(const key of item.getDynamicPropertyIds())next.setDynamicProperty(key,item.getDynamicProperty(key));
  next.setDynamicProperty(STAMP,serial);c.setItem(slot,next);
 }
 function tick(){
  const visit=getVisit(),delivery=system.currentTick>=nextDelivery;if(delivery)nextDelivery=system.currentTick+cfg.compassDeliveryTicks;
  for(const p of world.getAllPlayers())try{
   if((p.getComponent('minecraft:health')?.currentValue??1)<=0)continue;
   if(delivery)provide(p);update(p,visit);
  }catch(e){console.warn('[UMBRAL] Brújula: '+String(e));}
 }
 system.runInterval(tick,cfg.compassUpdateTicks);
 world.afterEvents.playerLeave.subscribe(e=>{fullNotice.delete(e.playerId);lastHint.delete(e.playerId);});
 return {provide,tick,update};
}
