// NEC adaptation for WARLAND Base: only confirmed, permitted effects.
// Original creature designs: Euforia / Drecxi. No per-tick entity scan.
import {world,EntityDamageCause} from '@minecraft/server';
import {CONFIG} from './core.js';
import {inSanctuary} from './sanctuary.js';
const MAGMA='warland:magma_creeper',SCULK='warland:sculk_creeper',MUMMY='warland:mummy_creeper';
const selected=new Set(['ender','ghost','magma','mummy','sculk','skeleton'].map(n=>'warland:'+n+'_creeper'));
export const UMBRAL_BLAST_SECONDS=6;
export function applyUmbralCreeperFeedback({hurtEntity:p,damage,damageSource},allowed=()=>true){
 try{
  if(damage<=0||p.typeId!=='minecraft:player'||p.dimension.id!=='minecraft:the_end'||damageSource.cause!==EntityDamageCause.entityExplosion||!selected.has(damageSource.damagingEntity?.typeId))return false;
  if(!p.isValid||p.getComponent('minecraft:health')?.currentValue<=0||!allowed(p.dimension,p.location))return false;
  // Same post-hit feedback as the thermal creeper, only to a living victim.
  // Keep the existing potion/echolocator counterplay and native effect timer.
  p.addEffect('blindness',UMBRAL_BLAST_SECONDS*20,{amplifier:0,showParticles:false});
  p.runCommand('stopsound @s warland.thermal.ringing');
  p.playSound('warland.thermal.ringing',{volume:1,pitch:1});
  return true;
 }catch{return false;}
}
const natural=new Set(['minecraft:stone','minecraft:deepslate','minecraft:tuff','minecraft:dirt','minecraft:grass_block','minecraft:gravel','minecraft:sand','minecraft:soul_sand','minecraft:soul_soil','minecraft:netherrack','minecraft:sculk','warland:umbral_stone','warland:umbral_soil','warland:umbral_ash','warland:umbral_sculk']);
export function creeperAreaAllowed(teams,ready,dimension,p,r=0){
 if(!ready()||inSanctuary(dimension,p,r))return false;
 const b=CONFIG.bufferBlocks;
 return !teams.some(t=>t.claims.some(c=>c.dimension===dimension&&Math.hypot(p.x-Math.max(c.x*16-b,Math.min(c.x*16+16+b,p.x)),p.z-Math.max(c.z*16-b,Math.min(c.z*16+16+b,p.z)))<=r));
}
export function registerSelectedCreeperEffects(teams,ready){
 const allowed=(d,p,r=0)=>creeperAreaAllowed(teams,ready,d.id,p,r);
 const pending=new Map();
 // Snapshot before source removal, but write only after a confirmed explosion.
 world.beforeEvents.explosion.subscribe(e=>{
  const s=e.source;if(!s||!selected.has(s.typeId))return;
  try{
   const p={...s.location};
   if(!allowed(e.dimension,p,12)||e.getImpactedBlocks().some(b=>!allowed(e.dimension,b.location))){e.cancel=true;return;}
   if(s.typeId===SCULK&&!e.cancel)pending.set(s.id,{dimension:e.dimension,location:p});
  }catch{e.cancel=true;}
 });
 world.afterEvents.explosion.subscribe(e=>{
  const key=e.source?.id,data=pending.get(key);if(!data)return;pending.delete(key);
  const {dimension:d,location:p}=data;
  if(!world.gameRules.mobGriefing||!allowed(d,p,5))return;
  // At most 49 loaded columns and one sensor. No catalysts: their delayed
  // autonomous spread can leave this reviewed area and accumulate chunk work.
  let sensors=0;
  for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++){
   if(x*x+z*z>16)continue;
   try{const b=d.getBlockBelow({x:p.x+x,y:p.y+1,z:p.z+z},{maxDistance:10});
    if(!b||!natural.has(b.typeId)||!allowed(d,b.location))continue;
    b.setType('minecraft:sculk');
    const above=b.above();if(sensors<1&&above?.isAir&&Math.random()<0.05&&allowed(d,above.location)){above.setType('minecraft:sculk_sensor');sensors++;}
   }catch{} // Unloaded columns are simply skipped.
  }
 });
 world.afterEvents.entityDie.subscribe(({deadEntity:s})=>{
  if(s.typeId!==MAGMA)return;
  try{const d=s.dimension,p=s.location;if(!world.gameRules.mobGriefing||!allowed(d,p,8))return;
   const b=d.getBlock(p),floor=b?.below();if(b?.isAir&&floor&&!floor.isAir&&!floor.isLiquid)b.setType('minecraft:lava');
  }catch{}
 });
 world.afterEvents.entityHurt.subscribe(event=>{
  applyUmbralCreeperFeedback(event,allowed);
  const {hurtEntity,damage,damageSource}=event;
  if(damage<=0||damageSource.damagingEntity?.typeId!==MUMMY)return;
  try{if(allowed(hurtEntity.dimension,hurtEntity.location))hurtEntity.addEffect('hunger',300,{amplifier:0});}catch{}
 });
 // Cancelled explosions have no after-event; keep the snapshot bounded by events.
 world.afterEvents.entityRemove.subscribe(({removedEntityId})=>pending.delete(removedEntityId));
}
