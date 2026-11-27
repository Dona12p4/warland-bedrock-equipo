import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),file=n=>fs.readFileSync(new URL('packs/behavior_packs/WARLAND_BP/scripts/'+n,root),'utf8');
const policy=await import('data:text/javascript;base64,'+Buffer.from(file('past-policy.js')).toString('base64'));
assert.equal(policy.inPast({get dimension(){throw Error('removed')}}),false);
assert.equal(policy.memoryAt(9.25),true);assert.equal(policy.memoryAt(27.5),false);
assert.equal(policy.cameraAt(9.25).position[1]>300,true);
assert.equal(policy.cameraAt(10).position[1]>300,true);
assert.equal(policy.cameraAt(27.5).position[1]<100,true);
for(let t=0;t<27.5;t+=.1)assert(policy.memoryAt(t));
for(let t=27.5;t<policy.PAST.duration;t+=.1)assert(!policy.memoryAt(t));
assert(policy.inPastBounds({x:250,y:64,z:-783}));
assert(policy.inPastBounds({x:1274,y:64,z:-783}));
assert(!policy.inPastBounds({x:800,y:64,z:-783}));
assert(!policy.inPastBounds({x:250,y:2,z:-783}));
assert(!policy.validReturn({dimension:policy.PAST.dimension,location:{x:0,y:60,z:0},mode:'survival'}));
assert(!policy.validReturn({dimension:'minecraft:overworld',location:{x:NaN,y:60,z:0},mode:'survival'}));
assert(policy.validReturn({dimension:'minecraft:overworld',location:{x:0,y:60,z:0},mode:'creative'}));
assert(!policy.pastAdmin('DanielGamerSC impostor'));
assert.equal(policy.shotAt(13.77).index,1);
assert.equal(policy.shotAt(policy.ACTOR_START).index,6);
assert.equal(policy.SHOTS.at(-1).t+policy.SHOTS.at(-1).d,policy.PAST.duration);
const makeEvents=()=>new Proxy({}, {get(o,k){return o[k]??=( {callbacks:[],subscribe(f){this.callbacks.push(f)}} )}});
const before=makeEvents(),after=makeEvents(),startup=makeEvents(),timeouts=[],intervals=[],commands=[],players=[],actors=[];
const props=new Map(),effects=[],logs=[];let runtimeClock=100000;
const dims=new Map();
for(const id of [policy.PAST.dimension,'minecraft:overworld'])dims.set(id,{id,runCommand(c){commands.push(c);return {successCount:1}},getBlock(){return {isAir:false,isLiquid:false,typeId:'minecraft:stone'}},getEntities(){return actors.filter(e=>e.isValid)},spawnParticle(...a){effects.push(a)},spawnEntity(typeId,location){const e={typeId,location,isValid:true,setRotation(){},setProperty(){},remove(){this.isValid=false}};actors.push(e);return e;}});
const world={beforeEvents:before,afterEvents:after,getAllPlayers:()=>players,getDynamicProperty:k=>props.get(k),getDimension:id=>dims.get(id)};
const system={currentTick:100,beforeEvents:startup,run:f=>timeouts.push(f),runTimeout:f=>timeouts.push(f),runInterval:(f,t)=>intervals.push({f,t})};
class Player{
 constructor(name){Object.assign(this,{name,id:name,isValid:true,typeId:'minecraft:player',dimension:dims.get('minecraft:overworld'),location:{x:10,y:65,z:20},mode:'creative',properties:new Map(),tags:new Set(),enabled:new Map([['camera',true],['movement',true]]),messages:[]});
 this.inputPermissions={isPermissionCategoryEnabled:c=>this.enabled.get(c),setPermissionCategory:(c,v)=>this.enabled.set(c,v)};
 this.views=[];this.sounds=[];this.particles=[];
 this.camera={fade(){},clear(){},resetFov(){},setCamera:(preset,options)=>this.views.push({preset,...options}),setFov(){}};
 this.onScreenDisplay={setTitle(){},setActionBar(){},getHiddenHudElements:()=>[],setHudVisibility(){}};
 }
 getDynamicProperty(k){return this.properties.get(k)} setDynamicProperty(k,v){this.properties.set(k,v)}
 hasTag(t){return this.tags.has(t)} addTag(t){this.tags.add(t)} removeTag(t){this.tags.delete(t)}
 getComponent(){return {currentValue:20}} getGameMode(){return this.mode} setGameMode(v){this.mode=v}
 getRotation(){return {x:0,y:20}} sendMessage(t){this.messages.push(t)} runCommand(c){commands.push(c)} playSound(id,options){this.sounds.push({id,...options})}
 teleport(l,o={}){this.location={...l};if(o.dimension)this.dimension=o.dimension}
 spawnParticle(...a){this.particles.push(a)}
}
const ctx=vm.createContext({...policy,Date:{now:()=>runtimeClock},world,system,Player,GameMode:{Creative:'creative',Adventure:'adventure',Survival:'survival',Spectator:'spectator'},HudVisibility:{Hide:0,Reset:1},InputPermissionCategory:{Camera:'camera',Movement:'movement'},EasingType:{Linear:'Linear'},CommandPermissionLevel:{Any:0},CustomCommandStatus:{Success:0,Failure:1},ActionFormData:class{},console:{warn:x=>logs.push(x)}});
const arrivalIntervals=[];
const arrivalCtx=vm.createContext({...ctx,system:{...system,get currentTick(){return system.currentTick},runInterval:(f,t)=>arrivalIntervals.push({f,t})},MolangVariableMap:class{setFloat(){}}});
for(const name of ['past-arrival-policy.js','past-arrival.js'])vm.runInContext(file(name).replace(/^import .+;\r?\n/gm,'').replace(/\bexport /g,''),arrivalCtx);
const arrival=vm.runInContext('({PAST_ARRIVAL,pastArrivalFrame,pastArrivalLight,pastArrivalActive,startPastArrival,stopPastArrival,recoverPastArrival,pastArrivalDebug})',arrivalCtx);
Object.assign(ctx,arrival);
for(const name of ['past-music.js','past-travel.js','past-palm-path.js','past-lighting.js','past.js'])vm.runInContext(file(name).replace(/^import .+;\r?\n/gm,'').replace(/\bexport /g,''),ctx);
const api=vm.runInContext('({enterPast,exitPast,startPastFilm,stopPastFilm,pastDebug,unstuckPast,createPastMusic,escapeProbe})',ctx);
const defaultEntry=api.enterPast;
// Existing film/travel checks use its explicit skip path; default entry is
// exercised with the new arrival controller below.
api.enterPast=(p,normal=false)=>defaultEntry(p,normal,true);
async function pump(promise){let done=false,error,result;promise.then(v=>{done=true;result=v},e=>{done=true;error=e});for(let i=0;i<500&&!done;i++){for(const f of timeouts.splice(0))f();await Promise.resolve();}assert(done,'async operation failed to settle');if(error)throw error;return result;}
for(const f of after.worldLoad.callbacks)f();
const a=new Player('DanielGamerSC'),b=new Player('visitor');players.push(a,b);
// Two simultaneous entrants must share one reservation, not remove one another's chunks.
assert.deepEqual(await pump(Promise.all([api.enterPast(a),api.enterPast(b)])),[true,true]);
assert.equal(commands.filter(c=>c.startsWith('tickingarea add')).length,1);
assert.equal(a.mode,'adventure');assert.equal(a.dimension.id,policy.PAST.dimension);
for(const name of ['playerBreakBlock','playerPlaceBlock','playerInteractWithBlock','playerInteractWithEntity']){
 const blocked={player:a,cancel:false};before[name].callbacks.forEach(f=>f(blocked));assert(blocked.cancel,name);
 const outside={player:new Player('outside'),cancel:false};before[name].callbacks.forEach(f=>f(outside));assert(!outside.cancel,name);
}
assert.equal(await pump(api.enterPast(b,true)),false,'regular player entered intact preview');
assert.equal(await pump(api.exitPast(a)),true);assert.equal(a.mode,'creative');assert.equal(a.location.x,10);
assert.equal(api.pastDebug().regions.length,1,'remaining visitor lost loaded region');
assert.equal(await pump(api.exitPast(b)),true);assert.equal(api.pastDebug().regions.length,0);
a.enabled.set('camera',false);assert.equal(await pump(api.enterPast(a)),false);a.enabled.set('camera',true);
a.addTag('warland_lobby_cinematic');assert.equal(await pump(api.enterPast(a)),false);a.removeTag('warland_lobby_cinematic');
assert.equal(await pump(api.startPastFilm(a)),true);assert.equal(a.mode,'spectator');assert(!a.enabled.get('movement'));
api.stopPastFilm(a);assert.equal(a.mode,'adventure');assert(a.enabled.get('movement'));assert(!a.hasTag(policy.PAST.filmTag));assert.equal(actors.filter(e=>e.isValid).length,0);
await pump(api.startPastFilm(a));props.set('warland:heart_overlay_v1',true);api.stopPastFilm(a,'heart');
assert(a.getDynamicProperty(policy.PAST.filmKey),'recovery record must survive a higher priority death overlay');
a.dimension=dims.get('minecraft:overworld');props.set('warland:heart_overlay_v1',false);
intervals.find(x=>x.t===20).f();assert.equal(a.mode,'creative');assert(!a.getDynamicProperty(policy.PAST.filmKey));assert(!a.getDynamicProperty(policy.PAST.returnKey));
const explode={dimension:dims.get(policy.PAST.dimension),cancel:false};before.explosion.callbacks.forEach(f=>f(explode));assert(explode.cancel);
const item={source:b,cancel:false};before.itemUse.callbacks.forEach(f=>f(item));assert(!item.cancel,'normal world item use was blocked');
console.log('PASS: policy, simultaneous visitors, read-only scope, return, cancellation, input ownership, death recovery.');
let clock=0;const soundCalls=[],mc=api.createPastMusic(()=>clock),listener=new Player('listener');listener.dimension=dims.get(policy.PAST.dimension);listener.playSound=(id,o)=>soundCalls.push([id,o.volume]);
mc.update(listener);clock=64000;mc.update(listener);assert.equal(soundCalls.length,1,'music restarted when cinema ended');assert.equal(soundCalls[0][1],.5);
clock=302000;mc.update(listener);assert.equal(soundCalls.length,2,'ambient did not loop');
listener.dimension=dims.get('minecraft:overworld');mc.update(listener);assert(!listener.getDynamicProperty('warland:past_music_v1'));
const cell=solid=>({typeId:solid?'minecraft:stone':'minecraft:air',isAir:!solid,isLiquid:false});
const flat={getBlock:({y})=>cell(y<64)};
assert.equal(api.escapeProbe(flat,{x:0,y:64,z:0}).trapped,false);
const pit={getBlock:({x,y,z})=>cell(y<60||(y<64&&(Math.abs(x)>1||Math.abs(z)>1)))};
assert.equal(api.escapeProbe(pit,{x:0,y:60,z:0}).trapped,true);
const steps={getBlock:({x,y,z})=>cell(y<(Math.abs(z)<=1&&x>=0?Math.min(64,60+x):64))};
assert.equal(api.escapeProbe(steps,{x:0,y:60,z:0}).trapped,false,'ordinary steps must be escapable');
assert.equal(api.escapeProbe({getBlock:()=>undefined},{x:0,y:60,z:0}).trapped,false,'unloaded terrain is not proof of entrapment');
assert.equal(api.escapeProbe(flat,{x:0,y:64,z:0},1).trapped,false,'exhausted budget is not proof of entrapment');
console.log('PASS: persistent ambient, individual exit, invalid entities, flash timing, enclosed pits, steps and bounded search.');
// Drive the real film controller across cuts and flashes, not only its policy.
runtimeClock=200000;await pump(api.startPastFilm(a));
const filmTick=intervals.find(x=>x.t===1).f,filmStart=runtimeClock;
const soundtrackCount=a.sounds.filter(s=>s.id==='warland.past.ambient').length;
for(const time of [0,9.25,13.77,20.64,27.49,27.5,34.57,39.77,44.64,policy.ACTOR_VANISH-.01]){
 runtimeClock=filmStart+time*1000;system.currentTick+=4;filmTick();
 const view=a.views.at(-1);assert.equal(view.preset,'warland:past_film');
 assert.equal(view.location.y>300,policy.memoryAt(time),'flash camera at '+time);
 assert.equal(actors.filter(e=>e.isValid).length,1,'actor vanished early at '+time);
}
runtimeClock=filmStart+policy.ACTOR_VANISH*1000+.01;filmTick();assert.equal(actors.filter(e=>e.isValid).length,0,'TP must disappear at the sound endpoint');
assert(effects.some(e=>e[0]==='warland:past_departure'),'missing departure cloud');
runtimeClock=filmStart+policy.PAST.duration*1000+1;filmTick();
assert.equal(a.mode,'adventure');assert(a.enabled.get('movement'));
assert(!a.hasTag(policy.PAST.filmTag));assert.equal(api.pastDebug().film,null);
assert.equal(a.sounds.filter(s=>s.id==='warland.past.ambient').length,soundtrackCount,'film completion restarted ambient');
assert(a.getDynamicProperty('warland:past_music_v1'),'film completion stopped exploring soundtrack');
await pump(api.exitPast(a));assert(!a.getDynamicProperty('warland:past_music_v1'),'ambient survived leaving dimension');
// Recovery never records the trapped location again after teleporting.
await pump(api.enterPast(a));const entrance={...a.location};
const walkDimension=dims.get(policy.PAST.dimension),oldBlocks=walkDimension.getBlock;
walkDimension.getBlock=flat.getBlock;a.location={x:300.5,y:64,z:-780.5};
for(let i=0;i<3;i++){system.currentTick+=20;intervals.find(x=>x.t===20).f();}
const safe={...a.location};a.location={x:303.5,y:60,z:-780.5};
assert(api.unstuckPast(a,true));assert.deepEqual(a.location,safe,'automatic recovery lost the walked safe point');
// A broad sealed room can exceed the local search radius. Manual recovery
// must reach the entrance even when a different last-safe point was recorded.
a.location={x:305.5,y:64,z:-780.5};assert(api.unstuckPast(a));assert.deepEqual(a.location,entrance);
walkDimension.getBlock=oldBlocks;
console.log('PASS: two full acts, seven cuts, instant TP, continued music, exit cleanup and two recovery routes.');
// Light changes restore only their own air cells and never erase later edits.
ctx.BlockPermutation={resolve:typeId=>({typeId})};
const lamps=new Map(),lampDimension={getBlock(at){const key=JSON.stringify(at);if(!lamps.has(key))lamps.set(key,{permutation:{typeId:'minecraft:air'},get typeId(){return this.permutation.typeId},get isAir(){return this.typeId==='minecraft:air'},setPermutation(p){this.permutation=p}});return lamps.get(key)}};
const light=vm.runInContext('createPastLighting()',ctx);light.update(lampDimension,8);
assert([...lamps.values()].some(b=>b.typeId.startsWith('minecraft:light_block')),'palm produced no native light');
light.clear();assert([...lamps.values()].every(b=>b.isAir),'temporary palm light remained after cancellation');
light.update(lampDimension,8);const lit=[...lamps.values()].find(b=>!b.isAir);lit.setPermutation({typeId:'minecraft:stone'});light.clear();assert.equal(lit.typeId,'minecraft:stone','cleanup erased a later block');
console.log('PASS: palm lighting, cancellation cleanup and occupied-cell preservation.');

