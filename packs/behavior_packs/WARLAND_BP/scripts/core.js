import { claimTouchesSanctuary } from './sanctuary.js';
export const CONFIG = { coinsEveryMs: 30 * 60 * 1000, chunksPerMember: 4, bufferBlocks: 16, maxMembers: 10 };
export const ADMIN_NAMES = ["danielgamersc", "hatsudemiku"];
export const emptyCounters = () => ({ playMs: 0, survivalMs: 0, earned: 0, deaths: 0, kills: 0, mobs: 0, broken: 0, placed: 0, joins: 0 });
export function newPlayer(id, name, now) {
    return { ...emptyCounters(), id, name, coins: 0, firstSeen: now, lastSeen: now, adminInitialized: false, days: {} };
}
export const dayKey = (ms) => new Date(ms - 5 * 3600000).toISOString().slice(0, 10);
export function count(p, key, amount, now) {
    p[key] += amount;
    const d = p.days[dayKey(now)] ??= emptyCounters();
    d[key] += amount;
}
// Divide el intervalo a medianoche de Colombia y conserva fracciones entre sesiones.
export function creditTime(p, start, end, survival, mint = true) {
    if (end <= start)
        return 0;
    let rewarded = 0;
    while (start < end) {
        const nextDay = (Math.floor((start - 5 * 3600000) / 86400000) + 1) * 86400000 + 5 * 3600000;
        const to = Math.min(end, nextDay);
        const before = Math.floor(p.playMs / CONFIG.coinsEveryMs);
        count(p, "playMs", to - start, start);
        if (survival)
            count(p, "survivalMs", to - start, start);
        const earned = Math.floor(p.playMs / CONFIG.coinsEveryMs) - before;
        if (earned && mint) {
            count(p, "earned", earned, start);
            p.coins += earned;
            rewarded += earned;
        }
        start = to;
    }
    p.lastSeen = end;
    return rewarded;
}
export const chunkAt = (dimension, x, z) => ({ dimension, x: Math.floor(x / 16), z: Math.floor(z / 16) });
export const sameChunk = (a, b) => a.dimension === b.dimension && a.x === b.x && a.z === b.z;
export const teamFor = (teams, id) => teams.find(t => t.members.includes(id));
export function zoneAt(teams, dimension, x, z, buffer = 0) {
    return teams.find(t => t.claims.some(c => c.dimension === dimension && x >= c.x * 16 - buffer && x < c.x * 16 + 16 + buffer && z >= c.z * 16 - buffer && z < c.z * 16 + 16 + buffer));
}
export function canAccess(teams, id, dimension, x, z, buffer = 0) {
    // Comprobar todos los márgenes que se solapan evita eludir un permiso por orden de equipos.
    return !teams.some(t => !t.members.includes(id) && t.claims.some(c => c.dimension === dimension && x >= c.x * 16 - buffer && x < c.x * 16 + 16 + buffer && z >= c.z * 16 - buffer && z < c.z * 16 + 16 + buffer));
}
export function validateClaim(teams, team, claim) {
    if (claimTouchesSanctuary(claim, CONFIG.bufferBlocks))
        throw new Error('El santuario y sus alrededores no se pueden reclamar.');
    if (!Number.isInteger(claim.x) || !Number.isInteger(claim.z))
        throw new Error("Coordenadas de parcela inválidas.");
    if (team.claims.some(c => sameChunk(c, claim)))
        throw new Error("Esta parcela ya pertenece a tu equipo.");
    if (team.claims.length >= team.members.length * CONFIG.chunksPerMember)
        throw new Error("Tu equipo agotó su superficie. Cada miembro aporta 4 parcelas.");
    for (const other of teams) {
        if (other.id === team.id)
            continue;
        if (other.claims.some(c => c.dimension === claim.dimension && Math.abs(c.x - claim.x) <= 1 && Math.abs(c.z - claim.z) <= 1))
            throw new Error("Terreno ocupado o demasiado cerca de otro equipo. Deja 16 bloques de separación.");
    }
}
export function claimLand(teams, team, claim) {
    validateClaim(teams, team, claim);
    team.claims.push({ ...claim });
}
export function leaveTeam(team, id) {
    const excess = team.claims.length - (team.members.length - 1) * CONFIG.chunksPerMember;
    if (excess > 0)
        throw new Error(`Antes de salir deben liberar ${excess} parcela${excess === 1 ? '' : 's'} (${excess * 256} bloques²). Abre Equipos y terrenos → Liberar parcelas. Puedes liberar las que aportaste; el líder puede liberar las demás. No se borrarán construcciones.`);
    team.members = team.members.filter(m => m !== id);
    if (team.owner === id)
        team.owner = team.members[0] ?? "";
}
export const canReleaseClaim = (team, id, claim) => team.owner === id || claim.contributor === id;
export function releaseClaim(team, id, claim) {
    if (!team.members.includes(id))
        throw Error('Ya no perteneces a este equipo.');
    const index = team.claims.findIndex(c => sameChunk(c, claim));
    if (index < 0)
        throw Error('Esta parcela ya no pertenece a tu equipo.');
    const current = team.claims[index];
    if (!canReleaseClaim(team, id, current))
        throw Error('Solo quien aportó esta parcela o el líder puede liberarla. Las parcelas antiguas sin autor registrado las gestiona el líder.');
    team.claims.splice(index, 1);
    return current;
}
export function acceptInvite(teams, team, id, now) {
    if (teamFor(teams, id))
        throw new Error("Ya perteneces a un equipo. Sal de él primero.");
    if (!team.invites[id] || team.invites[id] < now)
        throw new Error("No tienes una invitación vigente.");
    if (team.members.length >= CONFIG.maxMembers)
        throw new Error("El equipo alcanzó el máximo de miembros.");
    team.members.push(id);
    delete team.invites[id];
}
//# sourceMappingURL=core.js.map