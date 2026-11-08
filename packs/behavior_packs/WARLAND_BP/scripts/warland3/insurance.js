import { freeBetaShop } from '../beta-policy.js';
import { world, system, Player, EquipmentSlot } from '@minecraft/server';
import { purchase, W3 } from './domain.js';
const MARK = 'warland:insurance_keep_v1', LORE = '§r§8Seguro WARLAND§r';
const equipment = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet, EquipmentSlot.Offhand];
export const INSURANCE_VALIDATION = 'warland:insurance_validated_v1';
// Only undo flags owned by this feature. Menus and items with native permanent retention stay untouched.
export function insuranceMarked(item) { return item.maxAmount === 1 ? item.getDynamicProperty(MARK) === true : item.getLore().includes(LORE); }
export function insuredItem(original, active) {
    const marked = insuranceMarked(original);
    if (active ? (marked && original.keepOnDeath) || (!marked && original.keepOnDeath) : !marked)
        return;
    const item = original.clone();
    if (active) {
        if (!marked) {
            if (item.maxAmount === 1)
                item.setDynamicProperty(MARK, true);
            else {
                const lore = item.getLore();
                if (lore.length >= 20)
                    throw Error('Un objeto tiene demasiadas líneas de descripción para asegurarlo.');
                item.setLore([...lore, LORE]);
            }
        }
        item.keepOnDeath = true;
    }
    else {
        item.keepOnDeath = false;
        if (item.maxAmount === 1)
            item.setDynamicProperty(MARK, undefined);
        else
            item.setLore(item.getLore().filter(line => line !== LORE));
    }
    return item;
}
export function insuranceSlots(p, inventory = true) {
    const slots = [], inv = p.getComponent('minecraft:inventory')?.container, equip = p.getComponent('minecraft:equippable');
    if (!inv || !equip)
        throw Error('Inventario o armadura aún no disponibles.');
    if (inventory)
        for (let i = 0; i < inv.size; i++)
            slots.push({ get: () => inv.getItem(i), set: item => inv.setItem(i, item) });
    for (const name of equipment)
        slots.push({ get: () => equip.getEquipment(name), set: item => { if (!equip.setEquipment(name, item))
                throw Error('No se pudo proteger la armadura.'); } });
    return slots;
}
export function reconcileInsurance(p, active, inventory = true) {
    const changes = insuranceSlots(p, inventory).flatMap(slot => { const before = slot.get(), after = before && insuredItem(before, active); return after ? [{ slot, before: before, after }] : []; });
    const written = [];
    try {
        for (const change of changes) {
            change.slot.set(change.after);
            written.push(change);
        }
    }
    catch (error) {
        for (const change of written.reverse())
            try {
                change.slot.set(change.before);
            }
            catch { }
        throw error;
    }
    return changes.length;
}
export function createInventoryInsurance(ctx) {
    const active = new Map(), dirty = new Set(), dead = new Set(), busy = new Set(), queued = new Set(), lastError = new Map();
    let ticks = 0;
    const enabled = () => freeBetaShop() || world.getDynamicProperty('warland:insurance_preview') === true || world.getDynamicProperty(INSURANCE_VALIDATION) === true;
    const saleAvailable = () => enabled() && world.getDynamicProperty(INSURANCE_VALIDATION) === true;
    function status(p) { if (!active.has(p.id))
        active.set(p.id, !!ctx.repo.get(ctx.ensure(p).id)?.insurance); return active.get(p.id); }
    function sync(p, inventory = true) {
        if (!enabled() || !ctx.ready() || dead.has(p.id) || busy.has(p.id))
            return;
        if (p.getComponent('minecraft:health')?.currentValue === 0)
            return;
        busy.add(p.id);
        try {
            reconcileInsurance(p, status(p), inventory);
            if (inventory)
                dirty.delete(p.id);
        }
        finally {
            busy.delete(p.id);
        }
    }
    function failure(p, error) {
        if(!p.isValid)return;
        const now = Date.now();
        if (now - (lastError.get(p.id) ?? 0) < 10000)
            return;
        lastError.set(p.id, now);
        ctx.audit('insurance_error', p.name, JSON.stringify({ error: String(error), dimension: p.dimension.id, location: p.location }));
        ctx.message(p, '§cRevisa el seguro: ' + (error instanceof Error ? error.message : String(error)));
    }
    function activate(p, trial = false) {
        trial ||= freeBetaShop();
        if (!enabled())
            throw Error('Seguro aún no disponible en este mundo.');
        if (world.gameRules.keepInventory)
            throw Error('El mundo ya conserva el inventario. No necesitas seguro.');
        if (!trial && !saleAvailable())
            throw Error('Falta validar una muerte real antes de vender el seguro.');
        const id = ctx.ensure(p).id, a = ctx.repo.get(id);
        if (a.insurance)
            throw Error('Ya tienes un seguro activo.');
        if (!trial && a.balance < W3.insurancePrice)
            throw Error('Warcoins insuficientes.');
        if (p.getComponent('minecraft:health')?.currentValue === 0)
            throw Error('Reaparece antes de activar el seguro.');
        if (p.getComponent('minecraft:cursor_inventory')?.item)
            throw Error('Guarda primero el objeto que llevas en el cursor.');
        // Preflight and native writes precede the charge in this synchronous callback.
        busy.add(p.id);
        try {
            reconcileInsurance(p, true);
            ctx.repo.mutate(id, draft => { purchase(draft, 'insurance', Date.now(), 'insurance:' + String(draft.sequence + 1), trial ? 0 : undefined); });
            active.set(p.id, true);
        }
        catch (error) {
            const committed = ctx.repo.get(id)?.insurance === true;
            active.set(p.id, committed);
            if (!committed)
                reconcileInsurance(p, false);
            throw error;
        }
        finally {
            busy.delete(p.id);
        }
        ctx.audit(trial ? 'insurance_trial' : 'insurance_activated', p.name, JSON.stringify({ price: trial ? 0 : W3.insurancePrice, dimension: p.dimension.id, location: p.location }));
        ctx.message(p, trial ? 'Seguro de prueba activo · 1 muerte.' : 'Seguro activo · 1 muerte · 40 WC.');
    }
    function died(p, insured) {
        dead.add(p.id);
        active.set(p.id, false);
        dirty.delete(p.id);
        if (insured) {
            p.setDynamicProperty('warland:insurance_used', true);
            ctx.audit('insurance_consumed', p.name, JSON.stringify({ dimension: p.dimension.id, location: p.location }));
        }
    }
    // Native item stacks retain all their data. Never reconstruct items from type/count, or clone death drops.
    function collect(p, entity) {
        if (!p.isValid || !entity.isValid || dead.has(p.id) || p.getComponent('minecraft:health')?.currentValue === 0)
            return;
        if (p.dimension.id !== entity.dimension.id || Math.hypot(p.location.x - entity.location.x, p.location.y - entity.location.y, p.location.z - entity.location.z) > 3)
            return;
        const original = entity.getComponent('minecraft:item')?.itemStack, container = p.getComponent('minecraft:inventory')?.container;
        if (!original || !container)
            return;
        const normalized = insuredItem(original, status(p)) ?? original;
        let capacity = 0;
        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            capacity += !item ? normalized.maxAmount : item.isStackableWith(normalized) ? item.maxAmount - item.amount : 0;
        }
        const count = Math.min(capacity, normalized.amount);
        if (count <= 0)
            return;
        const taken = normalized.clone();
        taken.amount = count;
        const position = entity.location, dimension = entity.dimension;
        // Remove the exact source before inserting; queued readers recheck validity, preventing double pickup.
        entity.remove();
        try {
            const left = container.addItem(taken);
            if (left)
                dimension.spawnItem(insuredItem(left, false) ?? left, position);
        }
        catch (error) {
            dimension.spawnItem(insuredItem(taken, false) ?? taken, position);
            throw error;
        }
        if (count < original.amount) {
            const rest = original.clone();
            rest.amount = original.amount - count;
            dimension.spawnItem(insuredItem(rest, false) ?? rest, position);
        }
        dirty.add(p.id);
    }
    world.beforeEvents.entityItemPickup.subscribe(e => {
        if (e.cancel || !(e.entity instanceof Player) || !enabled() || !ctx.ready())
            return;
        const p = e.entity, item = e.item.getComponent('minecraft:item')?.itemStack;
        // A before event must not create player records or write native state.
        const id = p.getDynamicProperty('warland:player_id'), insured = typeof id === 'string' && ctx.repo.get(id)?.insurance === true;
        if (!item || (!insured && !insuranceMarked(item)))
            return;
        e.cancel = true;
        if (queued.has(e.item.id))
            return;
        queued.add(e.item.id);
        const dropped = e.item, key = dropped.id;
        system.run(() => { try {
            if (enabled() && ctx.ready()) {
                sync(p);
                collect(p, dropped);
            }
        }
        catch (error) {
            failure(p, error);
        }
        finally {
            queued.delete(key);
        } });
    });
    world.afterEvents.playerInventoryItemChange.subscribe(e => {
        if (!enabled() || !ctx.ready() || busy.has(e.player.id) || dead.has(e.player.id))
            return;
        dirty.add(e.player.id);
        try {
            sync(e.player);
        }
        catch (error) {
            failure(e.player, error);
        }
    });
    world.afterEvents.entityItemDrop.subscribe(e => {
        if (!enabled())
            return;
        // The current native event can supply an Array without Symbol.iterator.
        // Indexed access also handles empty Warden drops without touching other loot.
        const droppedItems = e.items ?? [];
        for (let index = 0; index < droppedItems.length; index++)
            try {
                const entity = droppedItems[index];
                const original = entity.getComponent('minecraft:item')?.itemStack, clean = original && insuredItem(original, false);
                if (!clean)
                    continue;
                const velocity = entity.getVelocity(), replacement = entity.dimension.spawnItem(clean, entity.location);
                try {
                    entity.remove();
                    replacement.applyImpulse(velocity);
                }
                catch (error) {
                    if (entity.isValid && replacement.isValid)
                        replacement.remove();
                    throw error;
                }
            }
            catch (error) {
                ctx.audit('insurance_drop_cleanup_error', e.entity.typeId === 'minecraft:player' ? e.entity.name : e.entity.typeId, String(error));
            }
    });
    world.afterEvents.playerSpawn.subscribe(({ player: p }) => {
        dead.delete(p.id);
        active.delete(p.id);
        dirty.add(p.id);
        const restore = () => { try {
            if (!enabled() || !ctx.ready())
                return;
            sync(p);
            if (p.getDynamicProperty('warland:insurance_used')) {
                p.setDynamicProperty('warland:insurance_used', undefined);
                ctx.message(p, 'Seguro consumido.');
            }
        }
        catch (error) {
            failure(p, error);
            dirty.add(p.id);
        } };
        restore();
        system.run(restore);
    });
    world.beforeEvents.playerLeave.subscribe(({ player: p }) => { active.delete(p.id); dirty.delete(p.id); dead.delete(p.id); lastError.delete(p.id); });
    system.runInterval(() => {
        if (!enabled() || !ctx.ready())
            return;
        ticks++;
        for (const p of world.getAllPlayers())
            try {
                // Main inventory is event-driven. Equipment has no stable change event; inspect its five slots.
                const full = dirty.has(p.id) || !active.has(p.id) || ticks % 20 === 0;
                sync(p, full);
            }
            catch (error) {
                failure(p, error);
            }
    }, 1);
    return { activate, died, sync, enabled, saleAvailable, collect };
}
//# sourceMappingURL=insurance.js.map