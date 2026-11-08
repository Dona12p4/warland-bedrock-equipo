import { world, system, Player, GameMode, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from '@minecraft/server';
import { ADMIN_NAMES, teamFor, count } from '../core.js';
import { SeasonRepository } from './repository.js';
import { bedrockSeasonStore } from './bedrock-store.js';
import { newSeason, startSeason, activateFirstMandate, phaseAt, seasonDay, localDay, createAccount, recordOpening, creditConnectedTime, assignDailyMissions, advanceMission, rewardCompletedMissions, purchase, W3 } from './domain.js';
import { registerReflectedPvp } from './pvp.js';
import { registerPlayerHealth } from './health.js';
import { registerAction, performAction } from '../actions.js';
import { isBeta, freeBetaShop } from '../beta-policy.js';
import { creditBeta, adjustBetaBalance } from './domain.js';
import { updateWarcoinSidebar, pendingWarcoinChange } from '../warcoins-sidebar.js';
import { createInventoryInsurance } from './insurance.js';
const tiers = ['easy', 'medium', 'hard'];
const aliases = { facil: 'easy', media: 'medium', dificil: 'hard' };
const labels = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };
const hostile = new Set(['zombie', 'husk', 'drowned', 'skeleton', 'stray', 'bogged', 'wither_skeleton', 'creeper', 'spider', 'cave_spider', 'witch', 'slime', 'magma_cube', 'blaze', 'ghast', 'piglin_brute', 'hoglin', 'zoglin', 'pillager', 'vindicator', 'evoker', 'ravager', 'phantom', 'silverfish', 'endermite', 'guardian', 'elder_guardian', 'breeze', 'warden'].map(s => 'minecraft:' + s));
export function createWarland3(ctx) {
    const repo = new SeasonRepository(bedrockSeasonStore);
    let season = newSeason();
    function importScoreboard(r, delta = pendingWarcoinChange(r)) {
        if (!delta || !isBeta() || !repo.get(r.id))
            return;
        const a = repo.get(r.id);
        const bounded = Math.max(0, Math.min(2147483647, a.balance + delta)) - a.balance;
        if (bounded) {
            repo.mutate(r.id, d => adjustBetaBalance(d, bounded, Date.now()));
            ctx.audit('beta_scoreboard', r.name, JSON.stringify({ delta: bounded }));
        }
        r.coins = repo.get(r.id).balance;
        ctx.persistPlayer(r);
        updateWarcoinSidebar(r);
    }
    function publishDay() { const o = world.scoreboard.getObjective('wl_season') ?? world.scoreboard.addObjective('wl_season', 'WARLAND season'); o.setScore('day', Math.min(30, Math.max(0, seasonDay(season, Date.now())))); }
    function saveSeason() { world.setDynamicProperty(isBeta() ? 'warland:beta_season' : 'warland3:season', JSON.stringify(season)); publishDay(); }
    system.runInterval(() => { if (ctx.ready())
        publishDay(); }, 200);
    function ensure(p) {
        const r = ctx.recordFor(p);
        let a = repo.get(r.id);
        if (!a) {
            a = createAccount(r.id, p.name, ADMIN_NAMES.includes(p.name.toLowerCase()), r.coins, teamFor(ctx.teams, r.id)?.id ?? null);
            a.playMs = Math.floor(r.playMs);
            recordOpening(a, Date.now());
            repo.saveInitial(a);
        }
        importScoreboard(r);
        a = repo.get(r.id);
        r.coins = a.balance;
        r.playMs = Math.max(r.playMs, a.playMs);
        return r;
    }
    function definitions(at) {
        const week = Math.min(4, Math.max(1, Math.ceil(seasonDay(season, at) / 7)));
        return { easy: { id: 'survival_time', target: 600000 }, medium: { id: 'hostile_kills', target: 8 + 4 * (week - 1) }, hard: { id: 'explore_chunks', target: 16 + 8 * (week - 1) } };
    }
    function prepare(a, p, at) {
        a.name = p.name;
        a.admin = ADMIN_NAMES.includes(p.name.toLowerCase());
        a.teamId = teamFor(ctx.teams, a.id)?.id ?? null;
        assignDailyMissions(a, at, definitions(at));
    }
    function announceRewards(p, r, rewards, at) {
        r.coins = repo.get(r.id).balance;
        if (!rewards.length)
            return;
        count(r, 'earned', rewards.reduce((sum, reward) => sum + reward.transaction.delta, 0), at);
        ctx.persistPlayer(r);
        updateWarcoinSidebar(r);
        for (const { tier, transaction } of rewards)
            ctx.message(p, `§aMisión ${labels[tier]}: +${transaction.delta} WC · Saldo: ${r.coins}.`);
    }
    function sync(p, survivalMs = 0, at = Date.now()) {
        const r = ensure(p);
        const result = repo.mutate(r.id, a => {
            prepare(a, p, at);
            const tx = creditConnectedTime(a, Math.floor(r.playMs), at);
            if (p.getGameMode() === GameMode.Survival) {
                advanceMission(a, at, 'easy', 'survival_time', Math.floor(survivalMs));
                const date = localDay(at), key = `${p.dimension.id}:${Math.floor(p.location.x / 16)}:${Math.floor(p.location.z / 16)}`;
                const mission = a.days[date].hard;
                const seen = (a.explored ??= {})[date] ??= [];
                if (seen.length < mission.target && !seen.includes(key)) {
                    seen.push(key);
                    advanceMission(a, at, 'hard', 'explore_chunks', 1);
                }
            }
            return { time: tx?.delta ?? 0, rewards: rewardCompletedMissions(a, at) };
        });
        if (result.time)
            count(r, 'earned', result.time, at);
        announceRewards(p, r, result.rewards, at);
        return result.time;
    }
    function initialize() {
        repo.recover();
        const raw = (isBeta() ? world.getDynamicProperty('warland:beta_season') : undefined) ?? world.getDynamicProperty('warland3:season');
        if (typeof raw === 'string')
            season = JSON.parse(raw);
        publishDay();
        for (const r of ctx.records.values())
            if (!repo.get(r.id)) {
                const a = createAccount(r.id, r.name, ADMIN_NAMES.includes(r.name.toLowerCase()), r.coins, teamFor(ctx.teams, r.id)?.id ?? null);
                a.playMs = Math.floor(r.playMs);
                recordOpening(a, Date.now());
                repo.saveInitial(a);
            }
    }
    function finishSession(r, at, survivalMs = 0) {
        const earned = repo.mutate(r.id, a => {
            assignDailyMissions(a, at, definitions(at));
            advanceMission(a, at, 'easy', 'survival_time', Math.floor(survivalMs));
            const tx = creditConnectedTime(a, Math.floor(r.playMs), at);
            return (tx?.delta ?? 0) + rewardCompletedMissions(a, at).reduce((sum, reward) => sum + reward.transaction.delta, 0);
        });
        r.coins = repo.get(r.id).balance;
        if (earned)
            count(r, 'earned', earned, at);
    }
    function exportEconomy() {
        const accounts = repo.allAccounts().map(a => ({ ...a, teamId: teamFor(ctx.teams, a.id)?.id ?? null }));
        console.warn('[WARLAND_ECONOMY] ' + JSON.stringify({ schema: 1, kind: 'begin', at: Date.now(), season, prices: { insurance: W3.insurancePrice, heart: W3.heartPrice } }));
        for (const a of accounts)
            console.warn('[WARLAND_ECONOMY] ' + JSON.stringify({ schema: 1, kind: 'account', account: a }));
        const ledger = repo.ledger();
        for (const tx of ledger)
            console.warn('[WARLAND_ECONOMY] ' + JSON.stringify({ schema: 1, kind: 'transaction', transaction: tx }));
        console.warn('[WARLAND_ECONOMY] ' + JSON.stringify({ schema: 1, kind: 'end', accounts: accounts.length, transactions: ledger.length }));
    }
    registerReflectedPvp(() => ctx.ready());
    const insurance = createInventoryInsurance({ ready: ctx.ready, ensure, repo, message: ctx.message, audit: ctx.audit });
    const health = registerPlayerHealth({ ready: ctx.ready, ensure, repo, season: () => season, message: ctx.message, audit: ctx.audit, onDeath: insurance.died });
    world.afterEvents.entityDie.subscribe(e => {
        if (!ctx.ready() || !hostile.has(e.deadEntity.typeId))
            return;
        let p = e.damageSource.damagingEntity;
        if (!(p instanceof Player))
            p = e.damageSource.damagingProjectile?.getComponent('minecraft:projectile')?.owner;
        if (!(p instanceof Player) || p.getGameMode() !== GameMode.Survival)
            return;
        const player = p, r = ensure(player), at = Date.now();
        const rewards = repo.mutate(r.id, a => { prepare(a, player, at); advanceMission(a, at, 'medium', 'hostile_kills', 1); return rewardCompletedMissions(a, at); });
        announceRewards(player, r, rewards, at);
    });
    system.beforeEvents.startup.subscribe(({ customCommandRegistry: registry }) => {
        const command = (name, description, fn, param) => {
            registerAction(name, (p, arg) => { if (!ctx.ready())
                throw Error('WARLAND está iniciando.'); ensure(p); fn(p, arg); });
            registry.registerCommand({ name: 'warland:' + name, description, permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false, ...(param ? { mandatoryParameters: [{ name: param, type: CustomCommandParamType.String }] } : {}) }, (origin, arg) => {
                if (!(origin.sourceEntity instanceof Player))
                    return { status: CustomCommandStatus.Failure, message: 'Requiere un jugador.' };
                const p = origin.sourceEntity;
                system.run(() => { try {
                    performAction(name, p, arg);
                }
                catch (e) {
                    ctx.message(p, '§c' + (e instanceof Error ? e.message : String(e)));
                } });
                return { status: CustomCommandStatus.Success };
            });
        };
        command('misiones', 'Ver las tres misiones diarias', p => {
            sync(p);
            const a = repo.get(ctx.recordFor(p).id), today = a.days[localDay(Date.now())];
            const descriptions = { easy: 'Minutos', medium: 'Enemigos', hard: 'Chunks nuevos' };
            ctx.message(p, '§eMisiones · Colombia · Solo survival\n' + tiers.map(t => { const m = today[t]; const divisor = t === 'easy' ? 60000 : 1; return `${labels[t]}: ${descriptions[t]} ${Math.floor(m.progress / divisor)}/${m.target / divisor} · ${W3.missionRewards[t]} WC${m.paid ? ' · Pagada' : ''}`; }).join('\n') + '\nPago automático · Hasta 6 WC/día + monedas por tiempo.');
        });
        // Compatibilidad con el comando antiguo: informa del estado, sin crear otro pago.
        command('cobrar', 'Consultar recompensa automática de una misión', (p, arg) => {
            const tier = aliases[arg ?? ''];
            if (!tier)
                throw Error('Usa facil, media o dificil.');
            sync(p);
            const r = ctx.recordFor(p);
            const m = repo.get(r.id).days[localDay(Date.now())]?.[tier];
            ctx.message(p, m?.paid ? `Misión ${labels[tier]} ya pagada · Saldo: ${r.coins} WC.` : 'En progreso. Pago automático al completar.');
        }, 'dificultad');
        command('temporada', 'Ver estado de WARLAND 3', p => ctx.message(p, season.startedAt === null ? 'Temporada en preparación · 30 días sin iniciar.' : `Día ${seasonDay(season, Date.now())}/30 · ${phaseAt(season, Date.now())}. Primer Mandato: ${season.firstMandateAt === null ? 'pendiente' : 'activo'}.`));
        command('vida', 'Consultar corazones máximos y regla de muerte', p => ctx.message(p, `Vida máxima: ${repo.get(ctx.recordFor(p).id).maximumHealth / 2} corazones. ${season.firstMandateAt === null ? 'Sin pérdida hasta el Primer Mandato.' : '−1 corazón al morir. Mínimo: ½.'}`));
        command('corazon', 'Beta: recuperar un corazón por 100 Warcoins', p => {
            if (world.getDynamicProperty('warland:beta') !== true)
                throw Error('Compra en validación en la beta.');
            const r = ctx.recordFor(p);
            repo.mutate(r.id, a => purchase(a, 'heart', Date.now(), 'heart:' + String(a.sequence + 1), freeBetaShop() ? 0 : undefined));
            r.coins = repo.get(r.id).balance;
            ctx.persistPlayer(r);
            updateWarcoinSidebar(r);
            health.restore(p, true, 2);
            ctx.message(p, `+1 corazón · ${freeBetaShop() ? "Gratis en beta" : "−" + W3.heartPrice + " WC"} · Saldo: ${r.coins}.`);
        });
        command('seguro', 'Seguro individual · 40 WC', p => {
            insurance.activate(p, freeBetaShop());
            const r = ctx.recordFor(p);
            r.coins = repo.get(r.id).balance;
            ctx.persistPlayer(r);
            updateWarcoinSidebar(r);
        });
        command('seguroprueba', 'Admin: seguro gratuito de validación', p => {
            if (!ADMIN_NAMES.includes(p.name.toLowerCase()) || world.getDynamicProperty('warland:insurance_preview') !== true)
                throw Error('Solo administradores en la copia de prueba.');
            insurance.activate(p, true);
        });
        // Estas acciones requieren dos condiciones: mundo beta y administrador autenticado.
        command('betaprueba', 'Admin: controles del mundo beta', (p, arg) => {
            if (world.getDynamicProperty('warland:beta') !== true || !ADMIN_NAMES.includes(p.name.toLowerCase()))
                throw Error('Solo administradores dentro de la beta.');
            const r = ctx.recordFor(p);
            if (arg === 'mandato_on' || arg === 'mandato_off') {
                if (arg === 'mandato_on') {
                    season.startedAt = Date.now() - 6 * 86400000;
                    season.firstMandateAt = Date.now();
                }
                else
                    season.firstMandateAt = null;
                saveSeason();
            }
            else if (/^semana[1-4]$/.test(arg ?? '')) {
                const week = Number(arg.slice(-1));
                season = { schema: 1, startedAt: Date.now() - (week - 1) * 7 * 86400000, firstMandateAt: week >= 2 ? Date.now() : null };
                saveSeason();
                ctx.message(p, `Semana ${week} de prueba. Misiones y Mandato disponibles; eventos y contenido semanal aún pendientes.`);
            }
            else if (arg === 'preparacion') {
                season = newSeason();
                saveSeason();
            }
            else if (arg === 'vida20' || arg === 'vida1') {
                repo.mutate(r.id, a => { a.maximumHealth = arg === 'vida20' ? 20 : 1; });
                health.restore(p, false);
            }
            else if (arg === 'morir')
                p.runCommand('kill @s');
            else if (arg === 'monedas') {
                repo.mutate(r.id, a => creditBeta(a, 500, Date.now()));
                r.coins = repo.get(r.id).balance;
                ctx.persistPlayer(r);
                updateWarcoinSidebar(r);
            }
            else
                throw Error('Prueba inválida.');
            ctx.audit('beta_test', p.name, String(arg));
            ctx.message(p, 'Prueba aplicada en esta beta.');
        }, 'accion');
        command('iniciartemporada', 'Admin: comenzar los 30 días', (p, arg) => {
            if (!ADMIN_NAMES.includes(p.name.toLowerCase()))
                throw Error('Solo administradores autorizados.');
            if (arg !== 'CONFIRMAR')
                throw Error('Usa /warland:iniciartemporada CONFIRMAR.');
            startSeason(season, Date.now());
            saveSeason();
            ctx.audit('season_start', p.name, JSON.stringify(season));
            for (const q of world.getAllPlayers())
                ctx.message(q, '§6Comienza WARLAND 3. Día 1 de 30.');
        }, 'confirmacion');
        command('primermandato', 'Admin: activar la pérdida de corazones', (p, arg) => {
            if (!ADMIN_NAMES.includes(p.name.toLowerCase()))
                throw Error('Solo administradores autorizados.');
            if (arg !== 'CONFIRMAR')
                throw Error('Usa /warland:primermandato CONFIRMAR.');
            if (season.firstMandateAt !== null)
                throw Error('El Primer Mandato ya está activo.');
            activateFirstMandate(season, Date.now());
            saveSeason();
            ctx.audit('first_mandate', p.name, JSON.stringify(season));
            for (const q of world.getAllPlayers())
                ctx.message(q, '§cPrimer Mandato: cada muerte resta un corazón. Mínimo: medio corazón.');
        }, 'confirmacion');
    });
    return { ensure, sync, importScoreboard, initialize, finishSession, exportEconomy, repo, health, insurance, getSeason: () => season };
}
//# sourceMappingURL=runtime.js.map