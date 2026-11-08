import {registerRetaliation} from './hostile-retaliation.js';
registerRetaliation(['warland:rastreador_prototype'],{native:true});
function mobileSetProperty(entity,key,value){if(entity.getProperty(key)!==value)entity.setProperty(key,value);}
// scripts/rastreador-bedrock.js
import { world, system } from "@minecraft/server";
var id = "warland:rastreador_prototype";
var positions = /* @__PURE__ */ new Map();
var noises = /* @__PURE__ */ new Map();
var gestures = /* @__PURE__ */ new Map();
function noise(e) {
  if (e.player) noises.set(e.player.id, system.currentTick + 15);
}
world.afterEvents.playerPlaceBlock.subscribe(noise);
world.afterEvents.playerBreakBlock.subscribe(noise);
system.runInterval(() => {
  const tick = system.currentTick, live = /* @__PURE__ */ new Set();
  for (const dimension of ["overworld", "nether", "the_end"]) {
    const d = world.getDimension(dimension);
    for (const p of d.getEntities({ families: ["player"] })) try {
      live.add(p.id);
      const pos = p.location, last = positions.get(p.id), v = p.getVelocity(), moved = last && last.dimension === d.id && (Math.hypot(pos.x - last.x, pos.y - last.y, pos.z - last.z) > 6e-3 || Math.hypot(v.x, v.y, v.z) > 0.012);
      const permitted = p.typeId !== "minecraft:player" || !["Creative", "Spectator", "creative", "spectator"].includes(p.getGameMode()), loud = permitted && (moved && !p.isSneaking || tick < (noises.get(p.id) ?? 0)), soft = permitted && moved && p.isSneaking;
      for (const [tag, value] of [["wl_rastreador_loud", loud], ["wl_rastreador_soft", soft]]) if (value) p.addTag(tag);
      else p.removeTag(tag);
      positions.set(p.id, { ...pos, dimension: d.id });
    } catch {
    }
    for (const e of d.getEntities({ type: id })) try {
      let s = gestures.get(e.id);
      if (!s) {
        s = { next: tick + 140 + gestures.size % 4 * 35, index: 0, until: 0 };
        gestures.set(e.id, s);
      }
      live.add(e.id);
      const aggressive = e.getProperty("warland:aggressive");
      if (aggressive && !s.wasAggressive) {
        s.alertUntil = tick + 23;
        mobileSetProperty(e,"warland:alerting", true);
      }
      if (s.alertUntil && tick >= s.alertUntil || !aggressive) {
        mobileSetProperty(e,"warland:alerting", false);
        s.alertUntil = 0;
      }
      s.wasAggressive = aggressive;
      if (aggressive) {
        s.until = 0;
        s.next = tick + 160;
        continue;
      }
      if (s.until && tick >= s.until) {
        e.triggerEvent("warland:gesture_0");
        s.until = 0;
        s.next = tick + 160;
      }
      if (!s.until && tick >= s.next && Math.hypot(e.getVelocity().x, e.getVelocity().z) < 0.02) {
        const sequence = [1, 2, 1, 3], g = sequence[s.index++ % 4];
        e.triggerEvent("warland:gesture_" + g);
        s.until = tick + { 1: 96, 2: 52, 3: 84 }[g];
      }
    } catch {
    }
  }
  for (const map of [positions, gestures]) for (const key of map.keys()) if (!live.has(key)) map.delete(key);
  for (const [key, until] of noises) if (tick > until) noises.delete(key);
}, 2);
world.afterEvents.entityHurt.subscribe(({ hurtEntity: e }) => {
  if (e.typeId !== id) return;
  try {
    mobileSetProperty(e,"warland:hurt", true);
    system.runTimeout(() => {
      try {
        if (e.isValid) mobileSetProperty(e,"warland:hurt", false);
      } catch {
      }
    }, 11);
  } catch {
  }
});
world.afterEvents.entityDie.subscribe(({ deadEntity: e }) => {
  if (e.typeId !== id) return;
  try {
    const d = e.dimension, pos = e.location, rotation = e.getRotation();
    system.run(() => {
      try {
        const remains = d.spawnEntity("warland:rastreador_remains", pos);
        remains.setRotation(rotation);
      } catch {
      }
    });
  } catch {
  }
});
