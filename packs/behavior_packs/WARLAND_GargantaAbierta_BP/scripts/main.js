import {registerRetaliation,provokedTarget} from './hostile-retaliation.js';
registerRetaliation(['warland:garganta_abierta_prototype'],{native:true});
import './garganta-dimension-audio.js';
// scripts/garganta-bedrock.js
import { world as world2, system as system2 } from "@minecraft/server";

// config/garganta-abierta.json
var garganta_abierta_default = {
  name: "Garganta Abierta",
  version: "0.7.0",
  identifier: "warland:garganta_abierta_prototype",
  reference: ".codex-attachments/6b88456d-5ec6-4990-a015-b6354cc8ad65/7cea1d1d-4b14-4916-8156-4c9a1d7b2237/42675.png",
  profile: "warland-visual-vanilla-preview-v1",
  texelsPerBlock: 16,
  previewPort: 8773,
  stage: "bedrock_prototype",
  installed: true,
  alarmConcept: "Ecolocalizacion de 360 grados con obstaculos; alarma a criaturas cercanas.",
  attacks: [
    "mordida",
    "embestida"
  ],
  forelegAttacks: false,
  lungeMouthClosed: true,
  alarmMouthOpenSeconds: 0.17,
  sensoryGillsPerSide: 4,
  echolocationStage: "native_detection",
  gillDesign: "uncovered_slits_with_thin_upper_skin_rim",
  echoTremorScale: 0.3,
  gillLightRequiresDetection: true,
  gameplay: {
    health: 60,
    damage: 6,
    walkSpeed: 0.16,
    runSpeed: 0.36,
    echoRange: 18,
    alertRange: 48,
    pursuitRange: 40,
    echoIntervalMin: 160,
    echoIntervalMax: 240,
    chargeDamage: 12,
    chargeHorizontalImpulse: 1.24,
    chargeVerticalImpulse: 0.25,
    screamDamage: 12,
    screamDamageRange: 14,
    screamCooldownTicks: 360,
    screamDirectChance: 0.3,
    screamDetectionChance: 1,
    screamBlockedTicks: 80,
    screamPulseTick: 39,
    alertTargetRange: 64,
    thermalRespondsToScream: false
  },
  installedDestination: "optimized_copy_imported_in_client",
  clientVerified: false,
  clientLoadVerified: false,
  airTasteMaximumOpening: 0.055,
  previousVersionClientLoadVerified: "0.5.0",
  airTastePattern: "five_quick_small_pulses_in_two_bursts_with_pauses",
  alarmDurationSeconds: 7.14,
  alarmSoundStartSeconds: 1.05
};

