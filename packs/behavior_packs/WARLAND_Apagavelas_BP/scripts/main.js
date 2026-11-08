import {registerRetaliation,provokedTarget,isProvokedBy} from './hostile-retaliation.js';
registerRetaliation(['warland:apagavelas_prototype']);
registerRetaliation(['minecraft:phantom'],{native:true});
import {gargantNotice} from './garganta-notice.js';
import {canAcquireGhostTarget} from './apagavelas-perception.js';
import {mobileGhostHitDistance} from './mobile-hitboxes.js';
// scripts/apagavelas-bedrock.js
import { world, system, EquipmentSlot, EntitySwingSource, EntityDamageCause, GameMode } from "@minecraft/server";

// config/apagavelas.json
var apagavelas_default = {
  name: "El Apagavelas",
  version: "0.4.0",
  reference: "42452.png \u2014 capucha c\xFAbica, calavera, hombros rasgados y cuerpo semitransparente",
  identifier: "warland:apagavelas_prototype",
  qualityProfile: "warland-visual-vanilla-preview-v1",
  texelsPerBlock: 16,
  projectileVisualScale: 3,
  ignoreBlockLighting: true,
  glow: {
    mode: "white_parts",
    previewEmission: 1,
    blockLight: false
  },
  opacity: {
    robe: 0.64,
    sleeve: 0.62,
    shoulder: 0.78,
    hood: 0.4,
    hood_trim: 0.4,
    bone: 0.4,
    void: 0.4
  },
  clips: {
    hover: 4.8,
    glide: 2.4,
    drift: 1.6,
    look: 6.4,
    search: 4.8,
    cast: 2.1,
    burst: 2.4,
    fan: 2.3
  },
  attacks: true,
  gameplay: true,
  combat: {
    health: 28,
    detectionBlocks: 24,
    pursuitBlocks: 40,
    preferredDistance: 8,
    moveSpeed: 0.11,
    chargeTicks: 23,
    castTicks: 42,
    cooldownTicks: 75,
    attackStyles: [
      {
        key: "cast",
        name: "Disparo oscuro",
        durationTicks: 42,
        releaseTicks: [
          23
        ],
        angles: [
          0
        ],
        damage: 6
      },
      {
        key: "burst",
        name: "R\xE1faga alterna",
        durationTicks: 48,
        releaseTicks: [
          16,
          23,
          30
        ],
        angles: [
          0
        ],
        damage: 3
      },
      {
        key: "fan",
        name: "Abanico de sombras",
        durationTicks: 46,
        releaseTicks: [
          25
        ],
        angles: [
          -18,
          0,
          18
        ],
        damage: 4
      }
    ],
    search: {
      firstDelayTicks: 45,
      intervalMinTicks: 180,
      intervalMaxTicks: 260,
      durationTicks: 96,
      wanderRadius: 6,
      wanderSpeed: 0.035
    },
    orbSpeed: 3,
    orbPhasesThroughBlocks: true,
    orbRange: 24,
    orbRadius: 0.22,
    orbDamage: 6,
    darknessTicks: 60,
    maximumOrbs: 24,
    phaseThroughBlocks: true,
    weaponIds: [
      "warland:espada_espectral_prueba"
    ],
    weaponDamage: 7,
    weaponReach: 3.3,
    weaponCooldownTicks: 10,
    weaponDurability: 256,
    allowWithWarlandBase: true
  },
  installed: false,
  viewerPort: 8772
};

// scripts/apagavelas-combat-core.js
var add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
var sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
var mul = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
var length = (v) => Math.hypot(v.x, v.y, v.z);
var unit = (v) => {
  const d = length(v);
  return d > 1e-8 ? mul(v, 1 / d) : { x: 0, y: 0, z: 1 };
};
function rayBox(origin, direction, min, max, limit = Infinity) {
  let near = 0, far = limit;
  for (const axis of ["x", "y", "z"]) {
    if (Math.abs(direction[axis]) < 1e-8) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return null;
      continue;
    }
    const a = (min[axis] - origin[axis]) / direction[axis], b = (max[axis] - origin[axis]) / direction[axis];
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return null;
  }
  return near <= limit && far >= 0 ? near : null;
}
function ghostHitDistance(origin, direction, location, limit) {
  return rayBox(origin, direction, { x: location.x - 0.48, y: location.y + 0.23, z: location.z - 0.48 }, { x: location.x + 0.48, y: location.y + 2.72, z: location.z + 0.48 }, limit);
}

