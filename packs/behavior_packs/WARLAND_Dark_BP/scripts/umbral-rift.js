import {world,system} from '@minecraft/server';
import {riftConfig as cfg} from './umbral-rift-config.js';
import {readVisit,joinVisit,leaveVisit,activateVisit,RIFT_STATE,inRiftDimension,touchingRift,signalProjection,repairDistantVisit} from './umbral-rift-policy.js';
import {chooseRiftExit} from './umbral-rift-route.js';
import {breakRiftChestplate} from './umbral-rift-armor.js';
export function installRift({leave,canJoin=()=>true}){
 let state=null,job=null,retryAt=0,lastSaved='',nextVisual=0;
 const returning=new Set(),retryReturn=new Map();
 const load=()=>{if(!state){state=readVisit(world.getDynamicProperty(RIFT_STATE));if(repairDistantVisit(state,cfg))world.setDynamicProperty(RIFT_STATE,JSON.stringify(state));}return state;};
 const save=()=>{const json=JSON.stringify(state);if(json!==lastSaved){world.setDynamicProperty(RIFT_STATE,json);lastSaved=json;}};
 const alive=p=>{try{return (p.getComponent('minecraft:health')?.currentValue??1)>0;}catch{return false;}};
 const join=p=>{if(!canJoin(p)||!alive(p))return;load();joinVisit(state,p.id,p.location);save();};
 const remove=id=>{load();leaveVisit(state,id);save();};
 function prepare(){
  load();if(job||state.phase!=='preparing'||system.currentTick<retryAt||!world.getAllPlayers().some(inRiftDimension))return;
  const serial=state.serial,valid=()=>state.serial===serial&&state.phase==='preparing'&&state.members.length>0;
  job=chooseRiftExit(state.origin,state.previous,cfg,valid).then(p=>{
   if(p&&activateVisit(state,serial,p))save();
   else retryAt=system.currentTick+200;
  }).catch(e=>{retryAt=system.currentTick+200;console.warn('[UMBRAL] Grieta: '+String(e));}).finally(()=>{job=null;});
 }
 function signal(p){
  const head=p.getHeadLocation();
  for(const distance of [10,6,3]){
   const pos=signalProjection(head,state.position,distance);
   try{if(p.dimension.getBlock(pos)?.isAir){p.spawnParticle('warland:rift_signal',pos);return true;}}catch{}
  }
  return false;
 }
 function visuals(players){
  if(state.phase!=='active')return;
  // Orientation now comes from the held compass; native sky flashes remain ambient.
  if(system.currentTick<nextVisual)return;nextVisual=system.currentTick+16;
  for(const p of players)if(Math.hypot(p.location.x-state.position.x,p.location.z-state.position.z)<40){
   try{p.spawnParticle('warland:rift_gate',{x:state.position.x,y:state.position.y+1.7,z:state.position.z});}catch{}
  }
 }
 function tick(){
  load();const all=world.getAllPlayers(),present=all.filter(p=>inRiftDimension(p)&&canJoin(p)&&alive(p));
  for(const p of all){if(inRiftDimension(p)&&alive(p)){if(canJoin(p))joinVisit(state,p.id,p.location);}else if(state.members.includes(p.id))leaveVisit(state,p.id);}
  save();prepare();visuals(present);
  if(state.phase!=='active')return;
  for(const p of present)if(touchingRift(p,state.position,cfg.riftRadius)&&!returning.has(p.id)&&system.currentTick>=(retryReturn.get(p.id)??0)){
   returning.add(p.id);leave(p).then(ok=>{if(ok){breakRiftChestplate(p);remove(p.id);}else retryReturn.set(p.id,system.currentTick+100);})
    .catch(e=>{retryReturn.set(p.id,system.currentTick+100);console.warn('[UMBRAL] Grieta: '+String(e));}).finally(()=>returning.delete(p.id));
  }
 }
 world.afterEvents.worldLoad.subscribe(()=>{load();lastSaved=JSON.stringify(state);});
 world.afterEvents.playerDimensionChange.subscribe(({player:p})=>{if(inRiftDimension(p))join(p);else remove(p.id);});
 world.afterEvents.playerSpawn.subscribe(({player:p})=>system.run(()=>{if(p.isValid){if(inRiftDimension(p))join(p);else remove(p.id);}}));
 world.afterEvents.entityDie.subscribe(({deadEntity:e})=>{if(e.typeId==='minecraft:player')remove(e.id);});
 system.runInterval(()=>{try{tick();}catch(e){console.warn('[UMBRAL] Grieta: '+String(e));}},cfg.scanTicks);
 return {state:()=>structuredState(load()),tick,join,remove,signal,async preview(p){
  if(!inRiftDimension(p))return;prepare();if(job)await job;
  if(state.phase==='active')p.teleport({...state.position,z:state.position.z+3},{dimension:world.getDimension('the_end')});
  else p.sendMessage('§7Buscando un paso seguro…');
 }};
}
const structuredState=s=>JSON.parse(JSON.stringify(s));
