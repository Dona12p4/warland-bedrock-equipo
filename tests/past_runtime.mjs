import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),file=n=>fs.readFileSync(new URL('packs/behavior_packs/WARLAND_BP/scripts/'+n,root),'utf8');
const policy=await import('data:text/javascript;base64,'+Buffer.from(file('past-policy.js')).toString('base64'));
assert.equal(policy.inPast({get dimension(){throw Error('removed')}}),false);
assert.equal(policy.memoryAt(9.25),true);assert.equal(policy.memoryAt(9.5),false);
assert.equal(policy.cameraAt(9.25).position[1]>300,true);
assert.equal(policy.cameraAt(10).position[1]<100,true);
assert(policy.inPastBounds({x:250,y:64,z:-783}));
assert(policy.inPastBounds({x:1274,y:64,z:-783}));
assert(!policy.inPastBounds({x:800,y:64,z:-783}));
assert(!policy.inPastBounds({x:250,y:2,z:-783}));
assert(!policy.validReturn({dimension:policy.PAST.dimension,location:{x:0,y:60,z:0},mode:'survival'}));
assert(!policy.validReturn({dimension:'minecraft:overworld',location:{x:NaN,y:60,z:0},mode:'survival'}));
assert(policy.validReturn({dimension:'minecraft:overworld',location:{x:0,y:60,z:0},mode:'creative'}));
assert(!policy.pastAdmin('DanielGamerSC impostor'));
assert.equal(policy.shotAt(13.7).index,1);
assert.equal(policy.shotAt(44.566666667).index,3);
assert.equal(policy.SHOTS.at(-1).t+policy.SHOTS.at(-1).d,policy.PAST.duration);
const makeEvents=()=>new Proxy({}, {get(o,k){return o[k]??=( {callbacks:[],subscribe(f){this.callbacks.push(f)}} )}});
const before=makeEvents(),after=makeEvents(),startup=makeEvents(),timeouts=[],intervals=[],commands=[],players=[],actors=[];
const props=new Map(),effects=[],logs=[];
const dims=new Map();
for(const id of [policy.PAST.dimension,'minecraft:overworld'])dims.set(id,{id,runCommand(c){commands.push(c);return {successCount:1}},getBlock(){return {isAir:false,isLiquid:false,typeId:'minecraft:stone'}},getEntities(){return actors.filter(e=>e.isValid)},spawnParticle(...a){effects.push(a)},spawnEntity(typeId,location){const e={typeId,location,isValid:true,setRotation(){},setProperty(){},remove(){this.isValid=false}};actors.push(e);return e;}});
const world={beforeEvents:before,afterEvents:after,getAllPlayers:()=>players,getDynamicProperty:k=>props.get(k),getDimension:id=>dims.get(id)};
const system={currentTick:100,beforeEvents:startup,run:f=>timeouts.push(f),runTimeout:f=>timeouts.push(f),runInterval:(f,t)=>intervals.push({f,t})};
class Player{
 constructor(name){Object.assign(this,{name,id:name,isValid:true,typeId:'minecraft:player',dimension:dims.get('minecraft:overworld'),location:{x:10,y:65,z:20},mode:'creative',properties:new Map(),tags:new Set(),enabled:new Map([['camera',true],['movement',true]]),messages:[]});
 this.inputPermissions={isPermissionCategoryEnabled:c=>this.enabled.get(c),setPermissionCategory:(c,v)=>this.enabled.set(c,v)};
 this.camera={fade(){},clear(){},resetFov(){},setCamera(){},setFov(){}};
 this.onScreenDisplay={setTitle(){},getHiddenHudElements:()=>[],setHudVisibility(){}};
 }
 getDynamicProperty(k){return this.properties.get(k)} setDynamicProperty(k,v){this.properties.set(k,v)}
 hasTag(t){return this.tags.has(t)} addTag(t){this.tags.add(t)} removeTag(t){this.tags.delete(t)}
 getComponent(){return {currentValue:20}} getGameMode(){return this.mode} setGameMode(v){this.mode=v}
 getRotation(){return {x:0,y:20}} sendMessage(t){this.messages.push(t)} runCommand(c){commands.push(c)} playSound(){}
 teleport(l,o={}){this.location={...l};if(o.dimension)this.dimension=o.dimension}
}
const ctx=vm.createContext({...policy,world,system,Player,GameMode:{Creative:'creative',Adventure:'adventure',Survival:'survival',Spectator:'spectator'},HudVisibility:{Hide:0,Reset:1},InputPermissionCategory:{Camera:'camera',Movement:'movement'},CommandPermissionLevel:{Any:0},CustomCommandStatus:{Success:0,Failure:1},ActionFormData:class{},console:{warn:x=>logs.push(x)}});
for(const name of ['past-music.js','past-travel.js','past.js'])vm.runInContext(file(name).replace(/^import .+;\r?\n/gm,'').replace(/\bexport /g,''),ctx);
const api=vm.runInContext('({enterPast,exitPast,startPastFilm,stopPastFilm,pastDebug,unstuckPast,createPastMusic,escapeProbe})',ctx);
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
