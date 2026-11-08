import {world,system,BlockVolume} from '@minecraft/server';
import {isGenerated} from './terrain.js';
import {cfg} from './void-config.js';
import {nearArrival} from './umbral-warden-policy.js';

// Upgrade loaded Umbral chunks in place. Only the shrieker's summoning state
// changes; blocks, active state, player builds and other dimensions are kept.
export function enableChunkShriekers(d,cx,cz){
 if(d.id!=='minecraft:the_end'||!isGenerated(cx,cz))return {complete:false,changed:0};
 const marker=`wl_umbral_shriekers_v2_${cx}_${cz}`;
 if(world.getDynamicProperty(marker)===true)return {complete:true,changed:0};
 const x=cx*16,z=cz*16;let changed=0;
 try{
  if(!d.getBlock({x,y:80,z})||!d.getBlock({x:x+15,y:80,z:z+15}))return {complete:false,changed};
  const found=d.getBlocks(new BlockVolume({x,y:32,z},{x:x+15,y:191,z:z+15}),{includeTypes:['minecraft:sculk_shrieker']});
  for(const p of found.getBlockLocationIterator()){
   const b=d.getBlock(p);
   const allowed=!nearArrival(p,cfg);
   if(b?.typeId==='minecraft:sculk_shrieker'&&b.permutation.getState('can_summon')!==allowed){b.setPermutation(b.permutation.withState('can_summon',allowed));changed++;}
  }
  world.setDynamicProperty(marker,true);return {complete:true,changed};
 }catch{return {complete:false,changed};}
}
const offsets=[];for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)offsets.push({x,z});offsets.sort((a,b)=>a.x*a.x+a.z*a.z-b.x*b.x-b.z*b.z);
let cursor=0;
system.runInterval(()=>{
 const offset=offsets[cursor++%offsets.length];
 for(const p of world.getAllPlayers())if(p.dimension.id==='minecraft:the_end')enableChunkShriekers(p.dimension,Math.floor(p.location.x/16)+offset.x,Math.floor(p.location.z/16)+offset.z);
},10);
