// Tags cross pack UUID boundaries; dynamic properties do not. A short-lived
// notice carries a confirmed target, never an arbitrary nearby suspect.
import {world,system} from '@minecraft/server';
export function gargantNotice(entity){
 for(const tag of entity.getTags())if(tag.startsWith('wl_ga_notice:')){
  const rest=tag.slice(13),cut=rest.indexOf(':'),until=Number(rest.slice(0,cut)),id=rest.slice(cut+1),left=until-system.currentTick;
  if(cut<0||!Number.isFinite(left)||left<0||left>100){entity.removeTag(tag);continue;}
  const p=world.getEntity(id);try{if(!p?.isValid||p.dimension.id!==entity.dimension.id||(p.getComponent('minecraft:health')?.currentValue??0)<=0||Math.hypot(p.location.x-entity.location.x,p.location.y-entity.location.y,p.location.z-entity.location.z)>40)continue;
   if(p.typeId==='minecraft:player'&&['creative','spectator'].includes(String(p.getGameMode()).toLowerCase()))continue;return p;
  }catch{}
 }
}
