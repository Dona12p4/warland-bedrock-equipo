import {world,system,GameMode} from '@minecraft/server';

// This module is installed ONLY in the optimized world's existing Base pack.
// A real native death still owns drops, insurance, statistics and heart loss.
export const HEART_STATE='warland:heart_death_v1';
export const HEART_OVERLAY='warland:heart_overlay_v1';
const ANIMATION=60,WAIT=60,SOUND='warland.player.heart_break';
// playerSpawn is emitted while the native respawn is still being dispatched.
// Keep spatial/mode/spawn mutations out of that callback and its native tick.
const RESPAWN_SETTLE_TICKS=2;
const jobs=new Map(),queue=[];let active=null,loaded=false;
const lastView=new Map(),OFF='WL_HEART|OFF|';
const SPECTATOR_TAG='warland_heart_spectator';
const audit=(action,p,extra={})=>console.warn('[WARLAND_HEART] '+JSON.stringify({action,name:p?.name,tick:system.currentTick,...extra}));
const alive=p=>p.isValid&&(p.getComponent('minecraft:health')?.currentValue??0)>0;
const point=p=>({dimension:p.dimension.id,...p.location});
const validMode=m=>[GameMode.Survival,GameMode.Adventure,GameMode.Creative].includes(m)?m:GameMode.Survival;
const persist=(p,s)=>p.setDynamicProperty(HEART_STATE,JSON.stringify(s));
const view=p=>({at:point(p),eye:p.getHeadLocation(),rotation:p.getRotation()});
function hideOverlay(p){
 // Empty titles can retain #hud_title_text_string in Bedrock JSON UI.
 // A nonempty OFF marker explicitly invalidates the frame visibility binding.
 p.onScreenDisplay.setTitle(OFF,{subtitle:' ',fadeInDuration:0,stayDuration:1,fadeOutDuration:0});
}
function nativeRespawnPoint(p,s){
 if(s.redirected)return s.returnPoint;
 const at=point(p),bed=s.spawnPoint;
 // The respawn event can expose the destination coordinates before its
 // dimension transition. Only disambiguate when they match the saved spawn;
 // a broken bed's fallback keeps the engine-selected position and dimension.
 if(bed&&Math.hypot(at.x-bed.x,at.y-bed.y,at.z-bed.z)<8)at.dimension=bed.dimension;
 return at;
}
function restoreSpawnPoint(p,s){
 if(!s.redirected||s.spawnRestored)return;
 const bed=s.spawnPoint;
 p.setSpawnPoint(bed?{dimension:world.getDimension(bed.dimension),x:bed.x,y:bed.y,z:bed.z}:undefined);
 s.spawnRestored=true;persist(p,s);
}
export function heartOverlayActive(){return active!==null;}
export function heartDebug(){return {active:active&&{name:active.name,start:active.start},queued:queue.length,jobs:jobs.size};}
function restore(p,s){
 // Keep the destination selected by Bedrock, including a broken bed fallback.
 // Spawn restoration below is only migration for an older persisted sequence.
 // Maximum health and inventory remain owned by the existing native handlers.
 const at=s.respawn;
 restoreSpawnPoint(p,s);
 if(at)p.teleport({x:at.x,y:at.y,z:at.z},{dimension:world.getDimension(at.dimension)});
 p.setGameMode(validMode(s.mode));
 if(s.cameraOwned)p.camera.clear();
 p.setDynamicProperty(HEART_STATE,undefined);jobs.delete(p.id);
 p.removeTag(SPECTATOR_TAG);
 audit('returned',p,{destination:at,mode:s.mode});
}
function beginSpectator(p,s){
 if(!alive(p))return false;
 if(!s.respawn)s.respawn=nativeRespawnPoint(p,s);
 // The spawn event may expose destination coordinates before the native
 // dimension changes. Keep its resolved destination; never overwrite it
 // with the old dimension during that transition.
 if(!s.spawned&&!s.redirected&&p.dimension.id!==s.respawn.dimension)return false;
 if(!s.spawned&&!s.redirected)s.respawn=point(p);
 restoreSpawnPoint(p,s);
 p.setGameMode(GameMode.Spectator);
 // Avoid the forced End respawn path implicated by real-client crashes. Never
 // redirect the native spawn or re-enter a dimension for the spectator scene.
 // Within the same dimension the original death view remains available.
 if(!s.spawned&&s.deathView&&s.deathView.at.dimension===p.dimension.id){const at=s.deathView.at;p.teleport({x:at.x,y:at.y,z:at.z},{rotation:s.deathView.rotation});}
 // New deaths use the native camera throughout. Only clear a camera owned by
 // a persisted sequence from older versions, after respawn has settled.
 if(s.cameraOwned)p.camera.clear();s.cameraOwned=false;s.spectatorFree=true;
 s.spawned=true;s.resumePending=false;persist(p,s);
 audit('spectator_ready',p,{spawnEventTick:s.spawnEventTick,settledTicks:system.currentTick-s.spawnEventTick});
 return true;
}
function sendFrame(p,frame,name){
 p.onScreenDisplay.setTitle('WL_HEART|F'+String(frame).padStart(2,'0')+'|',{
  subtitle:name+' perdió un corazón',fadeInDuration:0,stayDuration:3,fadeOutDuration:0
 });
}
function startNext(){
 if(active||!queue.length)return;
 // Broadcast on death; a slow native respawn must not hold up all viewers.
 const job=queue.shift();active={...job,start:system.currentTick};
 world.setDynamicProperty(HEART_OVERLAY,true);
 const s=jobs.get(job.id);if(s){s.release=system.currentTick+ANIMATION+WAIT;s.deadline=Date.now()+6000;
  const p=world.getAllPlayers().find(p=>p.id===job.id);if(p)persist(p,s);}
 for(const p of world.getAllPlayers())try{sendFrame(p,0,job.name);p.playSound(SOUND,{volume:1,pitch:1});}catch(e){audit('display_error',p,{error:String(e)});}
 audit('animation_started',null,{name:job.name,viewers:world.getAllPlayers().length});
}
function tick(){
 if(!loaded)return;
 for(const p of world.getAllPlayers()){
  const s=jobs.get(p.id);
  if(!s){if(alive(p))try{lastView.set(p.id,view(p));}catch{}continue;}
  if(!alive(p))continue;
  // Health can be restored before the native respawn transition is complete.
  // It is not a substitute for observing playerSpawn and waiting two ticks.
  if(s.spawnEventTick===undefined||system.currentTick<s.spawnEventTick+RESPAWN_SETTLE_TICKS)continue;
  try{
   if(s.release!==undefined&&system.currentTick>=s.release){restore(p,s);continue;}
   if((!s.spawned||s.resumePending)&&!beginSpectator(p,s))continue;
   if(p.getGameMode()!==GameMode.Spectator)p.setGameMode(GameMode.Spectator);
  }catch(e){audit('recovery_retry',p,{error:String(e)});}
 }
 if(active){
  const elapsed=system.currentTick-active.start;
  if(elapsed>=ANIMATION){
   for(const p of world.getAllPlayers())try{hideOverlay(p);}catch{}
   active=null;world.setDynamicProperty(HEART_OVERLAY,false);
  }else for(const p of world.getAllPlayers())try{sendFrame(p,elapsed,active.name);}catch{}
 }
 startNext();
}
export function playerDied(p){
 if(jobs.has(p.id))return;
 const s={mode:validMode(p.getGameMode()),name:p.name,spawned:false,created:Date.now(),deadline:Date.now()+10000};
 try{s.deathView=view(p);}catch{s.deathView=lastView.get(p.id);}
 try{const bed=p.getSpawnPoint();if(bed)s.spawnPoint={dimension:bed.dimension.id,x:bed.x,y:bed.y,z:bed.z};}catch{}
 // Bedrock owns the native spawn point. Do not replace it with the death
 // coordinates while the engine is processing a death and native respawn.
 // Do not attach a free camera to a dead native player. The overlay still
 // starts immediately, while the engine completes its ordinary respawn.
 p.addTag(SPECTATOR_TAG);
 jobs.set(p.id,s);persist(p,s);queue.push({id:p.id,name:p.name});
 audit('death_registered',p);
 // One shared sequence at a time. Concurrent deaths retain every name/audio;
 // each victim's three-second waiting period starts after their own sequence.
 startNext();
}
export function playerRespawned(p,initialSpawn){
 if(initialSpawn&&!active)try{hideOverlay(p);}catch{}
 let s=jobs.get(p.id);
 if(!s){
  const raw=p.getDynamicProperty(HEART_STATE);if(typeof raw!=='string'){p.removeTag(SPECTATOR_TAG);return;}
  try{s=JSON.parse(raw);}catch{p.setDynamicProperty(HEART_STATE,undefined);return;}
  if(!s.respawn)s.respawn=nativeRespawnPoint(p,s);
  // Rejoining/reloading must never leave a spectator trapped or replay a global death.
  s.release=system.currentTick+Math.min(120,Math.max(0,Math.ceil((s.deadline-Date.now())/50)));
  if(!Number.isFinite(s.release))s.release=system.currentTick;
  jobs.set(p.id,s);
 }
 if(!initialSpawn&&!s.spawned)s.respawn=nativeRespawnPoint(p,s);
 // Record only: native spawn/dimension/block-source ownership must settle
 // before restoring a spawn point, changing mode or teleporting this actor.
 s.spawnEventTick=system.currentTick;s.resumePending=true;persist(p,s);
 // Native respawn may clear titles. Resume the current frame immediately,
 // without restarting the global audio or waiting for the next interval.
 if(active)sendFrame(p,Math.max(0,Math.min(ANIMATION-1,system.currentTick-active.start)),active.name);
}
world.afterEvents.entityDie.subscribe(({deadEntity:p})=>{if(loaded&&p.typeId==='minecraft:player')try{playerDied(p);}catch(e){audit('death_error',p,{error:String(e)});}});
world.afterEvents.playerSpawn.subscribe(({player,initialSpawn})=>{if(loaded)try{playerRespawned(player,initialSpawn);}catch(e){audit('spawn_error',player,{error:String(e)});}});
world.afterEvents.playerLeave.subscribe(({playerId})=>{jobs.delete(playerId);lastView.delete(playerId);});
world.afterEvents.worldLoad.subscribe(()=>{
 world.gameRules.doImmediateRespawn=true;world.setDynamicProperty(HEART_OVERLAY,false);loaded=true;
 for(const p of world.getAllPlayers())playerRespawned(p,true);
 audit('loaded',null,{animationTicks:ANIMATION,waitTicks:WAIT,respawnSettleTicks:RESPAWN_SETTLE_TICKS});
});
system.runInterval(tick,1);
system.afterEvents.scriptEventReceive.subscribe(e=>{
 if(e.id!=='warland:heart_preview')return;
 const p=e.sourceEntity;
 if(p?.typeId!=='minecraft:player'||!['danielgamersc','hatsudemiku'].includes(p.name.toLowerCase()))return;
 if(active||queue.length){p.sendMessage('§7Espera a que termine la animación actual.');return;}
 queue.push({id:'preview',name:p.name});startNext();
});
