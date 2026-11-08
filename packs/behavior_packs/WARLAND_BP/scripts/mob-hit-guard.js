import {world} from '@minecraft/server';
// Longer native arm reach must never become attacks through solid walls.
const melee=new Set(['warland:shadow_boss_prototype','warland:palpador_prototype','warland:rastreador_prototype','warland:garganta_abierta_prototype']);
world.beforeEvents.entityHurt.subscribe(e=>{
 const a=e.damageSource.damagingEntity,b=e.hurtEntity;
 if(e.cancel||e.damageSource.cause!=='entityAttack'||!a||!melee.has(a.typeId)||a.dimension.id!==b.dimension.id)return;
 const from={x:a.location.x,y:a.location.y+Math.min(1.5,a.typeId.includes('rastreador')?.8:1.5),z:a.location.z};
 try{
  for(const to of [b.getHeadLocation(),{...b.location,y:b.location.y+.6}]){
   const x=to.x-from.x,y=to.y-from.y,z=to.z-from.z,length=Math.hypot(x,y,z);
   if(length<.01||!a.dimension.getBlockFromRay(from,{x:x/length,y:y/length,z:z/length},{maxDistance:length,includeLiquidBlocks:false,includePassableBlocks:false}))return;
  }
  e.cancel=true;
 }catch{e.cancel=true;}
});
