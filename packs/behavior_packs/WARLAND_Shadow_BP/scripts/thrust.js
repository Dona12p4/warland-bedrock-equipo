import {world,system} from '@minecraft/server';
import {thrustSettings} from './thrust-settings.js';
const recent=new Map();
export function launchUp(victim,impulse=thrustSettings.thrustVerticalImpulse){
 if(!victim.isValid||(victim.getComponent('minecraft:health')?.currentValue??0)<=0)return false;
 // Normalize only vertical momentum after the original hit's knockback. Keep
 // lateral motion and collision: the entity cannot pass through a ceiling.
 const v=victim.getVelocity();victim.applyImpulse({x:0,y:impulse-v.y,z:0});return true;
}
world.afterEvents.entityHurt.subscribe(event=>{
 const attacker=event.damageSource.damagingEntity,victim=event.hurtEntity;
 if(event.damage<=0||!attacker?.isValid||attacker.typeId!=='warland:shadow_boss_prototype'||attacker.getProperty('warland:visual_action')!==4)return;
 if(!victim.getComponent('minecraft:type_family')?.hasTypeFamily('player'))return;
 const key=attacker.id+':'+victim.id,now=system.currentTick;
 if(now-(recent.get(key)??-1000)<thrustSettings.thrustRepeatGuardTicks)return;
 recent.set(key,now);
 // Wait for native hurt knockback to finish applying before normalizing it.
 system.runTimeout(()=>{try{launchUp(victim,thrustSettings.thrustAfterHitImpulse);}catch(error){if(victim.isValid)console.warn('[WARLAND_THRUST] '+String(error));}},2);
 system.runTimeout(()=>{if(recent.get(key)===now)recent.delete(key);},thrustSettings.thrustRepeatGuardTicks+1);
});
