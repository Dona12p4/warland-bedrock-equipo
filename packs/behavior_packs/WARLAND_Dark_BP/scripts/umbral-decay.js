import {world,system} from '@minecraft/server';
import {isPermanentUmbralBlock} from './umbral-building-materials.js';
import {survivalConfig as cfg} from './umbral-survival-config.js';
const PREFIX='warland:decay_v1_';
const posKey=p=>Math.floor(p.x)+','+Math.floor(p.y)+','+Math.floor(p.z);
const regionKey=p=>PREFIX+[p.x,p.y,p.z].map(n=>Math.floor(n/4)).join('_');
const regionChunk=k=>{const n=k.slice(PREFIX.length).split('_').map(Number);return Math.floor(n[0]/4)+','+Math.floor(n[2]/4);};
const family=id=>id?.replace(/^minecraft:lit_/, 'minecraft:').replace(/^minecraft:unlit_/, 'minecraft:');
const end=d=>d.id==='minecraft:the_end'||d.id==='the_end';
export function installDecay({config=cfg,clock=()=>Date.now(),players=()=>world.getAllPlayers()}={}){
 const index=new Map(),cache=new Map(),dirty=new Set(),warningAt=new Map();let queue=[],cursor=0,nextRefresh=0,initialized=false;
 function addIndex(k){const c=regionChunk(k);if(!index.has(c))index.set(c,new Set());index.get(c).add(k);}
 function init(){if(initialized)return;initialized=true;for(const k of world.getDynamicPropertyIds())if(k.startsWith(PREFIX))addIndex(k);}
 function load(k){
  init();if(cache.has(k))return cache.get(k);
  let rows=[];try{rows=JSON.parse(world.getDynamicProperty(k)??'[]');}catch{}
  const entries=new Map();for(const e of rows)if(Array.isArray(e)&&e.length>=5&&e.slice(0,3).every(Number.isInteger)&&typeof e[3]==='string'&&Number.isFinite(e[4]))entries.set(e.slice(0,3).join(','),e);
  cache.set(k,entries);return entries;
 }
 function flush(){for(const k of dirty){const rows=[...load(k).values()];world.setDynamicProperty(k,rows.length?JSON.stringify(rows):undefined);if(!rows.length){index.get(regionChunk(k))?.delete(k);cache.delete(k);}else addIndex(k);}dirty.clear();}
 function put(e){const p={x:e[0],y:e[1],z:e[2]},k=regionKey(p);load(k).set(posKey(p),e);dirty.add(k);addIndex(k);}
 function find(p){return load(regionKey(p)).get(posKey(p));}
 function forget(p){const k=regionKey(p);if(load(k).delete(posKey(p))){dirty.add(k);warningAt.delete(posKey(p));}}
 function track(block,expires=clock()+config.decaySeconds*1000){
  if(!end(block.dimension)||block.isAir)return false;
  if(isPermanentUmbralBlock(block.typeId)){forget(block.location);flush();return false;}
  const p=block.location;let destination=p,falling=false;
  if(/:(sand|red_sand|gravel|anvil|.*concrete_powder)$/.test(block.typeId))try{
   const powder=block.typeId.endsWith('concrete_powder');
   const hit=block.dimension.getBlockFromRay({x:p.x+.5,y:p.y-.01,z:p.z+.5},{x:0,y:-1,z:0},{maxDistance:256,includeLiquidBlocks:powder,includePassableBlocks:false});
   if(hit&&hit.block.location.y<p.y-1){
    destination={x:p.x,y:hit.block.location.y+(powder&&hit.block.isLiquid?0:1),z:p.z};falling=true;
    while(destination.y<p.y&&(find(destination)?.[4]??0)>clock())destination.y++;
   }
  }catch{}
  // Only confirmed player placements enter this ledger. A foreign block is
  // temporary even when repairing original terrain or outside generated chunks.
  const row=[Math.floor(destination.x),Math.floor(destination.y),Math.floor(destination.z),block.typeId,expires];
  if(falling)row.push('falling');put(row);flush();nextRefresh=0;return true;
 }
 function refresh(){
  const now=clock();for(const [key,time]of warningAt)if(now-time>2000)warningAt.delete(key);
  const active=new Set(),regions=new Set();
  for(const p of players())if(end(p.dimension)){
   const cx=Math.floor(p.location.x/16),cz=Math.floor(p.location.z/16);
   for(let x=cx-config.activeChunkRadius;x<=cx+config.activeChunkRadius;x++)for(let z=cz-config.activeChunkRadius;z<=cz+config.activeChunkRadius;z++)active.add(x+','+z);
  }
  const work=[];
  for(const c of active)for(const k of index.get(c)??[]){regions.add(k);for(const e of load(k).values())work.push(e);}
  // Rotate so a busy construction cannot starve another loaded chunk.
  if(work.length)cursor%=work.length;else cursor=0;queue=work;
  for(const k of cache.keys())if(!regions.has(k)&&!dirty.has(k))cache.delete(k);
 }
 function step(){
  init();if(system.currentTick>=nextRefresh){refresh();nextRefresh=system.currentTick+20;}
  const d=world.getDimension('the_end'),now=clock();let checked=0,broken=0,effects=0;
  const total=queue.length;
  while(checked<Math.min(total,config.maximumDecayChecks)&&broken<config.maximumDecayBreaks){
   const e=queue[cursor++%total];checked++;const p={x:e[0],y:e[1],z:e[2]},live=find(p);
   if(live!==e)continue;
   // Migrate old queued native-material placements without removing them.
   if(isPermanentUmbralBlock(e[3])){forget(p);continue;}
   let b;try{b=d.getBlock(p);}catch{continue;}if(!b)continue;
   if(isPermanentUmbralBlock(b.typeId)){forget(p);continue;}
   if(b.typeId==='minecraft:moving_block')continue;
   if(e[5]&&b.isAir&&now<e[4])continue;
   if(family(b.typeId)!==family(e[3])&&!(e[3].endsWith('concrete_powder')&&b.typeId===e[3].replace('_powder',''))){forget(p);continue;}
   if(now>=e[4]){
    // Native destruction drops container contents and updates dependent blocks.
    // It does not fill/replace a region or damage neighboring natural terrain.
    try{const result=d.runCommand('setblock '+e.slice(0,3).join(' ')+' minecraft:air destroy');if(result.successCount>0){forget(p);broken++;}}catch{}
   }else if(e[4]-now<=config.decayWarningSeconds*1000&&effects<config.maximumDecayEffects&&now>=(warningAt.get(posKey(p))??0)){
    try{d.spawnParticle('warland:umbral_decay',{x:p.x+.5,y:p.y+.8,z:p.z+.5});effects++;warningAt.set(posKey(p),now+1000);}catch{}
   }
  }
  flush();return {checked,broken,effects};
 }
 function placed(e){try{track(e.block);}catch(err){console.warn('[UMBRAL] Bloque temporal: '+err);}}
 function piston(e){
  if(!end(e.dimension))return;
  try{
   // Bedrock pistons store the back face: state 4 extends east, 5 west.
   const facing=e.block.permutation.getState('facing_direction'),v=[{x:0,y:1,z:0},{x:0,y:-1,z:0},{x:0,y:0,z:1},{x:0,y:0,z:-1},{x:1,y:0,z:0},{x:-1,y:0,z:0}][facing];if(!v)return;
   const sign=e.isExpanding?1:-1,delta={x:v.x*sign,y:v.y*sign,z:v.z*sign},moves=new Map();
   for(const p of e.piston.getAttachedBlocksLocations()){
    const source=p,row=find(source);
    if(row)moves.set(posKey(source),{source,row,to:{x:source.x+delta.x,y:source.y+delta.y,z:source.z+delta.z}});
   }
   if(!moves.size)return;
   // Move metadata with the confirmed piston event, before its old cells become
   // air/arm collisions. The destination remains pending during interpolation.
   for(const m of moves.values())forget(m.source);
   for(const m of moves.values())put([m.to.x,m.to.y,m.to.z,m.row[3],m.row[4],'piston']);
   flush();nextRefresh=0;
  }catch(err){console.warn('[UMBRAL] Movimiento temporal: '+err);}
 }
 world.afterEvents.worldLoad.subscribe(init);
 world.afterEvents.playerPlaceBlock.subscribe(placed);
 world.afterEvents.playerBreakBlock.subscribe(e=>{if(end(e.dimension)){forget(e.block.location);flush();}});
 world.afterEvents.pistonActivate.subscribe(piston);
 system.runInterval(()=>{try{step();}catch(e){console.warn('[UMBRAL] Deterioro: '+e);}},config.decayScanTicks);
 return {track,step,placed,piston,find,flush,refresh,forget};
}
