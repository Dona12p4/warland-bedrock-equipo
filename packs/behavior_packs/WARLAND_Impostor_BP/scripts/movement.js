import {system, world} from '@minecraft/server';

const movers = new Map();
const inspectionTurns = new Map();
const jumpingBursts = new Map();
const between = (lo, hi, random = Math.random) => lo + Math.floor(random() * (hi - lo + 1));

function nearbyContainer(entity) {
  const p=entity.location;let best=null,distance=Infinity;
  for(let x=-2;x<=2;x++)for(let y=-1;y<=1;y++)for(let z=-2;z<=2;z++){
    const block=entity.dimension.getBlock({x:Math.floor(p.x)+x,y:Math.floor(p.y)+y,z:Math.floor(p.z)+z});
    if(!['minecraft:chest','minecraft:barrel'].includes(block?.typeId))continue;
    const target={x:block.x+.5,y:block.y+.7,z:block.z+.5},d=Math.hypot(target.x-p.x,target.z-p.z);
    if(d<distance){distance=d;best=target;}
  }
  return best;
}

export function faceInspection(entity, target) {
  const p=entity.location,rotation=entity.getRotation();
  const wanted=Math.atan2(-(target.x-p.x),target.z-p.z)*180/Math.PI;
  const delta=((wanted-rotation.y+540)%360)-180;
  entity.setRotation({x:0,y:rotation.y+Math.max(-8,Math.min(8,delta))});
  return Math.abs(delta)<1;
}

export function setPace(entity, mode, tick = system.currentTick, random = Math.random) {
  if (!['walk', 'run', 'rest', 'search', 'inspect'].includes(mode)) return;
  entity.triggerEvent('warland:' + mode);
  const state = movers.get(entity.id) ?? {entity, nextInterest: tick + between(160, 300, random)};
  state.mode = mode;
  state.until = tick + (mode === 'run' ? between(180, 260, random) : mode === 'search' ? 300 : mode === 'inspect' ? 88 : mode === 'rest' ? between(30, 70, random) : between(90, 170, random));
  state.burstRemaining = mode === 'run' ? between(6, 10, random) : 0;
  state.burstTotal = state.burstRemaining;
  state.nextJump = tick;
  state.awaitLanding = false; state.airSeen = false; state.inspected = false;
  state.lastLandingTick = undefined; state.lastJumpTick = undefined; state.lastGroundedPause = undefined;
  if (mode === 'search') state.nextInterest = tick + between(600, 1200, random);
  movers.set(entity.id, state);
  jumpingBursts.delete(entity.id);
  if(mode==='run') jumpingBursts.set(entity.id,state);
  inspectionTurns.delete(entity.id);
  if(mode==='inspect'){
    const target=nearbyContainer(entity);
    if(target)inspectionTurns.set(entity.id,{entity,target,expires:tick+30});
  }
}

export function movementDebug(entity) {
  const s = movers.get(entity.id);
  return s && {mode:s.mode, burstRemaining:s.burstRemaining, burstTotal:s.burstTotal, awaitLanding:s.awaitLanding, inspected:s.inspected, lastLandingTick:s.lastLandingTick, lastJumpTick:s.lastJumpTick, lastGroundedPause:s.lastGroundedPause};
}

export function trackMovement(entity) {
  if (!movers.has(entity.id)) setPace(entity, 'walk');
}

