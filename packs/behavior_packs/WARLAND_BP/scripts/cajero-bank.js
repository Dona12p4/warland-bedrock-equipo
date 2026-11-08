import { world, system, Player, ItemStack, GameMode, CommandPermissionLevel, CustomCommandStatus } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { cashWithdrawalForm } from './cajero-inventory-view.js';
import { CashLedger, cashAmount, CASH_COIN, CASH_DEPOSIT_SLOTS } from './warland3/cash-core.js';
import { insuredItem } from './warland3/insurance.js';
import { bedrockSeasonStore } from './warland3/bedrock-store.js';
import { updateWarcoinSidebar } from './warcoins-sidebar.js';
import { ADMIN_NAMES } from './core.js';
const ATM = 'warland:cajero', VAULT = 'warland:cajero_resguardo', ITEM = 'warland:warcoins_fisicos', SERIAL = 'warland:cash_serial', SESSION = 'warland:cash_session';
const CONTROL = 'warland:cajero_control', UI_SLOT = 'warland:cash_ui_slot', UI_ENTITY = 'warland:cash_ui_entity', UI_NONCE = 'warland:cash_ui_nonce';
const sites = [{ x: 1252, y: 71, z: -1369, yaw: 90 }, { x: 1229, y: 71, z: -1369, yaw: -90 }];
const inventory = (e) => e.getComponent('minecraft:inventory')?.container;
const serial = (i) => i?.typeId === ITEM ? i.getDynamicProperty(SERIAL) : undefined;
const readSession = (e) => { const s = e.getDynamicProperty(SESSION); return typeof s === 'string' ? JSON.parse(s) : undefined; };
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const canManageCajero = (p) => ADMIN_NAMES.includes(p.name.toLowerCase());
export function createCajeroBank(ctx) {
    const bank = new CashLedger(bedrockSeasonStore, ctx.w3.repo), busy = new Set(), migrationQueue = new Set(), reservations = new Map();
    let recovered = false, placementChecked = false, uiCounter = 0;
    const audit = (p, action, extra) => console.warn('[WARLAND_AUDIT] ' + JSON.stringify({ schema: 2, category: 'economy', action, outcome: 'confirmed', at: Date.now(), player: p.name, nameTag: p.nameTag, dimension: p.dimension.id, position: p.location, ...extra }));
    function ensure(p) { if (!ctx.ready() || !recovered)
        throw Error('El cajero está iniciando.'); if (p.getGameMode() === GameMode.Spectator || p.getComponent('minecraft:health').currentValue <= 0)
        throw Error('No puedes usar el cajero en espectador.'); return ctx.w3.ensure(p).id; }
    function publish(p) { const r = ctx.recordFor(p); r.coins = ctx.w3.repo.get(r.id).balance; ctx.persistPlayer(r); updateWarcoinSidebar(r); }
    function controls(e) {
        const box = inventory(e);
        if (!box || box.size < 27)
            return;
        const s = readSession(e);
        const balance = s ? ctx.w3.repo.get(s.owner)?.balance ?? 0 : 0;
        for (let slot = 16; slot < 27; slot++) {
            const old = box.getItem(slot);
            if (old && old.typeId !== CONTROL)
                continue;
            const name = slot === 25 ? '§0Saldo: ' + balance.toLocaleString('es-CO') + ' WC' : slot === 24 ? (s?.status ?? '§0Coloca tus Warcoins') : '§r';
            if (old?.nameTag === name && old.getDynamicProperty(UI_NONCE) === (s?.nonce ?? 'idle'))
                continue;
            const item = new ItemStack(CONTROL);
            item.nameTag = name;
            item.setDynamicProperty(UI_SLOT, slot);
            item.setDynamicProperty(UI_ENTITY, e.id);
            item.setDynamicProperty(UI_NONCE, s?.nonce ?? 'idle');
            box.setItem(slot, item);
        }
    }
    function physical(id) { const n = bank.note(id); if (!n)
        throw Error('Warcoins no válidos.'); const item = new ItemStack(ITEM, 1); item.setDynamicProperty(SERIAL, id); item.nameTag = '§6Warcoins · §e' + n.value.toLocaleString('es-CO'); item.setLore(['§7Valor: ' + n.value + ' WC', '§7Se convierte al recogerlo', '§8Moneda física de WARLAND']); return item; }
    function notes(inv) { const result = []; const seen = new Set(); for (let i = 0; i < inv.size; i++) {
        const n = bank.note(serial(inv.getItem(i)));
        if (n && !seen.has(n.serial)) {
            seen.add(n.serial);
            result.push({ slot: i, ...n });
        }
    } return result; }
    function flushOutputs(p, op, extra) {
        const inv = inventory(p);
        for (const box of [inv, ...(extra ? [extra] : [])])
            for (let i = 0; i < box.size; i++) {
                const id = serial(box.getItem(i));
                if (typeof id === 'string' && op.inputs.includes(id))
                    box.setItem(i);
            }
        for (let i = 0; i < op.outputs.length; i++) {
            const id = bank.serial(op, i);
            if (!bank.note(id))
                continue;
            if (notes(inv).some(n => n.serial === id))
                continue;
            const slot = inv.firstEmptySlot();
            if (slot === undefined) {
                ctx.message(p, '§eLibera un espacio: tus Warcoins pendientes siguen guardados en el cajero.');
                publish(p);
                return false;
            }
            inv.setItem(slot, physical(id));
        }
        bank.complete(op);
        publish(p);
        return true;
    }
    function recoverPlayer(p) { const owner = ensure(p); bank.recover(); for (const op of bank.pending(owner))
        if (!(op.delivery ? finishCoins(p, op) : flushOutputs(p, op)))
            return false; const collected = collectReturns(p); migrateLegacy(p); return collected; }
    // Native coins have identical metadata and no serial: Bedrock owns splitting,
    // merging, dropping and storage. Legacy serials remain redeemable only once.
    function coin(p, amount = 1) { const i = new ItemStack(CASH_COIN, amount); return insuredItem(i, !!ctx.w3.repo.get(ctx.recordFor(p).id)?.insurance) ?? i; }
    function snapshot(i) { if (!i)
        return; const id = serial(i); return { type: i.typeId, amount: i.amount, name: i.nameTag, lore: i.getLore(), keep: i.keepOnDeath, lock: i.lockMode, ...(typeof id === 'string' ? { serial: id } : {}), canPlace: i.getCanPlaceOn(), canDestroy: i.getCanDestroy() }; }
    function equivalent(a, b) {
        // Insurance may reconcile between reconnect and recovery. Its own marker
        // is not evidence that a player changed the monetary contents of a slot.
        const clean = (v) => v && ({ ...v, keep: undefined, lore: v.lore.filter(x => x !== '§r§8Seguro WARLAND§r') });
        return JSON.stringify(clean(a)) === JSON.stringify(clean(b));
    }
    function restoreCoin(p, s) { if (!s)
        return; const i = new ItemStack(CASH_COIN, s.amount); i.nameTag = s.name; i.setLore(s.lore); i.keepOnDeath = s.keep; i.lockMode = s.lock; i.setCanPlaceOn(s.canPlace); i.setCanDestroy(s.canDestroy); return insuredItem(i, !!ctx.w3.repo.get(ctx.recordFor(p).id)?.insurance) ?? i; }
    function finishCoins(p, op, keepOpen = false) {
        const plan = op.delivery;
        if (!plan || plan.player !== ctx.recordFor(p).id)
            throw Error('Entrega de otra cuenta.');
        const boxes = { player: inventory(p), entity: plan.entity ? world.getEntity(plan.entity)?.getComponent('minecraft:inventory')?.container : undefined };
        // Validate all affected slots before writing any; unrelated items are never
        // overwritten. A conflict retains the journal for recovery, not guessed credit.
        for (const e of plan.edits) {
            const box = boxes[e.target];
            if (!box)
                throw Error('Vuelve al cajero de la operación pendiente.');
            const actual = snapshot(box.getItem(e.slot));
            if (!equivalent(actual, e.before) && !equivalent(actual, e.after))
                throw Error('Una operación pendiente necesita revisión del inventario.');
        }
        for (const e of plan.edits) {
            const box = boxes[e.target];
            if (!equivalent(snapshot(box.getItem(e.slot)), e.after))
                box.setItem(e.slot, restoreCoin(p, e.after));
        }
        bank.complete(op);
        publish(p);
        // A deposit interrupted before emptying its slot stays locked while its
        // owner is offline. Recovery must also release that terminal immediately.
        const terminal = plan.entity ? world.getEntity(plan.entity) : undefined;
        if (!keepOpen && terminal && readSession(terminal)?.owner === op.owner)
            release(terminal, p);
        return true;
    }
    function capacity(p, removeSlot = -1) { const inv = inventory(p), template = coin(p); let n = 0; for (let i = 0; i < inv.size; i++) {
        const item = i === removeSlot ? undefined : inv.getItem(i);
        n += !item ? 64 : item.isStackableWith(template) ? Math.max(0, 64 - item.amount) : 0;
    } return n; }
    function coinPlan(p, amount, removeSlot = -1) {
        const inv = inventory(p), template = coin(p), edits = [];
        let left = amount;
        // Fill existing partial stacks first, then empty slots. Keep the native item
        // properties of stacks that are topped up, including insurance and name.
        for (const empty of [false, true])
            for (let slot = 0; slot < inv.size; slot++) {
                const before = inv.getItem(slot), effective = slot === removeSlot ? undefined : before;
                if ((!effective) !== empty || effective && !effective.isStackableWith(template))
                    continue;
                const add = Math.min(left, 64 - (effective?.amount ?? 0));
                if (!add && slot !== removeSlot)
                    continue;
                const after = effective || add ? effective?.clone() ?? template.clone() : undefined;
                if (after)
                    after.amount = (effective?.amount ?? 0) + add;
                edits.push({ target: 'player', slot, before: snapshot(before), after: snapshot(after) });
                left -= add;
            }
        if (left)
            throw Error('No caben todas las monedas en el inventario.');
        if (removeSlot >= 0 && !edits.some(e => e.slot === removeSlot))
            edits.push({ target: 'player', slot: removeSlot, before: snapshot(inv.getItem(removeSlot)) });
        return { player: ctx.recordFor(p).id, edits };
    }
    function withdraw(p, amount) {
        const owner = ensure(p);
        cashAmount(amount);
        if (!recoverPlayer(p))
            throw Error('Recoge primero lo pendiente.');
        if (amount > capacity(p))
            throw Error('No caben esas monedas. Retira una cantidad menor.');
        const op = bank.execute(owner, -amount, [], [], 'withdraw_coins', amount, coinPlan(p, amount));
        finishCoins(p, op);
        audit(p, 'cash_withdraw', { operation: op.id, amount });
        return op;
    }
    function migrateLegacy(p) {
        const owner = ensure(p), inv = inventory(p);
        let converted = 0, credited = 0;
        for (const n of notes(inv)) {
            const amount = Math.min(n.value, capacity(p, n.slot)), excess = n.value - amount;
            const op = bank.execute(owner, excess, [n.serial], [], 'legacy_to_coins', amount, coinPlan(p, amount, n.slot));
            finishCoins(p, op);
            converted += amount;
            credited += excess;
            audit(p, 'cash_migration', { operation: op.id, amount, banked: excess });
        }
        if (credited)
            ctx.message(p, `§7Monedas convertidas; ${credited} WC quedaron en tu cuenta.`);
        return { converted, credited };
    }
    function owned(p, e) { const s = readSession(e); return s?.owner === ctx.recordFor(p).id; }
    function returnKey(id) { return 'warland:cash_return_' + id; }
    function collectReturns(p) {
        const owner = ctx.recordFor(p).id, raw = world.getDynamicProperty(returnKey(owner));
        if (typeof raw !== 'string')
            return true;
        const ids = JSON.parse(raw), remaining = [];
        for (const id of ids) {
            const vault = world.getEntity(id);
            if (!vault) {
                remaining.push(id);
                continue;
            }
            const box = inventory(vault);
            let retained = false;
            for (let slot = 0; slot < box.size; slot++)
                if (box.getItem(slot)) {
                    const left = box.transferItem(slot, inventory(p));
                    if (left)
                        box.setItem(slot, left);
                    if (box.getItem(slot))
                        retained = true;
                }
            if (retained)
                remaining.push(id);
            else
                vault.remove();
        }
        world.setDynamicProperty(returnKey(owner), remaining.length ? JSON.stringify(remaining) : undefined);
        return remaining.length === 0;
    }
    function release(e, p) {
        const s = readSession(e);
        if (!s)
            return;
        const pending = bank.pending(s.owner).find(op => op.delivery?.entity === e.id);
        if (pending) {
            if (!p?.isValid)
                return;
            finishCoins(p, pending, true);
        }
        const box = inventory(e);
        for (let slot = 0; slot < box.size; slot++) {
            if (box.getItem(slot)?.typeId === CONTROL)
                continue;
            const id = serial(box.getItem(slot));
            if (typeof id === 'string') {
                const spent = bedrockSeasonStore.get('warland:cash_spent_' + id), op = spent ? bank.operation(spent) : undefined;
                if (op?.owner === s.owner && op.kind === 'deposit' && op.phase !== 'prepared')
                    box.setItem(slot);
            }
            if (box.getItem(slot) && p?.isValid && ctx.recordFor(p).id === s.owner) {
                const left = box.transferItem(slot, inventory(p));
                if (left)
                    box.setItem(slot, left);
            }
        }
        const retained = Array.from({ length: box.size }, (_, slot) => slot).filter(slot => { const i = box.getItem(slot); return i && i.typeId !== CONTROL; });
        if (retained.length) {
            const vault = e.dimension.spawnEntity(VAULT, e.location);
            vault.setDynamicProperty('warland:cash_owner', s.owner);
            const raw = world.getDynamicProperty(returnKey(s.owner)), ids = typeof raw === 'string' ? JSON.parse(raw) : [];
            ids.push(vault.id);
            world.setDynamicProperty(returnKey(s.owner), JSON.stringify(ids));
            for (const slot of retained) {
                const left = box.transferItem(slot, inventory(vault));
                if (left)
                    box.setItem(slot, left);
                if (box.getItem(slot))
                    throw Error('No se pudo guardar el objeto; ranura retenida.');
            }
            if (p?.isValid)
                ctx.message(p, '§eTus objetos quedan guardados. Libera espacio y vuelve a tocar el cajero para recogerlos.');
        }
        e.setDynamicProperty(SESSION, undefined);
        e.nameTag = 'Cajero';
        reservations.delete(e.id);
        controls(e);
    }
    function beginDeposit(p, e) { ensure(p); if (!recoverPlayer(p))
        throw Error('Libera espacio para recoger tus objetos pendientes.'); const s = readSession(e); if (s && s.owner !== ctx.recordFor(p).id)
        throw Error('Otra persona está usando el cajero.'); const box = inventory(e); if (!s)
        for (let slot = 0; slot < Math.min(CASH_DEPOSIT_SLOTS, box.size); slot++)
            if (box.getItem(slot))
                throw Error('Hay objetos pendientes de recuperación.'); e.setDynamicProperty(SESSION, JSON.stringify({ owner: ctx.recordFor(p).id, name: p.name, phase: 'armed', at: Date.now(), nonce: Date.now().toString(36) + '_' + (++uiCounter) })); e.nameTag = 'Cajero'; controls(e); }
    function depositValue(item) { if (item?.typeId === CASH_COIN && item.amount >= 1 && item.amount <= 64)
        return item.amount; const n = bank.note(serial(item)); return item?.amount === 1 ? n?.value : undefined; }
    function deposit(p, e) {
        const owner = ensure(p);
        if (!owned(p, e))
            throw Error('Esta ranura pertenece a otra persona.');
        const box = inventory(e), inputs = [], edits = [];
        let value = 0, native = 0;
        for (let slot = 0; slot < Math.min(CASH_DEPOSIT_SLOTS, box.size); slot++) {
            const item = box.getItem(slot);
            if (!item)
                continue;
            const amount = depositValue(item);
            if (!amount)
                throw Error('Solo se pueden consignar Warcoins válidos. Retira los otros objetos.');
            value += amount;
            if (item.typeId === CASH_COIN)
                native += amount;
            else
                inputs.push(bank.note(serial(item)).serial);
            edits.push({ target: 'entity', slot, before: snapshot(item) });
        }
        if (!value)
            throw Error('Coloca tus Warcoins antes de confirmar.');
        const op = bank.execute(owner, value, inputs, [], 'deposit_coins', -native, { player: owner, entity: e.id, edits });
        finishCoins(p, op, true);
        const s = readSession(e);
        if (s) {
            s.status = '§2Consignaste ' + value + ' WC';
            e.setDynamicProperty(SESSION, JSON.stringify(s));
        }
        controls(e);
        audit(p, 'cash_deposit', { operation: op.id, amount: value, slots: edits.length });
        return op;
    }
    function checkRemoval(p, e) {
        if (!canManageCajero(p))
            throw Error('Solo administradores.');
        ensure(p);
        if (!e.isValid || e.typeId !== ATM)
            throw Error('Ese cajero ya no está disponible.');
        if (p.dimension.id !== e.dimension.id || distance(p.location, e.location) > 6)
            throw Error('Acércate al cajero.');
        if (readSession(e))
            throw Error('Termina o cancela la consignación antes de quitarlo.');
        const box = inventory(e);
        if (!box)
            throw Error('No se pudo comprobar la ranura.');
        for (let slot = 0; slot < box.size; slot++)
            if (box.getItem(slot) && box.getItem(slot)?.typeId !== CONTROL)
                throw Error('Vacía las casillas antes de quitar el cajero.');
        // Pending deliveries may still need this entity, even without an active UI.
        for (const key of bedrockSeasonStore.keys())
            if (key.startsWith('warland:cash_op_')) {
                const op = bank.operation(key.slice('warland:cash_op_'.length));
                if (op?.delivery?.entity === e.id && op.phase !== 'delivered')
                    throw Error('Hay una operación pendiente en este cajero.');
            }
    }
    function removeTerminal(p, e) {
        checkRemoval(p, e);
        const entityId = e.id, position = e.location, dimension = e.dimension.id;
        e.remove();
        // Keep the lobby placement record: an intentional removal must survive restart.
        audit(p, 'cash_terminal_removed', { entityId, dimension, position });
        ctx.message(p, '§aCajero quitado.');
    }
    async function confirmRemoval(p, e) {
        checkRemoval(p, e);
        const r = await new ActionFormData().title('Quitar cajero').body('Se quitará este cajero. Los saldos se conservan.').button('Cancelar').button('Quitar cajero').show(p);
        if (!r.canceled && r.selection === 1 && p.isValid)
            removeTerminal(p, e);
    }
    async function show(p, e) {
        if (busy.has(p.id))
            return;
        busy.add(p.id);
        try {
            const owner = ensure(p);
            if (!recoverPlayer(p)) {
                ctx.message(p, '§eLibera un espacio o vuelve al cajero donde dejaste el objeto.');
                return;
            }
            const a = ctx.w3.repo.get(owner);
            const admin = canManageCajero(p), form = new ActionFormData().title('Cajero').body(`Saldo: ${a.balance} WC`).button('Retirar').button('Consignar · 16 casillas');
            if (admin)
                form.button('Quitar cajero');
            const r = await form.button('Cerrar').show(p);
            if (r.canceled || !p.isValid || !e.isValid)
                return;
            if (p.dimension.id !== e.dimension.id || distance(p.location, e.location) > 6)
                throw Error('Acércate al cajero.');
            if (r.selection === 0)
                await showWithdrawal(p, e);
            else if (r.selection === 1) {
                beginDeposit(p, e);
                ctx.message(p, '§7Toca el cajero para colocar tus Warcoins.');
            }
            else if (admin && r.selection === 2)
                await confirmRemoval(p, e);
        }
        catch (err) {
            ctx.message(p, '§c' + (err instanceof Error ? err.message : String(err)));
        }
        finally {
            busy.delete(p.id);
        }
    }
    async function showWithdrawal(p, e) {
        if (!p.isValid || !e.isValid || p.dimension.id !== e.dimension.id || distance(p.location, e.location) > 6)
            return;
        const owner = ensure(p);
        if (!recoverPlayer(p))
            throw Error('Libera espacio para recoger lo pendiente.');
        const f = await cashWithdrawalForm(p, ctx.w3.repo.get(owner).balance).show(p);
        if (f.canceled || !p.isValid)
            return;
        if (!e.isValid || distance(p.location, e.location) > 6 || p.dimension.id !== e.dimension.id)
            throw Error('Acércate al cajero.');
        const n = cashAmount(f.formValues?.[0]);
        withdraw(p, n);
        ctx.message(p, '§aRetiraste ' + n + ' WC físicos.');
    }
    function placeLobby() {
        if (placementChecked)
            return;
        const d = world.getDimension('overworld');
        const prior = world.getDynamicProperty('warland:cash_lobby_atm');
        if (typeof prior === 'string') {
            placementChecked = true;
            return;
        }
        for (const spot of sites) {
            try {
                let safe = true;
                for (const x of [spot.x - 1, spot.x])
                    for (const z of [spot.z - 1, spot.z]) {
                        const floor = d.getBlock({ x, y: spot.y - 1, z });
                        if (!floor || floor.isAir || floor.isLiquid || /slab|stairs/.test(floor.typeId))
                            safe = false;
                        for (let y = spot.y; y < spot.y + 3; y++)
                            if (!d.getBlock({ x, y, z })?.isAir)
                                safe = false;
                    }
                if (!safe)
                    continue;
                const previous = d.getEntities({ type: ATM, location: spot, maxDistance: 2 })[0];
                const entity = previous ?? d.spawnEntity(ATM, spot);
                entity.setRotation({ x: 0, y: spot.yaw });
                entity.nameTag = 'Cajero de Warcoins';
                entity.addTag('warland_lobby_atm');
                world.setDynamicProperty('warland:cash_lobby_atm', JSON.stringify({ ...spot, id: entity.id }));
                placementChecked = true;
                console.warn('[WARLAND_CAJERO_PLACED] ' + JSON.stringify(spot));
                return;
            }
            catch { }
        }
    }
    world.beforeEvents.playerInteractWithEntity.subscribe(e => {
        if (e.target.typeId !== ATM && e.target.typeId !== VAULT)
            return;
        if (e.target.typeId === VAULT) {
            e.cancel = true;
            return;
        }
        const p = e.player, atm = e.target, s = readSession(atm), id = p.getDynamicProperty('warland:player_id');
        if (!ctx.ready() || !recovered || p.getGameMode() === GameMode.Spectator) {
            e.cancel = true;
            return;
        }
        const reserved = reservations.get(atm.id);
        if (s && s.owner !== id || reserved && reserved !== p.id) {
            e.cancel = true;
            system.run(() => ctx.message(p, '§eOtra persona está usando este cajero.'));
            return;
        }
        if (p.isSneaking && canManageCajero(p) && !s) {
            e.cancel = true;
            system.run(() => show(p, atm));
            return;
        }
        if (!id || bank.pending(String(id)).length || typeof world.getDynamicProperty(returnKey(String(id))) === 'string') {
            e.cancel = true;
            system.run(() => { try {
                beginDeposit(p, atm);
                ctx.message(p, '§7Toca de nuevo el cajero.');
            }
            catch (err) {
                ctx.message(p, '§c' + String(err));
            } });
            return;
        }
        reservations.set(atm.id, p.id);
        system.run(() => { try {
            if (p.isValid && atm.isValid && !readSession(atm))
                beginDeposit(p, atm);
        }
        catch (err) {
            ctx.message(p, '§c' + String(err));
        }
        finally {
            reservations.delete(atm.id);
        } });
    });
    world.afterEvents.entityContainerOpened.subscribe(({ entity, openSource }) => { if (entity.typeId !== ATM)
        return; const p = openSource.entity; if (!(p instanceof Player))
        return; try {
        if (!readSession(entity))
            beginDeposit(p, entity);
        const s = readSession(entity);
        if (s?.owner === ctx.recordFor(p).id) {
            s.phase = 'open';
            entity.setDynamicProperty(SESSION, JSON.stringify(s));
            controls(entity);
        }
    }
    catch (err) {
        ctx.message(p, '§c' + String(err));
    } });
    world.afterEvents.entityContainerClosed.subscribe(({ entity, closeSource }) => { if (entity.typeId !== ATM)
        return; const p = closeSource.entity; let owner, nonce; try {
        if (p instanceof Player)
            owner = p.getDynamicProperty('warland:player_id');
        nonce = readSession(entity)?.nonce;
    }
    catch { } system.runTimeout(() => { try {
        if (!entity.isValid)
            return;
        const s = readSession(entity);
        if (!s || owner !== s.owner || s.nonce !== nonce)
            return;
        const next = s.withdraw;
        release(entity, p instanceof Player && p.isValid ? p : undefined);
        if (next && p instanceof Player && p.isValid)
            system.runTimeout(() => showWithdrawal(p, entity).catch(err => ctx.message(p, '§c' + String(err))), 5);
    }
    catch (err) {
        console.warn('[WARLAND_CAJERO_RETURN] ' + String(err));
    } }, 3); });
    function controlDrop(p, item) {
        if (item.typeId !== CONTROL)
            return false;
        const id = item.getDynamicProperty(UI_ENTITY), slot = item.getDynamicProperty(UI_SLOT), nonce = item.getDynamicProperty(UI_NONCE);
        if (typeof id !== 'string' || (slot !== 16 && slot !== 17) || typeof nonce !== 'string')
            return false;
        const e = world.getEntity(id);
        if (!e?.isValid || e.typeId !== ATM)
            return false;
        const s = readSession(e);
        if (!s || s.nonce !== nonce || s.phase !== 'open' || s.owner !== ensure(p) || p.dimension.id !== e.dimension.id || distance(p.location, e.location) > 6 || inventory(e).getItem(slot))
            return false;
        controls(e);
        if (slot === 16) {
            const op = deposit(p, e);
            ctx.message(p, '§aConsignaste ' + op.delta + ' WC.');
        }
        else {
            s.withdraw = true;
            e.setDynamicProperty(SESSION, JSON.stringify(s));
        }
        return true;
    }
    world.afterEvents.entityItemDrop.subscribe(({ entity, items }) => {
        if (!(entity instanceof Player))
            return;
        items.forEach(dropped => {
            const item = dropped.getComponent('minecraft:item')?.itemStack?.clone();
            if (item?.typeId !== CONTROL)
                return;
            system.run(() => { try {
                if (dropped.isValid)
                    dropped.remove();
                if (entity.isValid)
                    controlDrop(entity, item);
            }
            catch (err) {
                if (entity.isValid) {
                    const text = err instanceof Error ? err.message : String(err);
                    ctx.message(entity, '§c' + text);
                    const id = item.getDynamicProperty(UI_ENTITY), e = typeof id === 'string' ? world.getEntity(id) : undefined;
                    if (e?.isValid && owned(entity, e)) {
                        const s = readSession(e);
                        s.status = '§c' + (text.includes('Solo se pueden') ? 'Solo se aceptan Warcoins' : text.includes('Coloca') ? 'Coloca tus Warcoins' : 'Revisa el mensaje del cajero');
                        e.setDynamicProperty(SESSION, JSON.stringify(s));
                        controls(e);
                    }
                }
            } });
        });
    });
    world.beforeEvents.itemUse.subscribe(e => { if (e.itemStack.typeId !== ITEM)
        return; e.cancel = true; const p = e.source; system.run(() => { if (p.isValid)
        try {
            recoverPlayer(p);
        }
        catch (err) {
            ctx.message(p, '§c' + (err instanceof Error ? err.message : String(err)));
        } }); });
    world.afterEvents.playerInventoryItemChange.subscribe(({ player, itemStack }) => { if (itemStack?.typeId !== ITEM || migrationQueue.has(player.id))
        return; migrationQueue.add(player.id); system.runTimeout(() => { migrationQueue.delete(player.id); if (!player.isValid || busy.has(player.id) || !recovered)
        return; try {
        recoverPlayer(player);
    }
    catch { } }, 8); });
    world.afterEvents.playerLeave.subscribe(({ playerId }) => { busy.delete(playerId); migrationQueue.delete(playerId); });
    world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => { if (initialSpawn)
        system.runTimeout(() => { try {
            if (player.isValid && recovered)
                recoverPlayer(player);
        }
        catch { } }, 40); });
    system.runInterval(() => {
        if (!ctx.ready())
            return;
        if (!recovered) {
            try {
                bank.recover();
                recovered = true;
            }
            catch (e) {
                console.warn('[WARLAND_CAJERO_RECOVERY] ' + e);
                return;
            }
        }
        if (world.getAllPlayers().some(p => p.dimension.id === 'minecraft:overworld' && distance(p.location, sites[0]) < 80))
            placeLobby();
        for (const dim of ['overworld', 'nether', 'the_end'])
            for (const e of world.getDimension(dim).getEntities({ type: ATM })) {
                const s = readSession(e);
                if (!s) {
                    controls(e);
                    continue;
                }
                const p = world.getAllPlayers().find(p => p.getDynamicProperty('warland:player_id') === s.owner);
                if (!p || p.dimension.id !== e.dimension.id || distance(p.location, e.location) > 8 || p.getGameMode() === GameMode.Spectator || (s.phase !== 'open' && Date.now() - s.at > 120000))
                    try {
                        release(e, p);
                    }
                    catch { }
            }
    }, 40);
    system.beforeEvents.startup.subscribe(({ customCommandRegistry: r }) => r.registerCommand({ name: 'warland:cajero', description: 'Abrir el cajero cercano', permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false }, o => { const p = o.sourceEntity; if (!(p instanceof Player))
        return { status: CustomCommandStatus.Failure }; system.run(() => { const e = p.dimension.getEntities({ type: ATM, location: p.location, maxDistance: 6, closest: 1 })[0]; if (e)
        show(p, e);
    else
        ctx.message(p, '§eAcércate al cajero del lobby.'); }); return { status: CustomCommandStatus.Success }; }));
    return { bank, withdraw, deposit, capacity, migrateLegacy, finishCoins, beginDeposit, release, collectReturns, recoverPlayer, physical, placeLobby, show, removeTerminal, checkRemoval, controlDrop, controls, get ready() { return recovered; } };
}
