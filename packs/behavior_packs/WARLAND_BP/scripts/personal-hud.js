import {combatVisualActive} from './java-combat-visuals.js';
import {world,system,DisplaySlotId,           } from '@minecraft/server';
                                                
                                                   
const sent=new Map             (),blockedUntil=new Map               (),retryAt=new Map               ();
export const HUD_PREFIX='WL_HUD|';
export function hudPacket(a        ){return `${HUD_PREFIX}${a.insurance?'K1':'K0'}|${Math.max(0,Math.min(2147483647,Math.floor(a.balance)))}`;}
export function personalHudDebug(){return [...sent].map(([id,s])=>({id,...s}));}
export function registerPersonalHud(account                              ){
  function update(){
    // Keep the objective for console credits; remove ONLY its shared display.
    if(world.scoreboard.getObjectiveAtDisplaySlot(DisplaySlotId.Sidebar)?.objective.id==='warcoins')world.scoreboard.clearObjectiveAtDisplaySlot(DisplaySlotId.Sidebar);
    if(world.getDynamicProperty('warland:heart_overlay_v1')===true)return;
    for(const p of world.getAllPlayers())try{
      if(combatVisualActive(p.id))continue;
      if(system.currentTick<(blockedUntil.get(p.id)??0))continue;
      const a=account(p);if(!a)continue;
      const packet=hudPacket(a),last=sent.get(p.id),retry=retryAt.get(p.id);
      if(last?.packet===packet&&(retry===undefined||system.currentTick<retry))continue;
      // JSON UI caches this private packet. No continuous title/actionbar loop.
      // Only changes, spawn recovery and dimension recovery publish it.
      p.onScreenDisplay.setTitle(packet,{fadeInDuration:0,stayDuration:20,fadeOutDuration:0});
      sent.set(p.id,{packet,tick:system.currentTick,count:(last?.count??0)+1});
      if(retry!==undefined&&system.currentTick>=retry)retryAt.delete(p.id);
    }catch{ /* Native respawn may briefly make onScreenDisplay unavailable. */ }
  }
  world.afterEvents.playerSpawn.subscribe(({player:p,initialSpawn})=>{
    sent.delete(p.id);blockedUntil.set(p.id,system.currentTick+(initialSpawn?20:5));retryAt.set(p.id,system.currentTick+80);
  });
  world.afterEvents.playerDimensionChange.subscribe(({player:p})=>{
    // Allow the Umbral entrance title to finish; the cached HUD stays visible.
    sent.delete(p.id);blockedUntil.set(p.id,system.currentTick+100);retryAt.set(p.id,system.currentTick+140);
  });
  world.afterEvents.playerLeave.subscribe(({playerId})=>{sent.delete(playerId);blockedUntil.delete(playerId);retryAt.delete(playerId);});
  system.runInterval(update,5);
  return {update};
}
