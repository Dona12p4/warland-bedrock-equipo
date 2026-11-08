import { world, system } from "@minecraft/server";
import { CONFIG } from "./core.js";
function registerApagavelasSafety(teams, ready) {
  const type = "warland:apagavelas_prototype";
  const protectedEntity = (entity) => {
    const box = entity.getAABB(), p = entity.location, b = CONFIG.bufferBlocks;
    const minX = Math.min(p.x, box.center.x - box.extent.x) - 0.22, maxX = Math.max(p.x, box.center.x + box.extent.x) + 0.22;
    const minZ = Math.min(p.z, box.center.z - box.extent.z) - 0.22, maxZ = Math.max(p.z, box.center.z + box.extent.z) + 0.22;
    return teams.some((t) => t.claims.some((c) => c.dimension === entity.dimension.id && maxX >= c.x * 16 - b && minX <= c.x * 16 + 16 + b && maxZ >= c.z * 16 - b && minZ <= c.z * 16 + 16 + b));
  };
  world.beforeEvents.entityHurt.subscribe((event) => {
    const attacker = event.damageSource.damagingEntity;
    if (attacker?.typeId !== type) return;
    try {
      if (!ready() || protectedEntity(attacker) || protectedEntity(event.hurtEntity)) event.cancel = true;
    } catch {
      event.cancel = true;
    }
  });
  world.afterEvents.worldLoad.subscribe(() => {
    const objective = world.scoreboard.getObjective("wl_apaga_safe") ?? world.scoreboard.addObjective("wl_apaga_safe", "Apagavelas protection");
    objective.setScore("ready", -1);
    system.runInterval(() => objective.setScore("ready", ready() ? system.currentTick : -1), 1);
  });
}
export {
  registerApagavelasSafety
};
