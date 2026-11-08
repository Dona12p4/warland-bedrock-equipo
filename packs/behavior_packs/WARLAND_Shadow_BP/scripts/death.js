// La baja sigue siendo la muerte nativa. Este actor solo conserva su despedida visual.
import { world, system } from '@minecraft/server';
import { settings } from './settings.js';

world.afterEvents.entityDie.subscribe(({deadEntity}) => {
  if (deadEntity.typeId !== 'warland:shadow_boss_prototype') return;
  try {
    const dimension = deadEntity.dimension;
    const position = deadEntity.location;
    const rotation = deadEntity.getRotation();
    const probe = deadEntity.hasTag('warland_shadow_probe');
    const visual = dimension.spawnEntity('warland:shadow_death_visual', position);
    visual.setRotation({x:0,y:rotation.y});
    const started = system.currentTick;
    if (probe) console.warn('[SHADOW_DEATH] '+JSON.stringify({phase:'start',tick:started,position,yaw:rotation.y,visualId:visual.id}));
    system.runTimeout(() => {
      try {
        if (!visual.isValid) return;
        dimension.playSound(settings.deathSound, visual.location, {volume:settings.deathSoundVolume,pitch:1});
        if (probe) console.warn('[SHADOW_DEATH] '+JSON.stringify({phase:'sound',tick:system.currentTick,elapsedTicks:system.currentTick-started,sound:settings.deathSound}));
      } catch (error) {
        if (visual.isValid) console.warn('[SHADOW_RUNTIME] death sound: '+String(error));
      }
    },settings.deathSoundDelayTicks);
  } catch (error) {
    console.warn('[SHADOW_RUNTIME] death visual: '+String(error));
  }
});
