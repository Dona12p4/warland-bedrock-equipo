import {world,system,Player,GameMode,HudVisibility,InputPermissionCategory,EasingType,CommandPermissionLevel,CustomCommandStatus} from '@minecraft/server';
import {ActionFormData} from '@minecraft/server-ui';
import {PAST,SHOTS,ACTOR_SHOT,ACTOR_START,ACTOR_VANISH,pastAdmin,inPast,normalPast,offsetPoint,inPastBounds,shotAt,cameraAt,cameraAnchor,validReturn} from './past-policy.js';
import {createPastMusic,PAST_MUSIC} from './past-music.js';
import {escapeProbe,safeLanding} from './past-travel.js';
import {createPastLighting} from './past-lighting.js';
import {pastArrivalActive,startPastArrival,stopPastArrival} from './past-arrival.js';
import {createPastWind,createPastGuide,stormActive} from './past-environment.js';

const wait=t=>new Promise(r=>system.runTimeout(r,t)),v=a=>({x:a[0],y:a[1],z:a[2]});
const permissions=[InputPermissionCategory.Camera,InputPermissionCategory.Movement];
const busy=new Set(),lastSafe=new Map(),regions=new Set(),regionLoads=new Map();let film=null,actor=null,loaded=false;
const music=createPastMusic(),wind=createPastWind(),guide=createPastGuide(),lighting=createPastLighting(),travel=new Map();let travelCursor=0;
let lobbyTransfer=null;
export function registerPastLobbyTransfer(handler){lobbyTransfer=handler}
const read=(p,k)=>{try{return JSON.parse(p.getDynamicProperty(k)??'null')}catch{return null}};
const heart=p=>world.getDynamicProperty('warland:heart_overlay_v1')===true||!!p.getDynamicProperty('warland:heart_death_v1');
const alive=p=>p.isValid&&(p.getComponent('minecraft:health')?.currentValue??0)>0;
const audit=(action,p,detail={})=>console.warn('[WARLAND_PAST] '+JSON.stringify({action,name:p?.name,tick:system.currentTick,...detail}));
const dimension=()=>world.getDimension(PAST.dimension);
function notice(p,text){try{p.sendMessage('§7'+text)}catch{}}
function fog(p,normal,cinematic=false){
 for(const id of ['wl_past_ruins','wl_past_intact','wl_past_cinema'])try{p.runCommand('fog @s remove '+id)}catch{}
 const name=normal?'intact':cinematic?'cinema':'ruins';
 if(inPast(p))p.runCommand(`fog @s push warland:past_${name} wl_past_${name}`);
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
function canStart(p){return alive(p)&&!heart(p)&&!pastArrivalActive(p)&&!p.hasTag('warland_lobby_arrival')&&!p.hasTag('warland_lobby_cinematic')&&permissions.every(c=>p.inputPermissions.isPermissionCategoryEnabled(c));}
function saveOrigin(p){
 if(inPast(p))return;
 const s={dimension:p.dimension.id,location:{...p.location},rotation:p.getRotation(),mode:p.getGameMode()};
 if(!validReturn(s))throw Error('No se pudo guardar el punto de regreso.');
 p.setDynamicProperty(PAST.returnKey,JSON.stringify(s));
}
export async function enterPast(p,normal=false,skipArrival=false){
 if(busy.has(p.id)||!canStart(p))return false;
 if(normal&&!pastAdmin(p.name)){notice(p,'Ese recuerdo todavía no está disponible.');return false;}
 busy.add(p.id);
 const showArrival=!normal&&!skipArrival&&!inPast(p);
 try{
  const d=await region(normal);if(!alive(p)||heart(p))return false;
  saveOrigin(p);p.camera.fade({fadeColor:{red:0,green:0,blue:0},fadeTime:{fadeInTime:.15,holdTime:.4,fadeOutTime:.6}});
  await wait(4);if(!alive(p)||heart(p))return false;
  p.teleport(offsetPoint(PAST.spawn,normal),{dimension:d,rotation:{x:0,y:-90}});p.setGameMode(GameMode.Adventure);
  lastSafe.set(p.id,{...p.location});travel.delete(p.id);fog(p,normal);music.update(p);
  p.onScreenDisplay.setTitle(normal?'El Pasado · Antes de la ceniza':'El Pasado',{subtitle:normal?'Un recuerdo que aún permanece.':'WARLAND I · Lo que quedó.',fadeInDuration:10,stayDuration:40,fadeOutDuration:20});
  wind.update(p,stormActive(p));guide.forget(p.id);
  if(showArrival)startPastArrival(p);
  notice(p,'Cruza la luz de la entrada para llegar al lobby.');audit('entered',p,{normal});return true;
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
  if(inPast(p)){p.setGameMode(GameMode.Adventure);p.teleport(saved.location??PAST.spawn,{rotation:saved.rotation??{x:0,y:-90}});fog(p,normalPast(p));music.update(p)}
  p.onScreenDisplay.setTitle(' ',{fadeInDuration:0,stayDuration:1,fadeOutDuration:0});
 }
 p.removeTag(PAST.filmTag);
 if(!heart(p))p.setDynamicProperty(PAST.filmKey,undefined);
}
export function stopPastFilm(p,reason='cancelled'){
 if(film?.p.id===p.id){film=null;lighting.clear();if(actor?.isValid)actor.remove();actor=null;}
 restoreFilm(p);wind.update(p,stormActive(p));audit('cinema_stopped',p,{reason});releaseRegions();
}
export async function exitPast(p,toLobby=false){
 if(pastArrivalActive(p))stopPastArrival(p,'exit');
 if(!alive(p)||heart(p)){notice(p,'Espera a que termine la reaparición.');return false}
 if(busy.has(p.id))return false;
 if(p.getDynamicProperty(PAST.filmKey))stopPastFilm(p);
 const s=read(p,PAST.returnKey);
 if(!validReturn(s)){notice(p,'No hay un punto de regreso guardado.');return false}
 if(toLobby&&(!inPast(p)||typeof lobbyTransfer!=='function')){notice(p,'La llegada al lobby todavía no está disponible.');return false}
 busy.add(p.id);
 try{
  if(toLobby){
   if(!await lobbyTransfer(p,s.mode,()=>alive(p)&&!heart(p)&&inPast(p))){notice(p,'La llegada está ocupada o aún está cargando. Vuelve a cruzar la luz.');return false}
  }else{
   p.camera.fade({fadeColor:{red:0,green:0,blue:0},fadeTime:{fadeInTime:.15,holdTime:.3,fadeOutTime:.5}});await wait(4);
   if(!alive(p)||heart(p))return false;
   p.teleport(s.location,{dimension:world.getDimension(s.dimension),rotation:s.rotation});p.setGameMode(s.mode);
  }
  p.setDynamicProperty(PAST.returnKey,undefined);lastSafe.delete(p.id);travel.delete(p.id);guide.forget(p.id);wind.stop(p);music.stop(p);fog(p,false);audit('returned',p,{dimension:p.dimension.id,route:toLobby?'lobby':'origin'});return true;
 }catch(e){notice(p,'No se pudo regresar todavía. Repite /warland:pasado_salir.');audit('return_error',p,{error:String(e)});return false}
 finally{busy.delete(p.id);releaseRegions()}
}
export async function startPastFilm(p){
 if(film){notice(p,'La escena está en curso. Espera a que termine.');return false}
 if(!pastAdmin(p.name)){notice(p,'La cinemática está en revisión por los administradores.');return false}
 if(pastArrivalActive(p))stopPastArrival(p,'film');
 if(!canStart(p)||busy.has(p.id))return false;
 if(!inPast(p)||normalPast(p)){if(!await enterPast(p,false,true))return false}
 const d=await region(false);if(!canStart(p)||film)return false;
 const saved={location:{...p.location},rotation:p.getRotation(),hidden:p.onScreenDisplay.getHiddenHudElements(),permissions:permissions.map(c=>[c,p.inputPermissions.isPermissionCategoryEnabled(c)])};
 p.setDynamicProperty(PAST.filmKey,JSON.stringify(saved));p.addTag(PAST.filmTag);
 const s={p,start:0,playing:false,index:-1,memory:true,fading:false};film=s;
 wind.stop(p);guide.forget(p.id);
 try{
  permissions.forEach(c=>p.inputPermissions.setPermissionCategory(c,false));p.setGameMode(GameMode.Spectator);p.onScreenDisplay.setHudVisibility(HudVisibility.Hide);
  p.onScreenDisplay.setTitle('WL_PAST|FILM',{fadeInDuration:0,stayDuration:1600,fadeOutDuration:0});
  p.camera.fade({fadeColor:{red:0,green:0,blue:0},fadeTime:{fadeInTime:.15,holdTime:9,fadeOutTime:.6}});
  // The player remains behind the rail while free camera sees real terrain.
  const first=cameraAt(0);p.teleport(cameraAnchor(first),{dimension:d});fog(p,true,true);
  p.camera.setCamera('warland:past_film',{location:v(first.position),facingLocation:v(first.target)});p.camera.setFov({fov:first.fov});
  // Both acts share X/Z chunks. Warm the ruined set first; the intact opening
  // gets six full seconds at its real rail before the fade lifts.
  p.teleport({x:280,y:70,z:-783},{dimension:d});await wait(60);
  if(film!==s||!alive(p)||heart(p)){if(film===s)stopPastFilm(p,'interrupted');return false}
  p.teleport(cameraAnchor(first),{dimension:d});await wait(120);
  if(film!==s||!alive(p)||heart(p)){if(film===s)stopPastFilm(p,'interrupted');return false}
  for(const shot of SHOTS)for(const a of [shot.a,shot.b,shot.f])if(!d.getBlock(v(a.map((n,i)=>Math.floor(n+(shot.memory&&i===1?256:0))))))throw Error('Falta cargar una toma.');
  for(const e of d.getEntities({type:PAST.actor}))e.remove();
  actor=d.spawnEntity(PAST.actor,PAST.actorAt);actor.setRotation({x:0,y:180});actor.setProperty('warland:performance',false);
  p.onScreenDisplay.setActionBar(' ');
  music.update(p,true);p.playSound(PAST.sound,{volume:PAST_MUSIC.volume,pitch:1});s.start=Date.now();s.playing=true;
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
 if(!inPast(p)){if(film?.p.id===p.id)stopPastFilm(p,'dimension');wind.stop(p);guide.forget(p.id);music.stop(p);fog(p,false);releaseRegions()}
},4));
world.afterEvents.playerLeave.subscribe(({playerId})=>{lastSafe.delete(playerId);travel.delete(playerId);music.forget(playerId);wind.forget(playerId);guide.forget(playerId);busy.delete(playerId);if(film?.p.id===playerId){film=null;lighting.clear();if(actor?.isValid)actor.remove();actor=null}releaseRegions()});
world.afterEvents.worldLoad.subscribe(()=>{loaded=true;try{dimension();audit('dimension_loaded',null)}catch(e){audit('dimension_error',null,{error:String(e)})}});
system.runInterval(()=>{
 if(!loaded)return;
 if(film){const s=film,p=s.p;
  if(!alive(p)||!inPast(p)||heart(p)){if(p.isValid)stopPastFilm(p,'interrupted');else film=null;return}
  if(s.playing){const t=(Date.now()-s.start)/1000;if(t>=PAST.duration){stopPastFilm(p,'finished');return}
   const c=cameraAt(t),index=shotAt(t).index,cut=index!==s.index,flash=c.memory!==s.memory;
   lighting.update(dimension(),t-ACTOR_START);
   if(cut){s.index=index;p.camera.setFov({fov:c.fov});if(index===ACTOR_SHOT&&actor?.isValid)actor.setProperty('warland:performance',true);audit('cut',p,{index,time:t,intact:c.memory})}
   if(flash){s.memory=c.memory;fog(p,c.memory,true);wind.update(p,stormActive(p,s));audit('memory',p,{visible:c.memory,time:t})}
   // Camera listener is explicitly the player. Keep the spectator behind the
   // rail, close enough to stream terrain, the actor and the world particles.
   if(cut||flash||system.currentTick%4===0)p.teleport(cameraAnchor(c));
   const next=cameraAt(Math.min(t+.05,PAST.duration)),smooth=!cut&&!flash&&next.memory===c.memory;
   p.camera.setCamera('warland:past_film',{location:v(smooth?next.position:c.position),facingLocation:v(smooth?next.target:c.target),...(smooth?{easeOptions:{easeTime:.05,easeType:EasingType.Linear}}:{})});
   if(t>=ACTOR_VANISH&&actor?.isValid){const at=actor.location;actor.remove();actor=null;try{dimension().spawnParticle('warland:past_departure',{...at,y:at.y+4})}catch{}}
   if(t>=PAST.duration-1&&!s.fading){s.fading=true;p.camera.fade({fadeColor:{red:0,green:0,blue:0},fadeTime:{fadeInTime:1,holdTime:.1,fadeOutTime:.6}})}
  }
 }
},1);
system.runInterval(()=>{
 if(!loaded)return;
 const players=world.getAllPlayers(),probePlayer=players.length?players[travelCursor++%players.length]?.id:null;
 const cells=new Set();for(const p of players)try{
  music.update(p);
  const storm=stormActive(p,film?.p.id===p.id?film:null);wind.update(p,storm);
  if(guide.ready(p,system.currentTick,alive(p)&&!heart(p)&&!pastArrivalActive(p)&&!busy.has(p.id)&&validReturn(read(p,PAST.returnKey)))){
   exitPast(p,true).catch(e=>audit('guide_return_error',p,{error:String(e)}));continue;
  }
  if(!inPast(p)){
   if(!heart(p)&&alive(p)&&p.getDynamicProperty(PAST.filmKey)&&film?.p.id!==p.id)restoreFilm(p);
   const s=read(p,PAST.returnKey);
   if(s&&!busy.has(p.id)&&!heart(p)&&alive(p)){if(validReturn(s))p.setGameMode(s.mode);p.setDynamicProperty(PAST.returnKey,undefined)}
   continue;
  }
  if(!p.hasTag(PAST.filmTag)&&!pastArrivalActive(p)&&!heart(p)){
   if(p.getDynamicProperty(PAST.filmKey))restoreFilm(p);
   if(p.getGameMode()!==GameMode.Adventure)p.setGameMode(GameMode.Adventure);
   if(!inPastBounds(p.location))p.teleport(lastSafe.get(p.id)??offsetPoint(PAST.spawn,normalPast(p)));
   else if(p.id===probePlayer&&!busy.has(p.id)){
    const at=p.location,prev=travel.get(p.id),moved=!prev||Math.hypot(at.x-prev.x,at.z-prev.z)>1.5||Math.abs(at.y-prev.y)>.8;
    if(moved||!prev.checked){
     const check=escapeProbe(p.dimension,at,160);
     if(check.known&&!check.trapped)lastSafe.set(p.id,{...at});
     const recovered=check.trapped&&!moved&&prev.since+40<=system.currentTick&&unstuckPast(p,true);
     if(!recovered)travel.set(p.id,{...at,since:moved?system.currentTick:prev.since,checked:check.known&&!check.trapped});
    }
   }
  }
  const normal=normalPast(p);
  if(!pastArrivalActive(p))guide.emit(p);
  if(!storm)continue;
  let at={...p.location,y:p.location.y+2};if(film?.p.id===p.id&&film.playing){const c=cameraAt((Date.now()-film.start)/1000);if(c.memory)continue;at=v(c.position)}
  const key=Math.floor(at.x/12)+':'+Math.floor(at.z/12);if(cells.has(key)||cells.size>=4)continue;cells.add(key);
  // Emission cells stay fixed in world coordinates, never attached to the view.
  p.dimension.spawnParticle('warland:past_ash',{x:Math.floor(at.x/12)*12+6,y:Math.floor(at.y/6)*6+3,z:Math.floor(at.z/12)*12+6});
  p.dimension.spawnParticle('warland:past_ash_near',at);
  if(system.currentTick%60<20)p.dimension.spawnParticle('warland:past_drift',{...at,y:Math.max(62.4,at.y-1.5)});
 }catch(e){audit('visitor_error',p,{error:String(e)})}
},20);
export function unstuckPast(p,automatic=false){
 if(!inPast(p)||pastArrivalActive(p)||p.hasTag(PAST.filmTag)||busy.has(p.id)||heart(p)||!alive(p))return false;
 const previous=lastSafe.get(p.id),fallback=offsetPoint(PAST.spawn,normalPast(p)),target=automatic&&previous&&safeLanding(p.dimension,previous)?previous:fallback;
 // Manual recovery always reaches the entrance: a large sealed room may exceed
 // the bounded local search, so its last walking point is not a reliable exit.
 p.teleport(target);travel.delete(p.id);lastSafe.set(p.id,{...target});notice(p,automatic?'Has vuelto al último paso seguro.':'Has vuelto a la entrada del recuerdo.');audit('unstuck',p,{automatic,target});return true;
}
async function menu(p){
 const f=new ActionFormData().title('El Pasado').body('Un lugar que permanece en la memoria.').button('Recorrer las cenizas');
 const actions=[()=>enterPast(p,false)];
 if(pastAdmin(p.name)){f.button('Ver cinemática');actions.push(()=>startPastFilm(p));f.button('Antes de la ceniza · vista previa');actions.push(()=>enterPast(p,true))}
 if(read(p,PAST.returnKey)){f.button('Volver');actions.push(()=>exitPast(p))}
 if(inPast(p)){f.button('Volver a la entrada');actions.push(()=>unstuckPast(p))}
 const r=await f.show(p);if(!r.canceled)await actions[r.selection]?.();
}
system.beforeEvents.startup.subscribe(({customCommandRegistry:r})=>{
 for(const [name,description,action] of [['pasado','Entrar al recuerdo de WARLAND I',p=>menu(p)],['pasado_cenizas','Recorrer las ruinas de WARLAND I',p=>enterPast(p,false)],['pasado_intacto','Vista previa administrativa de WARLAND I',p=>enterPast(p,true)],['pasado_salir','Volver desde El Pasado',p=>exitPast(p)],['pasado_desatascar','Volver a la entrada de El Pasado',p=>unstuckPast(p)],['cinematica','Ver la cinemática nativa de WARLAND I',p=>startPastFilm(p)],['cinematica_salir','Salir de la cinemática',p=>stopPastFilm(p)]]){
  r.registerCommand({name:'warland:'+name,description,permissionLevel:CommandPermissionLevel.Any,cheatsRequired:false},origin=>{
   const p=origin.sourceEntity;if(!(p instanceof Player))return {status:CustomCommandStatus.Failure,message:'Requiere un jugador.'};
   system.run(()=>Promise.resolve(action(p)).catch(e=>audit('command_error',p,{error:String(e)})));return {status:CustomCommandStatus.Success};
  });
 }
});
