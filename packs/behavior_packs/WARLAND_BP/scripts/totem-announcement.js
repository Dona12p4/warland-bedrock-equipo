import { world, system, Player, EquipmentSlot } from '@minecraft/server';
export function heldTotems(p) {
    const eq = p.getComponent('minecraft:equippable');
    let count = 0;
    for (const slot of [EquipmentSlot.Mainhand, EquipmentSlot.Offhand]) {
        const item = eq?.getEquipment(slot);
        if (item?.typeId === 'minecraft:totem_of_undying')
            count += item.amount;
    }
    return count;
}
export function isTotemEffect(id, amplifier, duration) {
    return (id === 'minecraft:regeneration' && amplifier === 1 && duration === 900) || (id === 'minecraft:absorption' && amplifier === 1 && duration === 100) || (id === 'minecraft:fire_resistance' && amplifier === 0 && duration === 800);
}
export function registerTotemAnnouncements() {
    const candidates = new Map();
    world.beforeEvents.entityHurt.subscribe(e => {
        if (e.cancel || !(e.hurtEntity instanceof Player) || !(e.damage > 0))
            return;
        const count = heldTotems(e.hurtEntity);
        if (count)
            candidates.set(e.hurtEntity.id, { tick: system.currentTick, count, effects: new Set() });
    });
    world.afterEvents.effectAdd.subscribe(e => {
        const c = candidates.get(e.entity.id);
        if (!c || c.tick !== system.currentTick)
            return;
        if (isTotemEffect(e.effect.typeId, e.effect.amplifier, e.effect.duration))
            c.effects.add(e.effect.typeId);
    });
    world.afterEvents.entityHurt.subscribe(e => {
        const p = e.hurtEntity, c = candidates.get(p.id);
        if (!c)
            return;
        candidates.delete(p.id);
        // A moved/dropped totem or a normal potion is insufficient evidence.
        if (!(p instanceof Player) || c.tick !== system.currentTick || c.effects.size !== 3 || heldTotems(p) !== c.count - 1 || (p.getComponent('minecraft:health')?.currentValue ?? 0) <= 0)
            return;
        world.sendMessage(`§6☀ §f${p.nameTag || p.name}§r §eha usado un Tótem de la Inmortalidad.`);
        console.warn('[WARLAND_AUDIT] ' + JSON.stringify({ schema: 2, category: 'security', action: 'totem_pop', outcome: 'confirmed', at: Date.now(), player: p.name, nameTag: p.nameTag, dimension: p.dimension.id, position: p.location, evidence: 'Native damage, held totem consumed, alive, all three native resurrection effects in the same tick.' }));
    });
    system.runInterval(() => { for (const [id, c] of candidates)
        if (system.currentTick > c.tick + 1)
            candidates.delete(id); }, 20);
    world.afterEvents.playerLeave.subscribe(e => candidates.delete(e.playerId));
}
//# sourceMappingURL=totem-announcement.js.map