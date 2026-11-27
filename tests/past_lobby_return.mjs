import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const file=new URL('../packs/behavior_packs/WARLAND_Lobby_BP/scripts/past-return.js',import.meta.url);
function fixture(){
 const timers=[],commands=[],plays=[],props=new Map();let floor=true,capacity=0,startOK=true;
 const cfg={spawn:{x:1240.5,y:72,z:-1367.5}},past={id:'warland:el_pasado'},over={id:'minecraft:overworld',runCommand(c){commands.push(c);return{successCount:1}}};
 const world={getDimension:()=>over,getDynamicProperty:k=>props.get(k),afterEvents:{worldLoad:{subscribe(){}}}};
 const ctx=vm.createContext({world,system:{runTimeout:f=>timers.push(f)},cfg,GameMode:{Spectator:'spectator'},InputPermissionCategory:{Camera:'camera',Movement:'movement'},ARRIVED:'arrived',HEART_TAG:'heart',ARRIVAL:{settle:4,maxConcurrent:8},safeArrival:()=>floor,distance:(a,b)=>Math.hypot(...['x','y','z'].map(k=>a[k]-b[k])),arrivalDebug:()=>({active:Array(capacity)}),startArrival:(p,reason)=>{plays.push({p,reason});return startOK},console});
 vm.runInContext(fs.readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,''),ctx);
 const transfer=vm.runInContext('returnFromPast',ctx);
 function player(id){return{id,isValid:true,health:20,dimension:past,location:{x:245.5,y:63,z:-782.5},mode:'adventure',tags:new Set(),properties:new Map(),camera:{fade(){}},inputPermissions:{isPermissionCategoryEnabled:()=>true},getComponent(){return{currentValue:this.health}},getDynamicProperty(k){return this.properties.get(k)},setDynamicProperty(k,v){this.properties.set(k,v)},hasTag(k){return this.tags.has(k)},getRotation(){return{x:0,y:90}},getGameMode(){return this.mode},setGameMode(m){this.mode=m},teleport(at,o){this.location={...at};this.dimension=o.dimension}}}
 async function pump(p){let done=false,value,error;p.then(v=>{done=true;value=v},e=>{done=true;error=e});for(let i=0;i<150&&!done;i++){for(const f of timers.splice(0))f();await Promise.resolve()}assert(done);if(error)throw error;return value}
 return{transfer,player,pump,timers,commands,plays,props,past,over,cfg,setFloor:v=>floor=v,setCapacity:v=>capacity=v,setStart:v=>startOK=v};
}
{
 const f=fixture(),p=f.player('one');assert(await f.pump(f.transfer(p,'survival',()=>true)));assert.deepEqual(p.location,f.cfg.spawn);assert.equal(p.dimension,f.over);assert.equal(p.mode,'survival');assert.equal(f.plays[0].reason,'past');assert(p.getDynamicProperty('arrived'));assert(f.commands.at(-1).startsWith('tickingarea remove'));
}
for(const kind of ['blocked floor','cancelled','capacity','failed start','dead','locked input']){
 const f=fixture(),p=f.player(kind),original={...p.location};let valid=()=>true;
 if(kind==='blocked floor')f.setFloor(false);
 if(kind==='cancelled')valid=()=>false;
 if(kind==='capacity')f.setCapacity(8);
 if(kind==='failed start')f.setStart(false);
 if(kind==='dead')p.health=0;
 if(kind==='locked input')p.inputPermissions.isPermissionCategoryEnabled=()=>false;
 assert.equal(await f.pump(f.transfer(p,'survival',valid)),false,kind);assert.deepEqual(p.location,original,kind+' moved the player');assert.equal(p.mode,'adventure');assert(!p.getDynamicProperty('arrived'));
}
{
 const f=fixture(),a=f.player('a'),b=f.player('b');f.setFloor(false);
 const first=f.transfer(a,'survival',()=>true),second=f.transfer(b,'creative',()=>true);
 assert.equal(f.commands.filter(c=>c.startsWith('tickingarea add')).length,1,'concurrent transfer duplicated loading area');
 assert.equal(await f.transfer(a,'survival',()=>true),false,'same player entered twice');
 f.setFloor(true);assert.deepEqual(await f.pump(Promise.all([first,second])),[true,true]);
 assert.equal(f.commands.filter(c=>c.startsWith('tickingarea remove')).length,1,'released shared area early');assert.equal(f.plays.length,2);
}
console.log('PASS: Past gate to Lobby, cinematic trigger, failed transfer rollback, cancellation, safety, concurrency and area cleanup.');
