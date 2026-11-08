import {world,system} from '@minecraft/server';
const KEY='warland:provoked_by_v1',registered=new Set(),nativeTypes=new Set(),ready=new Set();
export function validAttacker(p){try{return p?.isValid&&p.typeId==='minecraft:player'&&(p.getComponent('minecraft:health')?.currentValue??0)>0&&!['creative','spectator'].includes(String(p.getGameMode()).toLowerCase());}catch{return false;}}
export function playerDamageSource(source){
 if(validAttacker(source?.damagingEntity))return source.damagingEntity;
 try{const owner=source?.damagingProjectile?.getComponent('minecraft:projectile')?.owner;return validAttacker(owner)?owner:null;}catch{return null;}
}
function enableNative(e){if(!nativeTypes.has(e.typeId)||ready.has(e.id))return;try{e.triggerEvent('warland:enable_retaliation');ready.add(e.id);}catch{}}
export function recordHostileHurt({hurtEntity:e,damageSource,damage}){
 try{
  if(!registered.has(e.typeId)||!e.isValid||!(damage>0)||(e.getComponent('minecraft:health')?.currentValue??0)<=0)return false;
  const p=playerDamageSource(damageSource);if(!p||p.dimension.id!==e.dimension.id)return false;
  e.setDynamicProperty(KEY,p.id);enableNative(e);return true;
 }catch{return false;}
}
export function provokedTarget(e,range=64){
 try{const id=e.getDynamicProperty(KEY);if(typeof id!=='string')return null;const p=world.getEntity(id);
  if(validAttacker(p)&&p.dimension.id===e.dimension.id&&Math.hypot(p.location.x-e.location.x,p.location.y-e.location.y,p.location.z-e.location.z)<=range)return p;
  e.setDynamicProperty(KEY,undefined);
 }catch{}return null;
}
export function isProvokedBy(e,p,range=64){return !!p&&provokedTarget(e,range)?.id===p.id;}
export function registerRetaliation(types,{native=false}={}){for(const id of types){registered.add(id);if(native)nativeTypes.add(id);}}
world.afterEvents.entityHurt.subscribe(recordHostileHurt);
world.afterEvents.entityDie.subscribe(({deadEntity})=>{ready.delete(deadEntity.id);});
world.afterEvents.entitySpawn.subscribe(({entity})=>enableNative(entity));
// Upgrade saved actors without replacing them or changing their health.
system.runInterval(()=>{if(!nativeTypes.size)return;const live=new Set();
 for(const dimension of ['overworld','nether','the_end'])for(const type of nativeTypes)for(const e of world.getDimension(dimension).getEntities({type})){live.add(e.id);enableNative(e);}
 for(const id of ready)if(!live.has(id))ready.delete(id);
},40);
