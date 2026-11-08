import {world,system} from '@minecraft/server';
export const CLEAR_POTION='warland:claridad_umbral';
export const BASIC_POTION='warland:claridad_umbral_i';
export const CLEAR_KEY='warland:clear_sight_until';
export const BASIC_KEY='warland:basic_sight_until';
export const BLIND_KEY='warland:ambient_blind_until';
export const NATIVE_KEY='warland:clear_sight_native_until';
export const SUSPENDED_KEY='warland:umbral_suspended_nv';
export const CLEAR_DURATION=4800;
const now=()=>world.getAbsoluteTime();
const inUmbral=p=>p.dimension.id==='minecraft:the_end';
export const remainingClearSight=(p,time=now())=>Math.max(0,Number(p.getDynamicProperty(CLEAR_KEY)??0)-time);
export const remainingBasicSight=(p,time=now())=>Math.max(0,Number(p.getDynamicProperty(BASIC_KEY)??0)-time);
export const clarityLevel=(p,time=now())=>remainingClearSight(p,time)>0?2:remainingBasicSight(p,time)>0?1:0;
const spectator=p=>String(p.getGameMode?.()??'').toLowerCase().endsWith('spectator')||p.hasTag?.('warland_heart_spectator');
const recovery=p=>!!p.getDynamicProperty('warland:devour_recovery');
// A wave temporarily suspends sight-blocking blindness, not the potion clock.
// Persist only an external effect so reconnect cannot lose its remaining time.
const echoViews=new Map();
// Fog transitions complement the actual native blindness required without
// either clarity potion. Never substitute darkness or fake an effect icon.
const echoFades=new Map();
export const ECHO_FADE_TICKS=24, ECHO_FOG_STEPS=12;
function openness(id,tick=system.currentTick){
 const f=echoFades.get(id);if(!f)return 0;
 const t=Math.max(0,Math.min(1,(tick-f.start)/ECHO_FADE_TICKS));
 return f.from+(f.to-f.from)*(t*t*(3-2*t));
}
function fadeTo(p,to){
 const current=echoFades.get(p.id);if(current?.to===to)return;
 const from=openness(p.id);if(!current&&to===0)return;
 echoFades.set(p.id,{from,to,start:system.currentTick});
}
export function echoFogPhase(p,tick=system.currentTick){
 if(spectator(p)||recovery(p)||activeClarityLevel(p)>0)return ECHO_FOG_STEPS;
 return Math.round(openness(p.id,tick)*ECHO_FOG_STEPS);
}
export function echoFogTransitioning(p){
 const f=echoFades.get(p.id);return !!f&&system.currentTick<f.start+ECHO_FADE_TICKS;
}
const ECHO_BLIND_KEY='warland:echo_saved_blindness';
const ECHO_NATIVE_FADE='warland:echo_blind_fade_until';
function savedBlindness(p){try{return JSON.parse(p.getDynamicProperty(ECHO_BLIND_KEY)??'null');}catch{return null;}}
function hideBlindness(p,time){
 const e=p.getEffect('blindness'),until=Number(p.getDynamicProperty(BLIND_KEY)??0);
 const fade=Number(p.getDynamicProperty(ECHO_NATIVE_FADE)??0);
 if(fade>time&&e&&e.duration>=0&&Math.abs(e.duration-(fade-time))<=2)return;
 if(fade)p.setDynamicProperty(ECHO_NATIVE_FADE,undefined);
 const owned=until>0&&e?.amplifier===0&&e.duration>=0&&Math.abs(e.duration-(until-time))<=12;
 if(e&&!owned){
  const old=savedBlindness(p),next={until:e.duration<0?-1:time+e.duration,amplifier:e.amplifier};
  if(!old||next.amplifier>old.amplifier||(next.amplifier===old.amplifier&&(next.until===-1||old.until!==-1&&next.until>old.until)))p.setDynamicProperty(ECHO_BLIND_KEY,JSON.stringify(next));
 }
 // Let a real, externally supplied blindness finish its native fade rather
 // than disappear in one frame. Its original deadline remains saved above.
 if(e){
  const ticks=e.duration<0?20:Math.min(20,e.duration),amplifier=e.amplifier;
  p.removeEffect('blindness');
  if(ticks>0){p.addEffect('blindness',ticks,{amplifier,showParticles:false});p.setDynamicProperty(ECHO_NATIVE_FADE,time+ticks);}
 }
 if(until)p.setDynamicProperty(BLIND_KEY,undefined);
}
function restoreEchoBlindness(p,time){
 const saved=savedBlindness(p);if(!saved)return;
 p.setDynamicProperty(ECHO_BLIND_KEY,undefined);
 const duration=saved.until===-1?-1:saved.until-time,current=p.getEffect('blindness');
 if(duration!==-1&&duration<=0)return;
 if(current&&(current.amplifier>saved.amplifier||current.amplifier===saved.amplifier&&(current.duration<0||duration!==-1&&current.duration>=duration)))return;
 if(duration===-1)p.runCommand(`effect @s blindness infinite ${saved.amplifier} true`);
 else p.addEffect('blindness',duration,{amplifier:saved.amplifier,showParticles:false});
}
export function beginEchoSight(p,time=now()){
 fadeTo(p,1);
 echoViews.set(p.id,system.currentTick+3);hideBlindness(p,time);
}
export function sustainEchoSight(p,time=now()){
 fadeTo(p,1);
 echoViews.set(p.id,system.currentTick+3);hideBlindness(p,time);
}
export function finishEchoSight(p,{discard=false}={}){
 echoViews.delete(p.id);
 fadeTo(p,0);
 p.setDynamicProperty(ECHO_NATIVE_FADE,undefined);
 if(discard)p.setDynamicProperty(ECHO_BLIND_KEY,undefined);
 else restoreEchoBlindness(p,now());
 reconcileAmbientBlindness(p);
}
world.afterEvents.playerLeave.subscribe(({playerId})=>{echoViews.delete(playerId);echoFades.delete(playerId);});
export const activeClarityLevel=(p,time=now())=>inUmbral(p)&&!recovery(p)&&!spectator(p)?clarityLevel(p,time):0;
export const clearSightActive=(p,time=now())=>activeClarityLevel(p,time)===2;

