import {world,system,GameMode} from '@minecraft/server';
// Full-height gaze supplements the native test, whose angular reference on
// custom actors can be at their feet. Native AI still owns chase and all hits.
const tracking=new Map(),leases=new Map(),SLOTS=32;let tick=-1,rays=0,players=[];
function rayBox(origin,dir,min,max){
 let lo=0,hi=64;
 for(const axis of ['x','y','z']){if(Math.abs(dir[axis])<1e-7){if(origin[axis]<min[axis]||origin[axis]>max[axis])return null;continue;}
  let a=(min[axis]-origin[axis])/dir[axis],b=(max[axis]-origin[axis])/dir[axis];if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(hi<lo)return null;}
 return lo;
}
function release(id){const s=tracking.get(id);if(!s)return;if(s.slot!==undefined){try{s.player?.removeTag('wl_shadow_gaze_'+s.slot);}catch{}try{if(s.entity?.isValid)s.entity.triggerEvent('warland:gaze_clear');}catch{}leases.delete(s.slot);}tracking.delete(id);}
export function forgetBodyGaze(id){release(id);}
export function scanBodyGaze(entity){
 const now=system.currentTick;if(now%3!==0)return;
 if(tick!==now){tick=now;rays=0;players=world.getAllPlayers().filter(p=>[GameMode.Survival,GameMode.Adventure].includes(p.getGameMode()));}
 if(entity.getProperty('warland:aggressive')){release(entity.id);return;}
 let previous=tracking.get(entity.id);
 if(previous?.slot!==undefined){if(now-previous.since>30)release(entity.id);return;}
 const at=entity.location,cx=at.x+(entity.getProperty('warland:presence_x')??0)/1000,cz=at.z+(entity.getProperty('warland:presence_z')??0)/1000;
 let chosen;
 for(const p of players){
  if(p.dimension.id!==entity.dimension.id||Math.hypot(p.location.x-at.x,p.location.y-at.y,p.location.z-at.z)>64)continue;
  const eye=p.getHeadLocation(),direction=p.getViewDirection(),length=rayBox(eye,direction,{x:cx-.7,y:at.y+.15,z:cz-.7},{x:cx+.7,y:at.y+4.3,z:cz+.7});
  if(length===null)continue;
  if(rays>=24){release(entity.id);return;} // Never count unchecked ticks as continuous gaze.
  rays++;if(p.dimension.getBlockFromRay(eye,direction,{maxDistance:Math.max(.01,length+.03),includePassableBlocks:false,includeLiquidBlocks:false}))continue;
  chosen=p;break;
 }
 if(!chosen){release(entity.id);return;}
 if(!previous||previous.player.id!==chosen.id||now-previous.checked>3){release(entity.id);tracking.set(entity.id,{since:now,checked:now,player:chosen,entity});return;}
 previous.checked=now;
 if(now-previous.since<6)return;
 const slot=Array.from({length:SLOTS},(_,i)=>i).find(i=>!leases.has(i));if(slot===undefined)return;
 leases.set(slot,entity.id);previous.slot=slot;previous.since=now;
 chosen.addTag('wl_shadow_gaze_'+slot);entity.triggerEvent('warland:gaze_target_'+slot);
}
// A saved/unloaded lease must not target a later player who reused the slot.
world.afterEvents.entityLoad.subscribe(({entity})=>{if(entity.typeId==='warland:shadow_boss_prototype'){try{entity.triggerEvent('warland:gaze_clear');}catch{}release(entity.id);}});
world.afterEvents.playerLeave.subscribe(({playerId})=>{for(const [id,s]of tracking)if(s.player.id===playerId)release(id);});
