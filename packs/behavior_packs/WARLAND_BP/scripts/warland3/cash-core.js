import { postCash } from './domain.js';
export const CASH_MAX = 2147483647;
export const CASH_COIN = 'warland:warcoin';
export const CASH_DEPOSIT_SLOTS = 16;
export function cashAmount(value) { const text = String(value).trim(); if (!/^[1-9][0-9]{0,9}$/.test(text))
    throw Error('Escribe una cantidad entera mayor que cero, sin puntos ni comas.'); const n = Number(text); if (!Number.isSafeInteger(n) || n > CASH_MAX)
    throw Error('Cantidad demasiado grande.'); return n; }
// Each issue is an immutable, serialised bearer claim. A cloned item cannot mint
// another claim. The account journal and prepared operation recover idempotently.
export class CashLedger {
    store;
    repo;
    constructor(store, repo) {
        this.store = store;
        this.repo = repo;
    }
    read(key) { const v = this.store.get(key); return v === undefined ? undefined : JSON.parse(v); }
    write(key, value) { this.store.set(key, JSON.stringify(value)); }
    operation(id) { return this.read('warland:cash_op_' + id); }
    serial(op, index) { return op.id + '_' + index; }
    note(serial) { if (typeof serial !== 'string' || !/^c[1-9][0-9]*_[01]$/.test(serial))
        return; const [id, index] = serial.split('_'), op = this.operation(id), out = op?.outputs[Number(index)]; if (!out || op?.phase === 'prepared' || this.store.get('warland:cash_spent_' + serial))
        return; return { ...out, serial, issuer: op.owner }; }
    execute(owner, delta, inputs, outputs, kind, coins = 0, delivery) {
        if (!Number.isSafeInteger(delta) || new Set(inputs).size !== inputs.length || inputs.length > 36 || outputs.length > 2)
            throw Error('Operación inválida.');
        if (!Number.isSafeInteger(coins) || Math.abs(coins) > CASH_MAX || (coins !== 0 && !delivery))
            throw Error('Entrega de monedas inválida.');
        if (delivery) {
            const slots = new Set();
            let moved = 0;
            if (!delivery.player || !delivery.edits.length || delivery.edits.length > 36 + CASH_DEPOSIT_SLOTS)
                throw Error('Entrega vacía.');
            for (const e of delivery.edits) {
                const key = e.target + ':' + e.slot;
                if (!['player', 'entity'].includes(e.target) || slots.has(key) || !Number.isInteger(e.slot) || e.slot < 0 || e.slot > 35 || (e.target === 'entity' && (!delivery.entity || e.slot >= CASH_DEPOSIT_SLOTS)))
                    throw Error('Ranura inválida.');
                slots.add(key);
                for (const item of [e.before, e.after])
                    if (item && (!Number.isInteger(item.amount) || item.amount < 1 || item.amount > (item.type === CASH_COIN ? 64 : 1)))
                        throw Error('Pila inválida.');
                if (e.after && e.after.type !== CASH_COIN)
                    throw Error('Salida inválida.');
                if (e.before && e.before.type !== CASH_COIN && (e.before.type !== 'warland:warcoins_fisicos' || !inputs.includes(e.before.serial ?? '')))
                    throw Error('Entrada inválida.');
                moved += (e.after?.type === CASH_COIN ? e.after.amount : 0) - (e.before?.type === CASH_COIN ? e.before.amount : 0);
            }
            if (moved !== coins)
                throw Error('La entrega no conserva las monedas.');
        }
        const account = this.repo.get(owner);
        if (!account)
            throw Error('No existe la cuenta.');
        if (account.balance + delta < 0 || account.balance + delta > CASH_MAX)
            throw Error('Warcoins insuficientes o saldo fuera de rango.');
        let total = 0;
        for (const id of inputs) {
            const note = this.note(id);
            if (!note)
                throw Error('Estos Warcoins ya se usaron o no son válidos.');
            total += note.value;
        }
        for (const n of outputs)
            cashAmount(n.value);
        if (outputs.reduce((sum, n) => sum + n.value, 0) + coins !== total - delta)
            throw Error('La operación no conserva el valor.');
        const seq = Number(this.store.get('warland:cash_sequence') ?? 0) + 1;
        if (!Number.isSafeInteger(seq))
            throw Error('Límite de operaciones.');
        this.store.set('warland:cash_sequence', String(seq));
        const op = { id: 'c' + seq, owner, delta, inputs, outputs, kind, at: Date.now(), phase: 'prepared', txId: owner + '_' + (account.sequence + 1), ...(delivery ? { coins, delivery } : {}) };
        this.write('warland:cash_op_' + op.id, op);
        this.commit(op);
        return op;
    }
    commit(op) {
        if (op.phase !== 'prepared')
            return;
        for (const serial of op.inputs) {
            const lock = this.store.get('warland:cash_spent_' + serial);
            if (lock && lock !== op.id)
                throw Error('Conflicto de moneda; operación retenida.');
            this.store.set('warland:cash_spent_' + serial, op.id);
        }
        this.repo.flush(op.owner);
        const existing = this.read('warland3:transaction_' + op.txId);
        if (existing?.operation !== 'cash:' + op.id) {
            // An unrelated time/mission credit can precede recovery after a restart.
            const a = this.repo.get(op.owner);
            op.txId = op.owner + '_' + (a.sequence + 1);
            this.write('warland:cash_op_' + op.id, op);
            this.repo.mutate(op.owner, a => postCash(a, op.delta, op.at, 'cash:' + op.id, JSON.stringify({ kind: op.kind, inputs: op.inputs, outputs: op.outputs, ...(op.delivery ? { coins: op.coins } : {}) })));
        }
        op.phase = 'committed';
        this.write('warland:cash_op_' + op.id, op);
    }
    complete(op) { op.phase = 'delivered'; this.write('warland:cash_op_' + op.id, op); }
    recover() { for (const key of this.store.keys())
        if (key.startsWith('warland:cash_op_')) {
            const op = this.read(key);
            if (op.phase === 'prepared')
                this.commit(op);
        } }
    pending(owner) { return this.store.keys().filter(k => k.startsWith('warland:cash_op_')).map(k => this.read(k)).filter(op => op.owner === owner && op.phase === 'committed'); }
    supply() { let value = 0, notes = 0; for (const key of this.store.keys())
        if (key.startsWith('warland:cash_op_')) {
            const op = this.read(key);
            for (let i = 0; i < op.outputs.length; i++) {
                const n = this.note(this.serial(op, i));
                if (n) {
                    value += n.value;
                    notes++;
                }
            }
        } return { value, notes }; }
}
