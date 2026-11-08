import { world, system, Player, ItemStack, ItemLockMode, MolangVariableMap, EntitySwingSource, EntityDamageCause, GameMode } from '@minecraft/server';
import { teamFor, chunkAt, CONFIG } from './core.js';
import { areaBounds, prepareSelection, selectedArea, confirmSelection, selectionStatus, outlineSegments } from './territory-selection.js';
export const TERRITORY_ITEM = 'warland:selector_terreno';
export function holdsTerritoryTool(p) { try {
    return p.getComponent('minecraft:inventory')?.container?.getItem(p.selectedSlotIndex)?.typeId === TERRITORY_ITEM;
}
catch {
    return false;
} }
export function unlockTerritoryTools(p) {
    const inv = p.getComponent('minecraft:inventory')?.container;
    if (!inv)
        return;
    for (let i = 0; i < inv.size; i++) {
        const item = inv.getItem(i);
        if (item?.typeId === TERRITORY_ITEM && item.lockMode !== ItemLockMode.none) {
            item.lockMode = ItemLockMode.none;
            inv.setItem(i, item);
        }
    }
}
export function createTerritorySelector(ctx) {
    world.afterEvents.playerSpawn.subscribe(({ player }) => system.run(() => { try {
        unlockTerritoryTools(player);
    }
    catch { } }));
    const selections = new Map(), lastUse = new Map(), lastMove = new Map(), displayed = new Set();
    const now = () => Date.now();
    function eligible(p) {
        if (!ctx.ready())
            throw Error('WARLAND está iniciando.');
        if (p.getGameMode() === GameMode.Spectator || p.getComponent('minecraft:health')?.currentValue === 0)
            throw Error('No puedes elegir terreno en este estado.');
        const owner = ctx.recordFor(p).id, team = teamFor(ctx.teams, owner);
        if (!team)
            throw Error('Crea o únete a un equipo primero.');
        return { owner, team };
    }
    function giveTool(p) {
        const inv = p.getComponent('minecraft:inventory')?.container;
        if (!inv)
            throw Error('Inventario no disponible.');
        let slot = -1;
        for (let i = 0; i < inv.size; i++)
            if (inv.getItem(i)?.typeId === TERRITORY_ITEM) {
                slot = i;
                break;
            }
        if (slot < 0)
            for (let i = 0; i < inv.size; i++)
                if (!inv.getItem(i)) {
                    slot = i;
                    break;
                }
        if (slot < 0)
            throw Error('Libera un hueco para el selector de terreno.');
        const item = new ItemStack(TERRITORY_ITEM);
        item.nameTag = '§aSelector de terreno';
        item.keepOnDeath = true;
        item.lockMode = ItemLockMode.none;
        item.setLore(['Golpear: mover la selección', 'Usar: solo tú puedes confirmar', 'Agacharse + usar: cancelar', `${CONFIG.chunksPerMember * 256} bloques² por persona · Toda la altura`]);
        inv.setItem(slot, item);
        if (slot < 9)
            p.selectedSlotIndex = slot;
        else
            ctx.message(p, 'Pon el selector en la barra rápida para usarlo.');
    }
    function target(p) {
        const hit = p.getBlockFromViewDirection({ maxDistance: 32, includeLiquidBlocks: true, includePassableBlocks: false });
        return hit ? { x: hit.block.location.x + .5, y: hit.block.location.y + 1.08, z: hit.block.location.z + .5 } : { ...p.location, y: Math.floor(p.location.y) + .08 };
    }
    function select(p, point, view = false) {
        const { owner, team } = eligible(p), claim = chunkAt(p.dimension.id, point.x, point.z);
        const limits = p.dimension.heightRange;
        const s = prepareSelection(ctx.teams, owner, claim, Math.max(limits.min + .1, Math.min(limits.max - 3.1, point.y)), now() + 120000, view);
        selections.set(p.id, s);
        render(p, s);
        return s;
    }
    function render(p, s) {
        if (p.dimension.id !== s.claim.dimension || !holdsTerritoryTool(p)) {
            if (displayed.delete(p.id))
                p.onScreenDisplay.setActionBar('');
            return;
        }
        const status = selectionStatus(ctx.teams, s, ctx.recordFor(p).id), area = selectedArea(ctx.teams, s);
        if (!area.length) {
            clear(p);
            return;
        }
        const b = areaBounds(area);
        const color = status.kind === 'available' ? { red: .22, green: 1, blue: .45 } : status.kind === 'owned' ? { red: .25, green: .72, blue: 1 } : { red: 1, green: .18, blue: .18 };
        for (const line of outlineSegments(area, s.y)) {
            const m = new MolangVariableMap();
            m.setFloat('variable.half_length', line.half);
            m.setColorRGB('variable.tint', line.buffer ? { red: 1, green: .67, blue: .15 } : color);
            try {
                p.spawnParticle('warland:territory_' + line.effect, { x: line.x, y: line.y, z: line.z }, m);
            }
            catch { }
        }
        const label = status.kind === 'available' ? '§aDisponible' : status.kind === 'owned' ? '§bProtegido' : '§cNo disponible';
        const areaText = status.kind === 'owned' ? `${area.length * 256} bloques²` : s.action === 'expand' ? `+${s.additions.length * 256} → ${area.length * 256} bloques²` : `${s.additions.length * 256} bloques²`;
        p.onScreenDisplay.setActionBar(`${label} §r${areaText} · Toda la altura\nX ${b.minX}–${b.maxX - 1} · Z ${b.minZ}–${b.maxZ - 1}\nGolpear: mover · Usar: confirmar · Amarillo: franja de ${CONFIG.bufferBlocks} bloques`);
        displayed.add(p.id);
    }
    function begin(p) { eligible(p); giveTool(p); select(p, target(p)); ctx.message(p, 'Golpea mirando al lugar para mover el cuadrado; usa el selector para confirmar. Agáchate y úsalo para cancelar.'); }
    function view(p) {
        const { owner, team } = eligible(p), point = target(p), claim = chunkAt(p.dimension.id, point.x, point.z);
        prepareSelection(ctx.teams, owner, claim, point.y, now() + 120000, true);
        giveTool(p);
        select(p, point, true);
        ctx.message(p, `${team.claims.length * 256} bloques² del equipo. Azul: terreno unido; amarillo: franja de protección. Toda la altura.`);
    }
    function clear(p) { selections.delete(p.id); if (displayed.delete(p.id))
        try {
            p.onScreenDisplay.setActionBar('');
        }
        catch { } }
    function move(p, point) {
        if (!holdsTerritoryTool(p))
            return;
        if (now() - (lastMove.get(p.id) ?? -Infinity) < 250)
            return;
        lastMove.set(p.id, now());
        select(p, point ?? target(p));
    }
    function confirm(p) {
        if (!holdsTerritoryTool(p))
            return;
        if (p.isSneaking) {
            clear(p);
            ctx.message(p, 'Selección cancelada.');
            return;
        }
        const { owner } = eligible(p), s = selections.get(p.id);
        if (!s) {
            select(p, target(p));
            ctx.message(p, 'Revisa el cuadrado y vuelve a usar para confirmar.');
            return;
        }
        const team = confirmSelection(ctx.teams, s, owner, p.dimension.id, p.location, now(), ctx.persistTeam);
        s.expires = now() + 120000;
        ctx.audit('claim', p.name, JSON.stringify({ ...s.claim, nameTag: p.nameTag, position: p.location, selection: 'confirmed', action: s.action, contributor: owner, added: s.additions, addedArea: s.additions.length * 256, area: s.area.length * 256, allHeights: true }));
        ctx.message(p, `+${s.additions.length * 256} bloques² para ${team.name}§r. Este terreno: ${s.area.length * 256} bloques². Total del equipo: ${team.claims.length * 256}/${team.members.length * CONFIG.chunksPerMember * 256} bloques².`);
        render(p, s);
    }
    function safe(p, fn) { try {
        fn();
    }
    catch (e) {
        ctx.message(p, e instanceof Error ? e.message : String(e));
        const s = selections.get(p.id);
        if (s)
            try {
                render(p, s);
            }
            catch { }
    } }
    function use(p, item) {
        if (item?.typeId !== TERRITORY_ITEM)
            return false;
        if (now() - (lastUse.get(p.id) ?? -Infinity) < 400)
            return true;
        lastUse.set(p.id, now());
        system.run(() => safe(p, () => confirm(p)));
        return true;
    }
    world.beforeEvents.itemUse.subscribe(e => { if (use(e.source, e.itemStack))
        e.cancel = true; });
    world.beforeEvents.playerInteractWithBlock.subscribe(e => { if (e.itemStack?.typeId === TERRITORY_ITEM) {
        e.cancel = true;
        if (e.isFirstEvent)
            use(e.player, e.itemStack);
    } });
    world.beforeEvents.playerInteractWithEntity.subscribe(e => { if(e.target.typeId==='warland:cajero')return; if (use(e.player, e.itemStack))
        e.cancel = true; });
    world.beforeEvents.playerBreakBlock.subscribe(e => { if (e.itemStack?.typeId === TERRITORY_ITEM) {
        e.cancel = true;
        const point = { ...e.block.location, y: e.block.location.y + 1.08 };
        system.run(() => safe(e.player, () => move(e.player, point)));
    } });
    world.beforeEvents.entityHurt.subscribe(e => { const p = e.damageSource.damagingEntity; if (e.damageSource.cause === EntityDamageCause.entityAttack && p instanceof Player && holdsTerritoryTool(p))
        e.cancel = true; });
    world.afterEvents.playerSwingStart.subscribe(e => {
        if (e.heldItemStack?.typeId !== TERRITORY_ITEM || ![EntitySwingSource.Attack, EntitySwingSource.Mine, EntitySwingSource.None].includes(e.swingSource))
            return;
        if (now() - (lastUse.get(e.player.id) ?? -Infinity) < 400)
            return;
        safe(e.player, () => move(e.player));
    });
    world.beforeEvents.playerLeave.subscribe(({ player }) => { selections.delete(player.id); displayed.delete(player.id); lastUse.delete(player.id); lastMove.delete(player.id); });
    world.afterEvents.playerDimensionChange.subscribe(({ player }) => clear(player));
    world.afterEvents.entityDie.subscribe(({ deadEntity }) => { if (deadEntity instanceof Player)
        clear(deadEntity); });
    system.runInterval(() => {
        if (!selections.size)
            return;
        for (const p of world.getAllPlayers()) {
            const s = selections.get(p.id);
            if (!s)
                continue;
            if (now() > s.expires || s.claim.dimension !== p.dimension.id) {
                clear(p);
                continue;
            }
            try {
                const { owner, team } = eligible(p);
                if (owner !== s.owner || team.id !== s.team) {
                    clear(p);
                    continue;
                }
                render(p, s);
            }
            catch {
                clear(p);
            }
        }
    }, 20);
    return { begin, view, confirm, move, clear };
}
//# sourceMappingURL=territory-selector.js.map