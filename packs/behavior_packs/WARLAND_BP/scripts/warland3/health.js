import { world, system, Player } from '@minecraft/server';
import { death } from './domain.js';
// El máximo se guarda en la cuenta; el componente nativo controla los corazones del HUD.
export function registerPlayerHealth(ctx) {
    const dead = new Set(), generations = new Map();
    const losses = new Map();
    function restore(p, initialSpawn, recovery = 0) {
        const generation = (generations.get(p.id) ?? 0) + 1;
        generations.set(p.id, generation);
        system.run(() => {
            try {
                if (!ctx.ready() || generations.get(p.id) !== generation || dead.has(p.id))
                    return;
                const id = ctx.ensure(p).id, a = ctx.repo.get(id);
                const health = p.getComponent('minecraft:health');
                if (!health || health.currentValue <= 0)
                    return;
                // Reentrar no cura heridas. Al reaparecer se llena el nuevo máximo reducido.
                let current = initialSpawn ? Math.min(health.currentValue + recovery, a.maximumHealth) : a.maximumHealth;
                const apply = (attempt) => {
                    if (generations.get(p.id) !== generation || dead.has(p.id))
                        return;
                    const before = p.getComponent('minecraft:health');
                    if (!before || before.currentValue <= 0)
                        return;
                    if (attempt > 0)
                        current = Math.min(current, before.currentValue);
                    p.triggerEvent('warland3:health_' + a.maximumHealth);
                    // El primer evento puede llegar antes de que Bedrock termine de cargar al jugador.
                    system.runTimeout(() => {
                        try {
                            if (generations.get(p.id) !== generation || dead.has(p.id))
                                return;
                            const h = p.getComponent('minecraft:health');
                            if (!h || h.currentValue <= 0)
                                return;
                            h.setCurrentValue(Math.min(h.currentValue, current));
                            if (h.effectiveMax !== a.maximumHealth) {
                                if (attempt < 2) {
                                    system.runTimeout(() => { try {
                                        apply(attempt + 1);
                                    }
                                    catch (error) {
                                        console.warn('[WARLAND3] Reintento de salud: ' + String(error));
                                    } }, 10);
                                    return;
                                }
                                ctx.audit('health_apply_failed', p.name, JSON.stringify({ maximumHealth: a.maximumHealth, actualMaximum: h.effectiveMax, initialSpawn }));
                                return;
                            }
                            const lost = losses.get(id);
                            losses.delete(id);
                            if (lost !== undefined)
                                ctx.message(p, `§cVida máxima: ${a.maximumHealth / 2} corazones.${lost > 0 ? ' Has perdido ' + lost / 2 + ' corazón.' : ' Has alcanzado el mínimo de medio corazón.'}`);
                            ctx.audit('health_applied', p.name, JSON.stringify({ maximumHealth: a.maximumHealth, actualMaximum: h.effectiveMax, initialSpawn }));
                        }
                        catch (error) {
                            console.warn('[WARLAND3] Salud al reaparecer: ' + String(error));
                        }
                    }, 3);
                };
                apply(0);
            }
            catch (error) {
                console.warn('[WARLAND3] Restaurar salud: ' + String(error));
            }
        });
    }
    world.afterEvents.entityDie.subscribe(({ deadEntity: p }) => {
        if (!ctx.ready() || !(p instanceof Player) || dead.has(p.id))
            return;
        try {
            const id = ctx.ensure(p).id;
            const result = ctx.repo.mutate(id, a => death(a, ctx.season(), Date.now()));
            dead.add(p.id);
            generations.set(p.id, (generations.get(p.id) ?? 0) + 1);
            if (result.globalEffect)
                losses.set(id, result.lostHealth);
            ctx.onDeath?.(p, result.insured);
            ctx.audit('health_death', p.name, JSON.stringify({ ...result, maximumHealth: ctx.repo.get(id).maximumHealth }));
        }
        catch (error) {
            console.warn('[WARLAND3] Guardar pérdida de salud: ' + String(error));
        }
    });
    world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
        dead.delete(player.id);
        restore(player, initialSpawn);
    });
    world.beforeEvents.playerLeave.subscribe(({ player }) => {
        // Invalida trabajo pendiente sin tocar entidades desconectadas.
        generations.set(player.id, (generations.get(player.id) ?? 0) + 1);
    });
    return { restore };
}
//# sourceMappingURL=health.js.map