import {registerPersonalHud} from './personal-hud.js';
import {createCajeroBank} from './cajero-bank.js';
import './mob-hit-guard.js';
import {registerJavaCombat} from './java-combat.js';
import {canAccess,teamFor} from './core.js';
import {inSanctuary} from './sanctuary.js';
import './heart-death.js';
import './spawn-polish-bootstrap.js';
import './beta-feedback-bootstrap.js';
import './insurance-preview.js';
import {registerApagavelasSafety} from './apagavelas-safety-bridge.js';
import {registerThermalSafety} from './thermal-safety-bridge.js';
import { world, system, Player, GameMode, CommandPermissionLevel } from "@minecraft/server";
import { initializeWarcoinSidebar, updateWarcoinSidebar, pendingWarcoinChange, forgetWarcoinSidebar, pruneWarcoinSidebar } from './warcoins-sidebar.js';
import { CONFIG, ADMIN_NAMES, newPlayer, count, creditTime } from "./core.js";
import { registerCommands } from "./commands.js";
import { registerSecurity } from "./security.js";
import { createWarland3 } from "./warland3/runtime.js";
import { createInventoryMenu } from './inventory-menu.js';
import { registerTeamChat } from './team-chat.js';
import { registerLobbyProtection } from './lobby-protection.js';
import { registerPlayerPresentation } from './player-presentation.js';
import { registerTotemAnnouncements } from './totem-announcement.js';
import { registerPolishItems } from './polish-items.js';
const records = new Map();
const teams = [];
const sessions = new Map();
let ready = false;
let activatedAt = 0;
let nextId = 0;
const teamChatAvailable = registerTeamChat(teams, () => ready);
registerLobbyProtection();
registerPlayerPresentation(teams, () => ready);
registerTotemAnnouncements();
registerPolishItems();
const isAdmin = (p) => ADMIN_NAMES.includes(p.name.toLowerCase());
const persistPlayer = (p) => world.setDynamicProperty(`warland:p_${p.id}`, JSON.stringify(p));
const persistTeam = (t) => world.setDynamicProperty(`warland:t_${t.id}`, JSON.stringify(t));
const warn = (message) => console.warn(`[WARLAND] ${message}`);
function audit(action, player, detail) { console.warn(`[WARLAND_AUDIT] ${JSON.stringify({ at: Date.now(), action, player, detail })}`); }
function message(p, text) { try {
    p.sendMessage(`§6WARLAND §r${text}`);
}
catch { } }
const warland3 = createWarland3({ ready: () => ready, recordFor, records, teams, persistPlayer, message, audit });
registerPersonalHud(p=>{if(!ready)return;const id=p.getDynamicProperty('warland:player_id');return typeof id==='string'?warland3.repo.get(id):undefined;});
const cajeroBank=createCajeroBank({ready:()=>ready,recordFor,persistPlayer,message,w3:warland3});
const inventoryMenu = createInventoryMenu({ ready: () => ready, recordFor, records, teams, w3: warland3, message, teamChatAvailable });
function recordFor(p) {
    let id = p.getDynamicProperty("warland:player_id");
    if (!id) {
        id = String(++nextId);
        world.setDynamicProperty("warland:next_id", nextId);
        p.setDynamicProperty("warland:player_id", id);
    }
    let record = records.get(id);
    if (!record) {
        record = newPlayer(id, p.name, Date.now());
        records.set(id, record);
    }
    record.name = p.name;
    return record;
}
function account(p, now = Date.now()) {
    const session = sessions.get(p.id);
    if (!session)
        return;
    // Un PC suspendido no genera saldo. Los intervalos normales conservan milisegundos.
    const start = Math.max(session.last, now - 10000), survival = p.getGameMode() === GameMode.Survival;
    creditTime(session.record, start, now, survival, false);
    const earned = warland3.sync(p, survival ? Math.max(0, now - start) : 0, now);
    session.last = now;
    if (earned)
        message(p, `§e+${earned} WC por tiempo · Saldo: ${session.record.coins}.`);
    persistPlayer(session.record);
}
function join(p) {
    if (sessions.has(p.id))
        return;
    const r = recordFor(p);
    count(r, "joins", 1, Date.now());
    r.lastSeen = Date.now();
    warland3.ensure(p);
    updateWarcoinSidebar(r);
    warland3.health.restore(p, true);
    inventoryMenu.giveItems(p);
    p.onScreenDisplay.setActionBar('');
    sessions.set(p.id, { record: r, last: Date.now() });
    if (isAdmin(p)) {
        p.commandPermissionLevel = CommandPermissionLevel.Admin;
        if (!r.adminInitialized) {
            p.setGameMode(GameMode.Creative);
            r.adminInitialized = true;
            message(p, "Primera entrada: creativo. Después se guarda tu modo.");
        }
    }
    persistPlayer(r);
    message(p, "§aBienvenido. §rAdministración: /warland:menu · 1 WC/30 min.");
    audit("join", p.name, isAdmin(p) ? "admin" : "player");
}
function exportData() {
    warland3.exportEconomy();
    console.warn(`[WARLAND_EXPORT] ${JSON.stringify({ kind: "meta", schema: 1, at: Date.now(), activatedAt, config: CONFIG, teams })}`);
    for (const p of records.values())
        console.warn(`[WARLAND_EXPORT] ${JSON.stringify({ kind: "player", schema: 1, at: Date.now(), player: p })}`);
    console.warn(`[WARLAND_EXPORT] ${JSON.stringify({ kind: "end", schema: 1, at: Date.now(), count: records.size })}`);
}
function rules() {
    world.gameRules.doFireTick = false;
    world.gameRules.mobGriefing = false;
    world.gameRules.tntExplodes = true;
    world.gameRules.respawnBlocksExplode = true;
    world.gameRules.showCoordinates = true;
}
world.afterEvents.worldLoad.subscribe(() => {
    try {
        for (const key of world.getDynamicPropertyIds()) {
            if (key.startsWith("warland:p_")) {
                const r = JSON.parse(world.getDynamicProperty(key));
                records.set(r.id, r);
            }
            if (key.startsWith("warland:t_")) {
                const t = JSON.parse(world.getDynamicProperty(key));
                if (t.members.length)
                    teams.push(t);
            }
        }
        nextId = Number(world.getDynamicProperty("warland:next_id") ?? 0);
        activatedAt = Number(world.getDynamicProperty("warland:activated_at") ?? Date.now());
        world.setDynamicProperty("warland:activated_at", activatedAt);
        rules();
        warland3.initialize();
        initializeWarcoinSidebar([...records.values()].map(r => ({ ...r, coins: warland3.repo.get(r.id).balance })));
        ready = true;
        for (const p of world.getAllPlayers())
            join(p);
        exportData();
        warn("Core 0.4.2 cargado; menú de inventario, misiones, economía, corazones persistentes y territorios activos.");
    }
    catch (e) {
        warn(`ERROR DE INICIALIZACIÓN: ${String(e)}`);
    }
});
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => { if (initialSpawn)
    system.run(() => { if (ready)
        join(player); }); });
