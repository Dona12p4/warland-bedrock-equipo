import { world, system, Direction } from '@minecraft/server';
import { inSanctuary, sanctuaryConfig } from './sanctuary.js';
import { ADMIN_NAMES } from './core.js';
// Permission is based on the authenticated gamertag, never a colored nameTag.
export const canEditLobby = (p) => ADMIN_NAMES.includes(p.name.toLowerCase());
const offsets = {
    [Direction.Up]: { x: 0, y: 1, z: 0 }, [Direction.Down]: { x: 0, y: -1, z: 0 }, [Direction.East]: { x: 1, y: 0, z: 0 }, [Direction.West]: { x: -1, y: 0, z: 0 }, [Direction.North]: { x: 0, y: 0, z: -1 }, [Direction.South]: { x: 0, y: 0, z: 1 }
};
export function protectedEntity(e) { try {
    return !!e && inSanctuary(e.dimension.id, e.location);
}
catch {
    return false;
} }
export function unwantedLobbyMob(e) {
    try {
        return protectedEntity(e) && !['minecraft:player','minecraft:armor_stand','warland:cajero','warland:cajero_resguardo'].includes(e.typeId) && !!e.getComponent('minecraft:health');
    }
    catch {
        return false;
    }
}
export function registerLobbyProtection() {
    const notices = new Map();
    function denied(p, action, position) {
        if (system.currentTick < (notices.get(p.id) ?? 0))
            return;
        notices.set(p.id, system.currentTick + 50);
        console.warn('[WARLAND_AUDIT] ' + JSON.stringify({ schema: 2, category: 'security', action, outcome: 'blocked', at: Date.now(), player: p.name, nameTag: p.nameTag, dimension: p.dimension.id, position, protectedTerritory: 'Lobby', detail: 'Intento cancelado en el santuario.' }));
        system.run(() => { try {
            p.sendMessage('§6El santuario y sus alrededores están protegidos.');
        }
        catch { } });
    }
    world.beforeEvents.playerBreakBlock.subscribe(e => { if (!canEditLobby(e.player) && inSanctuary(e.dimension.id, e.block.location)) {
        e.cancel = true;
        denied(e.player, 'lobby_break', e.block.location);
    } });
    world.beforeEvents.playerInteractWithBlock.subscribe(e => {
        if (!sanctuaryConfig() || canEditLobby(e.player))
            return;
        const a = e.block.location, o = offsets[e.blockFace], b = { x: a.x + o.x, y: a.y + o.y, z: a.z + o.z };
        if (inSanctuary(e.block.dimension.id, a) || inSanctuary(e.block.dimension.id, b)) {
            e.cancel = true;
            if (e.isFirstEvent)
                denied(e.player, 'lobby_interact', a);
        }
    });
    world.beforeEvents.playerInteractWithEntity.subscribe(e => { if(e.target.typeId==='warland:cajero')return; if (!canEditLobby(e.player) && protectedEntity(e.target)) {
        e.cancel = true;
        denied(e.player, 'lobby_entity_interact', e.target.location);
    } });
    world.beforeEvents.itemUse.subscribe(e => {
        const id = e.itemStack.typeId;
        if (!canEditLobby(e.source) && inSanctuary(e.source.dimension.id, e.source.location, 8) && (/_bucket$|_spawn_egg$/.test(id) || ['minecraft:flint_and_steel', 'minecraft:fire_charge', 'minecraft:end_crystal', 'minecraft:wind_charge', 'minecraft:tnt_minecart'].includes(id))) {
            e.cancel = true;
            denied(e.source, 'lobby_dangerous_use', e.source.location);
        }
    });
    world.beforeEvents.entityHurt.subscribe(e => { if (protectedEntity(e.hurtEntity) || protectedEntity(e.damageSource.damagingEntity) || protectedEntity(e.damageSource.damagingProjectile?.getComponent('minecraft:projectile')?.owner))
        e.cancel = true; });
    world.beforeEvents.explosion.subscribe(e => {
        const cfg = sanctuaryConfig();
        if (!cfg || cfg.dimension !== e.dimension.id)
            return;
        let impacted;
        try {
            impacted = e.getImpactedBlocks();
        }
        catch {
            e.cancel = true;
            return;
        }
        const touches = protectedEntity(e.source) || impacted.some(b => inSanctuary(e.dimension.id, b.location));
        if (touches) {
            e.cancel = true;
            console.warn('[WARLAND_AUDIT] ' + JSON.stringify({ schema: 2, category: 'security', action: 'lobby_explosion', outcome: 'blocked', at: Date.now(), dimension: e.dimension.id, position: e.source?.location ?? impacted.find(b => inSanctuary(e.dimension.id, b.location))?.location, player: null, nameTag: null, protectedTerritory: 'Lobby', detail: 'Explosión completa cancelada; sin atribuir autoría por proximidad.' }));
        }
    });
    const remove = (e) => { try {
        if (unwantedLobbyMob(e))
            e.remove();
    }
    catch { } };
    world.afterEvents.entitySpawn.subscribe(({ entity }) => remove(entity));
    world.afterEvents.entityLoad.subscribe(({ entity }) => remove(entity));
    system.runInterval(() => {
        const c = sanctuaryConfig();
        if (!c)
            return;
        const d = world.getDimension(c.dimension), height = d.heightRange;
        for (const e of d.getEntities({ location: { x: c.x - c.radius, y: height.min, z: c.z - c.radius }, volume: { x: c.radius * 2, y: height.max - height.min, z: c.radius * 2 } }))
            remove(e);
    }, 40);
    world.afterEvents.playerLeave.subscribe(e => notices.delete(e.playerId));
}
//# sourceMappingURL=lobby-protection.js.map