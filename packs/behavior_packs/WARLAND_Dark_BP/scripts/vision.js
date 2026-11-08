import {reconcileNightVision,beginEchoSight,sustainEchoSight,finishEchoSight} from './umbral-clear-sight.js';
export {reconcileNightVision} from './umbral-clear-sight.js';
import {world,system,MolangVariableMap} from '@minecraft/server';
import {cfg} from './void-config.js';
import {isGenerated} from './terrain.js';
import {waveSettings,createWave,nextGroundSample,sampleGround} from './umbral-echo-wave.js';
// Retain the item ID so existing potions and recipes become reusable emitters.
export const POTION=cfg.visionPotion.identifier;
export const VISION_KEY='warland:umbral_vision_until',SUSPENDED_KEY='warland:umbral_suspended_nv';
const jobs=new Map(),lastClick=new Map();let turn=0;
const inUmbral=p=>p.dimension.id==='minecraft:the_end',now=()=>world.getAbsoluteTime();
export const echoSettings=()=>waveSettings(cfg.echolocation);
export const remainingVision=()=>0;
export function clearUmbralVision(p,discard=false){p.setDynamicProperty(VISION_KEY,undefined);jobs.delete(p.id);finishEchoSight(p,{discard});}
export function fireEcho(p,tick=system.currentTick){
 if(!inUmbral(p)){try{p.sendMessage('§7El ecolocalizador responde dentro del Umbral.');}catch{}return false;}
 // An echo must work precisely when ambient blindness limits normal sight.
 // The capture sequence still owns input while the player is being devoured.
 if(p.getDynamicProperty('warland:devour_recovery'))return false;
 // Deduplicate item/block callbacks for the same physical click. No passive loop.
 if(jobs.has(p.id)||tick-(lastClick.get(p.id)??-100)<10)return false;lastClick.set(p.id,tick);
 const wave=createWave(p.location,p.getRotation().y,tick,echoSettings());jobs.set(p.id,{...wave,p,dimension:p.dimension.id});
 beginEchoSight(p);
 try{p.playSound('block.amethyst_block.chime',{volume:.25,pitch:.65});}catch{}
 return true;
}
export const drinkUmbralVision=fireEcho;
export function echoTick(tick=system.currentTick){
 const budget={rays:0,queries:0,emitted:0},settings=echoSettings(),list=[...jobs.values()];let idle=0,visits=0;
 for(const j of list){const p=j.p;
  if(!p.isValid){jobs.delete(p.id);continue;}
  if(p.dimension.id!==j.dimension||tick-j.started>4800||p.getDynamicProperty('warland:devour_recovery')){clearUmbralVision(p);continue;}
  if(j.finishAt!==undefined&&tick>=j.finishAt){clearUmbralVision(p);continue;}
  sustainEchoSight(p);
 }
 // One sample per turn, round robin. Global budgets don't multiply by players.
 while(list.length&&budget.rays<settings.raysPerTick&&budget.queries<=settings.queriesPerTick-6&&budget.emitted<settings.particlesPerTick&&visits<settings.raysPerTick*list.length*4){
  const j=list[(turn+visits++)%list.length],p=j.p;
  if(!jobs.has(p.id)){if(++idle>=list.length)break;continue;}
  if(j.finishAt!==undefined){if(++idle>=list.length)break;continue;}
  let progressed=false;
  if(!j.queue.length){const sample=nextGroundSample(j,tick);if(sample){j.queue.push(...sampleGround(p.dimension,j,sample,budget,isGenerated));progressed=true;}}
  if(j.queue.length){
   const h=j.queue.shift(),v=new MolangVariableMap();v.setFloat('variable.wl_size',.49);v.setFloat('variable.wl_alpha',.92);v.setFloat('variable.wl_normal',h.sign);
   try{p.spawnParticle('warland:umbral_echo_'+h.axis,h.location,v);}catch{}budget.emitted++;progressed=true;
  }
  if(j.finished&&!j.queue.length)j.finishAt=tick+Math.ceil(settings.lifetimeSeconds*20);
  if(progressed)idle=0;else if(++idle>=list.length)break;
 }
 turn=list.length?(turn+Math.max(1,visits))%list.length:0;return {...budget,active:jobs.size};
}
world.beforeEvents.itemUse.subscribe(e=>{if(e.itemStack.typeId===POTION){e.cancel=true;system.run(()=>{try{fireEcho(e.source);}catch{}});}});
world.beforeEvents.playerInteractWithBlock.subscribe(e=>{if(e.itemStack?.typeId===POTION){e.cancel=true;if(e.isFirstEvent)system.run(()=>{try{fireEcho(e.player);}catch{}});}});
world.afterEvents.playerSpawn.subscribe(({player,initialSpawn})=>system.run(()=>{clearUmbralVision(player,!initialSpawn);if(!initialSpawn)player.setDynamicProperty(SUSPENDED_KEY,undefined);}));
world.afterEvents.playerLeave.subscribe(e=>{jobs.delete(e.playerId);lastClick.delete(e.playerId);});
world.afterEvents.playerDimensionChange.subscribe(({player})=>clearUmbralVision(player));
world.afterEvents.itemCompleteUse.subscribe(({source,itemStack})=>{if(itemStack.typeId==='minecraft:milk_bucket'){clearUmbralVision(source,true);source.setDynamicProperty(SUSPENDED_KEY,undefined);}});
system.runInterval(()=>{echoTick();},1);
system.runInterval(()=>{for(const p of world.getAllPlayers())try{reconcileNightVision(p);}catch{}},10);