// prototypes/WARLAND_GargantaAbierta/sounds/echo-clips.json
var echo_clips_default = {
  source: "C:\\Users\\USER\\Desktop\\Todo Escritorio\\C\xF3dex\\Formulacion de proyectos\\material\\segundo-corte\\\u{1F534} TERRORIFICOS o BELLOS \u2753 cantos de SIRENA HIPNOTICOS \u{1F480} sonidos de MIEDO suspenso TENSION misterio.mp3",
  sourceSha256: "3037a2b680439fe8e4f491d397b28b9b10110d6f299d87adcdfb65fa32aa119b",
  sourceSeconds: 17.438186,
  selection: "Independent call windows with gaps before subsequent onsets and long release fades; no pitch/time alteration",
  clips: [
    {
      name: "Canto 1",
      id: "echo_01",
      file: "sounds/garganta/echo_01.ogg",
      sourceStart: 0.1,
      sourceEnd: 4.85,
      fadeInSeconds: 0.12,
      fadeOutSeconds: 0.65,
      duration: 4.75,
      peak: 0.35175,
      envelopeHz: 30,
      envelope: [
        0.061,
        0.107,
        0.22,
        0.241,
        0.251,
        0.348,
        0.339,
        0.301,
        0.342,
        0.392,
        0.522,
        0.475,
        0.374,
        0.433,
        0.554,
        0.432,
        0.533,
        0.601,
        0.454,
        0.49,
        0.464,
        0.442,
        0.48,
        0.575,
        0.667,
        0.572,
        0.626,
        0.595,
        0.706,
        0.857,
        0.931,
        0.982,
        1,
        0.998,
        1,
        1,
        1,
        1,
        0.995,
        1,
        1,
        1,
        0.994,
        0.99,
        0.963,
        0.904,
        1,
        0.876,
        0.824,
        0.958,
        0.749,
        0.874,
        0.83,
        0.78,
        0.851,
        0.716,
        0.872,
        0.798,
        0.932,
        0.679,
        0.689,
        0.765,
        0.775,
        0.874,
        0.772,
        0.728,
        0.599,
        0.664,
        0.771,
        0.724,
        0.809,
        0.646,
        0.565,
        0.71,
        0.56,
        0.627,
        0.643,
        0.579,
        0.484,
        0.503,
        0.635,
        0.458,
        0.577,
        0.577,
        0.521,
        0.744,
        0.621,
        0.457,
        0.621,
        0.54,
        0.488,
        0.589,
        0.52,
        0.439,
        0.478,
        0.493,
        0.44,
        0.434,
        0.551,
        0.545,
        0.509,
        0.519,
        0.416,
        0.516,
        0.595,
        0.357,
        0.478,
        0.535,
        0.544,
        0.503,
        0.489,
        0.438,
        0.458,
        0.491,
        0.562,
        0.555,
        0.471,
        0.409,
        0.541,
        0.541,
        0.587,
        0.503,
        0.503,
        0.456,
        0.57,
        0.486,
        0.461,
        0.345,
        0.413,
        0.343,
        0.431,
        0.381,
        0.312,
        0.359,
        0.23,
        0.3,
        0.268,
        0.152,
        0.182,
        0.184,
        0.125,
        0.083,
        0.037
      ],
      sha256: "78882a120aa5e6c0d882675a80fd5190498652b17630c9f9602c6ed3def4951f"
    },
    {
      name: "Canto 2",
      id: "echo_02",
      file: "sounds/garganta/echo_02.ogg",
      sourceStart: 5.58,
      sourceEnd: 9.65,
      fadeInSeconds: 0.12,
      fadeOutSeconds: 0.65,
      duration: 4.07,
      peak: 0.41594,
      envelopeHz: 30,
      envelope: [
        0.111,
        0.257,
        0.41,
        0.567,
        0.642,
        0.779,
        0.878,
        0.96,
        1,
        0.94,
        0.976,
        0.95,
        0.974,
        1,
        1,
        1,
        1,
        0.807,
        0.784,
        0.772,
        0.896,
        1,
        0.982,
        0.693,
        0.888,
        0.96,
        0.869,
        0.755,
        0.727,
        1,
        0.996,
        0.928,
        0.773,
        0.979,
        0.997,
        0.974,
        0.86,
        0.868,
        0.891,
        0.933,
        0.826,
        0.865,
        0.931,
        0.744,
        0.643,
        0.805,
        0.71,
        0.715,
        0.769,
        0.644,
        0.585,
        0.772,
        0.693,
        0.585,
        0.638,
        0.702,
        0.653,
        0.549,
        0.568,
        0.54,
        0.696,
        0.64,
        0.538,
        0.607,
        0.529,
        0.46,
        0.574,
        0.647,
        0.55,
        0.548,
        0.552,
        0.437,
        0.489,
        0.556,
        0.555,
        0.507,
        0.622,
        0.491,
        0.441,
        0.507,
        0.531,
        0.503,
        0.627,
        0.538,
        0.409,
        0.48,
        0.526,
        0.454,
        0.373,
        0.465,
        0.503,
        0.53,
        0.474,
        0.489,
        0.379,
        0.557,
        0.479,
        0.311,
        0.432,
        0.525,
        0.379,
        0.634,
        0.601,
        0.339,
        0.405,
        0.412,
        0.355,
        0.425,
        0.347,
        0.258,
        0.236,
        0.266,
        0.225,
        0.224,
        0.227,
        0.202,
        0.146,
        0.138,
        0.15,
        0.094,
        0.086,
        0.049,
        0.013
      ],
      sha256: "c48bddce096aaf15a8bbfc37c132290b54be5bc755cc586b34f3c5ee2acced24"
    },
    {
      name: "Canto 3",
      id: "echo_03",
      file: "sounds/garganta/echo_03.ogg",
      sourceStart: 10.46,
      sourceEnd: 15.75,
      fadeInSeconds: 0.12,
      fadeOutSeconds: 0.8,
      duration: 5.29,
      peak: 0.28761,
      envelopeHz: 30,
      envelope: [
        0.191,
        0.472,
        0.707,
        0.929,
        0.98,
        0.966,
        0.993,
        0.979,
        1,
        1,
        1,
        1,
        1,
        1,
        0.91,
        0.953,
        1,
        1,
        0.926,
        1,
        0.826,
        0.974,
        0.862,
        0.825,
        0.829,
        0.938,
        0.818,
        0.831,
        0.835,
        0.801,
        0.856,
        0.904,
        0.806,
        0.744,
        0.797,
        0.746,
        0.719,
        0.767,
        0.725,
        0.61,
        0.764,
        0.671,
        0.677,
        0.647,
        0.589,
        0.691,
        0.579,
        0.575,
        0.777,
        0.593,
        0.773,
        0.553,
        0.572,
        0.575,
        0.552,
        0.747,
        0.681,
        0.521,
        0.66,
        0.678,
        0.646,
        0.651,
        0.507,
        0.482,
        0.658,
        0.622,
        0.489,
        0.544,
        0.573,
        0.456,
        0.506,
        0.467,
        0.519,
        0.587,
        0.598,
        0.478,
        0.492,
        0.48,
        0.519,
        0.619,
        0.489,
        0.433,
        0.415,
        0.571,
        0.653,
        0.58,
        0.542,
        0.489,
        0.509,
        0.534,
        0.623,
        0.451,
        0.528,
        0.623,
        0.46,
        0.544,
        0.407,
        0.372,
        0.536,
        0.498,
        0.442,
        0.504,
        0.479,
        0.557,
        0.612,
        0.511,
        0.42,
        0.431,
        0.522,
        0.63,
        0.432,
        0.452,
        0.487,
        0.411,
        0.448,
        0.384,
        0.442,
        0.454,
        0.416,
        0.543,
        0.441,
        0.346,
        0.373,
        0.3,
        0.33,
        0.303,
        0.339,
        0.383,
        0.416,
        0.429,
        0.325,
        0.376,
        0.44,
        0.389,
        0.454,
        0.485,
        0.489,
        0.435,
        0.363,
        0.376,
        0.375,
        0.292,
        0.254,
        0.273,
        0.227,
        0.17,
        0.188,
        0.223,
        0.256,
        0.252,
        0.247,
        0.227,
        0.156,
        0.114,
        0.116,
        0.114,
        0.105,
        0.08,
        0.031
      ],
      sha256: "5038229c4209e5e114671d08f9b43795b9ea49fafba4da888356ca1279544e9b"
    }
  ],
  originalUnmodified: true
};

