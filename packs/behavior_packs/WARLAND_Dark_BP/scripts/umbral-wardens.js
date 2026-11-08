import {world,system} from '@minecraft/server';
import {cfg} from './void-config.js';
import {END,nearArrival,leavesUmbral,tooOld} from './umbral-warden-policy.js';
const KEY='warland:warden_exit_epoch',BIRTH='warland:warden_epoch',inside=new Set();
export const wardenEpoch=()=>Number(world.getDynamicProperty(KEY)??0);
function isWarden(e){return e?.isValid&&e.typeId==='minecraft:warden'&&e.dimension.id===END;}
export function reconcileWarden(e,fresh=false){
 try{
  if(!isWarden(e))return false;
  const epoch=wardenEpoch(),born=e.getDynamicProperty(BIRTH);
  if(!fresh&&tooOld(born,epoch)){e.kill();return true;}
  if(nearArrival(e.location,cfg)){e.kill();return true;}
  if(fresh||born===undefined)e.setDynamicProperty(BIRTH,epoch);
 }catch{}return false;
}
export function clearWardensOnExit(){
 const epoch=wardenEpoch()+1;world.setDynamicProperty(KEY,epoch);
 let count=0;for(const e of world.getDimension('the_end').getEntities({type:'minecraft:warden'}))if(reconcileWarden(e))count++;
 return {epoch,count};
}
world.afterEvents.entitySpawn.subscribe(({entity})=>reconcileWarden(entity,true));
world.afterEvents.entityLoad.subscribe(({entity})=>reconcileWarden(entity));
world.afterEvents.playerDimensionChange.subscribe(({player,fromDimension,toDimension})=>{
 if(leavesUmbral(fromDimension.id,toDimension.id)){inside.delete(player.id);clearWardensOnExit();}
 if(toDimension.id===END)inside.add(player.id);
});
// Disconnecting in the Umbral also ends that player's encounter. An epoch
// persists so Wardens in unloaded chunks die when loaded, including after restart.
world.afterEvents.playerLeave.subscribe(({playerId})=>{if(inside.delete(playerId))clearWardensOnExit();});
system.runInterval(()=>{
 for(const p of world.getAllPlayers())if(p.dimension.id===END)inside.add(p.id);else inside.delete(p.id);
 for(const e of world.getDimension('the_end').getEntities({type:'minecraft:warden'}))reconcileWarden(e);
},20);
