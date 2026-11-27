import './main.js';
import {world,system,GameMode,ItemStack,InputPermissionCategory} from '@minecraft/server';
import * as GameTest from '@minecraft/server-gametest';
import {lobbyConfig as cfg} from './lobby-config.js';
import {ARRIVED} from './lobby-policy.js';
import {arrive} from './main.js';
import {startArrival,arrivalDebug,observeArrivalSpawn,recoverArrival} from './arrival-runtime.js';
import {ARRIVAL,HEART_TAG,CINEMATIC_TAG,RECOVERY,arrivalFrame} from './arrival-policy.js';
const checks=[],wait=t=>new Promise(r=>system.runTimeout(r,t));
const check=(name,ok,detail)=>{checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+' '+JSON.stringify(detail));};
const active=p=>arrivalDebug().active.find(s=>s.id===p.id);
async function until(fn,ticks=240){for(let t=0;t<ticks;t+=2){if(fn())return true;await wait(2);}return false;}
async function die(p){p.runCommand('kill @s');await wait(3);if(p.getComponent('health').currentValue<=0)p.respawn();}
world.afterEvents.worldLoad.subscribe(()=>system.runTimeout(async()=>{
 let p,q;const d=world.getDimension('overworld');
 try{
  d.runCommand(`tickingarea add circle ${cfg.spawn.x} ${cfg.spawn.y} ${cfg.spawn.z} 2 wl_arrival_probe true`);await wait(40);
  for(let t=0;t<ARRIVAL.returnView;t+=4){const f=arrivalFrame(t,cfg.spawn),b=d.getBlock(f.location);const alternatives=[];if(!b?.isAir)for(const radius of [2,3,4,5,6])for(const h of [2.6,4,6]){const a=-36*Math.PI/180,at={x:cfg.spawn.x+Math.sin(a)*radius,y:cfg.spawn.y+h,z:cfg.spawn.z-Math.cos(a)*radius};alternatives.push({radius,h,type:d.getBlock(at)?.typeId});}check('Camera clear at tick '+t,b?.isAir,{type:b?.typeId,at:f.location,alternatives});}
  check('World spawn is lobby',Math.hypot(world.getDefaultSpawnLocation().x-cfg.spawn.x,world.getDefaultSpawnLocation().y-cfg.spawn.y,world.getDefaultSpawnLocation().z-cfg.spawn.z)<2);
  p=GameTest.spawnSimulatedPlayer({dimension:d,...cfg.spawn},'ArrivalFirst',GameMode.Survival);
  check('First entry begins',await until(()=>!!active(p),50),arrivalDebug());
  check('First entry reason',active(p).reason==='first');
  check('Arrival marker persisted',p.getDynamicProperty(ARRIVED)===true);
  check('Camera and movement locked',!p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Camera)&&!p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement));
  check('No spectator or mode change',p.getGameMode()===GameMode.Survival);
  const inv=p.getComponent('inventory').container;inv.setItem(8,new ItemStack('minecraft:diamond',3));const personal=p.getSpawnPoint();
  await wait(ARRIVAL.ticks+4);
  check('First entry finishes',!active(p)&&!p.hasTag(CINEMATIC_TAG)&&p.getDynamicProperty(RECOVERY)===undefined);
  check('Controls returned',p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Camera)&&p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement));
  check('Inventory preserved',inv.getItem(8)?.typeId==='minecraft:diamond'&&inv.getItem(8)?.amount===3);
  check('Spawn not modified',JSON.stringify(p.getSpawnPoint())===JSON.stringify(personal));
  check('Reconnect is keep',arrive(p,true)==='keep');observeArrivalSpawn(p,true);await wait(12);check('Reconnect does not replay',!active(p)&&arrivalDebug().pending===0);
  p.setSpawnPoint(undefined);
  const remote={x:cfg.spawn.x+22,y:cfg.spawn.y,z:cfg.spawn.z};
  d.runCommand(`fill ${Math.floor(remote.x)-2} ${remote.y-1} ${Math.floor(remote.z)-2} ${Math.floor(remote.x)+2} ${remote.y-1} ${Math.floor(remote.z)+2} stone`);
  d.runCommand(`fill ${Math.floor(remote.x)-2} ${remote.y} ${Math.floor(remote.z)-2} ${Math.floor(remote.x)+2} ${remote.y+3} ${Math.floor(remote.z)+2} air`);
  p.teleport(remote);await wait(3);await die(p);await wait(6);
  check('Heart flow remains in charge',p.hasTag(HEART_TAG)&&!active(p));
  check('Lobby death gets arrival after heart',await until(()=>active(p)?.reason==='respawn',220),arrivalDebug());
  check('Heart spectator ended before camera',!p.hasTag(HEART_TAG)&&p.getGameMode()===GameMode.Survival);
  await wait(ARRIVAL.ticks+4);check('Respawn scene completes',!active(p)&&p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement));
  q=GameTest.spawnSimulatedPlayer({dimension:d,...remote},'ArrivalPersonal',GameMode.Survival);q.setDynamicProperty(ARRIVED,true);await wait(12);
  q.setSpawnPoint({dimension:d,...remote});await die(q);await wait(250);
  check('Personal spawn skips cinematic',!active(q)&&Math.hypot(q.location.x-remote.x,q.location.z-remote.z)<4,{at:q.location,debug:arrivalDebug()});
  check('Personal spawn retained',q.getSpawnPoint()?.x===remote.x);
  p.teleport(cfg.spawn);await wait(3);check('Admin-preview entry starts',startArrival(p,'preview'));p.teleport(remote);await wait(4);
  check('Travel interruption restores controls',!active(p)&&p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement));
  check('Interruption does not pull player back',Math.abs(p.location.x-remote.x)<1);
  p.teleport(cfg.spawn);p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement,false);
  check('External input lock respected',!startArrival(p,'preview')&&!p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement));p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement,true);
  check('Recovery scene starts',startArrival(p,'preview'));recoverArrival(p);
  check('Saved camera ownership recovers',!active(p)&&!p.hasTag(CINEMATIC_TAG)&&!p.getDynamicProperty(RECOVERY)&&p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Camera));
  console.warn('[ARRIVAL_NATIVE_RESULT] '+JSON.stringify({passed:true,checks}));
 }catch(e){console.warn('[ARRIVAL_NATIVE_RESULT] '+JSON.stringify({passed:false,checks,error:String(e),stack:e.stack}));}
 finally{try{p?.disconnect();q?.disconnect();d.runCommand('tickingarea remove wl_arrival_probe');}catch{}}
},40));
