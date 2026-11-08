import {registerSelectedCreeperEffects} from './selected-creeper-effects.js';
import {inSanctuary} from './sanctuary.js';
import { world, system } from "@minecraft/server";
import { CONFIG } from "./core.js";
function registerThermalSafety(teams, ready, radius = 6) {
  registerSelectedCreeperEffects(teams,ready);
  world.afterEvents.worldLoad.subscribe(() => {
    let objective = world.scoreboard.getObjective("wl_mob_permit") ?? world.scoreboard.addObjective("wl_mob_permit", "WARLAND mob safety");
    const previous = /* @__PURE__ */ new Set();
    system.runInterval(() => {
      const current = /* @__PURE__ */ new Set();
      for (const id of ["overworld", "nether", "the_end"]) for (const entity of world.getDimension(id).getEntities({ type: "warland:thermal_creeper_prototype" })) {
        current.add(entity.id);
        const p = entity.location, b = CONFIG.bufferBlocks, r = radius;
        const blocked = !ready() || inSanctuary(entity.dimension.id,p,radius) || teams.some((t) => t.claims.some((c) => c.dimension === entity.dimension.id && Math.hypot(p.x - Math.max(c.x * 16 - b, Math.min(c.x * 16 + 16 + b, p.x)), p.z - Math.max(c.z * 16 - b, Math.min(c.z * 16 + 16 + b, p.z))) <= r));
        objective.setScore(entity.id, blocked ? -1 : system.currentTick);
      }
      for (const id of previous) if (!current.has(id)) objective.removeParticipant(id);
      previous.clear();
      for (const id of current) previous.add(id);
    }, 1);
  });
}
export {
  registerThermalSafety
};
