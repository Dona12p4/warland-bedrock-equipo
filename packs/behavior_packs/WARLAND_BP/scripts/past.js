import {world,system,Player,GameMode,HudVisibility,InputPermissionCategory,CommandPermissionLevel,CustomCommandStatus} from '@minecraft/server';
import {ActionFormData} from '@minecraft/server-ui';
import {PAST,SHOTS,pastAdmin,inPast,normalPast,offsetPoint,inPastBounds,shotAt,cameraAt,validReturn} from './past-policy.js';

const wait=t=>new Promise(r=>system.runTimeout(r,t)),v=a=>({x:a[0],y:a[1],z:a[2]});
const permissions=[InputPermissionCategory.Camera,InputPermissionCategory.Movement];
const busy=new Set(),lastSafe=new Map(),regions=new Set(),regionLoads=new Map();let film=null,actor=null,loaded=false;
const read=(p,k)=>{try{return JSON.parse(p.getDynamicProperty(k)??'null')}catch{return null}};
const heart=p=>world.getDynamicProperty('warland:heart_overlay_v1')===true||!!p.getDynamicProperty('warland:heart_death_v1');
const alive=p=>p.isValid&&(p.getComponent('minecraft:health')?.currentValue??0)>0;
const audit=(action,p,detail={})=>console.warn('[WARLAND_PAST] '+JSON.stringify({action,name:p?.name,tick:system.currentTick,...detail}));
const dimension=()=>world.getDimension(PAST.dimension);
function notice(p,text){try{p.sendMessage('§7'+text)}catch{}}
function fog(p,normal){
 for(const id of ['wl_past_ruins','wl_past_intact'])try{p.runCommand('fog @s remove '+id)}catch{}
 if(inPast(p))p.runCommand(`fog @s push warland:past_${normal?'intact':'ruins'} wl_past_${normal?'intact':'ruins'}`);
}
async function region(normal){
 const name='wl_past_'+(normal?'normal':'ruins'),d=dimension(),dx=normal?PAST.normalOffset:0;
 if(regionLoads.has(name))return regionLoads.get(name);
 const load=(async()=>{if(!regions.has(name)){
  try{d.runCommand('tickingarea remove '+name)}catch{}
  // Removal settles before recreating the same area name after reconnect.
  await wait(2);
  const result=d.runCommand(`tickingarea add ${208+dx} 40 -848 ${415+dx} 160 -737 ${name} true`);
  if(result.successCount!==1)throw Error('No se pudo reservar la carga del recuerdo.');
  regions.add(name);
 }
 for(let i=0;i<100;i++){
  try{if(d.getBlock({x:250+dx,y:61,z:-783})&&!d.getBlock({x:250+dx,y:61,z:-783}).isAir)return d}catch{}
  await wait(2);
 }
 throw Error('El terreno de El Pasado no está instalado o no termina de cargar.');})();
 regionLoads.set(name,load);
 try{return await load}finally{regionLoads.delete(name)}
}
function releaseRegions(){
 if(busy.size||regionLoads.size)return;
 const visitors=world.getAllPlayers().filter(inPast);
 for(const name of [...regions]){
  const normal=name==='wl_past_normal';
  if(visitors.some(p=>normalPast(p)===normal)||(!normal&&film))continue;
  try{dimension().runCommand('tickingarea remove '+name)}catch{}
  regions.delete(name);
 }
}
function canStart(p){return alive(p)&&!heart(p)&&!p.hasTag('warland_lobby_arrival')&&permissions.every(c=>p.inputPermissions.isPermissionCategoryEnabled(c));}
function saveOrigin(p){
 if(inPast(p))return;
 const s={dimension:p.dimension.id,location:{...p.location},rotation:p.getRotation(),mode:p.getGameMode()};
 if(!validReturn(s))throw Error('No se pudo guardar el punto de regreso.');
 p.setDynamicProperty(PAST.returnKey,JSON.stringify(s));
}
export async function enterPast(p,normal=false){
 if(busy.has(p.id)||!canStart(p))return false;
 if(normal&&!pastAdmin(p.name)){notice(p,'Ese recuerdo todavía no está disponible.');return false;}
 busy.add(p.id);
 try{
  const d=await region(normal);if(!alive(p)||heart(p))return false;
  saveOrigin(p);p.camera.fade({fadeColor:{red:0,green:0,blue:0},fadeTime:{fadeInTime:.15,holdTime:.4,fadeOutTime:.6}});
  await wait(4);if(!alive(p)||heart(p))return false;
  p.teleport(offsetPoint(PAST.spawn,normal),{dimension:d,rotation:{x:0,y:-90}});p.setGameMode(GameMode.Adventure);
  lastSafe.set(p.id,{...p.location});fog(p,normal);
  p.onScreenDisplay.setTitle(normal?'El Pasado · Antes de la ceniza':'El Pasado',{subtitle:normal?'Un recuerdo que aún permanece.':'WARLAND I · Lo que quedó.',fadeInDuration:10,stayDuration:40,fadeOutDuration:20});
  notice(p,'Recorre el recuerdo. /warland:pasado_salir para volver.');audit('entered',p,{normal});return true;
 }catch(e){notice(p,String(e.message??e));audit('entry_error',p,{error:String(e)});return false}
 finally{busy.delete(p.id);releaseRegions()}
}
function restoreFilm(p){
 const saved=read(p,PAST.filmKey);if(!saved){p.removeTag(PAST.filmTag);return}
 for(const [category,enabled] of saved.permissions??[])if(permissions.includes(category)&&typeof enabled==='boolean')p.inputPermissions.setPermissionCategory(category,enabled);
 p.camera.clear();try{p.camera.resetFov()}catch{}
 p.onScreenDisplay.setHudVisibility(HudVisibility.Reset);
 if(saved.hidden?.length)p.onScreenDisplay.setHudVisibility(HudVisibility.Hide,saved.hidden);
 try{p.runCommand('stopsound @s '+PAST.sound)}catch{}
 if(!heart(p)){
  if(inPast(p)){p.setGameMode(GameMode.Adventure);p.teleport(saved.location??PAST.spawn,{rotation:saved.rotation??{x:0,y:-90}});fog(p,normalPast(p))}
  p.onScreenDisplay.setTitle(' ',{fadeInDuration:0,stayDuration:1,fadeOutDuration:0});
 }
 p.removeTag(PAST.filmTag);
 if(!heart(p))p.setDynamicProperty(PAST.filmKey,undefined);
}
export function stopPastFilm(p,reason='cancelled'){
 if(film?.p.id===p.id){film=null;if(actor?.isValid)actor.remove();actor=null;}
 restoreFilm(p);audit('cinema_stopped',p,{reason});releaseRegions();
}
export async function exitPast(p){
 if(!alive(p)||heart(p)){notice(p,'Espera a que termine la reaparición.');return false}
 if(busy.has(p.id))return false;
 if(p.getDynamicProperty(PAST.filmKey))stopPastFilm(p);
 const s=read(p,PAST.returnKey);
 if(!validReturn(s)){notice(p,'No hay un punto de regreso guardado.');return false}
 busy.add(p.id);
 try{
  p.camera.fade({fadeColor:{red:0,green:0,blue:0},fadeTime:{fadeInTime:.15,holdTime:.3,fadeOutTime:.5}});await wait(4);
  if(!alive(p)||heart(p))return false;
  p.teleport(s.location,{dimension:world.getDimension(s.dimension),rotation:s.rotation});
  p.setGameMode(s.mode);p.setDynamicProperty(PAST.returnKey,undefined);lastSafe.delete(p.id);fog(p,false);audit('returned',p,{dimension:s.dimension});return true;
 }catch(e){notice(p,'No se pudo regresar todavía. Repite /warland:pasado_salir.');audit('return_error',p,{error:String(e)});return false}
 finally{busy.delete(p.id);releaseRegions()}
}
export async function startPastFilm(p){
 if(film){notice(p,'La escena está en curso. Espera a que termine.');return false}
 if(!pastAdmin(p.name)){notice(p,'La cinemática está en revisión por los administradores.');return false}
 if(!canStart(p)||busy.has(p.id))return false;
 if(!inPast(p)||normalPast(p)){if(!await enterPast(p,false))return false}
 const d=await region(false);if(!canStart(p)||film)return false;
 const saved={location:{...p.location},rotation:p.getRotation(),hidden:p.onScreenDisplay.getHiddenHudElements(),permissions:permissions.map(c=>[c,p.inputPermissions.isPermissionCategoryEnabled(c)])};
 p.setDynamicProperty(PAST.filmKey,JSON.stringify(saved));p.addTag(PAST.filmTag);
 const s={p,start:0,playing:false,index:-1};film=s;
 try{
  permissions.forEach(c=>p.inputPermissions.setPermissionCategory(c,false));p.setGameMode(GameMode.Spectator);p.onScreenDisplay.setHudVisibility(HudVisibility.Hide);
  p.onScreenDisplay.setTitle('WL_PAST|FILM',{fadeInDuration:0,stayDuration:1600,fadeOutDuration:0});
  p.camera.fade({fadeColor:{red:0,green:0,blue:0},fadeTime:{fadeInTime:.15,holdTime:9,fadeOutTime:.6}});
  // The player remains behind the rail while free camera sees real terrain.
  p.teleport({x:292,y:42,z:-782},{dimension:d});const first=cameraAt(0);
  p.camera.setCamera('minecraft:free',{location:v(first.position),facingLocation:v(first.target)});p.camera.setFov({fov:first.fov});
  // Warm the entire short route before the soundtrack/camera clock starts.
  await wait(180);if(film!==s||!alive(p)||heart(p)){if(film===s)stopPastFilm(p,'interrupted');return false}
  for(const shot of SHOTS)for(const a of [shot.a,shot.b,shot.f])if(!d.getBlock(v(a.map(Math.floor))))throw Error('Falta cargar una toma.');
  for(const e of d.getEntities({type:PAST.actor}))e.remove();
  actor=d.spawnEntity(PAST.actor,PAST.actorAt);actor.setRotation({x:0,y:0});actor.setProperty('warland:performance',false);
  p.playSound(PAST.sound,{volume:1,pitch:1});s.start=Date.now();s.playing=true;
  audit('cinema_started',p,{duration:PAST.duration,native:true});return true;
 }catch(e){audit('cinema_error',p,{error:String(e)});stopPastFilm(p,'error');return false}
}
export const pastDebug=()=>({loaded,regions:[...regions],film:film&&{player:film.p.name,playing:film.playing,elapsed:film.playing?(Date.now()-film.start)/1000:0},visitors:world.getAllPlayers().filter(inPast).map(p=>({name:p.name,normal:normalPast(p),position:p.location,mode:p.getGameMode()}))});

