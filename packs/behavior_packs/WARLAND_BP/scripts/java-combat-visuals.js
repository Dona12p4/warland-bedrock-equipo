import {world,system,GameMode} from '@minecraft/server';
import {WEAPONS,chargeAt} from './java-combat-rules.js';

const views=new Map(),PREFIX='WL_ATK|';
export function combatVisualDebug(){return [...views].map(([id,v])=>({id,...v}));}
export function combatVisualActive(id){return views.get(id)?.visible===true;}
const publish=(p,text)=>p.onScreenDisplay.setTitle(text,{fadeInDuration:0,stayDuration:8,fadeOutDuration:0});
export function createCombatVisuals(){
 function hide(p,v){
  if(v?.visible){if(world.getDynamicProperty('warland:heart_overlay_v1')!==true)publish(p,PREFIX+'OFF');v.visible=false;v.packet=PREFIX+'OFF';v.count++;}
 }
 return {
  update(p,{s,item,weapon},ready){
   let v=views.get(p.id);if(!v){v={last:-1000,visible:false,count:0,cycles:0};views.set(p.id,v);}
   const enabled=ready&&[GameMode.Survival,GameMode.Adventure].includes(p.getGameMode())
    &&(p.getComponent('minecraft:health')?.currentValue??0)>0
    &&(!item||!!WEAPONS[item.typeId])&&!p.isUsingItem;
   if(!enabled||world.getDynamicProperty('warland:heart_overlay_v1')===true){hide(p,v);v.last=s.last;return;}
   const elapsed=system.currentTick-s.last,ticks=Math.ceil(20/weapon.speed-.5),charge=chargeAt(elapsed,weapon.speed);
   if(elapsed<0||elapsed>ticks+6){hide(p,v);return;}
   if(v.last!==s.last){
    v.last=s.last;
    // Keep the native weapon swing; the resource pack animates the HUD fill.
    // Custom arm clips were ineffective on this client's first-person items.
    v.cycles++;v.durationTicks=Math.max(1,ticks-elapsed);
   }
   const packet=PREFIX+(Math.round(charge*20)*5);
   if(packet!==v.packet||!v.visible){publish(p,packet);v.packet=packet;v.visible=true;v.count++;v.tick=system.currentTick;}
  },
  forget(id){views.delete(id);}
 };
}
