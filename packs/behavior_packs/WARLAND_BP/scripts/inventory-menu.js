import { world, system, Player, ItemStack, ItemTypes, ItemLockMode, CommandPermissionLevel, CustomCommandStatus } from '@minecraft/server';
import { ActionFormData, ModalFormData, FormCancelationReason } from '@minecraft/server-ui';
import { ADMIN_NAMES, CONFIG, teamFor, canReleaseClaim } from './core.js';
import { registerAction, performAction } from './actions.js';
import { localDay, W3, seasonDay } from './warland3/domain.js';
import { freeBetaShop } from './beta-policy.js';
import { teamTag } from './team-style.js';
export const MENU_ITEMS = [
    { id: 'warland:administracion', name: '§6WARLAND · Administración', page: 'main' },
];
const legacyMenus = new Set(['warland:menu', 'warland:misiones', 'warland:territorios', 'warland:corazones']);
const accessItems = new Set([...legacyMenus, 'warland:administracion', 'warland:umbral']);
export function createInventoryMenu(ctx) {
    const busy = new Set(), lastUse = new Map();
    const admin = (p) => ADMIN_NAMES.includes(p.name.toLowerCase());
    const beta = () => world.getDynamicProperty('warland:beta') === true;
    function giveItems(p) {
        const inv = p.getComponent('minecraft:inventory')?.container;
        if (!inv)
            return;
        let slot = -1;
        const oldSlots = [];
        for (let i = 0; i < inv.size; i++) {
            const item = inv.getItem(i);
            if (item && accessItems.has(item.typeId)) {
                oldSlots.push(i);
                if (item.typeId === MENU_ITEMS[0].id && slot < 0)
                    slot = i;
            }
        }
        if (slot < 0)
            slot = oldSlots[0] ?? -1;
        if (slot < 0)
            for (let i = 0; i < inv.size; i++)
                if (!inv.getItem(i)) {
                    slot = i;
                    break;
                }
        if (slot < 0) {
            ctx.message(p, 'Libera un hueco y usa /warland:menu.');
            return;
        }
        const item = new ItemStack(MENU_ITEMS[0].id, 1);
        item.nameTag = MENU_ITEMS[0].name;
        item.keepOnDeath = true;
        item.lockMode = ItemLockMode.inventory;
        item.setLore(['Misiones · Equipos · Corazones · Umbral', 'Se conserva al morir.']);
        inv.setItem(slot, item);
        for (const i of oldSlots)
            if (i !== slot)
                inv.setItem(i, undefined);
    }
    async function info(p, title, text) { await new ActionFormData().title(title).body(text).button('Volver').show(p); }
    async function confirm(p, text, fn) { const r = await new ActionFormData().title('Confirmar').body(text).button('Cancelar').button('Confirmar').show(p); if (!r.canceled && r.selection === 1)
        fn(); }
    async function input(p, title, label, action) {
        const r = await new ModalFormData().title(title).textField(label, 'Escribe aquí').submitButton('Aceptar').show(p);
        if (!r.canceled)
            performAction(action, p, String(r.formValues?.[0] ?? '').trim());
    }
    async function choose(p, title, names, action) {
        if (!names.length) {
            await info(p, title, 'Sin opciones disponibles.');
            return;
        }
        const form = new ActionFormData().title(title);
        for (const name of names)
            form.button(name);
        form.button('Cancelar');
        const r = await form.show(p);
        if (!r.canceled && r.selection !== undefined && r.selection < names.length)
            performAction(action, p, names[r.selection]);
    }
    async function releaseParcelMenu(p) {
        const id = ctx.recordFor(p).id, t = teamFor(ctx.teams, id);
        if (!t)
            return;
        const choices = t.claims.filter(c => canReleaseClaim(t, id, c)).map(c => ({ ...c, team: t.id }));
        if (!choices.length) {
            await info(p, 'Liberar parcelas', t.claims.length ? 'No tienes parcelas con tu autoría registrada. El líder debe liberar las parcelas antiguas o las de otros miembros.' : 'Tu equipo no tiene parcelas. Puedes salir del equipo.');
            return;
        }
        const form = new ActionFormData().title('Liberar parcelas').body('Elige la parcela que perderá protección. Las construcciones y los bloques se conservan. Cada parcela ocupa 256 bloques².');
        for (const c of choices)
            form.button(`${c.dimension.replace('minecraft:', '')} · X ${c.x * 16}–${c.x * 16 + 15}\nZ ${c.z * 16}–${c.z * 16 + 15} · 256 bloques²`);
        form.button('Cancelar');
        const response = await form.show(p);
        const c = choices[response.selection ?? -1];
        if (!response.canceled && c)
            await confirm(p, `Liberar 256 bloques² en ${c.dimension.replace('minecraft:', '')}, X ${c.x * 16}–${c.x * 16 + 15}, Z ${c.z * 16}–${c.z * 16 + 15}.\n\nPerderá la protección; se conservarán las construcciones.`, () => performAction('liberarparcela', p, JSON.stringify(c)));
    }
    function pageData(p, page) {
        const r = ctx.recordFor(p), a = ctx.w3.repo.get(r.id), season = ctx.w3.getSeason();
        const run = (name, arg) => () => performAction(name, p, arg);
        const back = { text: 'Volver', page: 'main' };
        const title = 'Administración' + (beta() ? ' · BETA' : '');
        if (page === 'missions') {
            ctx.w3.sync(p);
            const current = ctx.w3.repo.get(r.id), today = current.days[localDay(Date.now())];
            const tiers = ['easy', 'medium', 'hard'], labels = ['Fácil', 'Media', 'Difícil'];
            const desc = ['Minutos', 'Enemigos', 'Chunks nuevos'];
            return { title: 'Misiones diarias', body: `${current.balance} Warcoins\nSolo survival · Pago automático\nHasta 6 WC/día + monedas por tiempo\n\n` + tiers.map((t, i) => { const m = today[t], d = i === 0 ? 60000 : 1; return `${labels[i]} · ${desc[i]} ${Math.floor(m.progress / d)}/${m.target / d} · ${W3.missionRewards[t]} WC${m.paid ? ' · Pagada' : ''}`; }).join('\n'), rows: [{ text: 'Actualizar', page: 'missions' }, back] };
        }
        if (page === 'team') {
            const t = teamFor(ctx.teams, r.id), invites = ctx.teams.filter(t => (t.invites[r.id] ?? 0) > Date.now()).map(t => t.name);
            const body = t ? `${teamTag(t)}\n${t.members.length} miembros · ${t.claims.length * 256}/${t.members.length * CONFIG.chunksPerMember * 256} bloques²\n${CONFIG.chunksPerMember * 256} bloques² por persona · Juntos o separados` : 'Sin equipo. Puedes crear uno individual.';
            return { title: 'Equipos y terrenos', body, rows: t ? [
                    { text: 'Elegir terreno', run: run('reclamar'), close: true },
                    { text: 'Ver límites aquí', run: run('verparcela'), close: true },
                    { text: 'Liberar parcelas', run: () => releaseParcelMenu(p) },
                    { text: 'Miembros y parcelas', run: () => info(p, 'Miembros y parcelas', `${t.members.map(id => ctx.records.get(id)?.name ?? id).join(', ')}\n\nParcelas: ${t.claims.length}/${t.members.length * CONFIG.chunksPerMember} · 16×16, toda la altura\n${t.claims.map(c => `${c.dimension.replace('minecraft:', '')} · X ${c.x * 16}–${c.x * 16 + 15}, Z ${c.z * 16}–${c.z * 16 + 15}`).join('\n') || 'Sin parcelas.'}`) },
                    ...(t.owner === r.id ? [
                        { text: 'Nombre y formato (§)', run: () => input(p, 'Nombre del equipo', '3–20 letras, números o guiones. Color opcional: §cEquipo', 'nombre') },
                        { text: 'Invitar jugador', run: () => choose(p, 'Invitar', world.getAllPlayers().filter(q => q.id !== p.id && !teamFor(ctx.teams, ctx.recordFor(q).id)).map(q => q.name), 'invitar') },
                        { text: 'Liberar aquí', run: () => confirm(p, 'Esta parcela perderá la protección.', run('liberar')) },
                        { text: 'Disolver equipo', run: () => confirm(p, `Disolver ${t.name}§r y liberar sus ${t.claims.length} parcelas. Las construcciones se conservan.`, run('disolver', t.id)) },
                    ] : []),
                    { text: 'Salir del equipo', run: () => confirm(p, 'Perderás acceso a los terrenos del equipo.', run('salir')) }, back,
                ] : [{ text: 'Crear equipo', run: () => input(p, 'Crear equipo', '3–20 letras, números o guiones. Color opcional: §cEquipo', 'crear') }, { text: 'Aceptar invitación', run: () => choose(p, 'Invitaciones', invites, 'aceptar') }, back] };
        }
        if (page === 'health')
            return { title: 'Corazones', body: `Vida máxima: ${a.maximumHealth / 2} corazones\n${a.balance} Warcoins\nMandato: ${season.firstMandateAt === null ? 'inactivo' : 'activo'}\nCon Mandato: −1 corazón al morir. Mínimo: ½.`, rows: [
                    ...(beta() ? [{ text: freeBetaShop() ? 'Recuperar corazón · Gratis' : 'Comprar 1 corazón · 100 WC', run: () => confirm(p, freeBetaShop() ? 'Recuperar 1 corazón gratis. Límite: 10 corazones.' : 'Recuperar 1 corazón máximo por 100 WC. Límite: 10 corazones.', run('corazon')) }] : []),
                    ...(ctx.w3.insurance.enabled() ? [
                        { text: a.insurance ? 'Seguro activo · 1 muerte' : freeBetaShop() ? 'Seguro · Gratis en beta' : 'Seguro · 40 WC', run: () => a.insurance ? info(p, 'Seguro activo', 'Inventario, armadura y mano secundaria. Una muerte. No conserva experiencia ni evita perder corazones.') :
                                (ctx.w3.insurance.saleAvailable() || freeBetaShop()) ? confirm(p, freeBetaShop() ? 'Seguro gratuito de prueba para una muerte. No protege experiencia ni corazones.' : '40 WC para conservar tus objetos durante una muerte. No protege experiencia ni corazones.', run('seguro')) : info(p, 'Seguro · En prueba', 'Falta comprobar una muerte real antes de cobrar los 40 WC.') },
                        ...(!ctx.w3.insurance.saleAvailable() && !freeBetaShop() && admin(p) ? [{ text: 'Probar seguro · Gratis', run: () => confirm(p, 'Activar para tu próxima muerte. Sin coste. Usa objetos de prueba; falta validar el resultado en Minecraft.', run('seguroprueba')) }] : []),
                    ] : [{ text: 'Seguro · Pendiente', run: () => info(p, 'Seguro pendiente', '40 WC · Una muerte. En validación.') }]), back
                ] };
        if (page === 'admin') {
            if (!admin(p))
                throw Error('Solo administradores autorizados.');
            return { title: 'Controles de administrador', body: '', rows: [
                    { text: 'Línea del tiempo', run: () => { p.runCommand('warland:linea_del_tiempo'); }, close: true },
                    { text: 'Eliminar un equipo', run: async () => { const teams = [...ctx.teams]; if (!teams.length) {
                            await info(p, 'Equipos', 'Sin equipos.');
                            return;
                        } const form = new ActionFormData().title('Eliminar equipo'); for (const team of teams)
                            form.button(team.name); form.button('Cancelar'); const response = await form.show(p); const t = teams[response.selection ?? -1]; if (!response.canceled && t)
                            await confirm(p, `Disolver ${t.name}§r y liberar sus terrenos. Las construcciones se conservan.`, run('disolver', t.id)); } },
                    { text: 'Modo survival', run: run('modo', 'survival') }, { text: 'Modo creativo', run: run('modo', 'creativo') },
                    ...(beta() ? [{ text: 'Pruebas de la beta', page: 'beta' }] : [
                        { text: 'Iniciar temporada', run: () => confirm(p, 'Comenzar los 30 días de WARLAND 3.', run('iniciartemporada', 'CONFIRMAR')) },
                        { text: 'Activar Primer Mandato', run: () => confirm(p, 'Cada muerte quitará 1 corazón (mínimo ½). Disponible desde el día 7.', run('primermandato', 'CONFIRMAR')) },
                        { text: 'Exportar estadísticas', run: run('exportar') },
                    ]), back
                ] };
        }
        if (page === 'beta') {
            if (!admin(p) || !beta())
                throw Error('Solo administradores de la beta.');
            return { title: 'Pruebas · BETA', body: `Solo este mundo de pruebas.\n${a.maximumHealth / 2} corazones · ${a.balance} WC\nPérdida al morir: ${season.firstMandateAt === null ? 'desactivada' : '−1 corazón (mínimo ½)'}`, rows: [
                    { text: season.firstMandateAt === null ? 'Activar pérdida al morir' : 'Desactivar pérdida al morir', run: run('betaprueba', season.firstMandateAt === null ? 'mandato_on' : 'mandato_off') },
                    { text: 'Restaurar 10 corazones', run: run('betaprueba', 'vida20') },
                    { text: 'Probar ½ corazón', run: run('betaprueba', 'vida1') },
                    { text: 'Probar muerte', run: () => confirm(p, 'Morirás. Puedes perder objetos y, con Mandato, 1 corazón máximo.', run('betaprueba', 'morir')) },
                    { text: '+500 WC de prueba', run: run('betaprueba', 'monedas') },
                    ...[1, 2, 3, 4].map(n => ({ text: `Semana ${n} · Prueba`, run: () => confirm(p, `Cambiar a semana ${n} en esta beta. ${n >= 2 ? 'Activa pérdida de corazones.' : 'Sin pérdida de corazones.'} Misiones y salud implementadas; demás eventos semanales pendientes.`, run('betaprueba', 'semana' + n)) })),
                    { text: 'Volver a preparación', run: run('betaprueba', 'preparacion') }, back
                ] };
        }
        return { title, body: `${p.name}\n${a.balance} Warcoins · ${a.maximumHealth / 2} corazones\n${season.startedAt === null ? 'Temporada en preparación' : `Día ${seasonDay(season, Date.now())}/30`}`, rows: [
                { text: 'Misiones', page: 'missions' }, { text: 'Equipos y terrenos', page: 'team' }, { text: 'Corazones', page: 'health' },
                { text: 'Estadísticas', run: () => info(p, 'Estadísticas', `${Math.floor(r.playMs / 60000)} min · ${a.balance} Warcoins\nMuertes: ${r.deaths}\nBajas: ${r.kills} · Mobs: ${r.mobs}\nBloques: ${r.broken} rotos / ${r.placed} colocados`) },
                ...(ItemTypes.get('warland:umbral') ? [{ text: 'El Umbral', run: () => { p.runCommand('warland:umbral'); }, close: true }] : []),
                ...(admin(p) ? [{ text: 'Controles de administrador', page: 'admin' }] : []),
                { text: 'En desarrollo', run: () => info(p, 'En desarrollo', 'Seguro individual, animación de muerte de jugadores, portales y contenido semanal.') },
            ] };
    }
    async function open(p, page = 'main') {
        if (busy.has(p.id))
            return;
        busy.add(p.id);
        try {
            if (!ctx.ready())
                throw Error('WARLAND está iniciando.');
            ctx.w3.ensure(p);
            while (true) {
                const data = pageData(p, page), form = new ActionFormData().title(data.title).body(data.body);
                for (const row of data.rows)
                    form.button(row.text);
                const response = await form.show(p);
                if (response.canceled) {
                    if (response.cancelationReason === FormCancelationReason.UserBusy)
                        ctx.message(p, 'Cierra el chat o inventario y vuelve a usar el menú.');
                    return;
                }
                const row = data.rows[response.selection ?? -1];
                if (!row)
                    return;
                if (row.page) {
                    page = row.page;
                    continue;
                }
                try {
                    await row.run?.();
                    if (row.close)
                        return;
                }
                catch (e) {
                    await info(p, 'WARLAND', e instanceof Error ? e.message : String(e));
                }
                if (p.getComponent('minecraft:health')?.currentValue === 0)
                    return;
            }
        }
        catch (e) {
            ctx.message(p, String(e));
        }
        finally {
            busy.delete(p.id);
        }
    }
    function use(p, item) {
        if (!item || (!legacyMenus.has(item.typeId) && item.typeId !== MENU_ITEMS[0].id))
            return false;
        const now = Date.now();
        if (now - (lastUse.get(p.id) ?? 0) < 400)
            return true;
        lastUse.set(p.id, now);
        system.run(() => { giveItems(p); void open(p); });
        return true;
    }
    world.beforeEvents.itemUse.subscribe(e => { if (use(e.source, e.itemStack))
        e.cancel = true; });
    world.beforeEvents.playerInteractWithBlock.subscribe(e => { if (use(e.player, e.itemStack))
        e.cancel = true; });
    world.beforeEvents.playerInteractWithEntity.subscribe(e => { if(e.target.typeId==='warland:cajero')return; if (use(e.player, e.itemStack))
        e.cancel = true; });
    world.afterEvents.playerSpawn.subscribe(({ player }) => system.runTimeout(() => { if (ctx.ready())
        giveItems(player); }, 12));
    world.beforeEvents.playerLeave.subscribe(({ player }) => { lastUse.delete(player.id); });
    system.beforeEvents.startup.subscribe(({ customCommandRegistry: r }) => {
        registerAction('menu', p => { void open(p); });
        r.registerCommand({ name: 'warland:menu', description: 'Abrir Administración y recuperar su objeto', permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false }, origin => {
            if (origin.sourceEntity instanceof Player) {
                const p = origin.sourceEntity;
                system.run(() => { giveItems(p); void open(p); });
            }
            return { status: CustomCommandStatus.Success };
        });
    });
    return { giveItems, open };
}
//# sourceMappingURL=inventory-menu.js.map