import {world,system,InputPermissionCategory,CommandPermissionLevel,CustomCommandStatus,CustomCommandParamType} from '@minecraft/server';
import {cfg} from './void-config.js';
import {eligibleStrike,chooseDevour,devourChanceForDay} from './devour-rules.js';
const SHADOW='warland:shadow_boss_prototype',KEY='warland:devour_recovery',sessions=new Map(),attackers=new Map(),rolled=new Map(),cooldowns=new Map();
const atSanctuary=p=>{const s=cfg.sanctuary;return !!s&&p.dimension.id===s.dimension&&Math.hypot(p.location.x-s.x,p.location.z-s.z)<=s.radius;};
const smooth=(a,b,t)=>{const f=Math.min(1,Math.max(0,(t-a)/(b-a)));return f*f*(3-2*f);};
const point=(base,forward,y,d)=>({x:base.x+forward.x*d,y:base.y+y,z:base.z+forward.z*d});
const forwardFromYaw=a=>{const yaw=a.getRotation().y*Math.PI/180;return {x:-Math.sin(yaw),y:0,z:Math.cos(yaw)};};
export function devourTestTarget(issuer,selected){
 if(issuer?.typeId!=='minecraft:player'||!issuer.isValid||!cfg.admins.some(n=>n.toLowerCase()===issuer.name.toLowerCase()))return {error:'Solo DanielGamerSC y Hatsudemiku pueden usar esta prueba.'};
 const targets=selected===undefined?[issuer]:selected;
 if(!Array.isArray(targets)||targets.length!==1)return {error:'Selecciona exactamente un jugador conectado.'};
 const target=targets[0];
 if(target?.typeId!=='minecraft:player'||!target.isValid)return {error:'Ese jugador ya no está conectado.'};
 if(target.dimension.id==='minecraft:the_end')return {error:'Sombra no puede devorar dentro del Umbral.'};
 if((target.getComponent('health')?.currentValue??0)<=0||String(target.getGameMode()).toLowerCase()==='spectator')return {error:'El jugador debe estar vivo y fuera de modo espectador.'};
 return {target};
}
function roomForCapture(a){
 try{const f=forwardFromYaw(a);
  for(const distance of [.4,.8,1.2,1.6])for(const dx of [-.3,.3])for(const dz of [-.3,.3])for(let y=.15;y<4;y+=.5){const p=point(a.location,f,y,distance);if(!a.dimension.getBlock({x:p.x+dx,y:p.y,z:p.z+dz})?.isAir)return false;}
  return true;
 }catch{return false;}
}
function restore(p,state,returnToStart){
 if(!p?.isValid)return;
 try{p.playAnimation('animation.warland.player.devour_reset',{controller:'wl_devour_player',blendOutTime:0});}catch{}
 if(p.typeId==='minecraft:player'){
  try{p.camera.clear();p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement,state.movement);p.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera,state.camera);}catch{}
 }
 if(returnToStart)try{p.teleport(state.back.location,{dimension:world.getDimension(state.back.dimension),rotation:state.back.rotation});}catch{}
 p.setDynamicProperty(KEY,undefined);
}
function finish(s,aborted=false){
 sessions.delete(s.victim.id);attackers.delete(s.attacker.id);
 if(s.orb?.isValid)s.orb.remove();
 if(s.visual?.isValid)s.visual.remove();
 if(s.attacker.isValid)try{s.attacker.triggerEvent('warland:devour_end');}catch{}
 restore(s.victim,s,aborted&&!s.transferred);
 if(aborted&&s.victim.isValid&&s.victim.typeId==='minecraft:player')s.victim.sendMessage('§7La captura se ha interrumpido.');
}
export function captureSnapshot(){return {victims:[...sessions.keys()],attackers:[...attackers.keys()]};}
export async function startCapture(attacker,victim,travel){
 if(atSanctuary(victim)||atSanctuary(attacker))return false;
 if(!attacker.isValid||!victim.isValid||attacker.dimension.id==='minecraft:the_end'||victim.dimension.id==='minecraft:the_end'||attacker.dimension.id!==victim.dimension.id||sessions.has(victim.id)||attackers.has(attacker.id)||!roomForCapture(attacker))return false;
 const player=victim.typeId==='minecraft:player',back={dimension:victim.dimension.id,location:victim.location,rotation:victim.getRotation()};
 const s={attacker,victim,back,base:{...attacker.location},rotation:{x:0,y:attacker.getRotation().y},forward:forwardFromYaw(attacker),started:system.currentTick,transferred:false,transferring:false,
  movement:player?victim.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement):true,camera:player?victim.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Camera):true};
 // getViewDirection can be vertical when the mob looks straight at a player
 // inside its hitbox; flattening that vector collapses all camera offsets.
 sessions.set(victim.id,s);attackers.set(attacker.id,s);cooldowns.set(victim.id,system.currentTick+cfg.devour.cooldownTicks);
 try{
  victim.setDynamicProperty(KEY,JSON.stringify({back,movement:s.movement,camera:s.camera}));
  attacker.triggerEvent('warland:devour_start');
  // The visual actor has no collision volume: the close-up avoids the native
  // near-mob dithering, while the real mob remains hittable for a rescue.
  s.visual=attacker.dimension.spawnEntity('warland:shadow_devour_visual',s.base);
  s.visual.teleport(s.base,{rotation:s.rotation});
  victim.playAnimation('animation.warland.player.devour',{controller:'wl_devour_player',blendOutTime:.05});
  if(player){victim.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement,false);victim.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera,false);victim.camera.setCamera('minecraft:first_person');}
  attacker.dimension.playSound('warland.shadow.devour',attacker.location,{volume:1,pitch:1});
  s.travel=travel;return true;
 }catch(e){finish(s,true);throw e;}
}
export function installDevour({enter,ready}){
 world.beforeEvents.entityHurt.subscribe(e=>{
  if(e.cancel)return;
  const victim=e.hurtEntity,attacker=e.damageSource.damagingEntity;
  if(sessions.has(victim.id)){e.cancel=true;return;}
  if(attacker?.typeId!==SHADOW||!attacker.isValid)return;
  if(attackers.has(attacker.id)){e.cancel=true;return;}
  const action=attacker.getProperty('warland:visual_action'),cycle=attacker.getProperty('warland:attack_cycle'),now=system.currentTick;
  if(!eligibleStrike({player:victim.typeId==='minecraft:player',alive:(victim.getComponent('health')?.currentValue??0)>0,mode:victim.typeId==='minecraft:player'?victim.getGameMode():'',dimension:victim.dimension.id,action,damage:e.damage,cause:e.damageSource.cause,busy:false,cooldown:now<(cooldowns.get(victim.id)??0)}))return;
  const k=attacker.id+':'+cycle;if(rolled.has(k))return;rolled.set(k,now);
  const day=world.scoreboard.getObjective('wl_season')?.getScore('day')??0;
  if(!chooseDevour(devourChanceForDay(day,cfg.devour)))return;
  if(!roomForCapture(attacker))return;
  // Cancel this hit before native damage: even half a heart survives capture.
  e.cancel=true;
  system.run(()=>startCapture(attacker,victim,enter).catch(err=>console.warn('[DEVOUR] '+err)));
  ready().catch(err=>console.warn('[DEVOUR] Destination preparation: '+err));
 });
 system.runInterval(()=>{
  for(const [k,t]of rolled)if(system.currentTick-t>400)rolled.delete(k);
  for(const [k,t]of cooldowns)if(system.currentTick>=t)cooldowns.delete(k);
  if(system.currentTick%40===0)for(const dim of ['overworld','nether','the_end'])for(const a of world.getDimension(dim).getEntities({type:SHADOW}))if(a.getProperty('warland:devouring')&&!attackers.has(a.id))a.triggerEvent('warland:devour_end');
  for(const s of [...sessions.values()])try{
   const {attacker:a,victim:p}=s,ticks=system.currentTick-s.started,t=ticks/20;
   if(!a.isValid||!p.isValid||!s.visual?.isValid||(a.getComponent('health')?.currentValue??0)<=0||(!s.transferred&&p.dimension.id!==s.back.dimension)){finish(s,true);continue;}
   if(ticks>200){finish(s,true);continue;}
   a.teleport(s.base,{rotation:s.rotation});
   const lift=smooth(1.3,2.8,t),mouth=point(s.base,s.forward,3.43,.37),mass=point(s.base,s.forward,1.125+2*lift,.8-.3*lift),swallow=smooth(3.85,4.55,t);
   if(!s.transferred){
    const held=point(s.base,s.forward,1.65*lift,1.6-.15*lift);
    // True first person hides the wearer's own body/armor. A free camera was
    // looking through the player's lifted arms and produced a dotted overlay.
    const eye={x:held.x,y:held.y+1.62,z:held.z},target=point(s.base,s.forward,3.43,.75);
    const camera={x:eye.x+(target.x-eye.x)*swallow,y:eye.y+(target.y-eye.y)*swallow,z:eye.z+(target.z-eye.z)*swallow};
    const delta={x:mouth.x-camera.x,y:mouth.y-camera.y,z:mouth.z-camera.z};
    p.teleport({x:camera.x,y:camera.y-1.62,z:camera.z},{rotation:{x:-Math.atan2(delta.y,Math.hypot(delta.x,delta.z))*180/Math.PI,y:Math.atan2(-delta.x,delta.z)*180/Math.PI}});
   }
   if(t>=2.15&&t<4.55&&ticks%4===0)for(const observer of a.dimension.getPlayers({location:s.base,maxDistance:64}))if(observer.id!==p.id)observer.spawnParticle('warland:devour_shroud',mass);
   if(t>=3.2&&t<4.55){
    if(!s.orb?.isValid)s.orb=a.dimension.spawnEntity('warland:devour_orb',mass);
    s.orb.teleport({x:mass.x+(mouth.x-mass.x)*swallow,y:mass.y+(mouth.y-mass.y)*swallow,z:mass.z+(mouth.z-mass.z)*swallow});s.orb.setProperty('warland:orb_scale',Math.round(100*(1-smooth(4.25,4.55,t))));
   }else if(s.orb?.isValid){s.orb.remove();s.orb=null;}
   if(ticks>=cfg.devour.transferTick&&!s.transferring&&!s.transferred){
    s.transferring=true;
    if(p.typeId==='minecraft:player'){p.spawnParticle('warland:devour_shroud',mouth);p.camera.fade({fadeTime:{fadeInTime:.15,holdTime:.5,fadeOutTime:.7},fadeColor:{red:0,green:0,blue:0}});}
    Promise.resolve(s.travel(p,s.back,()=>sessions.has(p.id)&&a.isValid)).then(ok=>{if(!sessions.has(p.id))return;if(!ok){finish(s,true);return;}s.transferred=true;restore(p,s,false);}).catch(e=>{console.warn('[DEVOUR] '+e);finish(s,true);});
   }
   if(ticks>=Math.round(cfg.devour.seconds*20)&&s.transferred)finish(s);
  }catch(e){console.warn('[DEVOUR] '+e);finish(s,true);}
 },1);
 world.afterEvents.playerSpawn.subscribe(({player:p})=>system.run(()=>{const raw=p.getDynamicProperty(KEY);if(raw&&!sessions.has(p.id))try{restore(p,JSON.parse(raw),true);}catch{p.camera.clear();p.setDynamicProperty(KEY,undefined);}}));
 world.afterEvents.playerLeave.subscribe(e=>{const s=sessions.get(e.playerId);if(s)finish(s,true);});
 // The issuer keeps administrator authorization; the selected victim does not
 // need operator privileges. Omitting the selector retains the self-test.
 system.beforeEvents.startup.subscribe(e=>e.customCommandRegistry.registerCommand({
  name:'warland:devorar_prueba',description:'Probar captura de Sombra sobre un jugador',permissionLevel:CommandPermissionLevel.Any,cheatsRequired:false,
  optionalParameters:[{name:'jugador',type:CustomCommandParamType.PlayerSelector}]
 },(o,selected)=>{
  const issuer=o.sourceEntity,plan=devourTestTarget(issuer,selected);
  if(plan.error)return {status:CustomCommandStatus.Failure,message:plan.error};
  system.run(async()=>{try{
   await ready();const fresh=devourTestTarget(issuer,[plan.target]);
   if(fresh.error){if(issuer.isValid)issuer.sendMessage('§7'+fresh.error);return;}
   const p=fresh.target;
   const candidates=p.dimension.getEntities({type:SHADOW,location:p.location,maxDistance:10}).sort((a,b)=>Math.hypot(a.location.x-p.location.x,a.location.y-p.location.y,a.location.z-p.location.z)-Math.hypot(b.location.x-p.location.x,b.location.y-p.location.y,b.location.z-p.location.z));
   const a=candidates.find(e=>e.isValid&&(e.getComponent('health')?.currentValue??0)>0&&!attackers.has(e.id)&&roomForCapture(e));
   if(!a){issuer.sendMessage(candidates.length?'§7Sombra necesita espacio libre delante y ninguna captura en curso.':'§7Coloca una Sombra a menos de 10 bloques del jugador elegido.');return;}
   if(await startCapture(a,p,enter)){
    issuer.sendMessage('§7Captura iniciada sobre '+p.name+'.');
    console.warn('[DEVOUR_TEST] '+JSON.stringify({at:Date.now(),administrator:issuer.name,target:p.name,dimension:p.dimension.id,position:p.location}));
   }else issuer.sendMessage('§7No se pudo iniciar: comprueba el espacio, la dimensión y si el jugador ya está capturado.');
  }catch(err){if(issuer?.isValid)issuer.sendMessage('§c'+err);}});
  return {status:CustomCommandStatus.Success};
 }));
}
