import {BlockVolume} from '@minecraft/server';
const cell=p=>p.x+','+p.y+','+p.z;
const natural=id=>id.startsWith('warland:umbral_');
export function shellPresent(d,cx,cz){
 if(!d.isChunkLoaded({x:cx*16+8,y:80,z:cz*16+8}))return false;
 // Generated bedrock at either extreme cannot be natural End island terrain.
 // A few deliberately mined creative-mode blocks are not corruption.
 for(const [x,y,z]of [[0,0,0],[15,255,15],[7,0,7],[7,255,7]])if(d.getBlock({x:cx*16+x,y,z:cz*16+z})?.typeId==='minecraft:bedrock')return true;
 return false;
}
export function createChunkIntegrity({system,dimension,recorded}){
 const cache=new Map();
 function ready(cx,cz){
  if(!recorded(cx,cz))return false;
  const key=cx+','+cz,c=cache.get(key);if(c&&c.until>system.currentTick)return c.ready;
  let ok=false;try{ok=shellPresent(dimension(),cx,cz);}catch{}
  cache.set(key,{ready:ok,until:system.currentTick+(ok?200:10)});
  if(cache.size>1024)cache.delete(cache.keys().next().value);return ok;
 }
 function accept(cx,cz){cache.set(cx+','+cz,{ready:true,until:system.currentTick+200});}
 return {ready,accept};
}
export function* preservingDimension(d,cx,cz,{recorded=false}={}){
 const x0=cx*16,z0=cz*16,volume=new BlockVolume({x:x0,y:0,z:z0},{x:x0+15,y:255,z:z0+15});
 // Snapshot only foreign cells. Chests, their NBT/inventories, redstone and
 // player structures are left in place, not removed and recreated later.
 const foreign=d.getBlocks(volume,{excludeTypes:['minecraft:air','minecraft:end_stone']});
 const protectedCells=new Set(),columns=new Map();let naturalCount=0,visited=0;
 for(const p of foreign.getBlockLocationIterator()){
  const b=d.getBlock(p);if(!b)throw Error('Chunk descargado durante inspeccion');
  if(natural(b.typeId))naturalCount++;
  if(recorded&&naturalCount>=1024)return {dimension:d,adopt:true,preserved:0};
  protectedCells.add(cell(p));const key=p.x+','+p.z;if(!columns.has(key))columns.set(key,[]);columns.get(key).push(p.y);
  if(++visited%128===0)yield;
 }
 for(const ys of columns.values())ys.sort((a,b)=>a-b);
 if(!d.isChunkLoaded({x:x0+8,y:80,z:z0+8}))throw Error('Chunk descargado antes de reparar');
 if(!protectedCells.size)return {dimension:d,adopt:false,preserved:0};
 const proxy={
  isChunkLoaded:p=>d.isChunkLoaded(p),
  getBlock(p){const b=d.getBlock(p);if(!b)return undefined;return {
   get typeId(){return b.typeId;},get isAir(){return b.isAir;},
   setPermutation(permutation){if(!protectedCells.has(cell(p)))b.setPermutation(permutation);}
  };},
  fillBlocks(v,type){
   const a=v.getMin(),b=v.getMax();let skip=0;
   for(let x=a.x;x<=b.x;x++)for(let z=a.z;z<=b.z;z++)for(const y of columns.get(x+','+z)??[])if(y>=a.y&&y<=b.y)skip++;
   if(!skip)return d.fillBlocks(v,type);
   let written=0;
   for(let x=a.x;x<=b.x;x++)for(let z=a.z;z<=b.z;z++){
    let from=a.y;const blocked=(columns.get(x+','+z)??[]).filter(y=>y>=a.y&&y<=b.y);
    for(const stop of [...blocked,b.y+1]){
     if(stop>from)written+=d.fillBlocks(new BlockVolume({x,y:from,z},{x,y:stop-1,z}),type).getCapacity();from=stop+1;
    }
   }
   return {getCapacity:()=>written,warlandSkipped:skip};
  }
 };
 return {dimension:proxy,adopt:false,preserved:protectedCells.size};
}