export function reconcileAmbientBlindness(p,time=now()){
 if(recovery(p)&&!spectator(p))return; // The capture sequence owns its visual effects.
 if(inUmbral(p)&&!spectator(p)&&(echoViews.get(p.id)??-1)>=system.currentTick){hideBlindness(p,time);return;}
 if(echoViews.delete(p.id))fadeTo(p,0);
 if(!inUmbral(p)||spectator(p))echoFades.delete(p.id);
 restoreEchoBlindness(p,time);
 const effect=p.getEffect('blindness'),ownedUntil=Number(p.getDynamicProperty(BLIND_KEY)??0);
 const owns=ownedUntil>0&&effect?.amplifier===0&&effect.duration>=0&&Math.abs(effect.duration-(ownedUntil-time))<=12;
 if(activeClarityLevel(p,time)>0){
  if(effect)p.removeEffect('blindness');
  if(p.getEffect('darkness'))p.removeEffect('darkness');
 }else if(inUmbral(p)&&!spectator(p)){
  // Give the closing visual transition time to finish before native blindness
  // returns. Both potions and an active sweep remain explicit exceptions.
  if(echoFogTransitioning(p))return;
  if(!effect||(owns&&effect.duration<500)||(effect.duration>=0&&effect.duration<40)){
   p.addEffect('blindness',600,{amplifier:0,showParticles:false});
   p.setDynamicProperty(BLIND_KEY,time+600);return;
  }
  if(!owns&&ownedUntil)p.setDynamicProperty(BLIND_KEY,undefined);
  return;
 }else if(owns)p.removeEffect('blindness');
 // Leaving never clears an unrelated, externally applied blindness effect.
 if(ownedUntil)p.setDynamicProperty(BLIND_KEY,undefined);
}

