import { world, system, DisplaySlotId } from "@minecraft/server";
import { teamFor } from "./core.js";
import { teamTag } from "./team-style.js";
function displayedHearts(health) {
  return Math.max(0, Math.ceil(health) / 2);
}
function updatePlayerPresentation(p, teams) {
  const id = p.getDynamicProperty("warland:player_id"), team = typeof id === "string" ? teamFor(teams, id) : void 0;
  const prefix = team ? teamTag(team) + " " : "";
  if ("chatNamePrefix" in p) {
    const chat = p;
    if (chat.chatNamePrefix !== prefix) chat.chatNamePrefix = prefix || void 0;
  }
  const tag = prefix + "\xA7f" + p.name + "\xA7r";
  if (p.nameTag !== tag) p.nameTag = tag;
  const health = p.getComponent("minecraft:health");
  return { name: tag, hearts: displayedHearts(health?.currentValue ?? 0), maximum: displayedHearts(health?.effectiveMax ?? 20) };
}
function registerPlayerPresentation(teams, ready) {
  let queued = false;
  function schedule() {
    if (!queued) {
      queued = true;
      system.run(() => {
        queued = false;
        update();
      });
    }
  }
  function update() {
    if (!ready()) return;
    const objective = world.scoreboard.getObjective("wl_hearts") ?? world.scoreboard.addObjective("wl_hearts", "Vida \xB7 1 punto = \xBD \u2665");
    if (world.scoreboard.getObjectiveAtDisplaySlot(DisplaySlotId.List)?.objective.id !== objective.id) world.getDimension("overworld").runCommand("scoreboard objectives setdisplay list wl_hearts");
    const players = world.getAllPlayers();
    const connected = new Set(players.map((p) => p.name));
    for (const participant of objective.getParticipants()) if (!connected.has(participant.displayName)) objective.removeParticipant(participant);
    for (const p of players) try {
      const info = updatePlayerPresentation(p, teams), points = Math.round(info.hearts * 2);
      if (objective.getScore(p) !== points) objective.setScore(p, points);
    } catch {
    }
  }
  system.runInterval(update, 20);
  world.afterEvents.playerSpawn.subscribe(schedule);
  world.afterEvents.entityHealthChanged.subscribe(({ entity }) => {
    if (entity.typeId === "minecraft:player") schedule();
  });
  world.afterEvents.playerLeave.subscribe((e) => {
    const o = world.scoreboard.getObjective("wl_hearts");
    if (o) {
      for (const p of o.getParticipants()) if (p.displayName === e.playerName) o.removeParticipant(p);
    }
  });
  return { update };
}
export {
  displayedHearts,
  registerPlayerPresentation,
  updatePlayerPresentation
};