let previousLight=Infinity,maxStep=0;
for(let t=0;t<=arrival.PAST_ARRIVAL.ticks;t++){
 const f=arrival.pastArrivalFrame(t);
 assert(f.light.y<=previousLight+.00001,'arrival ascended instead of falling');previousLight=f.light.y;
 assert(Object.values(f.camera).every(Number.isFinite));
 assert(f.light.x>=208&&f.light.x<=431&&f.light.z>=-896&&f.light.z<=-657,'light left the map');
 if(t){const p=arrival.pastArrivalFrame(t-1).camera;maxStep=Math.max(maxStep,Math.hypot(f.camera.x-p.x,f.camera.y-p.y,f.camera.z-p.z));}
}
assert(maxStep<4,'camera jumped '+maxStep);
const start=arrival.pastArrivalLight(0),opposite=arrival.pastArrivalLight(arrival.PAST_ARRIVAL.turn),last=arrival.pastArrivalLight(280),mid=arrival.pastArrivalFrame(140);
assert(start.x-opposite.x>160&&opposite.z-start.z>130,'route did not cross opposite town corners');
assert.equal(last.x,policy.PAST.spawn.x);assert.equal(last.z,policy.PAST.spawn.z);
assert(Math.hypot(mid.camera.x-mid.light.x,mid.camera.z-mid.light.z)>40,'missing distant mid-flight view');
await pump(api.exitPast(a));
const beforeParticles=a.particles.length;
assert(await pump(defaultEntry(a)),'default arrival did not start');
assert(arrival.pastArrivalActive(a));assert.equal(a.mode,'spectator');
const startTick=system.currentTick;
for(let t=2;t<=322;t+=2){system.currentTick=startTick+t;for(const h of arrivalIntervals)if(t%h.t===0)h.f();if(t%20===0)intervals.find(x=>x.t===20).f();}
assert(a.particles.length>beforeParticles);assert.equal(a.mode,'adventure');assert(!arrival.pastArrivalActive(a));
assert.equal(a.location.x,policy.PAST.spawn.x);assert.equal(a.location.z,policy.PAST.spawn.z);
assert(a.enabled.get('movement')&&a.enabled.get('camera'));assert(!a.getDynamicProperty(arrival.PAST_ARRIVAL.key));
assert(!effects.some(e=>String(e[0]).startsWith('warland:past_arrival')),'arrival light broadcast to film viewers');
assert(arrival.startPastArrival(a));system.currentTick+=42;arrivalIntervals.find(x=>x.t===2).f();
const count=a.particles.length;assert(await pump(api.startPastFilm(a)));assert(!arrival.pastArrivalActive(a));
system.currentTick+=40;arrivalIntervals.find(x=>x.t===2).f();assert.equal(a.particles.length,count,'light emitted during Colossus film');
assert.equal(arrival.startPastArrival(a),false,'film accepted overlapping arrival');api.stopPastFilm(a);
await pump(api.exitPast(a));assert(await pump(api.startPastFilm(a)),'direct film entry failed');assert(!arrival.pastArrivalActive(a),'direct film played arrival');api.stopPastFilm(a);
assert(arrival.startPastArrival(a));a.setDynamicProperty('warland:heart_death_v1','active');system.currentTick+=2;arrivalIntervals.find(x=>x.t===2).f();
assert(a.getDynamicProperty(arrival.PAST_ARRIVAL.key),'death recovery record lost');a.setDynamicProperty('warland:heart_death_v1',undefined);arrivalIntervals.find(x=>x.t===20).f();assert(!a.getDynamicProperty(arrival.PAST_ARRIVAL.key));assert.equal(a.mode,'adventure');
console.log('PASS: corner-to-corner arrival, wide view, entrance landing, private light, film exclusion and death recovery.');
