import {world,system,GameMode,HudVisibility,InputPermissionCategory,EasingType,MolangVariableMap} from '@minecraft/server';
import {PAST,inPast} from './past-policy.js';
import {PAST_ARRIVAL,pastArrivalFrame,pastArrivalLight} from './past-arrival-policy.js';
const jobs=new Map(),permissions=[InputPermissionCategory.Camera,InputPermissionCategory.Movement];
const alive=p=>p.isValid&&(p.getComponent('minecraft:health')?.currentValue??0)>0;
const deathOwns=p=>world.getDynamicProperty('warland:heart_overlay_v1')===true||!!p.getDynamicProperty('warland:heart_death_v1')||p.hasTag('warland_heart_spectator');
const audit=(action,p,extra={})=>console.warn('[PAST_ARRIVAL] '+JSON.stringify({action,name:p?.name,...extra}));
export const pastArrivalActive=p=>jobs.has(p.id)||p.hasTag(PAST_ARRIVAL.tag);
export const pastArrivalDebug=()=>[...jobs.values()].map(s=>({id:s.p.id,elapsed:system.currentTick-s.start,emissions:s.emissions}));
function saved(p){try{return JSON.parse(p.getDynamicProperty(PAST_ARRIVAL.key)??'null')}catch{return null}}
export function recoverPastArrival(p,land=true){
 const s=saved(p);if(!s){p.removeTag(PAST_ARRIVAL.tag);return true}
 if(!alive(p)||deathOwns(p))return false;
 // A later film or the death controller must retain their own camera.
 if(!p.hasTag(PAST.filmTag)){
  p.camera.clear();try{p.camera.resetFov()}catch{}
  for(const [c,value]of s.permissions??[])p.inputPermissions.setPermissionCategory(c,value);
  p.onScreenDisplay.setHudVisibility(HudVisibility.Reset);
  if(s.hidden?.length)p.onScreenDisplay.setHudVisibility(HudVisibility.Hide,s.hidden);
  if(inPast(p)){p.setGameMode(s.mode);if(land)p.teleport(PAST.spawn,{rotation:{x:0,y:-90}})}
 }
 try{p.runCommand('fog @s remove wl_past_arrival')}catch{}
 p.removeTag(PAST_ARRIVAL.tag);p.setDynamicProperty(PAST_ARRIVAL.key,undefined);return true;
}
function releaseArea(){if(jobs.size)return;try{world.getDimension(PAST.dimension).runCommand('tickingarea remove wl_past_arrival_north')}catch{}}
export function stopPastArrival(p,reason='cancelled',land=true){
 const s=jobs.get(p.id);jobs.delete(p.id);recoverPastArrival(p,land);releaseArea();
 if(s)audit('finished',p,{reason,emissions:s.emissions});
}
export function startPastArrival(p){
 if(!inPast(p)||!alive(p)||deathOwns(p)||p.hasTag(PAST.filmTag)||pastArrivalActive(p)||jobs.size>=PAST_ARRIVAL.maxConcurrent)return false;
 const enabled=permissions.map(c=>[c,p.inputPermissions.isPermissionCategoryEnabled(c)]);
 if(enabled.some(([,v])=>!v))return false;
 const state={mode:p.getGameMode(),permissions:enabled,hidden:p.onScreenDisplay.getHiddenHudElements()};
 p.setDynamicProperty(PAST_ARRIVAL.key,JSON.stringify(state));p.addTag(PAST_ARRIVAL.tag);
 const s={p,start:system.currentTick+40,emissions:0};jobs.set(p.id,s);
 try{
  // The existing central region plus 32 northern chunks cover the arrival.
  if(jobs.size===1)p.dimension.runCommand('tickingarea add 224 40 -736 351 220 -673 wl_past_arrival_north true');
  for(const c of permissions)p.inputPermissions.setPermissionCategory(c,false);
  p.setGameMode(GameMode.Spectator);p.onScreenDisplay.setHudVisibility(HudVisibility.Hide);
  p.runCommand('fog @s push warland:past_cinema wl_past_arrival');
  p.camera.fade({fadeColor:{red:0,green:0,blue:0},fadeTime:{fadeInTime:.1,holdTime:2,fadeOutTime:.35}});
  const f=pastArrivalFrame(0);p.teleport(f.anchor);
  p.camera.setCamera('warland:past_film',{location:f.camera,facingLocation:f.target});
  p.camera.setFov({fov:70});audit('started',p);return true;
 }catch(e){audit('error',p,{error:String(e)});stopPastArrival(p,'error');return false}
}
function emit(s,t){
 const f=pastArrivalLight(t),next=pastArrivalLight(t+2),vars=new MolangVariableMap();
 for(const k of ['x','y','z'])vars.setFloat('variable.past_light_v'+k,(next[k]-f[k])*10);
 // Never broadcast: another viewer's Colossus film cannot receive this light.
 s.p.spawnParticle('warland:past_arrival_core',f,vars);
 s.p.spawnParticle('warland:past_arrival_trail',f,vars);s.emissions+=2;
}
system.runInterval(()=>{
 for(const s of [...jobs.values()]){
  const p=s.p,t=system.currentTick-s.start;
  try{
   if(!p.isValid){jobs.delete(p.id);releaseArea();continue}
   if(!alive(p)||deathOwns(p)||!inPast(p)||p.hasTag(PAST.filmTag)){stopPastArrival(p,'interrupted',false);continue}
   if(t<0)continue;
   if(t>=PAST_ARRIVAL.ticks){stopPastArrival(p,'complete');continue}
   const f=pastArrivalFrame(t);p.teleport(f.anchor);
   p.camera.setCamera('warland:past_film',{location:f.camera,facingLocation:f.target,easeOptions:{easeTime:.1,easeType:EasingType.Linear}});
   emit(s,t);
  }catch(e){audit('error',p,{error:String(e)});stopPastArrival(p,'error')}
 }
},2);
system.runInterval(()=>{
 for(const p of world.getAllPlayers())if(!jobs.has(p.id)&&p.getDynamicProperty(PAST_ARRIVAL.key))try{recoverPastArrival(p)}catch(e){audit('recovery_error',p,{error:String(e)})}
},20);
world.afterEvents.playerLeave.subscribe(({playerId})=>{jobs.delete(playerId);releaseArea()});
// An interrupted server session must not keep the temporary northern chunks.
world.afterEvents.worldLoad.subscribe(releaseArea);
