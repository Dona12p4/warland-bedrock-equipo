import {createTerrainStreaming,verifyChunkShell} from './umbral-streaming.js';
import {createChunkIntegrity,preservingDimension,shellPresent} from './umbral-chunk-integrity.js';
import {safeArrivalBiome} from './umbral-warden-policy.js';
import {createUmbralRelief} from './umbral-relief.js';
import {decorateUmbralLandmarks} from './umbral-landmarks.js';
import {BlockPermutation} from '@minecraft/server';
import {createTerrainQueue} from './mobile-terrain-queue.js';
import {world,system,BlockVolume} from '@minecraft/server';
import {cfg} from './void-config.js';
import {decorate} from './biome-features.js';
const pending=new Map(),built=new Set(),DIM='the_end',enqueueTerrain=createTerrainQueue(system);
export const terrainQueueSize=()=>pending.size;
const fade=t=>t*t*(3-2*t),lerp=(a,b,t)=>a+(b-a)*t;
const hash=(x,z,s=0)=>{const n=Math.sin(x*127.1+z*311.7+cfg.seed+s*19.1)*43758.5453;return n-Math.floor(n);};
function noise(x,z,scale,s=0){x/=scale;z/=scale;const ix=Math.floor(x),iz=Math.floor(z),u=fade(x-ix),v=fade(z-iz);return lerp(lerp(hash(ix,iz,s),hash(ix+1,iz,s),u),lerp(hash(ix,iz+1,s),hash(ix+1,iz+1,s),u),v);}
export function biomeAt(x,z){
 if(Math.hypot(x-cfg.arrival.x,z-cfg.arrival.z)<30)return {id:'ash',name:biomeName('ash')};
 // Jittered region cells keep each habitat broad and recognizable. Warping
 // their edges avoids straight chunk borders without changing ground height.
 const scale=cfg.biomes.scale,wx=x+(noise(x,z,55,175)-.5)*36,wz=z+(noise(x,z,55,176)-.5)*36;
 let nearest=Infinity,id='ash';
 for(let gx=Math.floor(wx/scale)-1;gx<=Math.floor(wx/scale)+1;gx++)for(let gz=Math.floor(wz/scale)-1;gz<=Math.floor(wz/scale)+1;gz++){
  const px=(gx+.2+hash(gx,gz,177)*.6)*scale,pz=(gz+.2+hash(gx,gz,178)*.6)*scale,d=(px-wx)**2+(pz-wz)**2;
  if(d<nearest){nearest=d;id=cfg.biomes.catalog[Math.floor(hash(gx,gz,179)*cfg.biomes.catalog.length)].id;}
 }
 id=safeArrivalBiome(id,x,z,cfg);
 return {id,name:biomeName(id)};
}
const biomeName=id=>cfg.biomes.catalog.find(b=>b.id===id)?.name??(id==='forest'?cfg.biomes.forestName:'Cavernas de Ceniza');
export function surfaceAt(x,z){
 // Generation writes 2x2 columns. Sample the SAME position for path/spawn height.
 return terrainAt(Math.floor(x/2)*2+.5,Math.floor(z/2)*2+.5);
}
export const naturalGround=id=>['warland:umbral_stone','warland:umbral_tile','warland:umbral_moss','warland:umbral_soil','warland:umbral_root_soil','warland:umbral_ash_ground','warland:umbral_slate','warland:umbral_black_soil','minecraft:sculk','minecraft:deepslate','minecraft:deepslate_tiles','minecraft:cobbled_deepslate'].includes(id);
const mobileTerrainRevisions=new Map();
function terrainRevision(x,z){const k=`wl_umbral_c3_${Math.floor(x/16)}_${Math.floor(z/16)}`;if(!mobileTerrainRevisions.has(k))mobileTerrainRevisions.set(k,Number(world.getDynamicProperty(k+'_revision'))||(world.getDynamicProperty(k)===true?7:8));return mobileTerrainRevisions.get(k);}
const relief=createUmbralRelief(world,cfg,noise,legacyTerrainAt,{"version":[0,8,0],"generationRevision":10,"transitionBlocks":32,"arrivalQuietRadius":24,"arrivalBlendBlocks":40,"floorMinimum":36,"floorMaximum":112,"minimumHeadroom":48,"reset":false});
export const reliefBlendAt=relief.blendAt;
export const terrainAt=relief.terrainAt;
function legacyTerrainAt(x,z){
 let floor=Math.floor(43+noise(x,z,88)*23+noise(x,z,22,2)*8),ceiling=Math.floor(143+noise(x,z,105,4)*33+noise(x,z,31,5)*9);
 // Quiet arrival; continuous terrain outside it, never separate floating islands.
 const arrivalDistance=Math.hypot(x-cfg.arrival.x,z-cfg.arrival.z),arrivalBlend=fade(Math.min(1,Math.max(0,(arrivalDistance-7)/12)));
 floor=Math.round(52+(floor-52)*arrivalBlend);
 let pillar=0;
 for(let gx=Math.floor(x/64)-1;gx<=Math.floor(x/64)+1;gx++)for(let gz=Math.floor(z/64)-1;gz<=Math.floor(z/64)+1;gz++){
  const px=gx*64+12+hash(gx,gz,11)*40,pz=gz*64+12+hash(gx,gz,12)*40,rad=4+hash(gx,gz,13)*6;
  if(Math.hypot(px-cfg.arrival.x,pz-cfg.arrival.z)<24)continue;
  const distance=Math.hypot(x-px,z-pz);pillar=Math.max(pillar,Math.max(0,1-distance/(rad*2)));
 }
 // Broad walkable forest clearings in new terrain; saved revision-7 floors remain exact.
 if(terrainRevision(x,z)>=8&&biomeAt(x,z).id==='roots')pillar*=.2;
 const solid=pillar>.53;
 if(!solid){floor+=Math.floor(pillar*24);ceiling-=Math.floor(pillar*33);}
 return {floor,ceiling,solid};
}
const key=(x,z)=>`wl_umbral_c3_${x}_${z}`;
export const hasGeneratedRecord=(x,z)=>world.getDynamicProperty(key(x,z))===true;
const integrity=createChunkIntegrity({system,dimension:()=>world.getDimension(DIM),recorded:hasGeneratedRecord});
export const isGenerated=integrity.ready;
export function generatedBiomeAt(x,z){
 const id=world.getDynamicProperty(key(Math.floor(x/16),Math.floor(z/16))+'_biome');
 const revision=world.getDynamicProperty(key(Math.floor(x/16),Math.floor(z/16))+'_revision')??0;
 return {id:id??'ash',name:id==='ash'&&revision<7?'Cavernas de Ceniza':biomeName(id),revision};
}
function fill(d,x0,y0,z0,x1,y1,z1,id){
 if(y1<y0)return;
 const volume=new BlockVolume({x:x0,y:y0,z:z0},{x:x1,y:y1,z:z1});
 // fillBlocks reports CHANGED cells: filling existing air can legitimately
 // return zero. Completion is verified with loaded state and physical shell.
 if(!d.isChunkLoaded({x:x0,y:80,z:z0}))throw Error('Chunk descargado antes de escribir');
 d.fillBlocks(volume,id);
 if(!d.isChunkLoaded({x:x0,y:80,z:z0}))throw Error('Chunk descargado durante escritura');
}
export function ensureChunk(cx,cz){
 const k=key(cx,cz);if(isGenerated(cx,cz)){built.add(k);return Promise.resolve(true);}if(pending.has(k))return pending.get(k);
 let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});pending.set(k,promise);
 enqueueTerrain((function*(){try{
  const real=world.getDimension(DIM),x0=cx*16,z0=cz*16;
  if(!real.isChunkLoaded({x:x0+8,y:80,z:z0+8}))throw Error('Chunk no cargado');
  // A complete physical shell with a missing flag is adopted, never repainted.
  if(shellPresent(real,cx,cz)){
   try{verifyChunkShell(real,cx,cz);world.setDynamicProperty(k+'_revision',world.getDynamicProperty(k+'_revision')??cfg.biomes.generationRevision);world.setDynamicProperty(k+'_biome',world.getDynamicProperty(k+'_biome')??biomeAt(x0+8,z0+8).id);world.setDynamicProperty(k,true);integrity.accept(cx,cz);resolve(true);return;}catch{}
  }
  const repair=yield* preservingDimension(real,cx,cz,{recorded:hasGeneratedRecord(cx,cz)});
  if(repair.adopt){integrity.accept(cx,cz);resolve(true);return;}
  const d=repair.dimension;
  if(hasGeneratedRecord(cx,cz))console.warn('[UMBRAL] Reparando chunk End marcado como completo '+cx+','+cz+'; celdas conservadas '+repair.preserved);

  // Clear only a newly generated cavity; keep vanilla Nether generation.
  fill(d,x0,32,z0,x0+15,111,z0+15,'minecraft:air');yield;
  fill(d,x0,112,z0,x0+15,191,z0+15,'minecraft:air');yield;
  fill(d,x0,0,z0,x0+15,31,z0+15,'warland:umbral_stone');yield;
  fill(d,x0,192,z0,x0+15,255,z0+15,'warland:umbral_stone');yield;
  for(let x=x0;x<x0+16;x+=2)for(let z=z0;z<z0+16;z+=2){
   const t=terrainAt(x+.5,z+.5),stone=hash(x,z,24)>.84?'warland:umbral_tile':'warland:umbral_stone',biome=biomeAt(x+.5,z+.5);
   fill(d,x,32,z,x+1,t.floor,z+1,stone);
   fill(d,x,t.ceiling,z,x+1,191,z+1,'warland:umbral_stone');
   if(t.solid)fill(d,x,t.floor+1,z,x+1,t.ceiling-1,z+1,'warland:umbral_pillar');
   else if(biome.id==='silent')fill(d,x,t.floor-3,z,x+1,t.floor,z+1,'minecraft:deepslate');
   yield;
  }
  yield* decorate(d,x0,z0,{surfaceAt,biomeAt,noise,hash});
  yield* decorateUmbralLandmarks(d,x0,z0,{surfaceAt,biomeAt,hash,blendAt:reliefBlendAt,BlockPermutation});
  // Roof/floor bedrock protect the outer boundary without a visible End sky.
  fill(d,x0,0,z0,x0+15,0,z0+15,'minecraft:bedrock');fill(d,x0,255,z0,x0+15,255,z0+15,'minecraft:bedrock');
  verifyChunkShell(d,cx,cz);
  world.setDynamicProperty(k+'_biome',biomeAt(x0+8,z0+8).id);world.setDynamicProperty(k+'_revision',cfg.biomes.generationRevision);world.setDynamicProperty(k,true);built.add(k);integrity.accept(cx,cz);resolve(true);
 }catch(e){reject(e);}finally{pending.delete(k);}})());
 return promise;
}
export async function prepareArrival(){
 const d=world.getDimension(DIM),c=cfg.arrival,cx=Math.floor(c.x/16),cz=Math.floor(c.z/16);
 d.runCommand(`tickingarea add circle ${c.x} 80 ${c.z} 3 wl_umbral_arrival true`);
 await new Promise(r=>system.runTimeout(r,30));
 try{for(let r=0;r<=2;r++)for(let x=cx-r;x<=cx+r;x++)for(let z=cz-r;z<=cz+r;z++)if(Math.max(Math.abs(x-cx),Math.abs(z-cz))===r)await ensureChunk(x,z);}
 finally{try{d.runCommand('tickingarea remove wl_umbral_arrival');}catch{}}
 return {x:c.x,y:terrainAt(c.x,c.z).floor+1,z:c.z};
}
const streaming=createTerrainStreaming({system,dimension:()=>world.getDimension(DIM),isGenerated,ensureChunk,pendingCount:()=>pending.size,radius:cfg.generationRadiusChunks,capacity:2});
export const requestAround=streaming.request;
// Explicit admin travel discovers untouched terrain; existing chunks are never
// repainted, so player builds and the original cavern remain intact.
export const prepareSilentBiome=origin=>prepareBiome(origin,'silent');
export async function prepareBiome(origin,id){
 if(!cfg.biomes.catalog.some(b=>b.id===id))throw Error('Bioma no disponible.');
 let candidate;
 const cx=Math.floor(origin.x/16),cz=Math.floor(origin.z/16);
 outer:for(let ring=5;ring<=96;ring++)for(let dx=-ring;dx<=ring;dx++)for(const dz of (Math.abs(dx)===ring?Array.from({length:ring*2+1},(_,i)=>i-ring):[-ring,ring])){
  const x=(cx+dx)*16+8.5,z=(cz+dz)*16+8.5,t=surfaceAt(x,z);
  if(!hasGeneratedRecord(cx+dx,cz+dz)&&!t.solid&&[[0,0],[16,0],[-16,0],[0,16],[0,-16]].every(([dx,dz])=>biomeAt(x+dx,z+dz).id===id)){candidate={x,z,y:t.floor+1};break outer;}
 }
 if(!candidate)throw Error('No se encontró terreno nuevo cerca.');
 const d=world.getDimension(DIM),area='wl_'+id+'_preview';
 d.runCommand(`tickingarea add circle ${candidate.x} 80 ${candidate.z} 2 ${area} true`);
 try{
  await new Promise(r=>system.runTimeout(r,30));
  const tx=Math.floor(candidate.x/16),tz=Math.floor(candidate.z/16);
  for(let x=tx-1;x<=tx+1;x++)for(let z=tz-1;z<=tz+1;z++)await ensureChunk(x,z);
  for(let dx=-12;dx<=12;dx++)for(let dz=-12;dz<=12;dz++){const x=candidate.x+dx,z=candidate.z+dz,t=surfaceAt(x,z),p={x,y:t.floor+1,z};
   if(biomeAt(x,z).id===id&&!t.solid&&[0,1,2,3,4].every(y=>d.getBlock({...p,y:p.y+y})?.isAir)&&naturalGround(d.getBlock({...p,y:p.y-1})?.typeId))return p;
  }
  throw Error('No se encontró un punto de llegada libre.');
 }finally{try{d.runCommand('tickingarea remove '+area);}catch{}}
}

// Occupancy is replayed against an in-memory chunk, never the edited world.
import {createOriginalTerrain,reconstructOriginalLayout} from './umbral-original-layout.js';
const originalTerrain=createOriginalTerrain({world,system,isGenerated,reconstruct:function*(cx,cz){
 return yield* reconstructOriginalLayout(cx,cz,{surfaceAt,decorateChunk:function*(d,x0,z0){
  yield* decorate(d,x0,z0,{surfaceAt,biomeAt,noise,hash});
  yield* decorateUmbralLandmarks(d,x0,z0,{surfaceAt,biomeAt,hash,blendAt:reliefBlendAt,BlockPermutation});
 }});
}});
export const originallyOccupied=originalTerrain.occupied;
