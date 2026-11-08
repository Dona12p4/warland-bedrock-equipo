import {world,system} from '@minecraft/server';
import {musicConfig as cfg} from './umbral-music-config.js';
import {createUmbralMusicController} from './umbral-music-controller.js';
export const umbralMusic=createUmbralMusicController(cfg);
function update(p,restart=false){try{umbralMusic.update(p,restart);}catch(e){console.warn('[UMBRAL] Música: '+String(e));}}
world.afterEvents.playerDimensionChange.subscribe(({player})=>system.run(()=>update(player)));
world.afterEvents.playerSpawn.subscribe(({player})=>system.run(()=>update(player,true)));
world.afterEvents.playerLeave.subscribe(({playerId})=>umbralMusic.forget(playerId));
world.afterEvents.entityDie.subscribe(({deadEntity:p})=>{try{if(p.typeId==='minecraft:player')umbralMusic.stop(p);}catch{}});
world.afterEvents.worldLoad.subscribe(()=>system.run(()=>{for(const p of world.getAllPlayers())update(p);}));
system.runInterval(()=>{for(const p of world.getAllPlayers())update(p);},cfg.pollTicks);
