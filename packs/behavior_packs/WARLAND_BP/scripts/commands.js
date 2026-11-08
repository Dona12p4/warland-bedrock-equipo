import { world, system, Player, GameMode, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server";
import { CONFIG, ADMIN_NAMES, teamFor, chunkAt, sameChunk, leaveTeam, releaseClaim, acceptInvite } from "./core.js";
import { registerAction, performAction } from './actions.js';
import { validateTeamName, teamNameKey } from './team-style.js';
import { createTerritorySelector } from './territory-selector.js';
export function registerCommands(ctx) {
    const selector = createTerritorySelector(ctx);
    const { teams, records, recordFor, persistTeam, message, audit } = ctx;
    function ownTeam(p) { const t = teamFor(teams, recordFor(p).id); if (!t)
        throw new Error("Crea un equipo con /warland:crear Nombre o acepta una invitación."); return t; }
    function leader(p) { const t = ownTeam(p); if (t.owner !== recordFor(p).id)
        throw new Error("Solo el líder puede hacer esto."); return t; }
    system.beforeEvents.startup.subscribe(({ customCommandRegistry: registry }) => {
        const register = (name, description, action, param) => {
            registerAction(name, (p, arg) => { if (!ctx.ready())
                throw Error('WARLAND está iniciando.'); action(p, arg); });
            registry.registerCommand({ name: `warland:${name}`, description, permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false,
                ...(param ? { mandatoryParameters: [{ name: param, type: CustomCommandParamType.String }] } : {}) }, (origin, arg) => {
                if (!(origin.sourceEntity instanceof Player))
                    return { status: CustomCommandStatus.Failure, message: "Este comando requiere un jugador." };
                const p = origin.sourceEntity;
                system.run(() => { try {
                    performAction(name, p, arg);
                }
                catch (e) {
                    message(p, `§c${e instanceof Error ? e.message : String(e)}`);
                } });
                return { status: CustomCommandStatus.Success };
            });
        };
        register("ayuda", "Ver comandos de WARLAND", p => message(p, "Menú: /warland:menu\n/warland:stats · /warland:misiones · /warland:temporada\nEquipo: /warland:equipo · /warland:crear Nombre · /warland:invitar Gamertag · /warland:aceptar Equipo\nTerrenos: /warland:reclamar · /warland:liberar · /warland:salir"));
        register("stats", "Ver estadísticas y Warcoins", p => {
            const r = recordFor(p);
            message(p, `${r.coins} Warcoins · ${Math.floor(r.playMs / 60000)} min · Próxima moneda: ${Math.ceil((CONFIG.coinsEveryMs - r.playMs % CONFIG.coinsEveryMs) / 60000)} min.\nMuertes: ${r.deaths} · Bajas: ${r.kills} · Mobs: ${r.mobs}\nBloques survival: ${r.broken} rotos / ${r.placed} colocados.`);
        });
        register("modo", "Administradores: creativo o survival", (p, mode) => {
            if (!ADMIN_NAMES.includes(p.name.toLowerCase()))
                throw new Error("Solo administradores autorizados.");
            if (mode !== "creativo" && mode !== "survival")
                throw new Error("Usa /warland:modo creativo|survival.");
            p.setGameMode(mode === "creativo" ? GameMode.Creative : GameMode.Survival);
            message(p, `Modo: ${mode}.`);
            audit("gamemode", p.name, mode);
        }, "modo");
        register("crear", "Crear equipo, incluso personal", (p, name) => {
            const r = recordFor(p);
            if (teamFor(teams, r.id))
                throw new Error("Ya tienes equipo.");
            name = validateTeamName(name);
            if (teams.some(t => teamNameKey(t.name) === teamNameKey(name)))
                throw new Error("Ese nombre ya existe.");
            const t = { id: `${Date.now()}_${r.id}`, name, owner: r.id, members: [r.id], claims: [], invites: {} };
            teams.push(t);
            persistTeam(t);
            audit("team_create", p.name, name);
            message(p, `Equipo ${name}§r creado.`);
        }, "nombre");
        register("invitar", "Invitar a jugador conectado", (p, name) => {
            const t = leader(p);
            const target = world.getAllPlayers().find(q => q.name.toLowerCase() === name?.toLowerCase());
            if (!target)
                throw new Error("Jugador sin conexión.");
            const r = recordFor(target);
            if (teamFor(teams, r.id))
                throw new Error("Ese jugador ya tiene equipo.");
            t.invites[r.id] = Date.now() + 10 * 60000;
            persistTeam(t);
            message(target, `${p.name} te invita a ${t.name}§r (10 min). Acepta en Administración > Equipos.`);
            message(p, "Invitación enviada.");
        }, "jugador");
        register("aceptar", "Aceptar invitación", (p, name) => {
            const t = teams.find(t => teamNameKey(t.name) === teamNameKey(name ?? ''));
            if (!t)
                throw new Error("Equipo inexistente.");
            acceptInvite(teams, t, recordFor(p).id, Date.now());
            persistTeam(t);
            audit("team_join", p.name, t.name);
            message(p, `Te uniste a ${t.name}§r. Acceso a sus terrenos activo.`);
        }, "equipo");
        register("salir", "Salir sin dejar terrenos sin cupo", p => {
            const t = ownTeam(p);
            leaveTeam(t, recordFor(p).id);
            persistTeam(t);
            if (!t.members.length)
                teams.splice(teams.indexOf(t), 1);
            audit("team_leave", p.name, t.name);
            message(p, "Saliste del equipo.");
        });
        register('disolver', 'Disolver tu equipo; admins pueden elegir cualquiera', (p, name) => {
            const t = teams.find(t => t.id === name || teamNameKey(t.name) === teamNameKey(name ?? ''));
            if (!t)
                throw Error('Equipo inexistente.');
            if (t.owner !== recordFor(p).id && !ADMIN_NAMES.includes(p.name.toLowerCase()))
                throw Error('Solo el líder o un administrador puede disolverlo.');
            const detail = JSON.stringify({ id: t.id, name: t.name, members: [...t.members], claims: [...t.claims] });
            const members = new Set(t.members);
            t.members = [];
            t.claims = [];
            t.invites = {};
            persistTeam(t);
            teams.splice(teams.indexOf(t), 1);
            audit('team_dissolve', p.name, detail);
            for (const q of world.getAllPlayers())
                if (members.has(recordFor(q).id) || q.id === p.id)
                    message(q, `Equipo ${t.name}§r disuelto. Sus terrenos quedan libres; las construcciones se conservan.`);
        }, 'equipo');
        register("equipo", "Ver miembros y parcelas", p => {
            const t = ownTeam(p);
            message(p, `${t.name}: ${t.members.map(id => records.get(id)?.name ?? id).join(", ")}\nParcelas: ${t.claims.length}/${t.members.length * CONFIG.chunksPerMember} (${t.claims.length * 256} bloques²).\n${t.claims.map(c => `${c.dimension.replace("minecraft:", "")}: X ${c.x * 16} a ${c.x * 16 + 15}, Z ${c.z * 16} a ${c.z * 16 + 15}`).join("\n") || "Sin parcelas."}`);
        });
        register('reclamar', 'Aportar tu superficie al equipo, unida o separada', p => selector.begin(p));
        register('verparcela', 'Mostrar el contorno de un terreno del equipo', p => selector.view(p));
        register('nombre', 'El líder edita nombre y formato del equipo', (p, name) => {
            const t = leader(p), next = validateTeamName(name);
            if (teams.some(other => other.id !== t.id && teamNameKey(other.name) === teamNameKey(next)))
                throw Error('Ese nombre ya existe.');
            const previous = t.name;
            t.name = next;
            delete t.color;
            persistTeam(t);
            audit('team_rename', p.name, JSON.stringify({ team: t.id, previous, name: next }));
            message(p, `Equipo: ${next}§r.`);
        }, 'nombre');
        register("liberar", "Libera aquí una parcela tuya o del equipo si eres líder", p => {
            const t = ownTeam(p), c = releaseClaim(t, recordFor(p).id, chunkAt(p.dimension.id, p.location.x, p.location.z));
            persistTeam(t);
            audit("unclaim", p.name, JSON.stringify({ team: t.id, ...c }));
            message(p, "Parcela liberada: sin protección. Las construcciones se conservan.");
        });
        register('liberarparcela', 'Libera la parcela elegida en el menú', (p, arg) => {
            const t = ownTeam(p);
            let selected;
            try {
                selected = JSON.parse(arg ?? '');
            }
            catch {
                throw Error('Selecciona una parcela en Equipos y terrenos.');
            }
            if (selected.team !== t.id || !Number.isInteger(selected.x) || !Number.isInteger(selected.z) || typeof selected.dimension !== 'string')
                throw Error('La selección ya no es válida; abre el menú otra vez.');
            const current = t.claims.find(c => sameChunk(c, selected));
            if (!current || current.contributor !== selected.contributor)
                throw Error('Esta parcela cambió mientras el menú estaba abierto. Vuelve a seleccionarla.');
            const c = releaseClaim(t, recordFor(p).id, current);
            persistTeam(t);
            audit('unclaim', p.name, JSON.stringify({ team: t.id, ...c }));
            message(p, 'Parcela liberada: sin protección. Las construcciones se conservan.');
        }, 'seleccion');
        registry.registerCommand({ name: "warland:exportar", description: "Guardar estadísticas para Excel", permissionLevel: CommandPermissionLevel.Owner, cheatsRequired: false }, () => {
            system.run(() => { if (ctx.ready())
                ctx.exportData(); });
            return { status: CustomCommandStatus.Success };
        });
        registerAction('exportar', p => { if (!ADMIN_NAMES.includes(p.name.toLowerCase()))
            throw Error('Solo administradores.'); if (ctx.ready())
            ctx.exportData(); });
    });
}
//# sourceMappingURL=commands.js.map