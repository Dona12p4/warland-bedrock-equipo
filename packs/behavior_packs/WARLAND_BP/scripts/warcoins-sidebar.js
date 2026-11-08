import { world, DisplaySlotId, ObjectiveSortOrder } from '@minecraft/server';
const published = new Map();
const identities = new Map();
const playerFor = (row) => world.getAllPlayers().find(p => p.getDynamicProperty('warland:player_id') === row.id);
export function pendingWarcoinChange(row) {
    const p = playerFor(row), baseline = published.get(row.id), obj = world.scoreboard.getObjective('warcoins');
    if (!p || baseline === undefined || !obj)
        return 0;
    const score = obj.getScore(p);
    return score === undefined ? 0 : score - baseline;
}
export function updateWarcoinSidebar(row) {
    const p = playerFor(row), obj = world.scoreboard.getObjective('warcoins');
    if (!p || !obj)
        return;
    obj.setScore(p, row.coins);
    published.set(row.id, row.coins);
    identities.set(row.id, p.scoreboardIdentity ?? p);
}
export function pruneWarcoinSidebar() {
    const obj = world.scoreboard.getObjective('warcoins');
    if (!obj)
        return;
    const ids = new Set(world.getAllPlayers().map(p => p.scoreboardIdentity?.id ?? p.id));
    for (const entry of obj.getParticipants())
        if (!ids.has(entry.id))
            obj.removeParticipant(entry);
}
export function forgetWarcoinSidebar(id) { const identity = identities.get(id); if (identity)
    try {
        world.scoreboard.getObjective("warcoins")?.removeParticipant(identity);
    }
    catch { } identities.delete(id); published.delete(id); pruneWarcoinSidebar(); }
export function initializeWarcoinSidebar(rows) {
    let objective = world.scoreboard.getObjective('warcoins');
    if (objective && objective.displayName !== 'Warcoins') {
        world.scoreboard.removeObjective(objective);
        objective = undefined;
    }
    objective ??= world.scoreboard.addObjective('warcoins', 'Warcoins');
    for (const p of objective.getParticipants())
        objective.removeParticipant(p);
    published.clear();
    identities.clear();
    for (const row of rows)
        updateWarcoinSidebar(row);
    if(world.scoreboard.getObjectiveAtDisplaySlot(DisplaySlotId.Sidebar)?.objective.id==='warcoins')world.scoreboard.clearObjectiveAtDisplaySlot(DisplaySlotId.Sidebar);
}
//# sourceMappingURL=warcoins-sidebar.js.map