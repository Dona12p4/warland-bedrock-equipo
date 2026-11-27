// TEST ONLY: full addon plus a previously closed copy of the real Past terrain.
import {world,system,GameMode,ItemStack,InputPermissionCategory} from '@minecraft/server';
import {spawnSimulatedPlayer} from '@minecraft/server-gametest';
import {PAST} from './components/warland_bp/past-policy.js';
import {enterPast,exitPast,startPastFilm,stopPastFilm} from './components/warland_bp/past.js';
import {pastArrivalActive,pastArrivalDebug,startPastArrival,stopPastArrival} from './components/warland_bp/past-arrival.js';
import {PAST_ARRIVAL,pastArrivalFrame} from './components/warland_bp/past-arrival-policy.js';
import {createPastGuide} from './components/warland_bp/past-environment.js';
const checks=[],wait=t=>new Promise(r=>system.runTimeout(r,t));
const check=(name,ok,detail)=>{checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+' '+JSON.stringify(detail))};
const air=b=>!!b&&(b.isAir||b.typeId.startsWith('minecraft:light_block'));
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
  check('real default entry starts',await enterPast(p));check('arrival owns spectator',pastArrivalActive(p)&&p.getGameMode()===GameMode.Spectator);
  check('input held only during flight',!p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement));
  await wait(45);
  for(let t=0;t<=PAST_ARRIVAL.ticks;t+=4){
   const f=pastArrivalFrame(t);check('camera clear '+t,air(d.getBlock(f.camera)),{at:f.camera,type:d.getBlock(f.camera)?.typeId});
   const dist=Math.hypot(...['x','y','z'].map(k=>f.camera[k]-f.light[k]));const blocked=[];
   for(let u=0;u<=dist;u+=.4){const at=Object.fromEntries(['x','y','z'].map(k=>[k,f.camera[k]+(f.light[k]-f.camera[k])*u/dist]));const b=d.getBlock(at);if(!air(b))blocked.push({at,type:b?.typeId})}
   check('light unobstructed '+t,!blocked.length,blocked.slice(0,3));
   if(t%40===0)await wait(1);
  }
  check('targeted light emits natively',pastArrivalDebug().find(s=>s.id===p.id)?.emissions>0,pastArrivalDebug());
  await wait(PAST_ARRIVAL.ticks+5);
  check('flight ends',!pastArrivalActive(p)&&p.getGameMode()===GameMode.Adventure);
  check('lands at entrance',Math.hypot(p.location.x-PAST.spawn.x,p.location.z-PAST.spawn.z)<.15,p.location);
  check('controls restored',p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement)&&p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Camera));
  check('inventory retained',inventory.getItem(8)?.amount===3&&inventory.getItem(8)?.typeId==='minecraft:diamond');
  check('personal spawn retained',JSON.stringify(p.getSpawnPoint())===JSON.stringify(spawn));
  check('arrival recovery record cleared',!p.getDynamicProperty(PAST_ARRIVAL.key));
  q=spawnSimulatedPlayer({dimension:d,...PAST.spawn},'Arrival Companion',GameMode.Adventure);await wait(20);
  check('replay before film starts',startPastArrival(p));await wait(50);
  check('movie starts after cancelling arrival',await startPastFilm(p));
  check('no arrival during movie',!pastArrivalActive(p)&&!startPastArrival(p));
  const guide=createPastGuide();check('gate hidden from film viewer',guide.emit(p)===false);
  check('gate still usable by companion',guide.emit(q)===true);
  await wait(25);check('film still has no arrival emitter',!pastArrivalDebug().some(s=>s.id===p.id));
  stopPastFilm(p);check('guide returns after film',guide.emit(p)===true);
  check('exit restores original dimension',await exitPast(p)&&p.dimension.id===od.id);
  check('exit restores original mode',p.getGameMode()===GameMode.Creative);
  console.warn('[PAST_ARRIVAL_RESULT] '+JSON.stringify({passed:true,checks,clientVisualVerified:false}));
 }catch(e){console.warn('[PAST_ARRIVAL_RESULT] '+JSON.stringify({passed:false,error:String(e),stack:e.stack,checks}));}
 finally{try{if(p?.isValid){stopPastArrival(p);stopPastFilm(p);p.disconnect()}q?.disconnect();world.getDimension('overworld').runCommand('tickingarea remove arrival_fixture')}catch{}}
},40));
