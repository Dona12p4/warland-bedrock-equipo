// Fair, bounded admission into the existing cooperative terrain job.
// A failing/unloaded edge cannot monopolize the first player's two slots.
export function createTerrainStreaming({system,dimension,isGenerated,ensureChunk,pendingCount,radius=8,capacity=2}){
 const roster=new Map(),failures=new Map();let scheduled=false,nextPlayer=0;
 const key=(x,z)=>x+','+z;
 function failed(cx,cz,error){
  const k=key(cx,cz),old=failures.get(k),count=(old?.count??0)+1,tick=system.currentTick;
  failures.set(k,{count,retry:tick+Math.min(100,10*2**Math.min(3,count-1)),logged:old?.logged??tick});
  if(!old||tick-old.logged>=1200){console.warn('[UMBRAL] Chunk '+k+' pendiente; reintento: '+String(error));failures.get(k).logged=tick;}
  // Failure history is diagnostic/backoff only, never a generation marker.
  if(failures.size>256)failures.delete(failures.keys().next().value);
 }
 function submit(p){
  const d=dimension(),cx=Math.floor(p.location.x/16),cz=Math.floor(p.location.z/16);
  for(let ring=0;ring<=radius;ring++)for(let dx=-ring;dx<=ring;dx++)for(let dz=-ring;dz<=ring;dz++)if(Math.max(Math.abs(dx),Math.abs(dz))===ring){
   const x=cx+dx,z=cz+dz,k=key(x,z),f=failures.get(k);
   if(isGenerated(x,z)||(f&&f.retry>system.currentTick))continue;
   try{
    // getBlock alone can observe a chunk that is no longer fully available.
    if(!d.isChunkLoaded({x:x*16+8,y:80,z:z*16+8}))continue;
    const before=pendingCount(),work=ensureChunk(x,z);
    if(pendingCount()===before)continue;
    work.then(()=>failures.delete(k),e=>failed(x,z,e));return true;
   }catch(e){failed(x,z,e);}
  }
  return false;
 }
 function flush(){
  scheduled=false;const players=[...roster.values()].filter(p=>p.isValid!==false&&p.dimension.id==='minecraft:the_end');roster.clear();
  if(!players.length)return;
  let visited=0,admitted=0;
  // At most capacity admissions per pass; rotate through ALL connected players
  // even when the first player is continuously exploring new chunks.
  while(visited<players.length&&pendingCount()<capacity){const index=nextPlayer++%players.length;visited++;if(submit(players[index]))admitted++;}
  if(players.length===1&&admitted&&pendingCount()<capacity)submit(players[0]);
  nextPlayer%=players.length;
 }
 function request(player){roster.set(player.id,player);if(!scheduled){scheduled=true;system.run(flush);}}
 return {request,flush,failed,pendingFailures:()=>failures.size};
}

export function verifyChunkShell(d,cx,cz){
 if(!d.isChunkLoaded({x:cx*16+8,y:80,z:cz*16+8}))throw Error('Chunk se descargo antes de completar');
 for(const x of [0,7,15])for(const z of [0,7,15])for(const y of [0,255]){
  if(d.getBlock({x:cx*16+x,y,z:cz*16+z})?.typeId!=='minecraft:bedrock')throw Error('Limite de chunk incompleto');
 }
}
