import {world,system,GameMode,InputPermissionCategory,EasingType} from '@minecraft/server';
import {lobbyConfig as cfg} from './lobby-config.js';
import {safeArrival} from './lobby-policy.js';
import {ARRIVAL,CINEMATIC_TAG,RESPAWN_TAG,HEART_TAG,RECOVERY,arrivalFrame,lobbyRespawn,distance} from './arrival-policy.js';

const jobs=new Map(),requests=new Map();
const permissions=[InputPermissionCategory.Camera,InputPermissionCategory.Movement];
const alive=p=>p.isValid&&(p.getComponent('minecraft:health')?.currentValue??0)>0;
const audit=(action,p,extra={})=>console.warn('[WARLAND_ARRIVAL] '+JSON.stringify({action,gamertag:p?.name,tick:system.currentTick,...extra}));
export const arrivalActive=p=>jobs.has(p.id)||p.hasTag(CINEMATIC_TAG);
export const arrivalDebug=()=>({active:[...jobs.values()].map(s=>({id:s.p.id,reason:s.reason,elapsed:system.currentTick-s.start,emissions:s.emissions})),pending:requests.size});

export function recoverArrival(p){
 // Persisted ownership lets a disconnect, script reload or failed camera call
 // restore ONLY permissions this sequence changed. Never change mode or spawn.
 const raw=p.getDynamicProperty(RECOVERY);if(typeof raw!=='string'){p.removeTag(CINEMATIC_TAG);return;}
 let s;try{s=JSON.parse(raw);}catch{p.setDynamicProperty(RECOVERY,undefined);p.removeTag(CINEMATIC_TAG);return;}
 if(!alive(p))return;
 if(s.cameraOwned)p.camera.clear();
 for(const [category,enabled]of s.permissions??[])p.inputPermissions.setPermissionCategory(category,enabled);
 p.setDynamicProperty(RECOVERY,undefined);p.removeTag(CINEMATIC_TAG);jobs.delete(p.id);
 audit('recovered',p);
}
function finish(p,reason){
 const s=jobs.get(p.id);if(!s)return;
 jobs.delete(p.id);
 try{recoverArrival(p);}catch(e){audit('recovery_deferred',p,{error:String(e)});}
 audit('finished',p,{reason,emissions:s.emissions});
}
function emit(s,name){
 try{s.p.dimension.spawnParticle('warland:arrival_'+name,s.at);s.emissions++;}catch(e){audit('particle_error',s.p,{name,error:String(e)});}
}
export function startArrival(p,reason='preview'){
 if(jobs.has(p.id)||!alive(p)||p.hasTag(HEART_TAG)||p.getGameMode()===GameMode.Spectator||p.dimension.id!=='minecraft:overworld'||distance(p.location,cfg.spawn)>4||!safeArrival(p.dimension,cfg.spawn))return false;
 if(jobs.size>=ARRIVAL.maxConcurrent)return false;
 const saved=permissions.map(c=>[c,p.inputPermissions.isPermissionCategoryEnabled(c)]);
 if(saved.some(([,enabled])=>!enabled))return false;
 const s={p,reason,start:system.currentTick,at:{...cfg.spawn},permissions:saved,cameraOwned:true,emissions:0};
 // Commit recovery before touching controls; normal skin/equipment stay intact.
 p.setDynamicProperty(RECOVERY,JSON.stringify({permissions:saved,cameraOwned:true}));jobs.set(p.id,s);p.addTag(CINEMATIC_TAG);
 try{
  for(const c of permissions)p.inputPermissions.setPermissionCategory(c,false);
  p.teleport(s.at,{rotation:{x:0,y:180}});
  const frame=arrivalFrame(0,s.at);p.camera.setCamera('minecraft:free',{location:frame.location,facingLocation:frame.facingLocation});
  emit(s,'core');emit(s,'trail');emit(s,'body');
  p.playSound('beacon.activate',{volume:.35,pitch:1.5});
  audit('started',p,{reason});return true;
 }catch(e){audit('start_error',p,{error:String(e)});finish(p,'start_error');return false;}
}
export function queueArrival(p,reason){
 if(!p.isValid||jobs.has(p.id)||requests.has(p.id))return false;
 requests.set(p.id,{p,reason,created:system.currentTick,readyAt:system.currentTick+ARRIVAL.settle});return true;
}
export function observeArrivalSpawn(p,initialSpawn){
 // Run AFTER the native spawn tick. Death overlay owns its six-second flow.
 system.runTimeout(()=>{
  if(!p.isValid)return;
  try{recoverArrival(p);if(p.hasTag(RESPAWN_TAG))queueArrival(p,'respawn');}catch(e){audit('spawn_error',p,{error:String(e)});}
 },ARRIVAL.settle);
}
function eligible(p,reason){
 if(reason!=='respawn')return distance(p.location,cfg.spawn)<=4&&p.dimension.id==='minecraft:overworld';
 return lobbyRespawn(p.location,p.dimension.id,world.getDefaultSpawnLocation(),p.getSpawnPoint(),cfg);
}
system.runInterval(()=>{
 for(const [id,q]of requests){
  const p=q.p;
  try{
   if(!p.isValid){requests.delete(id);continue;}
   if(system.currentTick-q.created>ARRIVAL.maxWait){requests.delete(id);p.removeTag(RESPAWN_TAG);audit('skipped',p,{reason:'timeout'});continue;}
   if(!alive(p)||p.hasTag(HEART_TAG)||p.getGameMode()===GameMode.Spectator){q.readyAt=system.currentTick+ARRIVAL.settle;continue;}
   if(system.currentTick<q.readyAt)continue;
   if(!eligible(p,q.reason)){requests.delete(id);p.removeTag(RESPAWN_TAG);continue;}
   if(startArrival(p,q.reason)){requests.delete(id);p.removeTag(RESPAWN_TAG);}
  }catch(e){requests.delete(id);audit('request_error',p,{error:String(e)});}
 }
 for(const s of [...jobs.values()]){
  const p=s.p,t=system.currentTick-s.start;
  try{
   if(!p.isValid){jobs.delete(p.id);continue;}
   if(!alive(p)||p.hasTag(HEART_TAG)||p.dimension.id!=='minecraft:overworld'||distance(p.location,s.at)>2){finish(p,'interrupted');continue;}
   if(t>=ARRIVAL.ticks){finish(p,'complete');continue;}
   if(t>=ARRIVAL.impact&&!s.impact){s.impact=true;emit(s,'ring');emit(s,'converge');}
   if(t>=ARRIVAL.reveal&&!s.revealed){s.revealed=true;emit(s,'embers');p.playSound('random.orb',{volume:.3,pitch:.7});}
   if(t>=ARRIVAL.returnView&&!s.returning){s.returning=true;p.camera.fade({fadeColor:{red:1,green:.96,blue:.84},fadeTime:{fadeInTime:.12,holdTime:.04,fadeOutTime:.3}});}
   if(t>=ARRIVAL.returnView+4&&!s.cleared){p.camera.clear();s.cleared=true;}
   else if(t%4===0&&t<ARRIVAL.returnView){const f=arrivalFrame(t,s.at);p.camera.setCamera('minecraft:free',{location:f.location,facingLocation:f.facingLocation,easeOptions:{easeTime:.2,easeType:EasingType.Linear}});}
  }catch(e){audit('sequence_error',p,{error:String(e)});finish(p,'error');}
 }
},2);
world.afterEvents.entityDie.subscribe(({deadEntity:p})=>{
 if(p.typeId!=='minecraft:player')return;
 try{p.addTag(RESPAWN_TAG);requests.delete(p.id);finish(p,'death');}catch{}
});
world.afterEvents.playerLeave.subscribe(({playerId})=>{jobs.delete(playerId);requests.delete(playerId);});
for(const event of [world.beforeEvents.playerInteractWithBlock,world.beforeEvents.playerInteractWithEntity,world.beforeEvents.playerBreakBlock])event.subscribe(e=>{if(jobs.has(e.player.id))e.cancel=true;});
world.beforeEvents.itemUse.subscribe(e=>{if(jobs.has(e.source.id))e.cancel=true;});
