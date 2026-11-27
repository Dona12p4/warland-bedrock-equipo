import {world,system,GameMode,InputPermissionCategory} from '@minecraft/server';
import {lobbyConfig as cfg} from './lobby-config.js';
import {ARRIVED,safeArrival} from './lobby-policy.js';
import {ARRIVAL,HEART_TAG,distance} from './arrival-policy.js';
import {startArrival,arrivalDebug} from './arrival-runtime.js';

const wait=t=>new Promise(r=>system.runTimeout(r,t)),active=new Set();
const area='wl_lobby_past_return';
const alive=p=>p.isValid&&(p.getComponent('minecraft:health')?.currentValue??0)>0;
const free=p=>alive(p)&&!p.hasTag(HEART_TAG)&&!p.getDynamicProperty('warland:heart_death_v1')&&world.getDynamicProperty('warland:heart_overlay_v1')!==true;
function release(d){if(!active.size)try{d.runCommand('tickingarea remove '+area)}catch{}}

// Wired by the complete-addon entry point. Neither source component imports
// another pack by a brittle filesystem-relative path.
export async function returnFromPast(p,mode,canContinue){
 if(active.has(p.id)||!free(p)||mode===GameMode.Spectator)return false;
 const d=world.getDimension('overworld'),back={dimension:p.dimension,location:{...p.location},rotation:p.getRotation(),mode:p.getGameMode()};
 if(!['Camera','Movement'].every(k=>p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory[k])))return false;
 active.add(p.id);let moved=false;
 try{
  if(active.size===1){const r=d.runCommand(`tickingarea add circle ${cfg.spawn.x} ${cfg.spawn.y} ${cfg.spawn.z} 1 ${area} true`);if(!r.successCount)return false}
  let ready=false;
  for(let i=0;i<20;i++){
   if(!free(p)||!canContinue())return false;
   if(safeArrival(d,cfg.spawn)){ready=true;break}
   await wait(5);
  }
  if(!ready||arrivalDebug().active.length>=ARRIVAL.maxConcurrent)return false;
  p.camera.fade({fadeColor:{red:1,green:.96,blue:.84},fadeTime:{fadeInTime:.1,holdTime:.2,fadeOutTime:.35}});
  p.teleport(cfg.spawn,{dimension:d,rotation:{x:0,y:180}});moved=true;p.setGameMode(mode);
  await wait(ARRIVAL.settle);
  if(!free(p)||p.dimension.id!==d.id||distance(p.location,cfg.spawn)>4)return false;
  if(!startArrival(p,'past')){
   p.teleport(back.location,{dimension:back.dimension,rotation:back.rotation});p.setGameMode(back.mode);moved=false;return false;
  }
  p.setDynamicProperty(ARRIVED,true);return true;
 }catch(e){
  console.warn('[WARLAND_PAST_LOBBY] '+String(e));
  // Only undo our own transfer, never move a dead player or override new travel.
  if(moved&&free(p)&&p.dimension.id===d.id&&distance(p.location,cfg.spawn)<=4){p.teleport(back.location,{dimension:back.dimension,rotation:back.rotation});p.setGameMode(back.mode)}
  return false;
 }finally{active.delete(p.id);release(d)}
}
world.afterEvents.worldLoad.subscribe(()=>release(world.getDimension('overworld')));
