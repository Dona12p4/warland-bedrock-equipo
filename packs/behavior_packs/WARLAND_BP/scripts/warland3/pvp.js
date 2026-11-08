import { world, Player } from "@minecraft/server";
import { reflectedHealth } from "./domain.js";
// Registro explícito: importar este módulo no modifica el juego.
export function registerReflectedPvp(enabled) {
    const reflecting = new Set();
    world.afterEvents.entityHurt.subscribe(event => {
        if (!enabled() || !(event.hurtEntity instanceof Player) || !(event.damage > 0))
            return;
        let source = event.damageSource.damagingEntity;
        try {
            if (!(source instanceof Player))
                source = event.damageSource.damagingProjectile?.getComponent("minecraft:projectile")?.owner;
            if (!(source instanceof Player) || source.id === event.hurtEntity.id || reflecting.has(source.id))
                return;
            const health = source.getComponent("minecraft:health");
            if (!health || health.currentValue <= 1)
                return;
            reflecting.add(source.id);
            try {
                // Una segunda applyDamage volvería a aplicar armadura/resistencia. Se descuenta
                // la cantidad ya notificada por el evento, con suelo de 1 HP y sin otro atacante.
                health.setCurrentValue(reflectedHealth(health.currentValue, event.damage));
            }
            finally {
                reflecting.delete(source.id);
            }
        }
        catch (error) {
            console.warn(`[WARLAND3] Reflejo PvP pendiente de revisión: ${String(error)}`);
        }
    });
}
//# sourceMappingURL=pvp.js.map