function savedVision(p){
 try{const value=JSON.parse(p.getDynamicProperty(SUSPENDED_KEY)??'null');
  return value&&Number.isFinite(value.until)&&Number.isFinite(value.amplifier)?value:null;
 }catch{return null;}
}
function preserveNative(p,native,time,saved){
 if(!native)return saved;
 const candidate={until:native.duration<0?-1:time+native.duration,amplifier:native.amplifier};
 if(!saved||(saved.until!==-1&&(candidate.until===-1||candidate.until>saved.until))){
  p.setDynamicProperty(SUSPENDED_KEY,JSON.stringify(candidate));return candidate;
 }return saved;
}
export function reconcileNightVision(p,time=now()){
 reconcileAmbientBlindness(p,time);
 let native=p.getEffect('night_vision'),saved=savedVision(p);
 const ownedUntil=Number(p.getDynamicProperty(NATIVE_KEY)??0);
 // Only remove our own effect on exit. A later externally supplied effect
 // remains independent; it must not be mistaken for our temporary light.
 const owns=ownedUntil>0&&native?.amplifier===0&&native.duration>=0&&Math.abs(native.duration-(ownedUntil-time))<=12;
 if(inUmbral(p)){
  if(native&&!owns)saved=preserveNative(p,native,time,saved);
  if(clearSightActive(p,time)){
   const until=Number(p.getDynamicProperty(CLEAR_KEY))+400;
   // The extra 20 s are removed when the potion expires. Keeping the native
   // timer above its flashing threshold avoids brightness pulses at the end.
   if(!owns||ownedUntil<until){
    p.addEffect('night_vision',Math.max(401,until-time),{amplifier:0,showParticles:false});
    p.setDynamicProperty(NATIVE_KEY,until);
   }
  }else{
   if(native)p.removeEffect('night_vision');
   if(ownedUntil)p.setDynamicProperty(NATIVE_KEY,undefined);
  }
 }else{
  if(owns){p.removeEffect('night_vision');native=undefined;}
  if(ownedUntil)p.setDynamicProperty(NATIVE_KEY,undefined);
  if(saved){
   const duration=saved.until===-1?-1:Math.max(0,saved.until-time);
   if(duration!==0&&(!native||(native.duration>=0&&(duration===-1||native.duration<duration)))){
    if(duration===-1)p.runCommand(`effect @s night_vision infinite ${saved.amplifier} true`);
    else p.addEffect('night_vision',duration,{amplifier:saved.amplifier,showParticles:false});
   }p.setDynamicProperty(SUSPENDED_KEY,undefined);
  }
 }
 if(p.getDynamicProperty(CLEAR_KEY)!==undefined&&remainingClearSight(p,time)===0)p.setDynamicProperty(CLEAR_KEY,undefined);
 if(p.getDynamicProperty(BASIC_KEY)!==undefined&&remainingBasicSight(p,time)===0)p.setDynamicProperty(BASIC_KEY,undefined);
}
export function drinkClearSight(p,time=now()){
 p.setDynamicProperty(CLEAR_KEY,Math.max(Number(p.getDynamicProperty(CLEAR_KEY)??0),time+CLEAR_DURATION));
 reconcileNightVision(p,time);
 return true;
}
export function drinkBasicSight(p,time=now()){
 p.setDynamicProperty(BASIC_KEY,Math.max(Number(p.getDynamicProperty(BASIC_KEY)??0),time+CLEAR_DURATION));
 reconcileNightVision(p,time);return true;
}
export function clearClearSight(p,time=now()){
 p.setDynamicProperty(CLEAR_KEY,undefined);p.setDynamicProperty(BASIC_KEY,undefined);reconcileNightVision(p,time);
}
world.afterEvents.itemCompleteUse.subscribe(({source,itemStack})=>{
 if(itemStack.typeId===CLEAR_POTION)drinkClearSight(source);
 else if(itemStack.typeId===BASIC_POTION)drinkBasicSight(source);
 else if(itemStack.typeId==='minecraft:milk_bucket'){
  source.setDynamicProperty(ECHO_NATIVE_FADE,undefined);
  echoViews.delete(source.id);source.setDynamicProperty(ECHO_BLIND_KEY,undefined);
  source.setDynamicProperty(SUSPENDED_KEY,undefined);clearClearSight(source);
 }
});
world.afterEvents.playerSpawn.subscribe(({player,initialSpawn})=>system.run(()=>{
 if(!initialSpawn){echoFades.delete(player.id);echoViews.delete(player.id);player.setDynamicProperty(ECHO_NATIVE_FADE,undefined);player.setDynamicProperty(ECHO_BLIND_KEY,undefined);player.setDynamicProperty(SUSPENDED_KEY,undefined);clearClearSight(player);}
 else reconcileNightVision(player);
}));
world.afterEvents.playerDimensionChange.subscribe(({player})=>system.run(()=>reconcileNightVision(player)));
