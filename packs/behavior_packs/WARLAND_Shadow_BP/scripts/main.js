import {scanBodyGaze,forgetBodyGaze} from './body-gaze.js';
import './gaze-players.js';
import {registerRetaliation} from './hostile-retaliation.js';
registerRetaliation(['warland:shadow_boss_prototype'],{native:true});
// Script API estable 2.10.0. El objetivo y el golpe principal siguen siendo nativos.
import { world, system, EntityDamageCause } from '@minecraft/server';
import { settings } from './settings.js';
import { pulsePresence, resetPresence, presenceHeadWeight } from './presence.js';
import './death.js';

const type = 'warland:shadow_boss_prototype';
const states = new Map();
const dimensionIds = ['overworld', 'nether', 'the_end'];
/** @param {number} min @param {number} max */
const integer = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

system.runInterval(() => {
  const seen = new Set();
  for (const id of dimensionIds) {
    const dimension = world.getDimension(id);
    for (const entity of dimension.getEntities({ type })) {
      if ((entity.getComponent('minecraft:health')?.currentValue ?? 0) <= 0) continue;
      seen.add(entity.id);
      let state = states.get(entity.id);
      try {
        if (!state) {
          states.set(entity.id,state={next:system.currentTick,remaining:0,doubleAt:-100,wasAggressive:false,headAt:-100});
          resetPresence(entity);
          if(!entity.getProperty('warland:aggressive'))entity.triggerEvent('warland:calm');
        }
        scanBodyGaze(entity);
        const aggressive=entity.getProperty('warland:aggressive')===true;
        if (!aggressive) {
          state.wasAggressive = false;
        }
        if (aggressive && !state.wasAggressive) {
          state.wasAggressive = true;
          dimension.playSound(settings.gazeSound,entity.location,{volume:settings.gazeSoundVolume,pitch:1});
          if(entity.hasTag('warland_shadow_probe'))console.warn('[SHADOW_GAZE_SOUND] '+settings.gazeSound);
        }
        // La presencia también aparece al observar; no cambia navegación ni colisión.
        // El golpe se mantiene centrado para que las garras coincidan con el objetivo.
        const visible=entity.hasTag('warland_shadow_probe')||dimension.getPlayers({location:entity.location,maxDistance:settings.noticeDistance}).length>0;
        if (!visible || entity.getProperty('warland:visual_action') !== 0) {
          resetPresence(entity);state.remaining=0;state.headAt=-100;continue;
        }
        const weight=presenceHeadWeight(system.currentTick-state.headAt,settings);
        if(entity.getProperty('warland:head_weight')!==weight)entity.setProperty('warland:head_weight',weight);
        if (system.currentTick < state.next) continue;
        if (!state.remaining) state.remaining = settings.presenceBurstCount;
        const pulse=pulsePresence(entity,settings,state.remaining===1);
        if(pulse?.head)state.headAt=system.currentTick;
        state.remaining--;
        state.next = system.currentTick + (state.remaining ? settings.presenceBurstGapTicks : integer(settings.presenceRestMinTicks, settings.presenceRestMaxTicks));
      } catch (error) {
        if (entity.isValid) console.warn('[SHADOW_RUNTIME] ' + String(error));
      }
    }
  }
  for (const id of states.keys()) if (!seen.has(id)){states.delete(id);forgetBodyGaze(id);}
}, 1);

world.afterEvents.entityHurt.subscribe(event => {
  const attacker = event.damageSource.damagingEntity;
  if (attacker?.typeId !== type || !attacker.isValid || attacker.getProperty('warland:visual_action') !== 3) return;
  const state = states.get(attacker.id);
  if (!state || system.currentTick - state.doubleAt < 24) return;
  state.doubleAt = system.currentTick;
  const victim = event.hurtEntity;
  // La segunda mano pasa 0,6 s después. No inventar un objetivo por cercanía:
  // conserva únicamente el que recibió el primer golpe del motor.
  system.runTimeout(() => {
    try {
      if (!attacker.isValid || !victim.isValid || !attacker.getProperty('warland:aggressive') || attacker.getProperty('warland:visual_action') !== 3) return;
      if (attacker.dimension.id !== victim.dimension.id || (victim.getComponent('minecraft:health')?.currentValue ?? 0) <= 0) return;
      const from = attacker.location, to = victim.location;
      if (Math.hypot(to.x-from.x, to.z-from.z) > 3.3 || Math.abs(to.y-from.y) > 1.8) return;
      const start = { x:from.x, y:from.y+1.5, z:from.z };
      const end = victim.getHeadLocation();
      const delta = { x:end.x-start.x, y:end.y-start.y, z:end.z-start.z };
      const length = Math.hypot(delta.x,delta.y,delta.z);
      if (length > 0.01 && attacker.dimension.getBlockFromRay(start, {x:delta.x/length,y:delta.y/length,z:delta.z/length}, {maxDistance:length,includeLiquidBlocks:false,includePassableBlocks:false})) return;
      victim.applyDamage(settings.attackDamage, { cause:EntityDamageCause.entityAttack, damagingEntity:attacker });
    } catch (error) {
      if (attacker.isValid && victim.isValid) console.warn('[SHADOW_RUNTIME] '+String(error));
    }
  }, 12);
});

import './thrust.js';