// Interactions are blocked by dimension, including admins in Creative. No
// global rules change, and no items are removed from the player's inventory.
for(const name of ['playerBreakBlock','playerPlaceBlock','playerInteractWithBlock','playerInteractWithEntity'])world.beforeEvents[name]?.subscribe(e=>{if(inPast(e.player))e.cancel=true});
world.beforeEvents.itemUse.subscribe(e=>{if(inPast(e.source))e.cancel=true});
world.beforeEvents.explosion.subscribe(e=>{if(e.dimension.id===PAST.dimension)e.cancel=true});
world.beforeEvents.entityHurt.subscribe(e=>{if(inPast(e.hurtEntity)||inPast(e.damageSource.damagingEntity))e.cancel=true});
// The historical containers have no loot. Keep picking up a player's own
// dropped items possible; visiting this museum must not trap their inventory.
world.afterEvents.entitySpawn.subscribe(({entity:e})=>{
 if(inPast(e)&&!['minecraft:player','minecraft:item','minecraft:xp_orb',PAST.actor].includes(e.typeId))system.run(()=>{if(e.isValid&&inPast(e))e.remove()});
});
world.afterEvents.playerSpawn.subscribe(({player:p})=>system.runTimeout(()=>{
 if(!p.isValid)return;
 if(p.getDynamicProperty(PAST.filmKey)&&film?.p.id!==p.id)restoreFilm(p);
 if(inPast(p)){region(normalPast(p)).catch(e=>audit('load_error',p,{error:String(e)}));fog(p,normalPast(p));if(!heart(p))p.setGameMode(GameMode.Adventure)}
},10));
world.afterEvents.playerDimensionChange.subscribe(({player:p})=>system.runTimeout(()=>{
 if(!p.isValid)return;
 if(!inPast(p)){if(film?.p.id===p.id)stopPastFilm(p,'dimension');fog(p,false);releaseRegions()}
},4));
world.afterEvents.playerLeave.subscribe(({playerId})=>{lastSafe.delete(playerId);busy.delete(playerId);if(film?.p.id===playerId){film=null;if(actor?.isValid)actor.remove();actor=null}releaseRegions()});
world.afterEvents.worldLoad.subscribe(()=>{loaded=true;try{dimension();audit('dimension_loaded',null)}catch(e){audit('dimension_error',null,{error:String(e)})}});
system.runInterval(()=>{
 if(!loaded)return;
 if(film){const s=film,p=s.p;
  if(!alive(p)||!inPast(p)||heart(p)){if(p.isValid)stopPastFilm(p,'interrupted');else film=null;return}
  if(s.playing){const t=(Date.now()-s.start)/1000;if(t>=PAST.duration){stopPastFilm(p,'finished');return}
   const c=cameraAt(t),index=shotAt(t).index;
   if(index!==s.index){s.index=index;p.camera.setFov({fov:c.fov});if(index===3&&actor?.isValid)actor.setProperty('warland:performance',true);audit('cut',p,{index,time:t})}
   p.camera.setCamera('minecraft:free',{location:v(c.position),facingLocation:v(c.target)});
   if(t>=59.1&&actor?.isValid){const at=actor.location;actor.remove();actor=null;try{dimension().spawnParticle('warland:past_power',{...at,y:at.y+5})}catch{}}
  }
 }
},1);
system.runInterval(()=>{
 if(!loaded)return;
 const cells=new Set();for(const p of world.getAllPlayers())try{
  if(!inPast(p)){
   if(!heart(p)&&alive(p)&&p.getDynamicProperty(PAST.filmKey)&&film?.p.id!==p.id)restoreFilm(p);
   const s=read(p,PAST.returnKey);
   if(s&&!busy.has(p.id)&&!heart(p)&&alive(p)){if(validReturn(s))p.setGameMode(s.mode);p.setDynamicProperty(PAST.returnKey,undefined)}
   continue;
  }
  if(!p.hasTag(PAST.filmTag)&&!heart(p)){
   if(p.getDynamicProperty(PAST.filmKey))restoreFilm(p);
   if(p.getGameMode()!==GameMode.Adventure)p.setGameMode(GameMode.Adventure);
   if(!inPastBounds(p.location))p.teleport(lastSafe.get(p.id)??offsetPoint(PAST.spawn,normalPast(p)));
   else {const b=p.dimension.getBlock({x:Math.floor(p.location.x),y:Math.floor(p.location.y)-1,z:Math.floor(p.location.z)});if(b&&!b.isAir&&!b.isLiquid)lastSafe.set(p.id,{...p.location})}
  }
  if(normalPast(p))continue;
  let at={...p.location,y:p.location.y+2};if(film?.p.id===p.id&&film.playing)at=v(cameraAt((Date.now()-film.start)/1000).position);
  const key=Math.floor(at.x/12)+':'+Math.floor(at.z/12);if(cells.has(key)||cells.size>=4)continue;cells.add(key);
  p.dimension.spawnParticle('warland:past_ash',at);
  p.dimension.spawnParticle('warland:past_ash_near',at);
  if(system.currentTick%60<20)p.dimension.spawnParticle('warland:past_drift',{...at,y:Math.max(62.4,at.y-1.5)});
 }catch(e){audit('visitor_error',p,{error:String(e)})}
},20);
async function menu(p){
 const f=new ActionFormData().title('El Pasado').body('Un lugar que permanece en la memoria.').button('Recorrer las cenizas');
 const actions=[()=>enterPast(p,false)];
 if(pastAdmin(p.name)){f.button('Ver cinemática');actions.push(()=>startPastFilm(p));f.button('Antes de la ceniza · vista previa');actions.push(()=>enterPast(p,true))}
 if(read(p,PAST.returnKey)){f.button('Volver');actions.push(()=>exitPast(p))}
 const r=await f.show(p);if(!r.canceled)await actions[r.selection]?.();
}
system.beforeEvents.startup.subscribe(({customCommandRegistry:r})=>{
 for(const [name,description,action] of [['pasado','Entrar al recuerdo de WARLAND I',p=>menu(p)],['pasado_cenizas','Recorrer las ruinas de WARLAND I',p=>enterPast(p,false)],['pasado_intacto','Vista previa administrativa de WARLAND I',p=>enterPast(p,true)],['pasado_salir','Volver desde El Pasado',p=>exitPast(p)],['cinematica','Ver la cinemática nativa de WARLAND I',p=>startPastFilm(p)],['cinematica_salir','Salir de la cinemática',p=>stopPastFilm(p)]]){
  r.registerCommand({name:'warland:'+name,description,permissionLevel:CommandPermissionLevel.Any,cheatsRequired:false},origin=>{
   const p=origin.sourceEntity;if(!(p instanceof Player))return {status:CustomCommandStatus.Failure,message:'Requiere un jugador.'};
   system.run(()=>Promise.resolve(action(p)).catch(e=>audit('command_error',p,{error:String(e)})));return {status:CustomCommandStatus.Success};
  });
 }
});
