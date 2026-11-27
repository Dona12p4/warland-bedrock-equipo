import assert from 'node:assert/strict';
import {ARRIVAL,ARRIVAL_STORM,arrivalFrame,lobbyRespawn} from '../packs/behavior_packs/WARLAND_Lobby_BP/scripts/arrival-policy.js';
import {firstArrivalDecision,ARRIVED,safeArrival} from '../packs/behavior_packs/WARLAND_Lobby_BP/scripts/lobby-policy.js';
const cfg={spawn:{x:1240.5,y:72,z:-1367.5},existingPlayerIds:['old-id'],existingPlayerNames:['existing']},dim='minecraft:overworld';
const player=(name='New',id='new-id',arrived)=>({name,id,getDynamicProperty:key=>key===ARRIVED?arrived:undefined});
assert.equal(firstArrivalDecision(player(),true,cfg),'arrive');
assert.equal(firstArrivalDecision(player(),false,cfg),'keep');
assert.equal(firstArrivalDecision(player('New','id',true),true,cfg),'keep');
assert.equal(firstArrivalDecision(player('Existing'),true,cfg),'existing');
assert.equal(firstArrivalDecision(player('Other','old-id'),true,cfg),'existing');
const floorDimension=(floor,head='minecraft:air')=>({getBlock:({y})=>({typeId:y===71?floor:head,isAir:(y===71?floor:head)==='minecraft:air',isLiquid:floor==='minecraft:water'})});
assert.equal(safeArrival(floorDimension('minecraft:white_stained_glass'),cfg.spawn),true,'installed light well supports arrival');
assert.equal(safeArrival(floorDimension('minecraft:air'),cfg.spawn),false,'missing floor');
assert.equal(safeArrival(floorDimension('minecraft:water'),cfg.spawn),false,'liquid floor');
assert.equal(safeArrival(floorDimension('minecraft:white_stained_glass','minecraft:stone'),cfg.spawn),false,'blocked headroom');
assert.equal(lobbyRespawn(cfg.spawn,dim,cfg.spawn,undefined,cfg),true);
assert.equal(lobbyRespawn(cfg.spawn,'minecraft:nether',cfg.spawn,undefined,cfg),false);
assert.equal(lobbyRespawn({...cfg.spawn,x:1260},dim,cfg.spawn,undefined,cfg),false);
assert.equal(lobbyRespawn(cfg.spawn,dim,{x:0,y:80,z:0},undefined,cfg),false);
assert.equal(lobbyRespawn({...cfg.spawn,x:1243},dim,cfg.spawn,{...cfg.spawn,x:1243,dimension:{id:dim}},cfg),false);
assert.equal(lobbyRespawn(cfg.spawn,dim,cfg.spawn,{x:900,y:64,z:900,dimension:{id:dim}},cfg),true,'broken bed fallback');
assert.equal(lobbyRespawn(cfg.spawn,dim,cfg.spawn,{...cfg.spawn,dimension:{id:dim}},cfg),true,'explicit lobby point');
let previous=Infinity;
for(let t=0;t<=ARRIVAL.impact;t++){
 const f=arrivalFrame(t,cfg.spawn);assert.ok(f.lightY<=previous);assert.ok(f.lightY>=1.1);previous=f.lightY;
 assert.ok(Object.values(f.location).every(Number.isFinite));assert.ok(Object.values(f.facingLocation).every(Number.isFinite));
}
assert.equal(arrivalFrame(0,cfg.spawn).lightY+cfg.spawn.y,194,'Light originates IN the vanilla cloud layer');
assert.equal(arrivalFrame(ARRIVAL.impact,cfg.spawn).lightY,1.1);
assert.equal(arrivalFrame(ARRIVAL.reveal,cfg.spawn).phase,'reveal');
assert.ok(Math.hypot(arrivalFrame(0,cfg.spawn).location.x-cfg.spawn.x,arrivalFrame(0,cfg.spawn).location.z-cfg.spawn.z)>=24,'Opening shows the whole sanctuary from a distance');
assert.equal(arrivalFrame(0,cfg.spawn).phase,'vortex');
assert.equal(arrivalFrame(ARRIVAL.descent,cfg.spawn).phase,'descent');
const center=arrivalFrame(ARRIVAL.descent,cfg.spawn),wide=arrivalFrame(110,cfg.spawn),roof=arrivalFrame(140,cfg.spawn);
assert(Math.hypot(center.location.x-cfg.spawn.x,center.location.z-cfg.spawn.z)<.3,'Descent still starts in the eye of the spiral');
assert(Math.hypot(wide.location.x-cfg.spawn.x,wide.location.z-cfg.spawn.z)>30,'Mid-descent needs a distant view');
assert(Math.hypot(roof.location.x-cfg.spawn.x,roof.location.z-cfg.spawn.z)<.3,'Return to the opening before approaching the roof');
for(const storm of ARRIVAL_STORM)assert.ok(storm.tick<storm.soundTick&&storm.soundTick<ARRIVAL.descent,'Bolt then thunder before descent');
for(const groundY of [64,72,96]){
 const origin={...cfg.spawn,y:groundY};
 assert.equal(arrivalFrame(0,origin).lightY+groundY,194,'Cloud altitude is absolute, not an offset above the temple');
 assert.ok(arrivalFrame(0,origin).location.y>196,'Opening camera is ABOVE the real cloud layer');
 for(let t=1;t<ARRIVAL.returnView;t++){
  const a=arrivalFrame(t-1,origin),b=arrivalFrame(t,origin);
  assert.ok(Math.hypot(...['x','y','z'].map(k=>a.location[k]-b.location[k]))<3,'Continuous camera flight, without the former hard cut');
 }
}
for(const storm of ARRIVAL_STORM)assert.ok(ARRIVAL.cloudY+storm.offset.y>=192&&ARRIVAL.cloudY+storm.offset.y<=196,'Lightning stays inside clouds');
console.log('Arrival policy: entry, reconnect, personal spawn, fallback and continuous descent passed');
