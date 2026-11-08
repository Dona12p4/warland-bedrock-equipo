import {consumeThermalHit} from './thermal-retaliation.js';
import {gargantNotice} from './garganta-notice.js';
// scripts/thermal-perception-bedrock.js
import { world as world2, system as system2, BlockVolume, BlockTypes } from "@minecraft/server";

// config/sensory-preview.json
var sensory_preview_default = {
  stage: "isolated-prototype",
  installed: false,
  api: "2.10.0",
  thermal: {
    version: [
      0,
      6,
      3
    ],
    movingPlayerRange: 24,
    heatRange: 12,
    fieldOfViewDegrees: 160,
    motionThresholdBlocks: 2e-3,
    motionMemoryTicks: 4,
    sampleTicks: 2,
    pursuitRange: 48,
    lostSightTicks: 100,
    distractionTicks: 80,
    investigateTicks: 160,
    inspectTicks: 35,
    ignoreTicks: 400,
    targetChannels: 64,
    heatMobsPerScan: 2,
    warmAnimals: [
      "cow",
      "pig",
      "sheep",
      "chicken",
      "wolf",
      "cat",
      "ocelot",
      "horse",
      "donkey",
      "mule",
      "llama",
      "trader_llama",
      "rabbit",
      "fox",
      "panda",
      "polar_bear",
      "goat",
      "camel",
      "mooshroom",
      "sniffer",
      "armadillo",
      "villager",
      "villager_v2",
      "wandering_trader",
      "dolphin",
      "turtle",
      "frog",
      "axolotl",
      "bat",
      "bee",
      "parrot",
      "squid",
      "glow_squid",
      "salmon",
      "cod",
      "tropicalfish",
      "pufferfish"
    ]
  },
  palpador: {
    version: [
      0,
      4,
      2
    ],
    motionSampleTicks: 2,
    motionThresholdBlocks: 3e-3,
    motionTag: "wl_palpador_moving",
    restSeconds: 3.5,
    pulseStartSeconds: 1.1,
    pulseDurationSeconds: 1.4,
    gestures: [
      {
        clip: "feel",
        seconds: 4.2,
        radius: 12
      },
      {
        clip: "feel_ground",
        seconds: 4.8,
        radius: 8
      },
      {
        clip: "feel_wall",
        seconds: 4.6,
        radius: 6
      }
    ]
  }
};

// config/thermal-creeper.json
var thermal_creeper_default = {
  entityId: "warland:thermal_creeper_prototype",
  property: "warland:thermal_signal",
  radiusBlocks: 12,
  fieldOfViewDegrees: 160,
  eyeHeightBlocks: 2,
  scanEveryTicks: 5,
  mobsPerScan: 2,
  candidateLimit: 64,
  riseSeconds: 0.22,
  fadeSeconds: 0.85,
  sources: {
    "minecraft:lit_furnace": {
      strength: 0.95
    },
    "minecraft:lit_blast_furnace": {
      strength: 1
    },
    "minecraft:lit_smoker": {
      strength: 0.9
    },
    "minecraft:torch": {
      strength: 0.8
    },
    "minecraft:soul_torch": {
      strength: 0.65
    },
    "minecraft:lantern": {
      strength: 0.9
    },
    "minecraft:soul_lantern": {
      strength: 0.7
    },
    "minecraft:fire": {
      strength: 1
    },
    "minecraft:soul_fire": {
      strength: 0.75
    },
    "minecraft:lava": {
      strength: 1
    },
    "minecraft:flowing_lava": {
      strength: 1
    },
    "minecraft:campfire": {
      strength: 0.95,
      state: "extinguished",
      value: false
    },
    "minecraft:soul_campfire": {
      strength: 0.75,
      state: "extinguished",
      value: false
    },
    "minecraft:glowstone": {
      strength: 0.85
    },
    "minecraft:sea_lantern": {
      strength: 0.85
    },
    "minecraft:shroomlight": {
      strength: 0.85
    },
    "minecraft:end_rod": {
      strength: 0.75
    },
    "minecraft:lit_redstone_lamp": {
      strength: 0.85
    },
    "minecraft:redstone_torch": {
      strength: 0.45
    },
    "minecraft:lit_pumpkin": {
      strength: 0.8
    },
    "minecraft:ochre_froglight": {
      strength: 0.85
    },
    "minecraft:pearlescent_froglight": {
      strength: 0.85
    },
    "minecraft:verdant_froglight": {
      strength: 0.85
    },
    "warland:umbral_vent": {
      strength: 0.65
    }
  }
};