// scripts/apagavelas-bedrock.js
var cfg = apagavelas_default.combat;
var TYPE = apagavelas_default.identifier;
var ORB = "warland:apagavelas_orb";
var states = /* @__PURE__ */ new Map();
var orbs = /* @__PURE__ */ new Map();
var authorized = /* @__PURE__ */ new Set();
var swordCooldown = /* @__PURE__ */ new Map();
var OSARIO = "warland:peto_del_osario";
function wearsOsario(entity) {
  try {
    return entity?.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Chest)?.typeId === OSARIO;
  } catch {
    return false;
  }
}
function guardSpectralDamage(event) {
  const attacker = event.damageSource.damagingEntity;
  if (event.damageSource.cause === EntityDamageCause.entityAttack && attacker) {
    const held = attacker.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Mainhand);
    if (cfg.weaponIds.includes(held?.typeId)) event.cancel = true;
    if (attacker.typeId === "minecraft:phantom" && wearsOsario(event.hurtEntity) && !isProvokedBy(attacker,event.hurtEntity)) event.cancel = true;
  }
}
var living = (e) => e?.isValid && (e.getComponent("minecraft:health")?.currentValue ?? 0) > 0;
var center = (e) => add(e.location, { x: 0, y: 1.35, z: 0 });
function vulnerable(e) {
  return living(e) && (e.typeId !== "minecraft:player" || ![GameMode.Creative, GameMode.Spectator].includes(e.getGameMode()));
}
function canCombat() {
  if (world.getDynamicProperty("warland:apagavelas_lab") === false) return false;
  if (!world.scoreboard.getObjective("warcoins")) return true;
  if (!cfg.allowWithWarlandBase) return false;
  try {
    const tick = world.scoreboard.getObjective("wl_apaga_safe")?.getScore("ready");
    return typeof tick === "number" && tick >= 0 && system.currentTick - tick >= 0 && system.currentTick - tick <= 1;
  } catch {
    return false;
  }
}
function clearRay(d, from, to) {
  const delta = sub(to, from), distance = length(delta);
  if (distance < 0.01) return true;
  try {
    const block = d.getBlock(from);
    if (!block || !block.isAir && !block.isLiquid) return false;
    return !d.getBlockFromRay(from, unit(delta), { maxDistance: distance, includePassableBlocks: false, includeLiquidBlocks: false });
  } catch {
    return false;
  }
}
function emit(d, name, p) {
  try {
    d.spawnParticle("warland:apagavelas_" + name, p);
  } catch {
  }
}
function mark(e, n, v) {
  if (e.isValid && e.getProperty("warland:" + n) !== v) e.setProperty("warland:" + n, v);
}
world.beforeEvents.entityHurt.subscribe((e) => {
  guardSpectralDamage(e);
  if (e.hurtEntity.typeId === TYPE && !authorized.has(e.hurtEntity.id)) e.cancel = true;
});
function damageGhost(ghost, attacker, damage = cfg.weaponDamage) {
  if (!living(ghost) || !canCombat()) return false;
  authorized.add(ghost.id);
  ghost.addTag("wl_apagavelas_damage_open");
  try {
    return ghost.applyDamage(damage, { cause: EntityDamageCause.magic, damagingEntity: attacker });
  } finally {
    authorized.delete(ghost.id);
    if (ghost.isValid) ghost.removeTag("wl_apagavelas_damage_open");
  }
}
function strikeWithSpecial(attacker) {
  return performSpecialStrike(attacker, attacker.getComponent("minecraft:equippable"));
}
function performSpecialStrike(attacker, equipment) {
  if (!attacker.isValid || !canCombat()) return { hit: false, reason: "disabled" };
  const item = equipment?.getEquipment(EquipmentSlot.Mainhand);
  if (!cfg.weaponIds.includes(item?.typeId)) return { hit: false, reason: "ordinary_item" };
  if (system.currentTick < (swordCooldown.get(attacker.id) ?? 0)) return { hit: false, reason: "cooldown" };
  const origin = attacker.getHeadLocation(), direction = attacker.getViewDirection(), d = attacker.dimension;
  let limit = cfg.weaponReach;
  try {
    const wall = d.getBlockFromRay(origin, direction, { maxDistance: limit, includePassableBlocks: false, includeLiquidBlocks: false });
    if (wall) limit = Math.min(limit, length(sub(add(wall.block.location, wall.faceLocation), origin)));
    for (const hit of d.getEntitiesFromRay(origin, direction, { maxDistance: limit, ignoreBlockCollision: false })) if (hit.entity.id !== attacker.id && hit.entity.typeId !== TYPE && hit.entity.typeId !== ORB) limit = Math.min(limit, hit.distance);
  } catch {
    return { hit: false, reason: "unloaded" };
  }
  const hits = d.getEntities({ type: TYPE, location: origin, maxDistance: cfg.weaponReach + 3 }).filter(living).map((ghost2) => ({ ghost: ghost2, distance: mobileGhostHitDistance(origin, direction, ghost2.location, limit, ghost2.getRotation().y, ghost2.getProperty('warland:casting')?['cast','burst','fan'][ghost2.getProperty('warland:attack_style')]:ghost2.getProperty('warland:searching')?'search':ghost2.getProperty('warland:moving')?'glide':'hover') })).filter((h) => h.distance !== null && h.distance < limit - 1e-3).sort((a, b) => a.distance - b.distance);
  if (!hits.length) return { hit: false, reason: "no_target" };
  swordCooldown.set(attacker.id, system.currentTick + cfg.weaponCooldownTicks);
  const ghost = hits[0].ghost, at = center(ghost), id = ghost.id, applied = damageGhost(ghost, attacker);
  if (applied) {
    emit(d, "special_hit", at);
    const durability = item.getComponent("minecraft:durability");
    if (durability && !(attacker.typeId === "minecraft:player" && attacker.getGameMode() === GameMode.Creative)) {
      if (durability.damage + 1 >= durability.maxDurability) equipment.setEquipment(EquipmentSlot.Mainhand, void 0);
      else {
        durability.damage++;
        equipment.setEquipment(EquipmentSlot.Mainhand, item);
      }
    }
  }
  return { hit: applied, target: id, distance: hits[0].distance };
}
function isSpectralSwing(source) {
  return [EntitySwingSource.Attack, EntitySwingSource.None, EntitySwingSource.Mine].includes(source);
}
function handleSwing(event, equipment) {
  if (!isSpectralSwing(event.swingSource)) return { hit: false, reason: "not_attack" };
  if (event.heldItemStack && !cfg.weaponIds.includes(event.heldItemStack.typeId)) return { hit: false, reason: "ordinary_item" };
  const result = equipment ? performSpecialStrike(event.player, equipment) : strikeWithSpecial(event.player);
  if (world.getDynamicProperty("warland:spectral_diagnostics") === true) console.warn("[SPECTRAL_STRIKE] " + JSON.stringify({ player: event.player.name ?? event.player.id, source: event.swingSource, ...result }));
  return result;
}
world.afterEvents.playerSwingStart.subscribe((event) => handleSwing(event));
world.afterEvents.playerLeave.subscribe((e) => swordCooldown.delete(e.playerId));
function launchOrb(ghost, target, options = {}) {
  if (!living(ghost) || !vulnerable(target) || (wearsOsario(target) && !isProvokedBy(ghost,target,cfg.pursuitBlocks)) || !canCombat() || orbs.size >= cfg.maximumOrbs) return null;
  const from = center(ghost), to = add(target.location, { x: 0, y: 0.9, z: 0 });
  if (!cfg.orbPhasesThroughBlocks && !clearRay(ghost.dimension, from, to)) return null;
  const aim = unit(sub(to, from)), angle = (options.angle ?? 0) * Math.PI / 180;
  const direction = { x: aim.x * Math.cos(angle) + aim.z * Math.sin(angle), y: aim.y, z: aim.z * Math.cos(angle) - aim.x * Math.sin(angle) };
  const side = options.side ?? 0, start = add(add(from, mul(direction, 0.75)), { x: aim.z * side, y: 0, z: -aim.x * side });
  if (!cfg.orbPhasesThroughBlocks && !clearRay(ghost.dimension, from, start)) return null;
  try {
    if (!ghost.dimension.getBlock(start)) return null;
  } catch {
    return null;
  }
  const orb = ghost.dimension.spawnEntity(ORB, start);
  orbs.set(orb.id, { entity: orb, owner: ghost, direction, distance: 0, born: system.currentTick, damage: options.damage ?? cfg.orbDamage, hitSet: options.hitSet ?? /* @__PURE__ */ new Set(), style: options.style ?? "cast" });
  emit(ghost.dimension, "release", start);
  return orb;
}
function launchVolley(ghost, target, styleIndex, releaseIndex = 0) {
  const style = cfg.attackStyles[styleIndex], hitSet = /* @__PURE__ */ new Set();
  if (!style) return [];
  return style.angles.map((angle) => launchOrb(ghost, target, { angle, damage: style.damage, hitSet, style: style.key, side: style.key === "burst" ? releaseIndex % 2 === 0 ? 0.31 : -0.31 : 0 })).filter(Boolean);
}
function removeOrb(state, impact = false) {
  if (state.entity.isValid) {
    if (impact) emit(state.entity.dimension, "impact", state.entity.location);
    state.entity.remove();
  }
  orbs.delete(state.entity.id);
}
function flightTrail(d, from, direction, distance) {
  const samples = Math.min(6, Math.max(1, Math.ceil(distance / 0.5)));
  for (let i = 1; i <= samples; i++) emit(d, "trail", add(from, mul(direction, distance * i / samples)));
}
function stepOrb(state) {
  const e = state.entity;
  if (!e.isValid) {
    orbs.delete(e.id);
    return;
  }
  if (!living(state.owner) || !canCombat() || system.currentTick - state.born > 100 || state.distance >= cfg.orbRange) {
    removeOrb(state);
    return;
  }
  const from = e.location, step = Math.min(cfg.orbSpeed, cfg.orbRange - state.distance), direction = state.direction, dimension = e.dimension;
  let wallDistance = step;
  try {
    const end = add(from, mul(direction, step)), r = cfg.orbRadius;
    for (let x = Math.floor(Math.min(from.x, end.x) - r); x <= Math.floor(Math.max(from.x, end.x) + r); x++)
      for (let y = Math.floor(Math.min(from.y, end.y) - r); y <= Math.floor(Math.max(from.y, end.y) + r); y++)
        for (let z = Math.floor(Math.min(from.z, end.z) - r); z <= Math.floor(Math.max(from.z, end.z) + r); z++) {
          const block = dimension.getBlock({ x, y, z });
          if (!block) throw Error("unloaded orb path");
          if (cfg.orbPhasesThroughBlocks) continue;
          if (block.isAir || block.isLiquid || ["minecraft:light_block", "minecraft:structure_void"].includes(block.typeId)) continue;
          const distance = rayBox(from, direction, { x: x - r, y: y - r, z: z - r }, { x: x + 1 + r, y: y + 1 + r, z: z + 1 + r }, wallDistance);
          if (distance !== null) wallDistance = Math.min(wallDistance, distance);
        }
  } catch {
    removeOrb(state);
    return;
  }
  let hit = null, closest = wallDistance;
  for (const victim of dimension.getEntities({ location: from, maxDistance: step + 3 })) {
    if (victim.id === state.owner.id || victim.typeId === TYPE || victim.typeId === ORB || !vulnerable(victim) || state.hitSet.has(victim.id)) continue;
    const box = victim.getAABB(), r = cfg.orbRadius;
    const min = { x: box.center.x - box.extent.x - r, y: box.center.y - box.extent.y - r, z: box.center.z - box.extent.z - r };
    const max = { x: box.center.x + box.extent.x + r, y: box.center.y + box.extent.y + r, z: box.center.z + box.extent.z + r };
    const distance = rayBox(from, direction, min, max, closest);
    if (distance !== null && distance < closest) {
      closest = distance;
      hit = victim;
    }
  }
  if (hit) {
    flightTrail(dimension, from, direction, closest);
    e.teleport(add(from, mul(direction, closest)));
    const before = hit.getComponent("minecraft:health").currentValue;
    hit.applyDamage(state.damage, { cause: EntityDamageCause.magic, damagingEntity: state.owner });
    state.hitSet.add(hit.id);
    if (living(hit) && hit.getComponent("minecraft:health").currentValue < before && hit.typeId === "minecraft:player") hit.addEffect("darkness", cfg.darknessTicks, { showParticles: false });
    removeOrb(state, true);
    return;
  }
  if (wallDistance < step) {
    e.teleport(add(from, mul(direction, wallDistance)));
    removeOrb(state, true);
    return;
  }
  const next = add(from, mul(direction, step));
  e.teleport(next);
  state.distance += step;
  emit(dimension, "head", next);
  flightTrail(dimension, from, direction, step);
}
function getOrbStates() {
  return [...orbs.values()];
}
function moveGhost(ghost, target) {
  const from = ghost.location, to = target.location, distance = length(sub(to, from));
  const clear = cfg.orbPhasesThroughBlocks || clearRay(ghost.dimension, center(ghost), add(to, { x: 0, y: 0.9, z: 0 }));
  const forward = distance > cfg.preferredDistance + 1 || !clear ? 1 : distance < cfg.preferredDistance - 2 ? -1 : 0;
  const delta = sub(to, from), flat = Math.hypot(delta.x, delta.z) || 1, vertical = Math.max(-0.05, Math.min(0.05, (to.y + 0.1 - from.y) * 0.15));
  ghost.clearVelocity();
  if (forward || Math.abs(vertical) > 2e-3) ghost.applyImpulse({ x: delta.x / flat * cfg.moveSpeed * forward, y: vertical, z: delta.z / flat * cfg.moveSpeed * forward });
  ghost.setRotation({ x: 0, y: -Math.atan2(delta.x, delta.z) * 180 / Math.PI });
  mark(ghost, "moving", !!forward);
  return clear;
}
function targetFor(ghost, state) {
  const revenge=provokedTarget(ghost,cfg.pursuitBlocks);
  if(revenge){if(state.target!==revenge.id){state.start=null;state.nextCast=Math.min(state.nextCast??system.currentTick,system.currentTick+5);mark(ghost,'casting',false);}state.target=revenge.id;return revenge;}
  const notice=gargantNotice(ghost);if(notice&&!wearsOsario(notice)&&!state.target){state.target=notice.id;state.gargantaUntil=system.currentTick+600;state.gargantaTarget=notice.id;}
  let old = state.target && world.getEntity(state.target);
  if (vulnerable(old) && !wearsOsario(old) && old.dimension.id === ghost.dimension.id && length(sub(old.location, ghost.location)) <= (state.gargantaTarget===old.id&&system.currentTick<(state.gargantaUntil??0)?64:cfg.pursuitBlocks)) return old;
  const candidates = ghost.dimension.getEntities({ families: ["player"], location: ghost.location, maxDistance: cfg.detectionBlocks }).filter((e) => vulnerable(e) && !wearsOsario(e)).sort((a, b) => length(sub(a.location, ghost.location)) - length(sub(b.location, ghost.location)));
  const chosen = candidates.find((e) => canAcquireGhostTarget(ghost, e, clearRay, 120));
  if (state.target !== chosen?.id) {
    state.start = null;
    mark(ghost, "casting", false);
  }
  state.target = chosen?.id;
  return chosen;
}
function getGhostState(id) {
  const s = states.get(id);
  return s ? { searchStart: s.searchStart, start: s.start, nextStyle: s.nextStyle, style: s.style, home: s.home, target: s.target } : null;
}
function searchForTarget(ghost, state) {
  const now = system.currentTick, search = cfg.search;
  mark(ghost, "casting", false);
  state.start = null;
  ghost.clearVelocity();
  if (state.searchStart !== null) {
    mark(ghost, "moving", false);
    if (now - state.searchStart >= search.durationTicks) {
      state.searchStart = null;
      mark(ghost, "searching", false);
      state.nextSearch = now + search.intervalMinTicks + Math.floor(Math.random() * (search.intervalMaxTicks - search.intervalMinTicks + 1));
    }
    return;
  }
  if (now >= state.nextSearch) {
    state.searchStart = now;
    mark(ghost, "searching", true);
    mark(ghost, "moving", false);
    return;
  }
  if (!state.wanderTo || now >= state.nextWander || length(sub(state.wanderTo, ghost.location)) < 0.5) {
    const angle = Math.random() * Math.PI * 2, radius = 2 + Math.random() * (search.wanderRadius - 2);
    state.wanderTo = add(state.home, { x: Math.sin(angle) * radius, y: 0, z: Math.cos(angle) * radius });
    state.nextWander = now + 100;
  }
  const delta = sub(state.wanderTo, ghost.location), direction = unit({ x: delta.x, y: 0, z: delta.z });
  const next = add(ghost.location, mul(direction, search.wanderSpeed));
  try {
    if (!ghost.dimension.getBlock(next)) {
      mark(ghost, "moving", false);
      return;
    }
  } catch {
    mark(ghost, "moving", false);
    return;
  }
  ghost.applyImpulse(mul(direction, search.wanderSpeed));
  ghost.setRotation({ x: 0, y: -Math.atan2(direction.x, direction.z) * 180 / Math.PI });
  mark(ghost, "moving", true);
}
world.afterEvents.worldLoad.subscribe(() => system.runInterval(() => {
  const live = /* @__PURE__ */ new Set();
  for (const dimensionId of ["overworld", "nether", "the_end"]) {
    const dimension = world.getDimension(dimensionId);
    for (const ghost of dimension.getEntities({ type: TYPE })) try {
      live.add(ghost.id);
      if (!living(ghost)) continue;
      let state = states.get(ghost.id);
      if (!state) {
        state = { nextCast: system.currentTick + 30, target: null, start: null, nextStyle: 0, style: 0, searchStart: null, nextSearch: system.currentTick + cfg.search.firstDelayTicks, home: { ...ghost.location }, nextWander: 0 };
        states.set(ghost.id, state);
        ghost.removeTag("wl_apagavelas_damage_open");
      }
      if (ghost.hasTag("wl_apagavelas_probe_hold") || !canCombat()) {
        ghost.clearVelocity();
        mark(ghost, "casting", false);
        mark(ghost, "moving", false);
        mark(ghost, "searching", false);
        state.start = null;
        state.searchStart = null;
        continue;
      }
      const target = targetFor(ghost, state);
      if (!target) {
        searchForTarget(ghost, state);
        continue;
      }
      state.home = { ...ghost.location };
      state.nextSearch = system.currentTick + cfg.search.firstDelayTicks;
      state.searchStart = null;
      mark(ghost, "searching", false);
      if (state.start !== null) {
        ghost.clearVelocity();
        mark(ghost, "moving", false);
        const age = system.currentTick - state.start, style = cfg.attackStyles[state.style];
        const delta = sub(target.location, ghost.location);
        ghost.setRotation({ x: 0, y: -Math.atan2(delta.x, delta.z) * 180 / Math.PI });
        if (age < style.releaseTicks.at(-1) && age % 4 === 0) emit(dimension, "charge", center(ghost));
        const releaseIndex = style.releaseTicks.indexOf(age);
        if (releaseIndex >= 0) launchVolley(ghost, target, state.style, releaseIndex);
        if (age >= style.durationTicks) {
          state.start = null;
          mark(ghost, "casting", false);
        }
      } else {
        const clear = moveGhost(ghost, target), distance = length(sub(target.location, ghost.location));
        if (clear && distance <= cfg.orbRange && system.currentTick >= state.nextCast) {
          state.style = state.nextStyle;
          state.nextStyle = (state.nextStyle + 1) % cfg.attackStyles.length;
          state.start = system.currentTick;
          state.nextCast = system.currentTick + cfg.cooldownTicks;
          mark(ghost, "attack_style", state.style);
          mark(ghost, "casting", true);
          ghost.clearVelocity();
        }
      }
    } catch (error) {
      console.warn("[APAGAVELAS] " + String(error));
    }
    for (const orb of dimension.getEntities({ type: ORB })) if (!orbs.has(orb.id)) orb.remove();
  }
  for (const [id] of states) if (!live.has(id)) states.delete(id);
  for (const state of [...orbs.values()]) try {
    stepOrb(state);
  } catch {
    removeOrb(state);
  }
}, 1));
export {
  ORB,
  OSARIO,
  TYPE,
  canCombat,
  cfg,
  clearRay,
  damageGhost,
  getGhostState,
  getOrbStates,
  guardSpectralDamage,
  handleSwing,
  isSpectralSwing,
  launchOrb,
  launchVolley,
  moveGhost,
  performSpecialStrike,
  stepOrb,
  strikeWithSpecial,
  targetFor,
  wearsOsario
};