// scripts/garganta-combat.js
import { world, system } from "@minecraft/server";
var C = garganta_abierta_default.gameplay;
var recent = /* @__PURE__ */ new Map();
function canScream(s, tick) {
  return tick >= (s.screamReady ?? 0) && s.phase !== "alarm";
}
function queueMeleeScream(s, tick, random = Math.random) {
  if (!s || !canScream(s, tick) || random() >= C.screamDirectChance) return false;
  s.directPending = true;
  return true;
}
function trackBlocked(s, e, p, tick) {
  const dist = Math.hypot(p.location.x - e.location.x, p.location.y - e.location.y, p.location.z - e.location.z);
  if (dist > C.screamDamageRange || dist < 3) {
    s.blocked = null;
    return false;
  }
  const last = s.blocked;
  if (!last || last.target !== p.id || dist < last.distance - 0.65) {
    s.blocked = { target: p.id, since: tick, distance: dist };
    return false;
  }
  return tick - last.since >= C.screamBlockedTicks;
}
function screamVisible(e, p) {
  const from = { ...e.location, y: e.location.y + 2.4 };
  for (const to of [p.getHeadLocation(), { ...p.location, y: p.location.y + 0.8 }]) {
    const v = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z }, len = Math.hypot(v.x, v.y, v.z);
    if (len < 0.01 || !e.dimension.getBlockFromRay(from, { x: v.x / len, y: v.y / len, z: v.z / len }, { maxDistance: len, includePassableBlocks: false, includeLiquidBlocks: false })) return true;
  }
  return false;
}
function screamDamage(e, players, valid) {
  const hits = [];
  for (const p of players) {
    if (!valid(p) || p.dimension.id !== e.dimension.id || Math.hypot(p.location.x - e.location.x, p.location.y - e.location.y, p.location.z - e.location.z) > C.screamDamageRange || !screamVisible(e, p)) continue;
    if (p.applyDamage(C.screamDamage, { cause: "entityAttack", damagingEntity: e })) hits.push(p.id);
  }
  return hits;
}
function pushCharge(e, p, horizontal = C.chargeHorizontalImpulse, vertical = C.chargeVerticalImpulse) {
  if (!e.isValid || !p.isValid || (p.getComponent("minecraft:health")?.currentValue ?? 0) <= 0 || p.dimension.id !== e.dimension.id) return false;
  const dx = p.location.x - e.location.x, dz = p.location.z - e.location.z, len = Math.hypot(dx, dz);
  if (len < 0.01) return false;
  const velocity = p.getVelocity();
  p.applyImpulse({ x: dx / len * horizontal - velocity.x, y: Math.max(0, vertical - velocity.y), z: dz / len * horizontal - velocity.z });
  return true;
}
function recordMelee(ev, onHit) {
  const e = ev.damageSource.damagingEntity, p = ev.hurtEntity;
  if (ev.damage <= 0 || !e?.isValid || e.typeId !== garganta_abierta_default.identifier || !p.isValid || !p.getComponent("minecraft:type_family")?.hasTypeFamily("player")) return;
  if (p.typeId === "minecraft:player" && ["creative", "spectator"].includes(String(p.getGameMode()).toLowerCase())) return;
  const action = e.getProperty("warland:visual_action");
  if (action !== 1 && action !== 2) return;
  const key = e.id + ":" + p.id, now = system.currentTick;
  if (now - (recent.get(key) ?? -1e3) < 10) return;
  recent.set(key, now);
  onHit(e, p, action, now);
  if (action === 2) system.runTimeout(() => {
    try {
      pushCharge(e, p);
    } catch {
    }
  }, 2);
  system.runTimeout(() => {
    if (recent.get(key) === now) recent.delete(key);
  }, 12);
}

