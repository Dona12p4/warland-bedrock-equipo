import {world,system,GameMode} from '@minecraft/server';
// A nearby creative/spectator must not monopolize native looked_at scanning.
// This tag is a broad-phase eligibility filter, never a proximity attack.
const TAG='wl_shadow_watchable';
function refresh(p){try{const eligible=[GameMode.Survival,GameMode.Adventure].includes(p.getGameMode());if(eligible!==p.hasTag(TAG)){if(eligible)p.addTag(TAG);else p.removeTag(TAG);}}catch{}}
system.runInterval(()=>{for(const p of world.getAllPlayers())refresh(p);},5);
world.afterEvents.playerSpawn.subscribe(({player})=>refresh(player));
