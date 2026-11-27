import {BlockPermutation} from '@minecraft/server';
import {PALM_LIGHT} from './past-palm-path.js';
// Invisible block lighting works in the classic mobile renderer. The purple
// orb supplies color; this light makes its hand and the surrounding stone read.
export function createPastLighting(){
 let active=null,last='';
 function clear(){
  if(active)try{const b=active.dimension.getBlock(active.at);if(b?.typeId===active.placed)b.setPermutation(active.before)}catch{}
  active=null;last='';
 }
 function update(d,time){
  const row=PALM_LIGHT[Math.min(PALM_LIGHT.length-1,Math.max(0,Math.floor(time*5)))];
  if(time<0||time>=14.534||!row[4]){clear();return}
  const at={x:Math.floor(row[1]),y:Math.floor(row[2]),z:Math.floor(row[3])},type='minecraft:light_block_'+row[4],key=JSON.stringify([at,type]);
  if(key===last)return;clear();last=key;
  try{const b=d.getBlock(at);if(!b?.isAir)return;active={dimension:d,at,before:b.permutation,placed:type};b.setPermutation(BlockPermutation.resolve(type))}catch{active=null}
 }
 return {update,clear};
}
