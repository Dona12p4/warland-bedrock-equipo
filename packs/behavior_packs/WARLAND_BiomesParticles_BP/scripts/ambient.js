import { chooseParticle } from './selection.js';

export const limits = Object.freeze({ interval:20, cacheTicks:40, maxEmitters:6, normalTicks:180, auroraTicks:280, auroraCooldown:1200 });
export function createState() { return { next:0, auroraAfter:0, active:[], sample:null }; }

// No world mutation, no entities, no forced chunks. A failure skips this sample.
export function samplePlayer(player, previous, tick) {
  const dim=player.dimension, p=player.location;
  if (!['minecraft:overworld','minecraft:nether'].includes(dim.id)) return null;
  const head=player.getHeadLocation();
  const water=dim.getBlock(head);
  if (!water) return null;
  const underwater=['minecraft:water','minecraft:flowing_water'].includes(water.typeId);
  const key=`${dim.id}:${Math.floor(p.x/4)}:${Math.floor(p.y/4)}:${Math.floor(p.z/4)}`;
  let sample=previous;
  if (!sample || sample.key!==key || tick>=sample.expires) {
    const biome=dim.getBiome(p)?.id;
    if (!biome) return null;
    // One native column lookup replaces 14 getBlock calls; covers tall roofs too.
    const roof=dim.id==='minecraft:overworld' ? dim.getTopmostBlock({x:Math.floor(p.x),z:Math.floor(p.z)}) : null;
    if (dim.id==='minecraft:overworld' && !roof) return null;
    sample={key,biome,roofY:roof?.location.y ?? -Infinity,expires:tick+limits.cacheTicks};
  }
  return {...sample, underwater, outdoors:sample.roofY<head.y};
}

export function emitAmbient(player, state, tick, time, weather='Clear', random=Math.random) {
  if (tick<state.next) return {emitted:false,reason:'cooldown'};
  state.next=tick+limits.interval;
  state.active=state.active.filter(until=>until>tick);
  if (state.active.length>=limits.maxEmitters) return {emitted:false,reason:'budget'};
  const dimId=player.dimension.id;
  if (!['minecraft:overworld','minecraft:nether'].includes(dimId)) {
    state.sample=null;return {emitted:false,reason:'dimension'};
  }
  const sample=samplePlayer(player,state.sample,tick);
  if (!sample) return {emitted:false,reason:'unloaded'};
  state.sample=sample;
  if (!sample.underwater && !sample.outdoors) return {emitted:false,reason:'roof'};
  const rain=dimId==='minecraft:overworld' && ['rain','thunder'].includes(String(weather).toLowerCase());
  const thunder=rain && String(weather).toLowerCase()==='thunder';
  const effect=chooseParticle(sample.biome,rain,sample.underwater,dimId,time,thunder,random);
  if (!effect) return {emitted:false,reason:'quiet'};
  const aurora=effect.includes('northern_lights');
  if (aurora && tick<state.auroraAfter) return {emitted:false,reason:'aurora-cooldown'};
  const ground= /sand_ground|rainsplash|weepingtearsplash|tumble_bush/.test(effect);
  const p=sample.underwater ? player.getHeadLocation() : player.location;
  const pos={x:p.x,y:p.y+(sample.underwater ? 0 : ground ? .15 : 4),z:p.z};
  // Targeted packets: a crowd does not multiply everyone's ambient emitters.
  player.spawnParticle(effect,pos);
  state.active.push(tick+(aurora?limits.auroraTicks:limits.normalTicks));
  if (aurora) state.auroraAfter=tick+limits.auroraCooldown;
  return {emitted:true,effect,pos,active:state.active.length};
}
