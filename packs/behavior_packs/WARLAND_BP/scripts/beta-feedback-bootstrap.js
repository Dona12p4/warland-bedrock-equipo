import {world,system} from '@minecraft/server';
// This entry is included ONLY in the optimized beta copy, not the production pack.
world.afterEvents.worldLoad.subscribe(()=>{
 if(world.getDynamicProperty('warland:beta_feedback_v1')!==true){
  world.setDynamicProperty('warland:beta',true);
  world.setDynamicProperty('warland:beta_free_shop',true);
  world.setDynamicProperty('warland:insurance_preview',true);
  world.setDynamicProperty('warland:beta_feedback_v1',true);
 }
});
const healthTargets={'warland:thermal_creeper_prototype':60,'warland:palpador_prototype':80,'warland:rastreador_prototype':72};
const pending=new Set();
export function upgradeExistingMob(e){
 const maximum=healthTargets[e.typeId],h=e.getComponent('minecraft:health');
 if(!maximum||!h||h.currentValue<=0||h.effectiveMax===maximum||pending.has(e.id))return false;
 const fraction=h.currentValue/h.effectiveMax;pending.add(e.id);e.triggerEvent('warland:beta_toughness');
 system.runTimeout(()=>{try{if(e.isValid){const h=e.getComponent('minecraft:health');if(h&&h.currentValue>0)h.setCurrentValue(Math.max(1,Math.min(h.currentValue,Math.round(fraction*maximum))));}}finally{pending.delete(e.id);}},2);
 return true;
}
system.runInterval(()=>{for(const name of ['overworld','nether','the_end'])for(const type of Object.keys(healthTargets))for(const e of world.getDimension(name).getEntities({type}))try{upgradeExistingMob(e);}catch{}},40);
