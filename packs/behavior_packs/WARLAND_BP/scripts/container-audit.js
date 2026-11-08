import { world, system, Player } from "@minecraft/server";
export const CONTAINER_AUDIT_POLICY = { maxContainers: 256, idleSamplesPerTick: 32 };
const registryProperty = "warland:container_registry";
const supported = new Set(["minecraft:dropper", "minecraft:dispenser", "minecraft:hopper"]);
const keyOf = (dimension, p) => `${dimension}:${p.x},${p.y},${p.z}`;
function countTnt(container) {
    let total = 0;
    for (let slot = 0; slot < container.size; slot++) {
        const item = container.getItem(slot);
        if (item?.typeId === "minecraft:tnt")
            total += item.amount;
    }
    return total;
}
function playerTnt(player) {
    try {
        const inventory = player.getComponent("minecraft:inventory")?.container;
        const cursor = player.getComponent("minecraft:cursor_inventory");
        // Contar también el cursor: mover un stack hasta él no demuestra un depósito.
        if (!inventory || !cursor)
            return;
        return countTnt(inventory) + (cursor.item?.typeId === "minecraft:tnt" ? cursor.item.amount : 0);
    }
    catch {
        return;
    }
}
function identity(player) {
    const id = player.getDynamicProperty("warland:player_id");
    return { player: player.name, playerId: typeof id === "string" ? id : null, nameTag: player.nameTag };
}
export function registerContainerAudit(options) {
    const watches = new Map();
    const active = new Map();
    let dirty = false, cursor = 0, limitReported = false;
    function context(w) {
        return { dimension: w.dimension, position: w.position, positionKind: "block", target: w.type, outcome: "observed" };
    }
    function detach(playerId) {
        const key = active.get(playerId);
        if (key)
            watches.get(key)?.viewers.delete(playerId);
        active.delete(playerId);
    }
    function clearViewers(w) {
        for (const id of w.viewers.keys())
            detach(id);
        w.viewers.clear();
    }
    function forget(key) {
        const w = watches.get(key);
        if (w) {
            clearViewers(w);
            watches.delete(key);
            dirty = true;
        }
    }
    function sample(key, suppliedBlock) {
        const w = watches.get(key);
        if (!w)
            return;
        let total;
        try {
            const block = suppliedBlock ?? world.getDimension(w.dimension).getBlock(w.position);
            if (!block)
                throw new Error("Chunk no disponible");
            if (block.typeId !== w.type) {
                forget(key);
                return;
            }
            const container = block.getComponent("minecraft:inventory")?.container;
            if (!container)
                throw new Error("Inventario no disponible");
            total = countTnt(container);
        }
        catch {
            // Tras una interrupción no atribuir cambios ocurridos durante el hueco de observación.
            w.total = undefined;
            clearViewers(w);
            return;
        }
        const before = w.total;
        const accessors = [], suspects = [];
        for (const [id, viewer] of w.viewers) {
            try {
                if (viewer.player.dimension.id !== w.dimension || Math.hypot(viewer.player.location.x - w.position.x, viewer.player.location.y - w.position.y, viewer.player.location.z - w.position.z) > 10) {
                    detach(id);
                    continue;
                }
                viewer.identity = identity(viewer.player);
                const current = playerTnt(viewer.player);
                accessors.push(viewer.identity);
                const lost = viewer.total !== undefined && current !== undefined ? viewer.total - current : 0;
                if (before !== undefined && total > before && lost > 0) {
                    suspects.push({ ...viewer.identity, evidenceAt: Date.now(), action: "container_tnt_load", outcome: "candidate", object: "minecraft:tnt", position: { ...w.position }, distance: 0, secondsBefore: 0,
                        reason: `Tenía abierto ${w.type}; su inventario y cursor disminuyeron ${lost} TNT mientras el bloque aumentó ${total - before}. Posible cargador; correlación entre muestras, no transferencia ni intención maliciosa demostradas.` });
                }
                viewer.total = current;
            }
            catch {
                detach(id);
            }
        }
        w.total = total;
        if (before === undefined) {
            if (total > 0)
                options.emit(undefined, { ...context(w), action: "container_tnt_present", item: "minecraft:tnt", tntAfter: total, detail: `Primera lectura o lectura tras una interrupción: ${total} TNT en ${w.type}. No se conoce cuándo ni quién lo cargó.`, suspects: [] });
            return;
        }
        if (total === before)
            return;
        const delta = total - before;
        const opened = accessors.length ? accessors.map(p => `${p.player} (nombre visible: ${p.nameTag})`).join(", ") : "ningún jugador con apertura registrada";
        options.emit(undefined, { ...context(w), action: "container_tnt_change", item: "minecraft:tnt", tntBefore: before, tntAfter: total, tntDelta: delta, accessors, suspects,
            detail: `${w.type}: TNT ${before} → ${total} (${delta > 0 ? "+" : ""}${delta}). Acceso abierto: ${opened}. ${delta > 0 ? "Aumento observado; puede ser carga manual o automática. Solo se señalan posibles cargadores si coincide una disminución de TNT en su inventario y cursor." : "Disminución observada: retirada, expulsión o transferencia automática; no se atribuye a una persona."} No se confirma una infracción.`, alert: delta > 0 });
    }
    function watch(block) {
        if (!options.ready() || !supported.has(block.typeId))
            return;
        const position = { ...block.location }, dimension = block.dimension.id;
        const key = keyOf(dimension, position);
        const previous = watches.get(key);
        if (previous && previous.type !== block.typeId)
            forget(key);
        if (!watches.has(key)) {
            if (watches.size >= CONTAINER_AUDIT_POLICY.maxContainers) {
                if (!limitReported) {
                    limitReported = true;
                    options.emit(undefined, { action: "container_monitor_limit", outcome: "observed", dimension, position, positionKind: "block", target: block.typeId, alert: true,
                        detail: `Se alcanzó el límite de ${CONTAINER_AUDIT_POLICY.maxContainers} mecanismos vigilados. Este mecanismo y los siguientes no se añaden hasta liberar espacio. Revisar configuración; no hay cobertura completa.` });
                }
                return;
            }
            watches.set(key, { dimension, position, type: block.typeId, viewers: new Map() });
            dirty = true;
        }
        sample(key, block);
        return key;
    }
    world.afterEvents.worldLoad.subscribe(() => {
        try {
            const stored = world.getDynamicProperty(registryProperty);
            if (typeof stored !== "string")
                return;
            const rows = JSON.parse(stored);
            if (!Array.isArray(rows) || rows.length > CONTAINER_AUDIT_POLICY.maxContainers)
                throw new Error("Registro inválido");
            for (const row of rows) {
                if (!Array.isArray(row) || row.length !== 5)
                    continue;
                const [dimension, x, y, z, type] = row;
                if (!["minecraft:overworld", "minecraft:nether", "minecraft:the_end"].includes(dimension) || ![x, y, z].every(Number.isSafeInteger) || !supported.has(type))
                    continue;
                const position = { x, y, z };
                watches.set(keyOf(dimension, position), { dimension, position, type, viewers: new Map() });
            }
        }
        catch (error) {
            console.warn(`[WARLAND] No se pudo cargar el registro de mecanismos: ${String(error)}`);
        }
    });
    world.afterEvents.playerPlaceBlock.subscribe(e => {
        if (!e.block)
            return;
        forget(keyOf(e.dimension.id, e.block.location));
        watch(e.block);
    });
    world.afterEvents.playerBreakBlock.subscribe(e => {
        if (e.block)
            forget(keyOf(e.block.dimension.id, e.block.location));
    });
    world.afterEvents.playerInteractWithBlock.subscribe(e => { watch(e.block); });
    world.afterEvents.blockContainerOpened.subscribe(e => {
        const player = e.openSource.entity;
        if (!(player instanceof Player)) {
            watch(e.block);
            return;
        }
        detach(player.id);
        const key = watch(e.block);
        if (!key)
            return;
        const w = watches.get(key);
        w.viewers.set(player.id, { player, identity: identity(player), total: playerTnt(player) });
        active.set(player.id, key);
        options.emit(player, { ...context(w), action: "container_open", tntAfter: w.total,
            detail: `Apertura confirmada de ${w.type}; TNT visible: ${w.total ?? "no disponible"}. Abrir el bloque no demuestra haber introducido TNT.` });
    });
    world.afterEvents.blockContainerClosed.subscribe(e => {
        const player = e.closeSource.entity;
        if (!(player instanceof Player))
            return;
        const key = active.get(player.id);
        if (key === keyOf(e.block.dimension.id, e.block.location)) {
            sample(key);
            detach(player.id);
        }
    });
    world.beforeEvents.playerLeave.subscribe(e => { detach(e.player.id); });
    world.afterEvents.playerDimensionChange.subscribe(e => { detach(e.player.id); });
    system.runInterval(() => {
        if (!options.ready())
            return;
        const keys = [...watches.keys()], sampled = new Set();
        for (const key of active.values())
            if (!sampled.has(key)) {
                sampled.add(key);
                sample(key);
            }
        for (let n = 0; n < Math.min(keys.length, CONTAINER_AUDIT_POLICY.idleSamplesPerTick); n++) {
            const key = keys[cursor++ % keys.length];
            if (!sampled.has(key))
                sample(key);
        }
        if (dirty) {
            try {
                world.setDynamicProperty(registryProperty, JSON.stringify([...watches.values()].map(w => [w.dimension, w.position.x, w.position.y, w.position.z, w.type])));
                dirty = false;
            }
            catch (error) {
                console.warn(`[WARLAND] No se pudo guardar el registro de mecanismos: ${String(error)}`);
            }
        }
    }, 1);
    // Se usa también en el ensayo nativo para descubrir mecanismos creados sin un jugador.
    return { watch };
}
//# sourceMappingURL=container-audit.js.map