import { system, world } from '@minecraft/server';
import { createState, emitAmbient } from './ambient.js';

const states=new Map();
let players=[],cursor=0,time=0,weather='Clear',reported=false;
world.afterEvents.weatherChange.subscribe(event=>{
  if (event.dimension==='minecraft:overworld' || event.dimension?.id==='minecraft:overworld') weather=event.newWeather;
});
world.afterEvents.playerLeave.subscribe(event=>states.delete(event.playerId));

system.runInterval(()=>{
  players=world.getAllPlayers();time=world.getTimeOfDay();
  const online=new Set(players.map(p=>p.id));
  for(const id of states.keys()) if(!online.has(id)) states.delete(id);
  try { weather=world.getDimension('overworld').getWeather(); } catch { /* event fallback */ }
},20);

// Round robin: at most two player samples every two ticks, even on large servers.
system.runInterval(()=>{
  const tick=system.currentTick;
  for(let n=0;n<Math.min(2,players.length);n++) {
    const player=players[cursor++%players.length];
    try {
      if(!player.isValid) continue;
      let state=states.get(player.id);
      if(!state) {state=createState();states.set(player.id,state);}
      emitAmbient(player,state,tick,time,weather);
    } catch(error) {
      if(/unloaded|bounds|invalid entity/i.test(String(error))) continue;
      if(!reported){console.warn('[WARLAND particles] '+String(error));reported=true;}
    }
  }
},2);
