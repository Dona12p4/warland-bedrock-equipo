import {world,system,BlockVolume} from '@minecraft/server';
import {isGenerated} from './terrain.js';
const last=new Map();let turn=0;
export function removeNativeChorus(d,cx,cz){
 if(d.id!=='minecraft:the_end'||!isGenerated(cx,cz))return 0;
 let removed=0;
 try{
  const x=cx*16,z=cz*16;
  const found=d.getBlocks(new BlockVolume({x,y:0,z},{x:x+15,y:255,z:z+15}),{includeTypes:['minecraft:chorus_plant','minecraft:chorus_flower']});
  for(const p of found.getBlockLocationIterator()){
   const b=d.getBlock(p);if(b&&['minecraft:chorus_plant','minecraft:chorus_flower'].includes(b.typeId)){b.setType('minecraft:air');removed++;}
  }
 }catch{}return removed;
}
system.runInterval(()=>{
 const players=world.getDimension('the_end').getPlayers();if(!players.length)return;
 const p=players[turn++%players.length],cx=Math.floor(p.location.x/16),cz=Math.floor(p.location.z/16),tick=system.currentTick;
 let count=0;
 for(let ring=0;ring<=5&&count<2;ring++)for(let dx=-ring;dx<=ring&&count<2;dx++)for(let dz=-ring;dz<=ring&&count<2;dz++){
  if(Math.max(Math.abs(dx),Math.abs(dz))!==ring)continue;
  const x=cx+dx,z=cz+dz,key=x+','+z;if(!isGenerated(x,z)||tick-(last.get(key)??-1000)<400)continue;
  try{if(!p.dimension.getBlock({x:x*16,y:80,z:z*16}))continue;}catch{continue;}
  removeNativeChorus(p.dimension,x,z);last.set(key,tick);count++;
 }
 if(last.size>1024)for(const [key,t]of last)if(tick-t>1200)last.delete(key);
},10);
