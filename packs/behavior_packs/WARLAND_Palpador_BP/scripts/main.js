import {registerRetaliation} from './hostile-retaliation.js';
registerRetaliation(['warland:palpador_prototype'],{native:true});
// scripts/palpador-motion-sense.js
import { world, system } from "@minecraft/server";

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

// scripts/palpador-motion-sense.js
var C = sensory_preview_default.palpador;
var previous = /* @__PURE__ */ new Map();
system.runInterval(() => {
  const live = /* @__PURE__ */ new Set();
  for (const id of ["overworld", "nether", "the_end"]) for (const p of world.getDimension(id).getEntities({ families: ["player"] })) try {
    live.add(p.id);
    const at = p.location, last = previous.get(p.id), v = p.getVelocity();
    const moved = !!last && last.dimension === p.dimension.id && (Math.hypot(at.x - last.x, at.y - last.y, at.z - last.z) > C.motionThresholdBlocks || Math.hypot(v.x, v.y, v.z) > 8e-3);
    const targetable = p.typeId !== "minecraft:player" || !["Creative", "Spectator", "creative", "spectator"].includes(p.getGameMode());
    if (moved && targetable) p.addTag(C.motionTag);
    else p.removeTag(C.motionTag);
    previous.set(p.id, { ...at, dimension: p.dimension.id });
  } catch {
  }
  for (const id of previous.keys()) if (!live.has(id)) previous.delete(id);
}, C.motionSampleTicks);
