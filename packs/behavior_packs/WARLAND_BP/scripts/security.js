import { isHostileDefenseTarget, defenseUseAllowed } from './hostile-defense.js';
import { world, system, Player, Direction, EntityDamageCause } from "@minecraft/server";
import { CONFIG, canAccess, zoneAt } from "./core.js";
import { SuspectTracker, SUSPECT_POLICY } from "./suspects.js";
import { registerContainerAudit } from "./container-audit.js";
import { TERRITORY_ITEM, holdsTerritoryTool } from './territory-selector.js';
// Observaciones de riesgo, no acusaciones automáticas ni sanciones.
const dangerousBlocks = new Set(["tnt", "respawn_anchor", "fire", "soul_fire", "lava", "flowing_lava", "wither_skeleton_skull", "skull"]);
const mechanismBlocks = new Set(["piston", "sticky_piston", "dispenser", "dropper", "hopper"]);
const riskyItems = new Set(["tnt", "lava_bucket", "water_bucket", "powder_snow_bucket", "flint_and_steel", "fire_charge", "end_crystal", "tnt_minecart", "hopper_minecart", "wind_charge", "respawn_anchor"]);
const short = (id) => id.replace(/^minecraft:/, "");
const point = (p) => ({ x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) });
const riskyItem = (id) => riskyItems.has(short(id)) || id.endsWith("_spawn_egg");
const offsets = { [Direction.Up]: { x: 0, y: 1, z: 0 }, [Direction.Down]: { x: 0, y: -1, z: 0 }, [Direction.North]: { x: 0, y: 0, z: -1 }, [Direction.South]: { x: 0, y: 0, z: 1 }, [Direction.East]: { x: 1, y: 0, z: 0 }, [Direction.West]: { x: -1, y: 0, z: 0 } };
export function registerSecurity(options) {
    const notices = new Map();
    const suspectTracker = new SuspectTracker();
    function allowed(p, dimension, pos, buffer = CONFIG.bufferBlocks) {
        if (!options.ready())
            return false;
        if (options.isAdmin(p))
            return true;
        const id = p.getDynamicProperty("warland:player_id");
        return !!id && canAccess(options.teams, id, dimension, pos.x, pos.z, buffer);
    }
    function record(p, context) {
        const { alert: _legacyChatAlert, ...details } = context;
        const position = context.position ? point(context.position) : null;
        const playerId = p?.getDynamicProperty("warland:player_id");
        const event = {
            schema: 2, category: "security", at: Date.now(), ...details, position,
            player: p?.name ?? null, playerId: typeof playerId === "string" ? playerId : null,
            nameTag: p?.nameTag ?? null, admin: p ? options.isAdmin(p) : false,
            territory: position ? zoneAt(options.teams, context.dimension, position.x, position.z)?.name ?? null : null,
            ...(context.action === "explosion" ? { suspectPolicy: SUSPECT_POLICY } : {}),
        };
        suspectTracker.remember(event);
        if (context.action === "container_tnt_change")
            for (const s of context.suspects ?? []) {
                suspectTracker.remember({ at: s.evidenceAt, player: s.player, playerId: s.playerId, nameTag: s.nameTag,
                    action: s.action, outcome: "candidate", dimension: context.dimension, position: s.position,
                    positionKind: "block", item: "minecraft:tnt", target: context.target, evidenceReason: s.reason });
            }
        // Auditoría silenciosa: conservar toda la evidencia para JSONL/Excel sin avisos al chat.
        console.warn(`[WARLAND_AUDIT] ${JSON.stringify(event)}`);
    }
    function denied(p, context) {
        record(p, { ...context, outcome: "blocked", alert: true });
        if ((notices.get(p.id) ?? 0) + 2500 > Date.now())
            return;
        notices.set(p.id, Date.now());
        system.run(() => { try {
            p.sendMessage("§6WARLAND §cTerreno protegido de otro equipo.");
        }
        catch { } });
    }
    registerContainerAudit({ ready: options.ready, emit: record });
    world.beforeEvents.playerLeave.subscribe(({ player }) => {
        notices.delete(player.id);
    });
    world.beforeEvents.playerBreakBlock.subscribe(e => {
        if (e.itemStack?.typeId === TERRITORY_ITEM) {
            e.cancel = true;
            return;
        }
        if (!allowed(e.player, e.dimension.id, e.block.location)) {
            e.cancel = true;
            denied(e.player, { action: "break_block", dimension: e.dimension.id, position: e.block.location, positionKind: "block", item: e.itemStack?.typeId, target: e.block.typeId, detail: "Intentó romper un bloque protegido." });
        }
    });
    world.beforeEvents.playerInteractWithBlock.subscribe(e => {
        if (e.itemStack?.typeId === TERRITORY_ITEM) {
            e.cancel = true;
            return;
        }
        const o = offsets[e.blockFace];
        const pos = e.block.location;
        const next = { x: pos.x + o.x, y: pos.y + o.y, z: pos.z + o.z };
        const context = { action: "interact_block", dimension: e.block.dimension.id, position: pos, positionKind: "clicked_block", adjacent: next, item: e.itemStack?.typeId, target: e.block.typeId };
        if (!allowed(e.player, context.dimension, pos) || !allowed(e.player, context.dimension, next)) {
            e.cancel = true;
            if (e.isFirstEvent)
                denied(e.player, { ...context, detail: "Interacción cancelada: bloque pulsado o adyacente protegido. No confirma colocación ni apertura." });
        }
        else if (e.isFirstEvent && (riskyItem(context.item ?? "") || dangerousBlocks.has(short(context.target)) || (context.target === "minecraft:bed" && context.dimension !== "minecraft:overworld"))) {
            record(e.player, { ...context, action: "risky_interaction", outcome: "attempt", detail: "Intento de uso sobre el bloque indicado; el adyacente es candidato, no colocación confirmada.", alert: true });
        }
    });
    world.beforeEvents.itemUse.subscribe(e => {
        if (e.itemStack.typeId === TERRITORY_ITEM) {
            e.cancel = true;
            return;
        }
        const context = { action: "use_item", dimension: e.source.dimension.id, position: e.source.location, positionKind: "player", item: e.itemStack.typeId };
        if (!allowed(e.source, context.dimension, e.source.location) && !(options.ready() && defenseUseAllowed(e.itemStack.typeId))) {
            e.cancel = true;
            denied(e.source, { ...context, detail: "Uso cancelado en zona protegida. Coordenadas del jugador, no del impacto." });
        }
        else if (riskyItem(context.item)) {
            record(e.source, { ...context, outcome: "attempt", detail: "Intento de uso. Solo se conoce el origen del jugador, no el resultado ni el impacto.", alert: true });
        }
    });
    world.beforeEvents.playerInteractWithEntity.subscribe(e => {
        if (e.itemStack?.typeId === TERRITORY_ITEM) {
            e.cancel = true;
            return;
        }
        const context = { action: "interact_entity", dimension: e.target.dimension.id, position: e.target.location, positionKind: "entity", item: e.itemStack?.typeId, target: e.target.typeId };
        if (!allowed(e.player, context.dimension, context.position)) {
            e.cancel = true;
            denied(e.player, { ...context, detail: "Interacción con entidad protegida cancelada." });
        }
        else if (riskyItem(context.item ?? "")) {
            record(e.player, { ...context, outcome: "attempt", detail: "Intento de usar objeto de riesgo sobre una entidad.", alert: true });
        }
    });
    world.beforeEvents.entityHurt.subscribe(e => {
        const target = e.hurtEntity;
        const attacker = e.damageSource.damagingEntity ?? e.damageSource.damagingProjectile?.getComponent("minecraft:projectile")?.owner;
        if (e.damageSource.cause === EntityDamageCause.entityAttack && attacker instanceof Player && holdsTerritoryTool(attacker)) {
            e.cancel = true;
            return;
        }
        if (e.damageSource.cause === EntityDamageCause.blockExplosion || e.damageSource.cause === EntityDamageCause.entityExplosion) {
            const territory = zoneAt(options.teams, target.dimension.id, target.location.x, target.location.z, CONFIG.bufferBlocks);
            if (!options.ready() || territory) {
                e.cancel = true;
                record(attacker instanceof Player ? attacker : undefined, { action: "explosion_entity_damage", outcome: "blocked", dimension: target.dimension.id, position: target.location, positionKind: "entity", target: target.typeId, protectedTerritory: territory?.name, detail: "Daño de explosión contra una entidad en zona protegida cancelado. Las coordenadas corresponden a la entidad afectada.", alert: true });
                return;
            }
        }
        if (attacker instanceof Player && !allowed(attacker, target.dimension.id, target.location, 0) && !(options.ready() && isHostileDefenseTarget(target))) {
            e.cancel = true;
            denied(attacker, { action: "hurt_entity", dimension: target.dimension.id, position: target.location, positionKind: "entity", target: target.typeId, detail: "Ataque contra entidad protegida cancelado." });
        }
    });
    world.beforeEvents.explosion.subscribe(e => {
        let position, sourceType, actor;
        let positionKind = "unknown";
        try {
            if (e.source) {
                position = e.source.location;
                sourceType = e.source.typeId;
                positionKind = "explosion_source";
                if (e.source instanceof Player)
                    actor = e.source;
            }
        }
        catch { }
        let impacted = [], inspectionFailed = false;
        try {
            impacted = e.getImpactedBlocks().map(block => ({ ...block.location }));
        }
        catch {
            inspectionFailed = true;
        }
        let protectedPosition;
        let territory;
        for (const pos of [...(position ? [position] : []), ...impacted]) {
            const zone = zoneAt(options.teams, e.dimension.id, pos.x, pos.z, CONFIG.bufferBlocks);
            if (zone) {
                territory = zone;
                protectedPosition = point(pos);
                break;
            }
        }
        if (!position && impacted.length) {
            position = impacted[0];
            positionKind = "affected_block";
        }
        const preCancelled = e.cancel;
        const blocked = preCancelled || !options.ready() || inspectionFailed || !!territory;
        if (blocked)
            e.cancel = true;
        const suspects = blocked && territory && !actor && positionKind === "explosion_source" ? suspectTracker.find(Date.now(), e.dimension.id, position, sourceType) : [];
        const detail = territory
            ? `Explosión completa cancelada para proteger ${territory.name} o su franja de ${CONFIG.bufferBlocks} bloques, en ${protectedPosition.x}, ${protectedPosition.y}, ${protectedPosition.z}. Los posibles sospechosos tienen acciones relacionadas registradas; no son responsables confirmados.`
            : !options.ready() || inspectionFailed
                ? "Explosión cancelada por precaución: protección aún no preparada o no fue posible revisar los bloques afectados."
                : preCancelled ? "Explosión ya cancelada por otro controlador."
                    : "Explosión permitida fuera de parcelas y sus franjas. Uso libre para minería; no se genera una lista de sospechosos.";
        record(actor, { action: "explosion", outcome: blocked ? "blocked" : "allowed", dimension: e.dimension.id, position, positionKind, target: sourceType, suspects, protectedTerritory: territory?.name, protectedPosition, impactedBlockCount: impacted.length, detail, alert: blocked });
    });
    world.afterEvents.playerPlaceBlock.subscribe(e => {
        if (!options.ready())
            return;
        const id = short(e.block.typeId);
        const dangerous = dangerousBlocks.has(id) || (id === "bed" && e.dimension.id !== "minecraft:overworld");
        if (dangerous || mechanismBlocks.has(id))
            record(e.player, { action: "place_block", outcome: "observed", dimension: e.dimension.id, position: e.block.location, positionKind: "block", target: e.block.typeId, detail: dangerous ? "Colocación de bloque de riesgo confirmada. No demuestra daño ni intención maliciosa." : "Mecanismo colocado; registrado para revisión de movimientos automáticos.", alert: dangerous });
    });
}
//# sourceMappingURL=security.js.map