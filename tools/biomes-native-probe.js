// TEST ONLY: inserted exclusively in the disposable full-pack laboratory.
import {world,system,GameMode,WeatherType} from '@minecraft/server';
import {spawnSimulatedPlayer} from '@minecraft/server-gametest';
import {createState,emitAmbient,samplePlayer} from './components/warland_biomesparticles_bp/ambient.js';
const checks=[];
const check=(name,passed,details)=>{checks.push({name,passed:!!passed,details});if(!passed)throw Error(name);};
const wait=t=>new Promise(r=>system.runTimeout(r,t));
world.afterEvents.worldLoad.subscribe(()=>system.runTimeout(async()=>{
 let player;
 try {
  const d=world.getDimension('overworld');
  d.runCommand('tickingarea add circle 10000 110 10000 2 biomes_probe true');await wait(50);
  d.runCommand('fill 9996 109 9996 10004 109 10004 stone');
  d.runCommand('fill 9996 110 9996 10004 160 10004 air');
  d.runCommand('gamerule doMobSpawning false');
  player=spawnSimulatedPlayer({dimension:d,x:10000.5,y:110,z:10000.5},'Particulas Probe',GameMode.Creative);
  await wait(30);player.teleport({x:10000.5,y:110,z:10000.5},{dimension:d});
  check('native getBiome available',!!d.getBiome(player.location).id);
  check('native player-only particles available',typeof player.spawnParticle==='function');
  d.setWeather(WeatherType.Rain,6000);await wait(100);
  check('existing rain queried on startup',String(d.getWeather()).toLowerCase()==='rain',d.getWeather());
  const sample=samplePlayer(player,null,0);check('native roof and biome sample',sample?.outdoors&&!sample.underwater,sample);
  const result=emitAmbient(player,createState(),0,6000,'Rain',()=>0);
  check('native targeted particle emission',result.emitted,result);
  d.runCommand('setblock 10000 150 10000 stone');
  const roof=emitAmbient(player,createState(),0,6000,'Rain',()=>0);
  check('roof 40 blocks above blocks weather',roof.reason==='roof',roof);
  d.runCommand('setblock 10000 150 10000 air');
  d.runCommand('fill 10000 110 10000 10000 112 10000 water');
  const wet=emitAmbient(player,createState(),0,6000,'Clear',()=>0);
  check('underwater chooses water-only effect',wet.effect?.includes('underwater'),wet);
  d.runCommand('fill 10000 110 10000 10000 112 10000 air');
  const state=createState();let emitted=0;
  for(let t=0;t<12000;t+=20){if(emitAmbient(player,state,t,6000,'Rain',()=>0).emitted)emitted++;}
  check('sustained native budget does not exceed six',state.active.length<=6&&emitted>100,{emitted,active:state.active.length});
  // The test above accelerates calls; it tests bookkeeping/API, not GPU/FPS.
  console.warn('[BIOMES_RESULT] '+JSON.stringify({passed:true,checks}));
 }catch(e){console.warn('[BIOMES_RESULT] '+JSON.stringify({passed:false,error:String(e),checks}));}
 finally{try{player?.disconnect();world.getDimension('overworld').runCommand('tickingarea remove biomes_probe');}catch{}}
},20));
