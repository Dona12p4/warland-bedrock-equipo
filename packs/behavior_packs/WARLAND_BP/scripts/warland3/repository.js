const prefix = "warland3:account_", transactions = "warland3:transaction_";
const copy = (value) => JSON.parse(JSON.stringify(value));
const utf8Length = (value) => [...value].reduce((n, c) => n + (c.codePointAt(0) > 0xffff ? 4 : c.charCodeAt(0) > 0x7ff ? 3 : c.charCodeAt(0) > 0x7f ? 2 : 1), 0);
// Saldo, compras y cola pendiente se guardan juntos. Tras una interrupción se completa
// el diario por ID determinista; nunca se vuelve a cobrar ni a generar moneda.
export class SeasonRepository {
    store;
    constructor(store) {
        this.store = store;
    }
    get(id) {
        const raw = this.store.get(prefix + id);
        return raw === undefined ? undefined : JSON.parse(raw);
    }
    saveInitial(account) {
        if (this.get(account.id))
            throw new Error("La cuenta ya existe.");
        this.save(account);
        this.flush(account.id);
    }
    mutate(id, operation) {
        this.flush(id);
        const current = this.get(id);
        if (!current)
            throw new Error("Cuenta inexistente.");
        const draft = copy(current), result = operation(draft);
        this.save(draft);
        this.flush(id);
        return result;
    }
    save(account) {
        const json = JSON.stringify(account);
        if (utf8Length(json) > 32000)
            throw new Error("Cuenta demasiado grande; requiere archivado antes de continuar.");
        this.store.set(prefix + account.id, json);
    }
    flush(id) {
        const account = this.get(id);
        if (!account?.pending.length)
            return;
        for (const tx of account.pending) {
            const key = transactions + tx.id, json = JSON.stringify(tx), previous = this.store.get(key);
            if (previous !== undefined && previous !== json)
                throw new Error("Conflicto de identidad de transacción.");
            if (previous === undefined)
                this.store.set(key, json);
        }
        account.pending = [];
        this.save(account);
    }
    recover() { for (const key of this.store.keys())
        if (key.startsWith(prefix))
            this.flush(key.slice(prefix.length)); }
    allAccounts() { return this.store.keys().filter(key => key.startsWith(prefix)).map(key => JSON.parse(this.store.get(key))); }
    ledger() { return this.store.keys().filter(key => key.startsWith(transactions)).map(key => JSON.parse(this.store.get(key))).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)); }
}
//# sourceMappingURL=repository.js.map