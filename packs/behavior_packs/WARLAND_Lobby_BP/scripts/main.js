import {world,system,Player,CommandPermissionLevel,CustomCommandStatus} from '@minecraft/server';
import {ActionFormData} from '@minecraft/server-ui';
import {lobbyConfig as cfg} from './lobby-config.js';
import {ARRIVED,insideLight,firstArrivalDecision,safeArrival} from './lobby-policy.js';
import {currentDay,ensureTimelineLight} from './lobby-timeline-runtime.js';
const pending=new Map(),sneaking=new Map(),forms=new Set(),visits=new Set();let pulse=0;
const admin=p=>['danielgamersc','hatsudemiku'].includes(p.name.toLowerCase());
function audit(action,p,extra={}){console.warn('[WARLAND_LOBBY] '+JSON.stringify({action,gamertag:p?.name,displayName:p?.nameTag,at:new Date().toISOString(),dimension:p?.dimension.id,position:p?.location,...extra}));}
function birth(){try{world.getDimension('overworld').spawnParticle('warland:lobby_birth_d'+currentDay(),{x:cfg.spawn.x,y:cfg.spawn.y+3.8,z:cfg.spawn.z});}catch{}}
export function arrive(p,initialSpawn){
 const choice=firstArrivalDecision(p,initialSpawn,cfg);
 if(choice==='keep')return choice;
 if(choice==='existing'){p.setDynamicProperty(ARRIVED,true);return choice;}
 if(pending.has(p.id))return 'pending';
 const token={attempts:0};pending.set(p.id,token);
 const attempt=()=>{
  if(!p.isValid||pending.get(p.id)!==token){pending.delete(p.id);return;}
  const d=world.getDimension('overworld');
  if(safeArrival(d,cfg.spawn)){
   try{p.teleport(cfg.spawn,{dimension:d,rotation:{x:-5,y:180}});p.setDynamicProperty(ARRIVED,true);birth();audit('first_arrival',p);pending.delete(p.id);return;}
   catch(e){if(token.attempts>=10)audit('first_arrival_deferred',p,{reason:String(e)});}
  }
  if(++token.attempts<=10)system.runTimeout(attempt,10);else{pending.delete(p.id);audit('first_arrival_deferred',p,{reason:'Spawn floor not loaded or no longer safe'});}
 };
 system.runTimeout(attempt,5);return choice;
}
export async function showGifts(p){
 if(!p.isValid||!insideLight(p.location,p.dimension.id,cfg)||forms.has(p.id))return false;
 forms.add(p.id);
 try{
  // A real catalog has not been chosen. Never grant the viewer's demonstration gift.
  await new ActionFormData().title('Regalos de Dios').body('Estás dentro de la luz.\n\nTodavía no hay regalos disponibles. Vuelve a este lugar para recibirlos cuando lleguen.').button('Volver').show(p);
  return true;
 }catch{return false;}finally{forms.delete(p.id);}
}
system.beforeEvents.startup.subscribe(({customCommandRegistry:r})=>{
 for(const [name,description,action]of [
  ['regalos','Recibir los regalos de Dios dentro de la luz',p=>{if(!insideLight(p.location,p.dimension.id,cfg)){p.sendMessage('§eEntra en la luz de la Cuna para consultar los regalos.');return;}showGifts(p);}],
  ['lobby','Administradores: visitar la Cuna del Último Dios',p=>{
   if(!admin(p)){p.sendMessage('§cEsta visita de revisión es solo para administradores.');return;}
   const d=world.getDimension('overworld');
   // Admin inspection only. The ordinary return/travel mechanic remains undecided.
   if(visits.has(p.id))return;visits.add(p.id);
   const name='wl_lobby_visit_'+p.name.toLowerCase();try{d.runCommand(`tickingarea add circle ${cfg.spawn.x} ${cfg.spawn.y} ${cfg.spawn.z} 1 ${name} true`);}catch{}
   system.runTimeout(()=>{try{if(p.isValid&&safeArrival(d,cfg.spawn)){p.teleport(cfg.spawn,{dimension:d,rotation:{x:-5,y:180}});audit('admin_visit',p);}}finally{visits.delete(p.id);try{d.runCommand('tickingarea remove '+name);}catch{}}},30);
  }]
 ])r.registerCommand({name:'warland:'+name,description,permissionLevel:CommandPermissionLevel.Any,cheatsRequired:false},o=>{
  if(!(o.sourceEntity instanceof Player))return{status:CustomCommandStatus.Failure,message:'Requiere un jugador.'};
  system.run(()=>action(o.sourceEntity));return{status:CustomCommandStatus.Success};
 });
});
world.afterEvents.playerSpawn.subscribe(({player,initialSpawn})=>system.run(()=>arrive(player,initialSpawn)));
world.afterEvents.playerLeave.subscribe(({playerId})=>{pending.delete(playerId);sneaking.delete(playerId);forms.delete(playerId);});
world.afterEvents.worldLoad.subscribe(()=>system.run(()=>{
 const d=world.getDimension('overworld');for(const n of ['danielgamersc','hatsudemiku'])try{d.runCommand('tickingarea remove wl_lobby_visit_'+n);}catch{}
 console.warn('[WARLAND_LOBBY_READY] '+JSON.stringify({version:cfg.version,spawn:cfg.spawn,realGiftsConfigured:false}));
 for(const p of world.getAllPlayers())arrive(p,true);
}));
system.runInterval(()=>{
 const emit=++pulse%4===0;
 for(const p of world.getAllPlayers()){
  const inside=insideLight(p.location,p.dimension.id,cfg),was=sneaking.get(p.id)??false;
  if(inside&&p.isSneaking&&!was)showGifts(p);sneaking.set(p.id,p.isSneaking);
  if(!emit)continue;
  if(p.dimension.id==='minecraft:overworld'&&Math.hypot(p.location.x-cfg.spawn.x,p.location.z-cfg.spawn.z)<48){
   ensureTimelineLight();
   try{p.spawnParticle((inside?'warland:lobby_light_inner_d':'warland:lobby_light_d')+currentDay(),{x:cfg.spawn.x,y:cfg.spawn.y+3.8,z:cfg.spawn.z});}catch{}
  }
  if(inside&&!forms.has(p.id))try{p.onScreenDisplay.setActionBar('§eAgáchate §7· §fRegalos de Dios');}catch{}
 }
},5);
