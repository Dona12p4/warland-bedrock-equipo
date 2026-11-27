import {world,system,BlockPermutation} from '@minecraft/server';
import {PAST,cameraAt,inPast} from './past-policy.js';
import {escapeProbe} from './past-travel.js';
const wait=t=>new Promise(r=>system.runTimeout(r,t));
world.afterEvents.worldLoad.subscribe(()=>system.runTimeout(async()=>{
 const d=world.getDimension(PAST.dimension),restore=[],areas=[],evidence=[];
 const assert=(ok,label,extra={})=>{if(!ok)throw Error(label);evidence.push({label,...extra})};
 try{
  for(const [name,x0,z0,x1,z1] of [['past_film_probe',208,-848,415,-737],['past_escape_probe',480,-608,495,-577]]){
   try{d.runCommand('tickingarea remove '+name)}catch{}await wait(2);
   assert(d.runCommand(`tickingarea add ${x0} 48 ${z0} ${x1} 420 ${z1} ${name} true`).successCount===1,'reserved '+name);areas.push(name);
  }
  for(let i=0;i<100;i++){await wait(2);try{if(d.getBlock({x:484,y:180,z:-592})&&d.getBlock({x:284,y:320,z:-783}))break}catch{}}
  for(const [x,y,z] of [[250,61,-783],[284,64,-783],[272,63,-800],[302,63,-766]]){
   const high=d.getBlock({x,y:y+256,z}),low=d.getBlock({x,y,z});assert(!!high&&!!low,'loaded both sets',{at:[x,y,z],ruins:low.typeId,intact:high.typeId});
  }
  assert(!d.getBlock({x:250,y:317,z:-783}).isAir,'intact memory floor exists');
  for(const t of [0,9.25,13.7,17.6,27.44,30.6,44.57,59.1]){const c=cameraAt(t),a=c.position;assert(!!d.getBlock({x:Math.floor(a[0]),y:Math.floor(a[1]),z:Math.floor(a[2])}),'loaded camera '+t)}
  assert(!inPast({get dimension(){throw Error('removed')}}),'removed entity safe');
  const stone=BlockPermutation.resolve('minecraft:stone');
  for(let x=480;x<=494;x++)for(let z=-600;z<=-586;z++)for(let y=180;y<=185;y++){
   const b=d.getBlock({x,y,z});assert(b?.isAir,'fixture originally empty');restore.push([b,b.permutation]);
   if(y===180||((Math.abs(x-487)>1||Math.abs(z+593)>1)&&y<184))b.setPermutation(stone);
  }
  let q=escapeProbe(d,{x:487.5,y:181,z:-592.5});assert(q.trapped,'native enclosed pit detected',{probe:q});
  // Three footholds connect its bottom to the rim using ordinary jumps.
  for(const [x,y] of [[488,181],[489,182],[490,183]]){
   for(let yy=181;yy<=185;yy++)d.getBlock({x,y:yy,z:-593}).setPermutation(BlockPermutation.resolve(yy<=y?'minecraft:stone':'minecraft:air'));
  }
  q=escapeProbe(d,{x:487.5,y:181,z:-592.5});assert(!q.trapped,'native stairs provide escape',{probe:q});
  const light=BlockPermutation.resolve('minecraft:light_block_11');assert(!!light,'native cinematic light available');
 }catch(e){console.warn('[PAST_TEST_FAIL] '+e+' '+e.stack)}
 finally{
  for(const [b,p] of restore)b.setPermutation(p);
  for(const name of areas)d.runCommand('tickingarea remove '+name);
 }
 console.warn('[PAST_TEST_DONE] '+JSON.stringify({checks:evidence.length,evidence:evidence.filter(e=>e.label!=='fixture originally empty'),restored:restore.length}));
},20));