// scripts/thermal-sense-core.js
function sourceStrength(typeId, states3 = {}) {
  const rule = thermal_creeper_default.sources[typeId];
  if (!rule || rule.state && states3[rule.state] !== rule.value) return 0;
  return rule.strength;
}
function easeThermal(current, target, dt) {
  const tau = target > current ? thermal_creeper_default.riseSeconds : thermal_creeper_default.fadeSeconds;
  const next = current + (target - current) * (1 - Math.exp(-dt / tau));
  return target === 0 && next < 0.01 ? 0 : Math.max(0, Math.min(1, next));
}

// scripts/thermal-combat-bedrock.js
import { world, system, EntityDamageCause, GameMode } from "@minecraft/server";

// config/thermal-combat.json
var thermal_combat_default = {
  version: [
    0,
    5,
    3
  ],
  detectionBlocks: 24,
  screamSeconds: 3.9,
  runSpeed: 0.48,
  suctionTriggerBlocks: 4,
  suctionRadiusBlocks: 6,
  suctionSeconds: 2.8,
  suctionImpulse: 0.13,
  maximumPullSpeed: 0.45,
  blastRadiusBlocks: 6,
  peakDamage: {
    easy: 50,
    normal: 90,
    hard: 135,
    peaceful: 0
  },
  blindnessSeconds: 6,
  breaksBlocks: false,
  requiresAreaPermit: true,
  audioPending: false,
  deafnessImplemented: false,
  installed: false,
  ringingVolume: 1,
  ringingIncluded: true,
  whispersSeconds: 3,
  whispersVolume: 0.85,
  explosionVolume: 1,
  explosionIncluded: true,
  whispersIncluded: true,
  preBlastTremor: true,
  screamVolume: 1,
  suctionVolume: 0.9,
  suctionAudioSeconds: 3,
  whispersDelaySeconds: 0.5,
  screamIncluded: true,
  suctionAudioIncluded: true
};

// scripts/thermal-combat-core.js
function radialDamage(distance2, exposure2, peak, radius) {
  if (distance2 >= radius || exposure2 <= 0 || peak <= 0) return 0;
  const power = (1 - Math.max(0, distance2) / radius) * Math.min(1, exposure2);
  return Math.max(1, Math.floor(peak * power * (0.5 + 0.5 * power)));
}
function pullVector(from, to, strength, maxSpeed, velocity) {
  const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz);
  if (d < 0.85) return { x: 0, y: 0, z: 0 };
  const x = dx / d, z = dz / d, along = velocity.x * x + velocity.z * z;
  const impulse = Math.max(0, Math.min(strength, maxSpeed - along));
  return { x: x * impulse, y: 0, z: z * impulse };
}

