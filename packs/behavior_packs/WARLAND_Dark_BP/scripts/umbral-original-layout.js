// Reconstruct the generator's occupancy in memory, NEVER from player builds.
// The bitset is 8 KiB (16 KiB serialized), below one Bedrock string property.
// Persist on first interaction so later generator changes cannot rewrite history.
const PREFIX='warland:origin_v1_',HEX='0123456789abcdef';
const address=p=>{const cx=Math.floor(p.x/16),cz=Math.floor(p.z/16);return {cx,cz,key:PREFIX+cx+'_'+cz,index:(Math.floor(p.x)-cx*16)*4096+(Math.floor(p.z)-cz*16)*256+Math.floor(p.y)};};
const bit=(a,i)=>!!(a[i>>3]&(1<<(i&7)));
const set=(a,i,on)=>{if(on)a[i>>3]|=1<<(i&7);else a[i>>3]&=~(1<<(i&7));};
export function* reconstructOriginalLayout(cx,cz,{surfaceAt,decorateChunk}){
 const x0=cx*16,z0=cz*16,bits=new Uint8Array(8192),changed=new Map();
 for(let x=x0;x<x0+16;x++)for(let z=z0;z<z0+16;z++){
  const t=surfaceAt(x,z),offset=(x-x0)*4096+(z-z0)*256;
  for(let y=0;y<256;y++)if(y<=31||y>=192||t.solid||y<=t.floor||y>=t.ceiling)set(bits,offset+y,true);
  yield;
 }
 // Decorators only use local getBlock/isAir/typeId/setPermutation. Preserve
 // those reads and their write order, including hollow vents and leaves.
 const virtual={getBlock(p){
  if(p.x<x0||p.x>=x0+16||p.z<z0||p.z>=z0+16||p.y<0||p.y>255)throw Error('Original layout escaped its chunk');
  const i=(p.x-x0)*4096+(p.z-z0)*256+p.y;
  return {get typeId(){return changed.get(i)??(bit(bits,i)?'warland:umbral_stone':'minecraft:air');},
   get isAir(){return !bit(bits,i);},setPermutation(permutation){const id=permutation.type.id;changed.set(i,id);set(bits,i,id!=='minecraft:air');}};
 }};
 yield* decorateChunk(virtual,x0,z0);
 return bits;
}
export function createOriginalTerrain({world,system,isGenerated,reconstruct,cacheLimit=16}){
 const cache=new Map(),pending=new Map();let running=false;
 function remember(k,b){cache.delete(k);cache.set(k,b);while(cache.size>cacheLimit)cache.delete(cache.keys().next().value);return b;}
 function enqueue(a){
  if(pending.has(a.key)||pending.size>=64)return;
  pending.set(a.key,a);if(running)return;running=true;
  system.runJob((function*(){try{while(pending.size){
   const [key,p]=pending.entries().next().value;
   try{
    const b=yield* reconstruct(p.cx,p.cz);let encoded='';
    for(let i=0;i<b.length;i++){encoded+=HEX[b[i]>>4]+HEX[b[i]&15];if(i%256===0)yield;}
    world.setDynamicProperty(key,encoded);remember(key,b);
   }catch(e){console.warn('[UMBRAL] Origen del terreno: '+e);}
   finally{pending.delete(key);}
   yield;
  }}finally{running=false;}})());
 }
 function occupied(p){
  if(p.y<0||p.y>=256)return false;
  const a=address(p);if(!isGenerated(a.cx,a.cz))return false;
  let b=cache.get(a.key);
  if(!b){
   const encoded=world.getDynamicProperty(a.key);
   if(typeof encoded==='string'&&encoded.length===16384&&/^[0-9a-f]+$/.test(encoded)){
    b=new Uint8Array(8192);for(let i=0;i<b.length;i++)b[i]=parseInt(encoded.slice(i*2,i*2+2),16);remember(a.key,b);
   }else{enqueue(a);return undefined;}
  }else remember(a.key,b);
  return bit(b,a.index);
 }
 return {occupied,pendingCount:()=>pending.size,cacheSize:()=>cache.size};
}