world.beforeEvents.playerLeave.subscribe(({ player }) => {
    const session = sessions.get(player.id);
    if (!session)
        return;
    const now = Date.now();
    const survival = player.getGameMode() === GameMode.Survival;
    const start = Math.max(session.last, now - 10000);
    creditTime(session.record, start, now, survival, false);
    const externalDelta = pendingWarcoinChange(session.record);
    sessions.delete(player.id);
    // La identidad, la ubicación y el modo ya no son accesibles tras abandonar.
    system.run(() => { warland3.importScoreboard(session.record, externalDelta); warland3.finishSession(session.record, now, survival ? Math.max(0, now - start) : 0); persistPlayer(session.record); forgetWarcoinSidebar(session.record.id); exportData(); });
});
system.runInterval(() => {
    if (!ready)
        return;
    pruneWarcoinSidebar();
    for (const p of world.getAllPlayers()) {
        try {
            if (!sessions.has(p.id))
                join(p);
            account(p);
            const r = sessions.get(p.id).record;
            updateWarcoinSidebar(r);
        }
        catch (e) {
            warn(`Error de jugador: ${String(e)}`);
        }
    }
}, 20);
system.runInterval(() => { if (ready) {
    rules();
    exportData();
} }, 1200);
registerSecurity({ teams, ready: () => ready, isAdmin });
registerJavaCombat({ready:()=>ready,sameTeam:(a,b)=>{const t=teamFor(teams,a.getDynamicProperty('warland:player_id'));return !!t&&t.members.includes(b.getDynamicProperty('warland:player_id'));},canAttack:(a,b)=>!inSanctuary(b.dimension.id,b.location)&&canAccess(teams,a.getDynamicProperty('warland:player_id'),b.dimension.id,b.location.x,b.location.z,0)});
world.afterEvents.playerBreakBlock.subscribe(e => {
    if (ready && e.player.getGameMode() === GameMode.Survival) {
        const r = recordFor(e.player);
        count(r, "broken", 1, Date.now());
        persistPlayer(r);
    }
});
world.afterEvents.playerPlaceBlock.subscribe(e => {
    if (ready && e.player.getGameMode() === GameMode.Survival) {
        const r = recordFor(e.player);
        count(r, "placed", 1, Date.now());
        persistPlayer(r);
    }
});
world.afterEvents.entityDie.subscribe(e => {
    if (!ready)
        return;
    if (e.deadEntity instanceof Player) {
        const r = recordFor(e.deadEntity);
        count(r, "deaths", 1, Date.now());
        persistPlayer(r);
    }
    const killer = e.damageSource.damagingEntity;
    if (killer instanceof Player && killer.id !== e.deadEntity.id && killer.getGameMode() === GameMode.Survival) {
        const r = recordFor(killer);
        count(r, e.deadEntity instanceof Player ? "kills" : "mobs", 1, Date.now());
        persistPlayer(r);
    }
});
registerCommands({ teams, records, recordFor, persistTeam, message, audit, ready: () => ready, exportData: () => { for (const p of world.getAllPlayers())
        account(p); exportData(); } });
system.runInterval(() => { if (ready)
    for (const p of world.getAllPlayers())
        try {
            warland3.ensure(p);
        }
        catch (e) {
            warn(String(e));
        } }, 1);
//# sourceMappingURL=main.js.map
registerThermalSafety(teams,()=>ready,6);
registerApagavelasSafety(teams,()=>ready);