// scripts/thermal-combat-bedrock.js
var type = "warland:thermal_creeper_prototype";
var states = /* @__PURE__ */ new Map();
function canAffectArea(entity) {
  const permit = world.scoreboard.getObjective("wl_mob_permit");
  if (permit) {
    const tick = permit.getScore(entity.id) ?? -100;
    const age = system.currentTick - tick;
    return tick >= 0 && age >= 0 && age <= 1;
  }
  if (world.scoreboard.getObjective("warcoins")) return false;
  return world.getDynamicProperty("warland:thermal_isolated_lab") !== false;
}
system.afterEvents.scriptEventReceive.subscribe((e) => {
  if (e.id !== "warland:thermal_lab" || !["Server", "Entity"].includes(e.sourceType)) return;
  if (e.sourceEntity && e.sourceEntity.typeId !== "minecraft:player") return;
  if (world.scoreboard.getObjective("warcoins")) return;
  world.setDynamicProperty("warland:thermal_isolated_lab", e.message.trim() === "on");
});
var living = (e) => e.isValid && (e.getComponent("minecraft:health")?.currentValue ?? 0) > 0;
function vulnerable(e) {
  if (!living(e)) return false;
  if (e.typeId === "minecraft:player") return ![GameMode.Creative, GameMode.Spectator].includes(e.getGameMode());
  return true;
}
function exposure(entity, victim) {
  const origin = { ...entity.location, y: entity.location.y + 0.9 }, to = victim.location;
  let clear = 0;
  for (const height of [0.25, 0.9, 1.5]) {
    const delta = { x: to.x - origin.x, y: to.y + height - origin.y, z: to.z - origin.z }, length = Math.hypot(delta.x, delta.y, delta.z);
    if (length < 0.01 || !entity.dimension.getBlockFromRay(origin, { x: delta.x / length, y: delta.y / length, z: delta.z / length }, { maxDistance: length, includeLiquidBlocks: false, includePassableBlocks: false })) clear++;
  }
  return clear / 3;
}
function suck(entity, emitParticles = true) {
  if (!canAffectArea(entity)) return 0;
  let count = 0;
  for (const victim of entity.dimension.getEntities({ location: entity.location, maxDistance: thermal_combat_default.suctionRadiusBlocks })) {
    if (victim.id === entity.id || !vulnerable(victim) || exposure(entity, victim) === 0) continue;
    const v = pullVector(victim.location, entity.location, thermal_combat_default.suctionImpulse, thermal_combat_default.maximumPullSpeed, victim.getVelocity());
    victim.applyImpulse(v);
    count++;
  }
  if (emitParticles) try {
    entity.dimension.spawnParticle("warland:thermal_suction", { ...entity.location, y: entity.location.y + 1.1875 });
  } catch {
  }
  return count;
}
function detonate(entity) {
  const allowed = canAffectArea(entity), at = { ...entity.location }, dimension = entity.dimension;
  const hits = [];
  if (allowed) {
    dimension.playSound("warland.thermal.explosion", at, { volume: thermal_combat_default.explosionVolume, pitch: 1 });
    try {
      dimension.spawnParticle("warland:thermal_black_blast", { ...at, y: at.y + 1 });
    } catch {
    }
    const difficulty = String(world.getDifficulty()).toLowerCase();
    for (const victim of dimension.getEntities({ location: at, maxDistance: thermal_combat_default.blastRadiusBlocks })) {
      if (victim.id === entity.id || !vulnerable(victim)) continue;
      const distance2 = Math.hypot(victim.location.x - at.x, victim.location.y - at.y, victim.location.z - at.z);
      const damage = radialDamage(distance2, 1, thermal_combat_default.peakDamage[difficulty] ?? thermal_combat_default.peakDamage.normal, thermal_combat_default.blastRadiusBlocks);
      if (!damage) continue;
      const applied = victim.applyDamage(damage, { cause: EntityDamageCause.entityExplosion, damagingEntity: entity });
      hits.push({ id: victim.id, player: victim.typeId === "minecraft:player" ? victim.name : null, nameTag: victim.nameTag, position: { ...victim.location }, damage, applied });
      if (applied && living(victim) && victim.typeId === "minecraft:player") {
        victim.addEffect("blindness", thermal_combat_default.blindnessSeconds * 20, { showParticles: false });
        victim.runCommand("stopsound @s warland.thermal.ringing");
        victim.playSound("warland.thermal.ringing", { volume: thermal_combat_default.ringingVolume, pitch: 1 });
        system.runTimeout(() => {
          if (!victim.isValid || !vulnerable(victim)) return;
          victim.runCommand("stopsound @s warland.thermal.whispers");
          victim.playSound("warland.thermal.whispers", { volume: thermal_combat_default.whispersVolume, pitch: 1 });
        }, Math.round(thermal_combat_default.whispersDelaySeconds * 20));
      }
    }
  }
  console.warn("[WARLAND_AUDIT] " + JSON.stringify({ category: "security", action: "thermal_blast", at: Date.now(), outcome: allowed ? "allowed" : "blocked", dimension: dimension.id, position: at, target: entity.typeId, player: null, nameTag: null, hits, detail: "Custom black blast; no block destruction; no inferred player attribution." }));
  entity.remove();
  return { allowed, hits };
}
world.afterEvents.worldLoad.subscribe(() => system.runInterval(() => {
  const live = /* @__PURE__ */ new Set();
  for (const id of ["overworld", "nether", "the_end"]) for (const entity of world.getDimension(id).getEntities({ type })) {
    live.add(entity.id);
    if (!living(entity)) continue;
    const phase = entity.getProperty("warland:phase");
    let state = states.get(entity.id);
    if (!state || state.phase !== phase) {
      state = { phase, since: system.currentTick };
      states.set(entity.id, state);
      if (phase === 1) entity.dimension.playSound("warland.thermal.scream", entity.location, { volume: thermal_combat_default.screamVolume, pitch: 1 });
      if (phase === 3) entity.dimension.playSound("warland.thermal.suction", entity.location, { volume: thermal_combat_default.suctionVolume, pitch: 1 });
    }
    if (phase === 3 && system.currentTick % 2 === 0) suck(entity, system.currentTick - state.since < (thermal_combat_default.suctionSeconds - 0.4) * 20);
    if (phase === 4 && system.currentTick - state.since >= 4) detonate(entity);
  }
  for (const id of states.keys()) if (!live.has(id)) states.delete(id);
}, 1));

