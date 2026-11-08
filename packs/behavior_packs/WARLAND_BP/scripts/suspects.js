export const SUSPECT_POLICY = { windowMs: 300000, radius: 16, maxEvidence: 500 };
const family = (id) => ({
    "minecraft:tnt": "tnt", "minecraft:tnt_minecart": "tnt",
    "minecraft:end_crystal": "crystal", "minecraft:ender_crystal": "crystal",
    "minecraft:respawn_anchor": "anchor", "minecraft:bed": "bed", "minecraft:creeper": "creeper",
}[id ?? ""]);
function evidenceFamily(e) {
    if (!e.player || !e.position || !["block", "clicked_block", "entity"].includes(e.positionKind))
        return;
    if (e.action === "place_block" && e.outcome === "observed")
        return family(e.target);
    if (e.action === "container_tnt_load" && e.outcome === "candidate")
        return family(e.item);
    if (!["risky_interaction", "interact_entity"].includes(e.action) || e.outcome !== "attempt")
        return;
    // No usar el origen del jugador, una acción bloqueada ni una interacción irrelevante como indicio.
    if (["minecraft:tnt", "minecraft:tnt_minecart", "minecraft:end_crystal"].includes(e.item ?? ""))
        return family(e.item);
    if (["minecraft:flint_and_steel", "minecraft:fire_charge"].includes(e.item ?? ""))
        return family(e.target);
    if (["minecraft:respawn_anchor", "minecraft:bed"].includes(e.target ?? ""))
        return family(e.target);
}
export class SuspectTracker {
    recent = [];
    remember(event) {
        if (!evidenceFamily(event))
            return;
        this.recent = this.recent.filter(e => event.at - e.at <= SUSPECT_POLICY.windowMs);
        this.recent.push(JSON.parse(JSON.stringify(event)));
        if (this.recent.length > SUSPECT_POLICY.maxEvidence)
            this.recent.splice(0, this.recent.length - SUSPECT_POLICY.maxEvidence);
    }
    find(at, dimension, position, sourceType) {
        const kind = family(sourceType);
        if (!position || !kind)
            return [];
        this.recent = this.recent.filter(e => at - e.at <= SUSPECT_POLICY.windowMs);
        const found = new Map();
        // Se conserva el indicio más reciente de cada identidad, con sus límites explícitos.
        for (const e of [...this.recent].reverse()) {
            const age = at - e.at;
            if (age < 0 || age > SUSPECT_POLICY.windowMs || e.dimension !== dimension || evidenceFamily(e) !== kind)
                continue;
            const pos = e.position;
            const distance = Math.hypot(pos.x - position.x, pos.y - position.y, pos.z - position.z);
            if (distance > SUSPECT_POLICY.radius)
                continue;
            const key = e.playerId == null ? e.player : String(e.playerId);
            if (found.has(key))
                continue;
            const object = e.action === "place_block" ? e.target : e.item ? `${e.item} sobre ${e.target ?? "bloque"}` : e.target;
            const secondsBefore = Math.floor(age / 1000);
            found.set(key, {
                player: e.player, playerId: e.playerId, nameTag: e.nameTag, evidenceAt: e.at, action: e.action,
                outcome: e.outcome, object, position: pos, distance: Math.round(distance * 10) / 10, secondsBefore,
                reason: `${e.evidenceReason ?? (e.outcome === "observed" ? "Colocación confirmada" : "Intento de interacción; resultado no confirmado")} con ${object}, ${secondsBefore} s antes, a ${Math.round(distance * 10) / 10} bloques del origen. Indicio, no autoría demostrada.`,
            });
        }
        return [...found.values()];
    }
}
//# sourceMappingURL=suspects.js.map