import './main.js';
import {world,system,GameMode,ItemStack,InputPermissionCategory} from '@minecraft/server';
import * as GameTest from '@minecraft/server-gametest';
import {lobbyConfig as cfg} from './lobby-config.js';
import {ARRIVED,firstArrivalDecision,safeArrival} from './lobby-policy.js';
import {arrive} from './main.js';
import {startArrival,arrivalDebug,observeArrivalSpawn,recoverArrival} from './arrival-runtime.js';
import {ARRIVAL,HEART_TAG,CINEMATIC_TAG,RECOVERY,arrivalFrame} from './arrival-policy.js';
const checks=[],wait=t=>new Promise(r=>system.runTimeout(r,t));
const check=(name,ok,detail)=>{checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+' '+JSON.stringify(detail));};
const active=p=>arrivalDebug().active.find(s=>s.id===p.id);
async function until(fn,ticks=240){for(let t=0;t<ticks;t+=2){if(fn())return true;await wait(2);}return false;}
async function die(p,destination){
 p.kill();await wait(3);check('Native death registered',p.hasTag(HEART_TAG),{health:p.getComponent('health').currentValue,at:p.location});
 if(p.getComponent('health').currentValue<=0)p.respawn();
 // SimulatedPlayer does not acknowledge the client's relocation on fallback.
 // Supply that destination before Base's two-tick settle, not a fake death.
 if(destination)p.teleport(destination);
}
world.afterEvents.worldLoad.subscribe(()=>system.runTimeout(async()=>{
 let p,q;const d=world.getDimension('overworld');
 try{
  d.runCommand(`tickingarea add circle ${cfg.spawn.x} ${cfg.spawn.y} ${cfg.spawn.z} 2 wl_arrival_probe true`);await wait(40);
  for(let t=0;t<ARRIVAL.returnView;t+=2){const f=arrivalFrame(t,cfg.spawn),b=d.getBlock(f.location);check('Camera clear at tick '+t,b?.isAir||/^minecraft:light(_block)?$/.test(b?.typeId??''),{type:b?.typeId,at:f.location});}
  for(let t=ARRIVAL.descent;t<ARRIVAL.impact;t+=4){
   const f=arrivalFrame(t,cfg.spawn),occluders=[];
   const length=Math.hypot(...['x','y','z'].map(k=>f.facingLocation[k]-f.location[k]));
   for(let a=0;a<length;a+=.2){const at=Object.fromEntries(['x','y','z'].map(k=>[k,f.location[k]+(f.facingLocation[k]-f.location[k])*a/length])),b=d.getBlock(at);if(!b?.isAir&&!/glass|light_block|minecraft:light$/.test(b?.typeId??''))occluders.push({at,type:b?.typeId});}
   check('Descending light visible at tick '+t,occluders.length===0,occluders);
  }
  check('World spawn is lobby',Math.hypot(world.getDefaultSpawnLocation().x-cfg.spawn.x,world.getDefaultSpawnLocation().y-cfg.spawn.y,world.getDefaultSpawnLocation().z-cfg.spawn.z)<2);
  p=GameTest.spawnSimulatedPlayer({dimension:d,...cfg.spawn},'Arrival'+String(Date.now()).slice(-6),GameMode.Survival);
  console.warn('[ARRIVAL_PROBE_IDENTITY] '+JSON.stringify({id:p.id,arrived:p.getDynamicProperty(ARRIVED),choice:firstArrivalDecision(p,true,cfg),safe:safeArrival(d,cfg.spawn),at:p.location,blocks:[-1,0,1].map(y=>d.getBlock({x:Math.floor(cfg.spawn.x),y:cfg.spawn.y+y,z:Math.floor(cfg.spawn.z)})?.typeId)}));
  arrive(p,true); // GameTest players do not emit the client's initial-join event.
  check('First entry begins',await until(()=>!!active(p),120),{...arrivalDebug(),id:p.id,arrived:p.getDynamicProperty(ARRIVED),choice:firstArrivalDecision(p,true,cfg),safe:safeArrival(d,cfg.spawn),at:p.location});
  check('First entry reason',active(p).reason==='first');
  check('Visual hidden until reveal',active(p).visualHidden&&JSON.parse(p.getDynamicProperty(RECOVERY)).visualOwned===true);
  check('Arrival marker persisted',p.getDynamicProperty(ARRIVED)===true);
  check('Camera and movement locked',!p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Camera)&&!p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement));
  check('No spectator or mode change',p.getGameMode()===GameMode.Survival);
  await wait(50);
  check('Two cosmetic bolts and thunder before descent',active(p)?.bolts===2&&active(p)?.thunder===2&&!active(p)?.descentStarted,active(p));
  check('Player remains hidden during thunder',active(p)?.visualHidden);
  const inv=p.getComponent('inventory').container;inv.setItem(8,new ItemStack('minecraft:diamond',3));const personal=p.getSpawnPoint();
  await wait(ARRIVAL.ticks+4);
  check('First entry finishes',!active(p)&&!p.hasTag(CINEMATIC_TAG)&&p.getDynamicProperty(RECOVERY)===undefined);
  check('Controls returned',p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Camera)&&p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement));
  check('Inventory preserved',inv.getItem(8)?.typeId==='minecraft:diamond'&&inv.getItem(8)?.amount===3);
  check('Spawn not modified',JSON.stringify(p.getSpawnPoint())===JSON.stringify(personal));
  check('Reconnect is keep',arrive(p,true)==='keep');observeArrivalSpawn(p,true);await wait(12);check('Reconnect does not replay',!active(p)&&arrivalDebug().pending===0);
  p.setSpawnPoint(undefined);
  const remote={x:cfg.spawn.x+180,y:150,z:cfg.spawn.z};
  d.runCommand(`tickingarea add circle ${remote.x} ${remote.y} ${remote.z} 1 wl_arrival_remote true`);await wait(30);
  d.runCommand(`fill ${Math.floor(remote.x)-2} ${remote.y-1} ${Math.floor(remote.z)-2} ${Math.floor(remote.x)+2} ${remote.y-1} ${Math.floor(remote.z)+2} stone`);
  d.runCommand(`fill ${Math.floor(remote.x)-2} ${remote.y} ${Math.floor(remote.z)-2} ${Math.floor(remote.x)+2} ${remote.y+3} ${Math.floor(remote.z)+2} air`);
  p.teleport(remote);await wait(3);await die(p,cfg.spawn);await wait(6);
  check('Heart flow remains in charge',p.hasTag(HEART_TAG)&&!active(p));
  check('Lobby death gets arrival after heart',await until(()=>active(p)?.reason==='respawn',220),arrivalDebug());
  check('Heart spectator ended before camera',!p.hasTag(HEART_TAG)&&p.getGameMode()===GameMode.Survival);
  await wait(ARRIVAL.ticks+4);check('Respawn scene completes',!active(p)&&p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement));
  q=GameTest.spawnSimulatedPlayer({dimension:d,...remote},'Personal'+String(Date.now()).slice(-6),GameMode.Survival);q.setDynamicProperty(ARRIVED,true);await wait(12);
  q.setSpawnPoint({dimension:d,...remote});const qSpawn=q.getSpawnPoint();await die(q);await wait(250);
  check('Personal spawn skips cinematic',!active(q)&&Math.hypot(q.location.x-remote.x,q.location.z-remote.z)<4,{at:q.location,debug:arrivalDebug()});
  const afterSpawn=q.getSpawnPoint();check('Personal spawn retained',afterSpawn&&['x','y','z'].every(k=>afterSpawn[k]===qSpawn[k])&&afterSpawn.dimension.id===qSpawn.dimension.id,{before:qSpawn,after:afterSpawn});
  p.teleport(cfg.spawn);await wait(3);check('Admin-preview entry starts',startArrival(p,'preview'));p.teleport(remote);await wait(4);
  check('Travel interruption restores controls',!active(p)&&p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement));
  check('Interruption does not pull player back',Math.abs(p.location.x-remote.x)<1);
  p.teleport(cfg.spawn);p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement,false);
  check('External input lock respected',!startArrival(p,'preview')&&!p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement));p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement,true);
  check('Recovery scene starts',startArrival(p,'preview'));recoverArrival(p);
  check('Saved camera ownership recovers',!active(p)&&!p.hasTag(CINEMATIC_TAG)&&!p.getDynamicProperty(RECOVERY)&&p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Camera));
  console.warn('[ARRIVAL_NATIVE_RESULT] '+JSON.stringify({passed:true,checks,simulatedFallbackDestination:true,realClientFallbackVerified:false}));
 }catch(e){console.warn('[ARRIVAL_NATIVE_RESULT] '+JSON.stringify({passed:false,checks,error:String(e),stack:e.stack}));}
 finally{try{p?.disconnect();q?.disconnect();d.runCommand('tickingarea remove wl_arrival_probe');d.runCommand('tickingarea remove wl_arrival_remote');}catch{}}
},40));
