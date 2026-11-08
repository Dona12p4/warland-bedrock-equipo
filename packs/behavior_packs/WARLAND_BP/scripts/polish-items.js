import { world, system, EquipmentSlot } from '@minecraft/server';
import { unlockTerritoryTools } from './territory-selector.js';
const OSARIO = 'warland:peto_del_osario', MIGRATED = 'warland:osario_half_v1';
export function migrateOsario(item) {
    if (item?.typeId !== OSARIO || item.getDynamicProperty(MIGRATED) === true)
        return false;
    const d = item.getComponent('minecraft:durability');
    if (!d || d.maxDurability !== 56)
        return false;
    d.damage = Math.min(55, Math.floor(d.damage / 2));
    item.setDynamicProperty(MIGRATED, true);
    return true;
}
export function migratePolishItems(p) {
    unlockTerritoryTools(p);
    const inv = p.getComponent('minecraft:inventory')?.container;
    if (inv)
        for (let i = 0; i < inv.size; i++) {
            const item = inv.getItem(i);
            if (migrateOsario(item))
                inv.setItem(i, item);
        }
    const eq = p.getComponent('minecraft:equippable'), chest = eq?.getEquipment(EquipmentSlot.Chest);
    if (migrateOsario(chest))
        eq?.setEquipment(EquipmentSlot.Chest, chest);
}
export function registerPolishItems() {
    const pending = new Set();
    const queue = (p) => { if (pending.has(p.id))
        return; pending.add(p.id); system.run(() => { pending.delete(p.id); if (p.isValid)
        try {
            migratePolishItems(p);
        }
        catch { } }); };
    world.afterEvents.playerSpawn.subscribe(({ player }) => queue(player));
    world.afterEvents.playerInventoryItemChange.subscribe(({ player }) => queue(player));
    system.runInterval(() => { for (const p of world.getAllPlayers()) {
        const eq = p.getComponent('minecraft:equippable'), chest = eq?.getEquipment(EquipmentSlot.Chest);
        if (migrateOsario(chest))
            eq?.setEquipment(EquipmentSlot.Chest, chest);
    } }, 20);
}
//# sourceMappingURL=polish-items.js.map