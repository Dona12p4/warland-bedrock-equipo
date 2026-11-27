// TEST ONLY: full addon plus a previously closed copy of the real Past terrain.
import {world,system,GameMode,ItemStack,InputPermissionCategory} from '@minecraft/server';
import {spawnSimulatedPlayer} from '@minecraft/server-gametest';
import {PAST,ACTOR_START,ACTOR_VANISH,cameraAt} from './components/warland_bp/past-policy.js';
import {enterPast,exitPast,startPastFilm,stopPastFilm} from './components/warland_bp/past.js';
import {pastArrivalActive,pastArrivalDebug,startPastArrival,stopPastArrival} from './components/warland_bp/past-arrival.js';
import {PAST_ARRIVAL,pastArrivalFrame} from './components/warland_bp/past-arrival-policy.js';
import {createPastGuide,PAST_GUIDE} from './components/warland_bp/past-environment.js';
import {arrivalDebug} from './components/warland_lobby_bp/arrival-runtime.js';
import {ARRIVAL,arrivalFrame} from './components/warland_lobby_bp/arrival-policy.js';
import {lobbyConfig} from './components/warland_lobby_bp/lobby-config.js';
import {pastAdminPage} from './components/warland_bp/past-admin-menu.js';
const checks=[],wait=t=>new Promise(r=>system.runTimeout(r,t));
const check=(name,ok,detail)=>{checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+' '+JSON.stringify(detail))};
const air=b=>!!b&&(b.isAir||/^minecraft:light(_block(_[0-9]+)?)?$/.test(b.typeId));
const transparent=b=>air(b)||!!b&&/^minecraft:(?:[a-z_]*glass(?:_pane)?)$/.test(b.typeId);
world.afterEvents.worldLoad.subscribe(()=>system.runTimeout(async()=>{
 let p,q;
 try{
  const od=world.getDimension('overworld'),d=world.getDimension(PAST.dimension);
  od.runCommand('tickingarea add circle 10000 150 10000 1 arrival_fixture true');await wait(30);
  od.runCommand('fill 9998 149 9998 10002 149 10002 stone');
  p=spawnSimulatedPlayer({dimension:od,x:10000.5,y:150,z:10000.5},'DanielGamerSC',GameMode.Creative);
  await wait(20);p.teleport({x:10000.5,y:150,z:10000.5});p.setGameMode(GameMode.Creative);
  const inventory=p.getComponent('inventory').container;inventory.setItem(8,new ItemStack('minecraft:diamond',3));
  const spawn=p.getSpawnPoint();
  const menu=pastAdminPage(p);check('admin menu exposes Past arrival',menu.rows.some(r=>r.id==='past-arrival'));
  check('real menu entry starts',await menu.rows.find(r=>r.id==='past-arrival').run());
  check('enters on foot',!pastArrivalActive(p)&&p.getGameMode()===GameMode.Adventure);
  check('entry floor safe',!air(d.getBlock({...PAST.spawn,y:PAST.spawn.y-1}))&&!d.getBlock({...PAST.spawn,y:PAST.spawn.y-1}).isLiquid);
  check('entry body and head clear',air(d.getBlock(PAST.spawn))&&air(d.getBlock({...PAST.spawn,y:PAST.spawn.y+1})));
  check('starts far from exit beacon',Math.hypot(p.location.x-PAST_GUIDE.at.x,p.location.z-PAST_GUIDE.at.z)>100,p.location);
  await wait(80);
  check('does not automatically exit or start a flight',p.dimension.id===PAST.dimension&&!pastArrivalActive(p)&&p.getGameMode()===GameMode.Adventure);
  check('controls restored',p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement)&&p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Camera));
  check('inventory retained',inventory.getItem(8)?.amount===3&&inventory.getItem(8)?.typeId==='minecraft:diamond');
  check('personal spawn retained',JSON.stringify(p.getSpawnPoint())===JSON.stringify(spawn));
  check('arrival recovery record cleared',!p.getDynamicProperty(PAST_ARRIVAL.key));
  q=spawnSimulatedPlayer({dimension:d,...PAST.spawn},'Arrival Companion',GameMode.Adventure);await wait(20);
  check('movie starts from exploration',await startPastFilm(p));
  check('no arrival during movie',!pastArrivalActive(p)&&!startPastArrival(p));
  const guide=createPastGuide();check('gate hidden from film viewer',guide.emit(p)===false);
  check('gate still usable by companion',guide.emit(q)===true);
  await wait(25);check('film still has no arrival emitter',!pastArrivalDebug().some(s=>s.id===p.id));
  const colossus=d.getEntities({type:PAST.actor})[0];check('Colossus rotation preserved for rear shot',colossus&&Math.abs(Math.abs(colossus.getRotation().y)-180)<.1);
  for(let t=ACTOR_START;t<ACTOR_VANISH;t+=1){
   const c=cameraAt(t),cam={x:c.position[0],y:c.position[1],z:c.position[2]},focus={x:PAST.actorAt.x,y:PAST.actorAt.y+4.1,z:PAST.actorAt.z+.5};
   check('three quarter camera clear '+t,air(d.getBlock(cam)),cam);
   const dx=cam.x-PAST.actorAt.x,dz=cam.z-PAST.actorAt.z;check('camera shows side and back '+t,dx>4&&dz>3&&dz/Math.hypot(dx,dz)<.8,{dx,dz});
   const len=Math.hypot(...['x','y','z'].map(k=>focus[k]-cam[k])),blocked=[];
   for(let u=0;u<len;u+=.25){const at=Object.fromEntries(['x','y','z'].map(k=>[k,cam[k]+(focus[k]-cam[k])*u/len]));const b=d.getBlock(at);if(!air(b))blocked.push({at,type:b?.typeId})}
   check('cape visible without terrain obstruction '+t,!blocked.length,blocked.slice(0,3));
  }
  check('performance waits at frame zero',colossus.getProperty('warland:performance_time')===0&&!colossus.getProperty('warland:performance'));
  await wait(Math.ceil((ACTOR_START+2)*20));
  const clockStart=colossus.getProperty('warland:performance_time');
  check('performance starts at the actor shot',colossus.getProperty('warland:performance')&&clockStart>0&&clockStart<5,{clockStart});
  await wait(120);
  const clockHand=colossus.getProperty('warland:performance_time');
  check('performance clock advances through hand gesture',clockHand>7&&clockHand<12&&clockHand-clockStart>5,{clockStart,clockHand});
  stopPastFilm(p);check('guide returns after film',guide.emit(p)===true);
  check('exit restores original dimension',await exitPast(p)&&p.dimension.id===od.id);
  check('exit restores original mode',p.getGameMode()===GameMode.Creative);
  check('gate scenario enters Past',await enterPast(p,false,true));
  p.teleport(PAST_GUIDE.at);await wait(65);
  check('crossing light reaches Lobby',p.dimension.id===od.id&&Math.hypot(p.location.x-lobbyConfig.spawn.x,p.location.z-lobbyConfig.spawn.z)<.2,p.location);
  check('real lobby cinematic starts from gate',arrivalDebug().active.some(s=>s.id===p.id&&s.reason==='past'),arrivalDebug());
  for(let t=0;t<ARRIVAL.returnView;t+=2){
   const f=arrivalFrame(t,lobbyConfig.spawn),cam=f.location,light=f.facingLocation;
   check('lobby camera clear '+t,air(od.getBlock(cam)),{at:cam,type:od.getBlock(cam)?.typeId});
   const len=Math.hypot(...['x','y','z'].map(k=>light[k]-cam[k])),blocked=[];
   for(let u=0;u<len;u+=.4){const at=Object.fromEntries(['x','y','z'].map(k=>[k,cam[k]+(light[k]-cam[k])*u/len]));if(!transparent(od.getBlock(at)))blocked.push({at,type:od.getBlock(at)?.typeId})}
   check('lobby light visible '+t,!blocked.length,blocked.slice(0,3));
  }
  check('Past return record cleared after handoff',!p.getDynamicProperty(PAST.returnKey));
  check('Past ambient stopped before Lobby sequence',!p.getDynamicProperty('warland:past_music_v1')&&!p.getDynamicProperty('warland:past_wind_v1'));
  await wait(ARRIVAL.ticks+15);
  check('lobby cinematic ends without replay',!arrivalDebug().active.some(s=>s.id===p.id)&&arrivalDebug().pending===0,arrivalDebug());
  check('lobby hands back control',p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Camera)&&p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement));
  check('Lobby transfer keeps inventory',inventory.getItem(8)?.amount===3&&inventory.getItem(8)?.typeId==='minecraft:diamond');
  check('Lobby transfer preserves personal spawn',JSON.stringify(p.getSpawnPoint())===JSON.stringify(spawn));
  check('Lobby preserves original mode',p.getGameMode()===GameMode.Creative);
  console.warn('[PAST_ARRIVAL_RESULT] '+JSON.stringify({passed:true,checks,clientVisualVerified:false}));
 }catch(e){console.warn('[PAST_ARRIVAL_RESULT] '+JSON.stringify({passed:false,error:String(e),stack:e.stack,checks}));}
 finally{try{if(p?.isValid){stopPastArrival(p);stopPastFilm(p);p.disconnect()}q?.disconnect();world.getDimension('overworld').runCommand('tickingarea remove arrival_fixture')}catch{}}
},40));