// scripts/garganta-bedrock.js
var C2 = garganta_abierta_default.gameplay;
var TYPE = garganta_abierta_default.identifier;
var states = /* @__PURE__ */ new Map();
var preyTags = /* @__PURE__ */ new Map();
var noticePrefix = "wl_ga_notice:";
var recipients = /* @__PURE__ */ new Map();
var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
function validPrey(p) {
  try {
    return p?.isValid && (p.getComponent("minecraft:health")?.currentValue ?? 0) > 0 && (p.typeId !== "minecraft:player" || !["creative", "spectator"].includes(String(p.getGameMode()).toLowerCase()));
  } catch {
    return false;
  }
}
function echoVisible(e, p) {
  if (!validPrey(p) || e.dimension.id !== p.dimension.id || distance(e.location, p.location) > C2.echoRange) return false;
  try {
    const from = { ...e.location, y: e.location.y + 1.4 }, to = p.getHeadLocation(), delta = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z }, len = Math.hypot(delta.x, delta.y, delta.z);
    return len < 0.01 || !e.dimension.getBlockFromRay(from, { x: delta.x / len, y: delta.y / len, z: delta.z / len }, { maxDistance: len, includePassableBlocks: false, includeLiquidBlocks: false });
  } catch {
    return false;
  }
}
function chooseCall(last, random = Math.random) {
  const choices = [0, 1, 2].filter((i) => i !== last);
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}
function mark(e, key, value) {
  if (e.getProperty("warland:" + key) !== value) e.setProperty("warland:" + key, value);
}
function tagPrey(p, tick) {
  p.addTag("wl_garganta_prey");
  preyTags.set(p.id, tick + 120);
}
function alertNearby(e, p, tick = system2.currentTick) {
  tagPrey(p, tick);
  let count = 0;
  for (const mob of e.dimension.getEntities({ location: e.location, maxDistance: C2.alertRange })) {
    if (!["warland:shadow_boss_prototype", "warland:palpador_prototype", "warland:rastreador_prototype", "warland:apagavelas_prototype", TYPE].includes(mob.typeId) || mob.id === e.id) continue;
    for (const tag of mob.getTags()) if (tag.startsWith(noticePrefix)) mob.removeTag(tag);
    mob.addTag(noticePrefix + (tick + 600) + ":" + p.id);
    recipients.set(mob.id, tick + 600);
    if (mob.typeId === TYPE) {
      const ally = states.get(mob.id) ?? { call: -1, phase: "idle", cycles: 0 };
      states.set(mob.id, ally);
      if (ally.phase === "idle" || ally.phase === "echo") {
        ally.calledUntil = tick + 600;
        if (!ally.openingScreamDone) {
          ally.screamReady = tick;
          beginScream(mob, ally, p, tick, "called_opening");
        } else {
          ally.screamReady = Math.max(ally.screamReady ?? 0, tick + 360);
          acquire(mob, ally, p, tick);
        }
      }
    }
    if (["warland:shadow_boss_prototype", "warland:palpador_prototype", "warland:rastreador_prototype"].includes(mob.typeId)) try {
      mob.triggerEvent("warland:garganta_alert");
    } catch {
    }
    count++;
  }
  return count;
}
function beginEcho(e, s, tick, random = Math.random) {
  s.call = chooseCall(s.call, random);
  s.until = tick + Math.ceil((0.15 + echo_clips_default.clips[s.call].duration + 0.35) * 20);
  s.start = tick;
  s.target = null;
  s.phase = "echo";
  e.setProperty("warland:echo", s.call + 1);
  e.triggerEvent("warland:scan");
}
function acquire(e, s, p, tick) {
  s.target = p.id;
  tagPrey(p, tick);
  e.triggerEvent("warland:acquire");
  s.phase = "acquire";
  s.until = tick + 60;
  s.blocked = null;
  s.directPending = false;
}
function beginScream(e, s, p, tick, reason = "blocked") {
  if (!validPrey(p) || !canScream(s, tick) || p.dimension.id !== e.dimension.id) return false;
  s.openingScreamDone = true;
  s.target = p.id;
  s.phase = "alarm";
  s.start = tick;
  s.reason = reason;
  s.pulseDone = false;
  s.directPending = false;
  s.blocked = null;
  s.until = tick + Math.ceil(garganta_abierta_default.alarmDurationSeconds * 20);
  s.screamReady = s.until + C2.screamCooldownTicks;
  e.setRotation({ x: 0, y: -Math.atan2(p.location.x - e.location.x, p.location.z - e.location.z) * 180 / Math.PI });
  e.triggerEvent("warland:alarm");
  return true;
}
function stepGarganta(e, players, tick, random = Math.random) {
  let s = states.get(e.id);
  if (!s) {
    s = { next: tick + 35, call: -1, phase: "idle", cycles: 0 };
    states.set(e.id, s);
  }
  const revenge=provokedTarget(e,C2.pursuitRange);
  if(revenge&&(s.target!==revenge.id||['idle','echo','shake'].includes(s.phase))){
    if(s.phase==='alarm')s.target=revenge.id;
    else if(!s.openingScreamDone&&beginScream(e,s,revenge,tick,'provoked_opening')){}
    else acquire(e,s,revenge,tick);
  }
  if (s.phase === "alarm") {
    const p = s.target && world2.getEntity(s.target);
    if (!s.pulseDone && tick - s.start >= C2.screamPulseTick) {
      s.pulseDone = true;
      s.lastScreamHits = screamDamage(e, players, validPrey);
      if (s.reason !== "called_opening" && validPrey(p) && p.dimension.id === e.dimension.id) alertNearby(e, p, tick);
    }
    if (tick >= s.until) {
      if (validPrey(p) && p.dimension.id === e.dimension.id && distance(p.location, e.location) <= C2.pursuitRange) acquire(e, s, p, tick);
      else {
        e.triggerEvent("warland:calm");
        s.phase = "idle";
        s.next = tick + 80;
      }
    }
    return s;
  }
  if (e.getProperty("warland:aggressive")) {
    const p = s.target && world2.getEntity(s.target);
    if (!validPrey(p) || p.dimension.id !== e.dimension.id || distance(p.location, e.location) > (tick < (s.calledUntil ?? 0) ? C2.alertTargetRange : C2.pursuitRange)) {
      e.triggerEvent("warland:calm");
      s.phase = "idle";
      s.next = tick + 80;
      return;
    }
    tagPrey(p, tick);
    s.phase = "hunt";
    s.next = tick + 100;
    const blocked = trackBlocked(s, e, p, tick);
    if (canScream(s, tick) && e.getProperty("warland:visual_action") === 0 && (blocked || s.directPending)) {
      beginScream(e, s, p, tick, blocked ? "blocked" : "rare_melee");
    }
    return s;
  }
  if (s.phase === "hunt") {
    s.phase = "idle";
    s.next = tick + 60;
  }
  if (s.phase === "echo") {
    if (tick - s.start >= 12 && tick <= s.until - 10) {
      const p = players.filter((p2) => echoVisible(e, p2)).sort((a, b) => distance(a.location, e.location) - distance(b.location, e.location))[0];
      if (p) {
        s.target = p.id;
        mark(e, "detected", true);
      }
    }
    if (tick >= s.until) {
      const p = s.target && world2.getEntity(s.target);
      mark(e, "detected", false);
      if (validPrey(p) && p.dimension.id === e.dimension.id) {
        if (!(random() < C2.screamDetectionChance && beginScream(e, s, p, tick, "rare_detection"))) acquire(e, s, p, tick);
      } else {
        e.triggerEvent("warland:calm");
        s.phase = "idle";
        s.next = tick + C2.echoIntervalMin + Math.floor(random() * (C2.echoIntervalMax - C2.echoIntervalMin));
      }
    }
  } else if (s.phase === "acquire" && tick >= s.until) {
    e.triggerEvent("warland:calm");
    s.phase = "idle";
    s.next = tick + 80;
  } else if (s.phase === "shake" && tick >= s.until) {
    e.triggerEvent("warland:calm");
    s.phase = "idle";
    s.next = tick + 80;
  } else if (s.phase === "idle" && tick >= s.next) {
    if (++s.cycles % 4 === 0) {
      e.triggerEvent("warland:shake");
      s.phase = "shake";
      s.until = tick + 36;
    } else beginEcho(e, s, tick, random);
  }
  return s;
}
var stateFor = (id) => states.get(id);
system2.runInterval(() => {
  const tick = system2.currentTick, live = /* @__PURE__ */ new Set();
  for (const name of ["overworld", "nether", "the_end"]) {
    const d = world2.getDimension(name), players = d.getEntities({ families: ["player"] });
    for (const p of players) if (p.hasTag("wl_garganta_prey") && tick > (preyTags.get(p.id) ?? -1)) p.removeTag("wl_garganta_prey");
    for (const e of d.getEntities({ type: TYPE })) try {
      if (!validPrey(e)) continue;
      live.add(e.id);
      stepGarganta(e, players, tick);
    } catch (error) {
      console.warn("[GARGANTA] " + error);
    }
  }
  for (const id of states.keys()) if (!live.has(id)) states.delete(id);
  for (const [id, until] of preyTags) if (tick > until) preyTags.delete(id);
  for (const [id, until] of recipients) if (tick > until) {
    const e = world2.getEntity(id);
    if (e?.isValid) {
      try {
        e.triggerEvent("warland:garganta_quiet");
      } catch {
      }
      for (const tag of e.getTags()) if (tag.startsWith(noticePrefix)) e.removeTag(tag);
    }
    recipients.delete(id);
  }
}, 2);
world2.afterEvents.entityHurt.subscribe(({ hurtEntity: e }) => {
  if (e.typeId !== TYPE) return;
  try {
    mark(e, "hurt", true);
    const s = states.get(e.id);
    if (s?.phase === "idle") s.next = Math.min(s.next, system2.currentTick + 10);
    system2.runTimeout(() => {
      if (e.isValid) mark(e, "hurt", false);
    }, 12);
  } catch {
  }
});
world2.afterEvents.entityHurt.subscribe((ev) => recordMelee(ev, (e, p, action, tick) => queueMeleeScream(states.get(e.id), tick)));
world2.afterEvents.entityDie.subscribe(({ deadEntity: e }) => {
  if (e.typeId !== TYPE) return;
  try {
    const d = e.dimension, pos = e.location, rotation = e.getRotation();
    system2.run(() => {
      try {
        const corpse = d.spawnEntity("warland:garganta_remains", pos);
        corpse.setRotation(rotation);
      } catch {
      }
    });
  } catch {
  }
});
export {
  alertNearby,
  beginEcho,
  beginScream,
  canScream,
  chooseCall,
  echoVisible,
  pushCharge,
  queueMeleeScream,
  screamDamage,
  stateFor,
  stepGarganta,
  trackBlocked,
  validPrey
};
