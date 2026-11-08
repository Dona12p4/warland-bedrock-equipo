// Reglas de WARLAND 3. No importan APIs del juego ni activan la temporada por sí solas.
export const W3 = {
    durationDays: 30, timeRewardMs: 30 * 60 * 1000,
    missionRewards: { easy: 1, medium: 2, hard: 3 },
    minimumHealth: 1, maximumHealth: 20, deathLoss: 2, heartRecovery: 2,
    insurancePrice: 40, heartPrice: 100, maxInsurance: 1,
};
const integer = (n, label, minimum = 0) => {
    if (!Number.isSafeInteger(n) || n < minimum)
        throw new Error(`${label}: valor inválido.`);
};
export function localDay(at) {
    if (!Number.isFinite(at))
        throw new Error("Fecha inválida.");
    return new Date(at - 5 * 3600000).toISOString().slice(0, 10);
}
export const newSeason = () => ({ schema: 1, startedAt: null, firstMandateAt: null });
export function seasonDay(season, at) {
    if (season.startedAt === null || at < season.startedAt)
        return 0;
    return Math.floor((Date.parse(localDay(at)) - Date.parse(localDay(season.startedAt))) / 86400000) + 1;
}
export function phaseAt(season, at) {
    const day = seasonDay(season, at);
    return day === 0 ? "preparation" : day > 30 ? "finished" : day <= 7 ? "fall" : day <= 14 ? "difficulty" : day <= 21 ? "invasion" : "counterattack";
}
export function startSeason(season, at) {
    if (season.startedAt !== null)
        throw new Error("La temporada ya tiene fecha de inicio.");
    localDay(at);
    season.startedAt = at;
}
export function activateFirstMandate(season, at) {
    const day = seasonDay(season, at);
    if (day < 7 || day > 30)
        throw new Error("El Primer Mandato se activa desde el final de la primera semana durante la temporada.");
    if (season.firstMandateAt === null)
        season.firstMandateAt = at;
}
export const firstMandateApplies = (season, at) => season.firstMandateAt !== null && at >= season.firstMandateAt;
export function createAccount(id, name, admin, balance = 0, teamId = null) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id))
        throw new Error("Identidad inválida.");
    integer(balance, "Saldo");
    return { schema: 1, id, name, admin, teamId, balance, openingBalance: balance, generatedTime: 0, generatedMissions: 0, spentShop: 0,
        playMs: 0, maximumHealth: 20, insurance: false, sequence: 0, days: {}, recentOperations: [], pending: [] };
}
function post(a, kind, delta, at, operation, extra = {}) {
    if (!Number.isSafeInteger(delta))
        throw new Error("Importe inválido.");
    integer(a.balance + delta, "Saldo resultante");
    if (!operation || operation.length > 160)
        throw new Error("Operación inválida.");
    if (a.recentOperations.includes(operation))
        throw new Error("Operación ya procesada.");
    localDay(at);
    a.balance += delta;
    const tx = { ...extra, schema: 1, id: `${a.id}_${++a.sequence}`, operation, at, accountId: a.id, player: a.name, admin: a.admin, teamId: a.teamId,
        kind, delta, balanceAfter: a.balance };
    a.pending.push(tx);
    a.recentOperations.push(operation);
    if (a.recentOperations.length > 128)
        a.recentOperations.shift();
    return tx;
}
export function recordOpening(a, at) {
    if (a.sequence !== 0)
        throw new Error("La cuenta ya está inicializada.");
    return post(a, "opening", 0, at, "opening", { reference: `Saldo previo: ${a.openingBalance}. No es emisión nueva.` });
}
export function adjustBetaBalance(a, delta, at) {
    if (!Number.isSafeInteger(delta) || a.balance + delta < 0 || a.balance + delta > 2147483647)
        throw Error('Saldo de prueba fuera de rango.');
    return post(a, 'beta_adjustment', delta, at, 'scoreboard:' + String(a.sequence + 1), { reference: 'Ajuste de scoreboard en beta; no representa tiempo ni misiones.' });
}
export function creditBeta(a, amount, at) {
    integer(amount, 'Crédito de beta', 1);
    return post(a, 'beta_credit', amount, at, 'beta:' + String(a.sequence + 1), { reference: 'Monedas ficticias del mundo beta; no representan tiempo jugado.' });
}
// El adaptador entrega tiempo conectado real; un reloj detenido o una sesión cerrada no lo incrementa.
export function creditConnectedTime(a, cumulativeMs, at) {
    integer(cumulativeMs, "Tiempo acumulado");
    if (cumulativeMs <= a.playMs)
        return;
    const amount = Math.floor(cumulativeMs / W3.timeRewardMs) - Math.floor(a.playMs / W3.timeRewardMs);
    const tx = amount ? post(a, "time", amount, at, `time:${Math.floor(cumulativeMs / W3.timeRewardMs)}`, { reference: `${cumulativeMs} ms conectados acumulados` }) : undefined;
    a.playMs = cumulativeMs;
    a.generatedTime += amount;
    return tx;
}
export function assignDailyMissions(a, at, definitions) {
    const day = localDay(at);
    if (a.days[day])
        return;
    for (const tier of ["easy", "medium", "hard"]) {
        if (!definitions[tier]?.id)
            throw new Error("Falta una misión diaria.");
        integer(definitions[tier].target, "Objetivo", 1);
    }
    a.days[day] = Object.fromEntries(Object.entries(definitions).map(([tier, definition]) => [tier, { ...definition, progress: 0, paid: false }]));
    // Mantener acotado el registro activo. El diario de transacciones conserva los pagos.
    for (const old of Object.keys(a.days).sort().slice(0, -35)) {
        delete a.days[old];
        if (a.explored)
            delete a.explored[old];
    }
}
export function advanceMission(a, at, tier, missionId, amount) {
    integer(amount, "Progreso");
    const mission = a.days[localDay(at)]?.[tier];
    if (!mission || mission.id !== missionId || mission.paid)
        return;
    mission.progress = Math.min(mission.target, mission.progress + amount);
}
export function claimMission(a, at, tier) {
    const day = localDay(at), mission = a.days[day]?.[tier];
    if (!mission || mission.progress < mission.target)
        throw new Error("Misión incompleta.");
    if (mission.paid)
        throw new Error("La misión de hoy ya fue cobrada.");
    const tx = post(a, "mission", W3.missionRewards[tier], at, `mission:${day}:${tier}`, { reference: mission.id });
    mission.paid = true;
    a.generatedMissions += tx.delta;
    return tx;
}
// Se ejecuta dentro de la misma escritura que el progreso: recompensa y marca pagada juntas.
export function rewardCompletedMissions(a, at) {
    const rewards = [];
    for (const tier of ['easy', 'medium', 'hard']) {
        const mission = a.days[localDay(at)]?.[tier];
        if (mission && !mission.paid && mission.progress >= mission.target)
            rewards.push({ tier, transaction: claimMission(a, at, tier) });
    }
    return rewards;
}
export function purchase(a, product, at, operation, price) {
    if (product !== "insurance" && product !== "heart")
        throw new Error("Producto inválido.");
    const amount = price ?? (product === "insurance" ? W3.insurancePrice : W3.heartPrice);
    integer(amount, "Precio", 0);
    if (product === "insurance" && a.insurance)
        throw new Error("Ya tienes un seguro. Debes consumirlo antes de comprar otro.");
    if (product === "heart" && a.maximumHealth >= W3.maximumHealth)
        throw new Error("Ya tienes los diez corazones máximos.");
    if (a.balance < amount)
        throw new Error("Warcoins insuficientes.");
    const tx = post(a, product === "insurance" ? "insurance_purchase" : "heart_purchase", -amount, at, operation, { product, quantity: 1, unitPrice: amount });
    a.spentShop += amount;
    if (product === "insurance")
        a.insurance = true;
    else
        a.maximumHealth = Math.min(W3.maximumHealth, a.maximumHealth + W3.heartRecovery);
    return tx;
}
export function death(a, season, at) {
    const insured = a.insurance, before = a.maximumHealth;
    a.insurance = false;
    const globalEffect = firstMandateApplies(season, at);
    if (globalEffect)
        a.maximumHealth = Math.max(W3.minimumHealth, a.maximumHealth - W3.deathLoss);
    return { insured, lostHealth: before - a.maximumHealth, globalEffect };
}
export function reflectedHealth(current, actualDamage) {
    if (!Number.isFinite(current) || !Number.isFinite(actualDamage) || actualDamage < 0)
        throw new Error("Daño inválido.");
    if (current <= 1)
        return current; // No reanima ni cura a alguien ya muerto.
    return Math.max(1, current - actualDamage);
}
export function economyIndicators(accounts) {
    const players = accounts.filter(a => !a.admin);
    const teams = {};
    for (const a of players)
        teams[a.teamId ?? "unassigned"] = (teams[a.teamId ?? "unassigned"] ?? 0) + a.balance;
    return { playerCount: players.length, circulating: players.reduce((n, a) => n + a.balance, 0), opening: players.reduce((n, a) => n + a.openingBalance, 0),
        generatedTime: players.reduce((n, a) => n + a.generatedTime, 0), generatedMissions: players.reduce((n, a) => n + a.generatedMissions, 0), spentShop: players.reduce((n, a) => n + a.spentShop, 0), teams };
}
//# sourceMappingURL=domain.js.map
export function postCash(a,delta,at,operation,reference){
 if(!Number.isSafeInteger(delta)||a.balance+delta<0||a.balance+delta>2147483647)throw Error("Saldo insuficiente o importe fuera de rango.");
 return post(a,delta<0?"cash_withdraw":delta>0?"cash_deposit":"cash_exchange",delta,at,operation,{reference});
}
