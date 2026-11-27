import {PAST,inPast,normalPast,offsetPoint} from './past-policy.js';

export const PAST_GUIDE={at:{x:245.5,y:63,z:-782.5},radius:1.8,holdTicks:20};
export const PAST_WIND={track:'warland.past.wind',volume:.38,durationSeconds:24,key:'warland:past_wind_v1'};

// The intact set is above the ruined set during the film. X alone cannot
// distinguish those acts; use the actual camera state, including preloading.
export function stormActive(p,scene){
 return inPast(p)&&!normalPast(p)&&(!p.hasTag(PAST.filmTag)||!!scene?.playing&&scene.memory===false);
}
export function createPastWind(now=Date.now){
 const due=new Map();
 function stop(p){
  if(due.has(p.id)||p.getDynamicProperty(PAST_WIND.key)){
   p.runCommand('stopsound @s '+PAST_WIND.track);
   due.delete(p.id);p.setDynamicProperty(PAST_WIND.key,undefined);
  }
 }
 function update(p,enabled){
  if(p.isValid===false)return;
  if(!enabled||!inPast(p)||(p.getComponent('minecraft:health')?.currentValue??0)<=0){stop(p);return}
  if(due.has(p.id)&&now()<due.get(p.id))return;
  // Clear any stale persisted playback on reconnect, never restart other audio.
  if(!due.has(p.id))stop(p);
  p.playSound(PAST_WIND.track,{volume:PAST_WIND.volume,pitch:1});
  p.setDynamicProperty(PAST_WIND.key,true);due.set(p.id,now()+PAST_WIND.durationSeconds*1000);
 }
 return {update,stop,forget:id=>due.delete(id)};
}
export function createPastGuide(){
 const arrived=new Map();
 function ready(p,tick,eligible=true){
  const at=offsetPoint(PAST_GUIDE.at,normalPast(p)),v=p.location;
  const inside=eligible&&inPast(p)&&!p.hasTag(PAST.filmTag)&&v.y>=at.y-.6&&v.y<=at.y+2.5&&Math.hypot(v.x-at.x,v.z-at.z)<=PAST_GUIDE.radius;
  if(!inside){arrived.delete(p.id);return false}
  if(!arrived.has(p.id)){arrived.set(p.id,tick);return false}
  if(tick-arrived.get(p.id)<PAST_GUIDE.holdTicks)return false;
  arrived.delete(p.id);return true;
 }
 function emit(d,normal=false){
  const at=offsetPoint(PAST_GUIDE.at,normal);
  // The shaft rises above the real gate; depth remains enabled. It is never a
  // screen overlay or a beam drawn through walls. Two copies share four effects.
  d.spawnParticle('warland:past_guide_beam',{...at,y:84});
  d.spawnParticle('warland:past_guide_halo',{...at,y:84});
  d.spawnParticle('warland:past_guide_core',{...at,y:at.y+1.8});
  d.spawnParticle('warland:past_guide_sparks',{...at,y:at.y+.2});
 }
 return {ready,emit,forget:id=>arrived.delete(id)};
}