// scripts/thermal-perception-bedrock.js
var C = sensory_preview_default.thermal;
var states2 = /* @__PURE__ */ new Map();
var motion = /* @__PURE__ */ new Map();
var placements = /* @__PURE__ */ new Map();
var dimensions = ["overworld", "nether", "the_end"];
var animals = new Set(C.warmAnimals.map((n) => "minecraft:" + n));
var sourceTypes = [];
var cursor = 0;
var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
var key = (d, p) => `${d.id}:${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
var center = (p) => ({ x: Math.floor(p.x) + 0.5, y: Math.floor(p.y) + 0.5, z: Math.floor(p.z) + 0.5 });
function alive(e) {
  try {
    return e.isValid && (e.getComponent("minecraft:health")?.currentValue ?? 1) > 0;
  } catch {
    return false;
  }
}
function prey(e) {
  if (!alive(e)) return false;
  if (e.typeId !== "minecraft:player") return true;
  return !["Creative", "Spectator", "creative", "spectator"].includes(e.getGameMode());
}
function visible(e, p, range, fov = true, sourceBlock) {
  const eye = { ...e.location, y: e.location.y + 2 }, v = { x: p.x - eye.x, y: p.y - eye.y, z: p.z - eye.z }, len = Math.hypot(v.x, v.y, v.z);
  if (len > range) return false;
  if (len < 0.01) return true;
  const forward = e.getViewDirection();
  if (fov && (v.x * forward.x + v.y * forward.y + v.z * forward.z) / len < Math.cos(C.fieldOfViewDegrees * Math.PI / 360)) return false;
  const ray = e.dimension.getBlockFromRay(eye, { x: v.x / len, y: v.y / len, z: v.z / len }, { maxDistance: Math.max(0.01, len - 0.08), includePassableBlocks: false, includeLiquidBlocks: false });
  return !ray || sourceBlock && key(e.dimension, ray.block.location) === key(e.dimension, sourceBlock);
}
function release(s) {
  try {
    if (s.target?.isValid) s.target.removeTag("wl_heat_focus_" + s.channel);
  } catch {
  }
  try {
    if (s.marker?.isValid) s.marker.remove();
  } catch {
  }
  s.target = null;
  s.marker = null;
  s.choice = null;
  if (s.entity.isValid) {
    s.entity.triggerEvent("warland:unfocus");
    s.entity.triggerEvent("warland:reset");
    s.entity.setProperty("warland:sense_kind", 0);
  }
}
function ignore(s, tick) {
  if (s.choice) s.ignored.set(s.choice.key, tick + C.ignoreTicks);
  release(s);
}
function markerLocation(e, p) {
  for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) for (const dy of [0, 1, -1]) {
    const pos = { x: Math.floor(p.x) + dx, y: Math.floor(p.y) + dy, z: Math.floor(p.z) + dz };
    try {
      const feet = e.dimension.getBlock(pos), head = e.dimension.getBlock({ ...pos, y: pos.y + 1 }), above = e.dimension.getBlock({ ...pos, y: pos.y + 2 });
      const hit = e.dimension.getBlockFromRay({ x: pos.x + 0.5, y: pos.y + 0.05, z: pos.z + 0.5 }, { x: 0, y: -1, z: 0 }, { maxDistance: 1.1, includePassableBlocks: false, includeLiquidBlocks: false });
      if (feet?.isAir && head?.isAir && above?.isAir && hit && hit.block.location.y === pos.y - 1 && !hit.block.isLiquid && !["minecraft:magma", "minecraft:campfire", "minecraft:soul_campfire", "minecraft:cactus"].includes(hit.block.typeId)) return { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 };
    } catch {
    }
  }
  return { ...e.location };
}
function select(s, c, tick) {
  if (s.choice?.key === c.key && s.choice.kind === c.kind) return;
  release(s);
  if (!c) return;
  const e = s.entity;
  s.choice = { ...c, since: tick, until: tick + (c.kind === "decoy" ? C.distractionTicks : C.investigateTicks), nearSince: null };
  if (c.kind === "block" || c.kind === "decoy") {
    s.marker = e.dimension.spawnEntity("warland:heat_marker", markerLocation(e, c.position));
    s.target = s.marker;
  } else s.target = c.entity;
  s.target.addTag("wl_heat_focus_" + s.channel);
  e.triggerEvent("warland:focus_" + s.channel);
  e.setProperty("warland:sense_kind", { player: 1, animal: 2, block: 3, decoy: 4 }[c.kind]);
  e.triggerEvent(c.kind === "player" ? "warland:warn" : "warland:investigate");
}
function heatScan(s, tick) {
  const e = s.entity, r = C.heatRange, p = e.location, bounds = e.dimension.heightRange, volume = new BlockVolume({ x: Math.floor(p.x - r), y: Math.max(bounds.min, Math.floor(p.y - r)), z: Math.floor(p.z - r) }, { x: Math.floor(p.x + r), y: Math.min(bounds.max - 1, Math.floor(p.y + r)), z: Math.floor(p.z + r) });
  const hits = e.dimension.getBlocks(volume, { includeTypes: sourceTypes, location: p, closest: 32 }, true), found = [];
  for (const loc of hits.getBlockLocationIterator()) {
    const b = e.dimension.getBlock(loc);
    if (!b || !sourceStrength(b.typeId, b.permutation.getAllStates())) continue;
    const id = key(e.dimension, loc), position = center(loc);
    if (s.scanned && !s.known.has(id)) s.fresh.set(id, tick);
    s.known.add(id);
    found.push({ key: id, kind: "block", position, block: loc, typeId: b.typeId });
  }
  s.blocks = found;
  s.scanned = true;
  s.scanAt = tick;
  if (s.known.size > 512) s.known = new Set(found.map((b) => b.key));
}
function tickThermal(s, players, tick) {
  const e = s.entity, phase = e.getProperty("warland:phase");
  const struckBy=consumeThermalHit(e,players,tick,C.pursuitRange);
  if (phase === 3 || phase === 4) {
    e.setProperty(thermal_creeper_default.property, 100);
    return;
  }
  if(struckBy&&prey(struckBy)){s.prey={id:struckBy.id,lastSeen:tick};s.retaliationUntil=tick+40;}
  for (const [id, until] of s.ignored) if (tick >= until) s.ignored.delete(id);
  for (const [id, when] of s.fresh) if (tick - when > C.distractionTicks) s.fresh.delete(id);
  const notice=gargantNotice(e);if(notice&&prey(notice)&&!s.prey)s.prey={id:notice.id,lastSeen:tick};
  const candidates = [];
  const remembered = s.prey;
  if (remembered) {
    const p = players.find((p2) => p2.id === remembered.id);
    if (!p || !prey(p) || distance(e.location, p.location) > C.pursuitRange) {
      s.prey = null;
    } else {
      const pos = { ...p.location, y: p.location.y + 1 };
      if (visible(e, pos, C.pursuitRange, false)) remembered.lastSeen = tick;
      if (tick - remembered.lastSeen <= C.lostSightTicks) candidates.push({ key: p.id, entity: p, position: pos, kind: "player", score: tick<(s.retaliationUntil??0)?150:85 });
      else s.prey = null;
    }
  }
  for (const p of players) {
    if (!prey(p) || !motion.get(p.id)?.movingUntil || tick > motion.get(p.id).movingUntil) continue;
    const pos = { ...p.location, y: p.location.y + 1 };
    if (visible(e, pos, C.movingPlayerRange, s.prey?.id !== p.id)) {
      if (!s.prey) s.prey = { id: p.id, lastSeen: tick };
      candidates.push({ key: p.id, entity: p, position: pos, kind: "player", score: s.prey.id === p.id ? 85 : 80 });
    }
  }
  for (const a of e.dimension.getEntities({ location: e.location, maxDistance: C.heatRange })) {
    if (a.id === e.id || s.ignored.has(a.id)) continue;
    const pos = { ...a.location, y: a.location.y + (animals.has(a.typeId) ? 0.7 : 0) };
    if (!visible(e, pos, C.heatRange, s.choice?.key !== a.id)) continue;
    if (animals.has(a.typeId) && alive(a)) candidates.push({ key: a.id, entity: a, position: pos, kind: "animal", score: 30 });
    else if (a.typeId === "minecraft:arrow" && (a.getComponent("minecraft:onfire")?.onFireTicksRemaining ?? 0) > 0) candidates.push({ key: a.id, entity: a, position: pos, kind: "decoy", score: 120 });
  }
  if (tick - s.scanAt < 100) for (const b of s.blocks) {
    if (s.ignored.has(b.key)) continue;
    const live = e.dimension.getBlock(b.block);
    if (!live || !sourceStrength(live.typeId, live.permutation.getAllStates())) continue;
    if (!visible(e, b.position, C.heatRange, s.choice?.key !== b.key, b.block)) continue;
    const created = Math.max(s.fresh.get(b.key) ?? -1e4, placements.get(b.key) ?? -1e4);
    const fresh = tick - created < C.distractionTicks;
    candidates.push({ ...b, kind: fresh ? "decoy" : "block", score: fresh ? 110 : 20 });
  }
  const current = s.choice;
  if (current && current.kind !== "player") {
    if (tick >= current.until) {
      ignore(s, tick);
    } else {
      const match = candidates.find((c) => c.key === current.key);
      if (!match) {
        release(s);
      } else {
        if (current.kind === "decoy") {
          match.kind = "decoy";
          match.score = 130;
        }
        if (current.entity?.isValid && s.marker?.isValid) s.marker.teleport(markerLocation(e, current.entity.location));
        const near = distance(e.location, match.position) < 3;
        if (near) {
          current.nearSince ??= tick;
          e.triggerEvent("warland:inspect");
          if (current.kind !== "decoy" && tick - current.nearSince >= C.inspectTicks) ignore(s, tick);
        }
      }
    }
  }
  const available = candidates.filter((c) => !s.ignored.has(c.key));
  available.sort((a, b) => b.score - a.score || distance(e.location, a.position) - distance(e.location, b.position));
  const best = available[0];
  if (best) select(s, best, tick);
  else if (s.choice) release(s);
  const target = available.length ? Math.max(0.25, 1 - distance(e.location, available[0].position) / 32) : 0;
  s.glow = easeThermal(s.glow, target, C.sampleTicks / 20);
  e.setProperty(thermal_creeper_default.property, Math.round(s.glow * 100));
  if (e.getProperty("warland:phase") === 0) {
    const v = e.getVelocity();
    e.setProperty("warland:gait", Math.hypot(v.x, v.z) > 0.015 ? 1 : 0);
  }
}
function perceptionSnapshot(id) {
  const s = states2.get(id);
  return s ? { channel: s.channel, choice: s.choice ? { key: s.choice.key, kind: s.choice.kind, since: s.choice.since } : null, ignored: [...s.ignored.keys()], blocks: s.blocks.map((b) => b.typeId) } : null;
}
world2.afterEvents.playerPlaceBlock.subscribe((ev) => {
  try {
    if (sourceStrength(ev.block.typeId, ev.block.permutation.getAllStates())) placements.set(key(ev.block.dimension, ev.block.location), system2.currentTick);
  } catch {
  }
});
world2.afterEvents.worldLoad.subscribe(() => system2.run(() => {
  sourceTypes = Object.keys(thermal_creeper_default.sources).filter((id) => BlockTypes.get(id));
  const cleaned = /* @__PURE__ */ new Set();
  system2.runInterval(() => {
    const tick = system2.currentTick, all = [], byDimension = /* @__PURE__ */ new Map(), livePlayers = /* @__PURE__ */ new Set();
    for (const id of dimensions) {
      const d = world2.getDimension(id), players = d.getEntities({ families: ["player"] });
      byDimension.set(d.id, players);
      for (const p of players) {
        livePlayers.add(p.id);
        const previous = motion.get(p.id), pos = { ...p.location }, v = p.getVelocity();
        const moved = previous && previous.dimension === d.id && (distance(previous.position, pos) > C.motionThresholdBlocks || Math.hypot(v.x, v.y, v.z) > 8e-3);
        motion.set(p.id, { position: pos, dimension: d.id, movingUntil: moved ? tick + C.motionMemoryTicks : previous?.movingUntil ?? 0 });
      }
      const loaded = d.getEntities();
      for (const a of loaded) if (!cleaned.has(a.id)) {
        cleaned.add(a.id);
        for (const tag of a.getTags()) if (/^wl_heat_focus_\d+$/.test(tag)) a.removeTag(tag);
        if (a.typeId === "warland:heat_marker") a.remove();
      }
      all.push(...loaded.filter(e => e.isValid && e.typeId === thermal_creeper_default.entityId && alive(e)));
    }
    for (const id of motion.keys()) if (!livePlayers.has(id)) motion.delete(id);
    const live = new Set(all.map((e) => e.id));
    for (const [id, s] of states2) if (!live.has(id)) {
      try {
        release(s);
      } catch {
      }
      states2.delete(id);
    }
    const used = new Set([...states2.values()].map((s) => s.channel));
    for (const e of all) if (!states2.has(e.id)) {
      let channel = 0;
      while (used.has(channel)) channel++;
      if (channel >= C.targetChannels) continue;
      used.add(channel);
      const s = { entity: e, channel, choice: null, target: null, marker: null, blocks: [], known: /* @__PURE__ */ new Set(), fresh: /* @__PURE__ */ new Map(), ignored: /* @__PURE__ */ new Map(), scanned: false, scanAt: -1e4, glow: 0 };
      states2.set(e.id, s);
      release(s);
    }
    const entries = [...states2.values()];
    for (let i = 0; i < Math.min(C.heatMobsPerScan, entries.length); i++) {
      const s = entries[(cursor + i) % entries.length];
      try {
        heatScan(s, tick);
      } catch {
        s.blocks = [];
      }
    }
    if (entries.length) cursor = (cursor + C.heatMobsPerScan) % entries.length;
    for (const s of entries) try {
      tickThermal(s, byDimension.get(s.entity.dimension.id) ?? [], tick);
      if (s.marker) cleaned.add(s.marker.id);
    } catch (error) {
      console.warn("[WARLAND_SENSE] " + String(error));
      try {
        release(s);
      } catch {
      }
    }
    for (const [k, t] of placements) if (tick - t > C.distractionTicks) placements.delete(k);
    if (tick % 200 === 0) {
      const loaded = new Set(dimensions.flatMap((id) => world2.getDimension(id).getEntities().map((e) => e.id)));
      for (const id of cleaned) if (!loaded.has(id)) cleaned.delete(id);
    }
  }, C.sampleTicks);
}));
export {
  canAffectArea,
  detonate,
  exposure,
  markerLocation,
  perceptionSnapshot,
  suck
};