export function tryRunningJump(entity, random = Math.random, tick = system.currentTick) {
  const state = movers.get(entity.id);
  if (!state || state.mode !== 'run' || entity.isInWater) return false;
  if (state.awaitLanding) {
    if (!entity.isOnGround) {state.airSeen = true; return false;}
    if (!state.airSeen) return false;
    state.awaitLanding = false; state.nextJump = tick; state.lastLandingTick = tick;
  }
  if (!state.burstRemaining || tick < state.nextJump || !entity.isOnGround) return false;
  const velocity = entity.getVelocity(), speed = Math.hypot(velocity.x, velocity.z);
  if (speed < .06) return false; // Never bounce while standing still.
  const p = entity.location, dim = entity.dimension;
  // Native navigation remains in charge. Skip ceilings, liquids and ledges.
  const ahead = {x: Math.floor(p.x + velocity.x / speed * 1.6), y: Math.floor(p.y), z: Math.floor(p.z + velocity.z / speed * 1.6)};
  const above = dim.getBlock({x: Math.floor(p.x), y: Math.floor(p.y) + 2, z: Math.floor(p.z)});
  const headAhead = dim.getBlock({...ahead, y: ahead.y + 2});
  // isSolid is experimental; use stable collision raycasting instead.
  const landing = dim.getBlockFromRay({x: ahead.x + .5, y: ahead.y + 1, z: ahead.z + .5}, {x: 0, y: -1, z: 0}, {maxDistance: 2.1, includeLiquidBlocks: true, includePassableBlocks: false})?.block;
  state.nextJump = tick + 10;
  if (!above?.isAir || !headAhead?.isAir || !landing || landing.isLiquid || landing.y !== ahead.y - 1) return false;
  entity.applyImpulse({x: 0, y: .50, z: 0});
  state.lastJumpTick=tick;
  state.lastGroundedPause=state.lastLandingTick===undefined ? undefined : tick-state.lastLandingTick;
  state.burstRemaining--; state.awaitLanding = true; state.airSeen = false;
  return true;
}

// Fair round-robin: at most 16 loaded mobs per pass, no scan of every world/chunk.
system.runInterval(() => {
  let processed = 0;
  for (const [id, state] of [...movers]) {
    if (++processed > 16) break;
    movers.delete(id);
    try {
      const entity = state.entity;
      if (!entity.isValid) continue;
      movers.set(id, state);
      if (state.mode === 'search') {
        if (entity.getProperty('warland:inspecting')) {setPace(entity, 'inspect');state.inspected = true;}
        else if (state.inspected) setPace(entity, 'walk');
      }
      // Finish a burst before changing gait; abandon an obstructed route after
      // a bounded timeout instead of bouncing against a wall indefinitely.
      if (system.currentTick >= state.until && entity.isOnGround &&
          (!state.burstRemaining || system.currentTick >= state.until + 160)) {
        const next = state.mode !== 'walk' ? 'walk' : system.currentTick >= state.nextInterest && Math.random() < .5 ? 'search' : Math.random() < .65 ? 'run' : 'rest';
        setPace(entity, next);
      }
    } catch {
      // A neighboring chunk can unload while the entity itself is still valid.
      // Skip this opportunity; do not permanently disable its movement cycle.
      try { if (!state.entity.isValid) movers.delete(id); } catch { movers.delete(id); }
    }
  }
}, 5);
// Landing is checked each tick only for active bursts. A five-tick AI pass
// introduced a visible ground pause; the next hop now starts on landing.
// Raycasts run only on a grounded launch attempt, never every airborne tick.
system.runInterval(()=>{
  for(const [id,state] of [...jumpingBursts].slice(0,16)){
    jumpingBursts.delete(id);
    try{
      if(!state.entity.isValid||state.mode!=='run')continue;
      tryRunningJump(state.entity);
      if(!state.burstRemaining&&!state.awaitLanding)setPace(state.entity,'walk');
      else jumpingBursts.set(id,state);
    }catch{try{if(state.entity.isValid)jumpingBursts.set(id,state);}catch{}}
  }
},1);
// Only a short, bounded turn for an actual inspection; no per-tick world scan.
system.runInterval(()=>{
  let budget=8;
  for(const [id,state] of inspectionTurns){
    if(!budget--)break;
    try{if(system.currentTick>=state.expires||!state.entity.isValid||faceInspection(state.entity,state.target))inspectionTurns.delete(id);}
    catch{inspectionTurns.delete(id);}
  }
},1);
world.afterEvents.entityRemove.subscribe(({removedEntityId}) => {movers.delete(removedEntityId);inspectionTurns.delete(removedEntityId);jumpingBursts.delete(removedEntityId);});
