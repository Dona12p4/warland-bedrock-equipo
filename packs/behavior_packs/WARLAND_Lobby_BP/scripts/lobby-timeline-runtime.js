import {world,system,Player,BlockPermutation,CommandPermissionLevel,CustomCommandStatus} from '@minecraft/server';
import {ActionFormData} from '@minecraft/server-ui';
import {timelinePalette,timelineChunks} from './timeline-data.js';
import {nativePermutation} from './lobby-block-palette.js';
import {timelineAdmin,assertAdvance,weeksFrom,daysAfter,weekOf,dayInWeek,STAGE_TITLES} from './lobby-timeline-policy.js';

const KEY='warland:lobby_timeline_v1',AREA='wl_lobby_timeline',catalog=1;
let state,loaded=false,fault='',active,perms,readyAt=0,loadAttempts=0,lightDay=0;
const forms=new Set(),cache=new Map();
const d=()=>world.getDimension('overworld');
function readState(){
 if(loaded)return state;
 const raw=world.getDynamicProperty(KEY);
 state=raw===undefined?{catalog,day:1,job:null,history:[]}:JSON.parse(String(raw));
 if(state.catalog!==catalog||!Number.isInteger(state.day)||state.day<1||state.day>7)throw Error('Estado de la línea del tiempo incompatible.');
 if(state.job&&(!Number.isInteger(state.job.to)||state.job.to<=state.day||state.job.to>7||state.job.from!==state.day||!Number.isInteger(state.job.chunk)||state.job.chunk<0||state.job.chunk>timelineChunks.length||!Number.isInteger(state.job.cursor)||state.job.cursor<0))throw Error('Avance incompleto no válido; se ha detenido para conservar el lobby.');
 loaded=true;return state;
}
function save(){world.setDynamicProperty(KEY,JSON.stringify(state));}
export function currentDay(){try{return readState().day;}catch{return 1;}}
export function timelineStatus(){const s=readState();return JSON.parse(JSON.stringify(s));}
function actor(p){return {player:p.name,nameTag:p.nameTag,dimension:p.dimension.id,position:{...p.location}};}
function audit(action,who,extra={}){console.warn('[WARLAND_AUDIT] '+JSON.stringify({schema:2,category:'security',action,outcome:'confirmed',at:Date.now(),...who,...extra,protectedTerritory:'Lobby'}));}
function removeArea(){try{d().runCommand('tickingarea remove '+AREA);}catch{}}
export function requestTimelineAdvance(p,to,expected=currentDay()){
 const s=readState();assertAdvance(p,expected,to,s.day,!!s.job);
 // Persist the intent before the first block edit. Real names, never nameTag permissions.
 const who=actor(p);s.job={from:s.day,to,chunk:0,cursor:0,changed:0,preserved:0,actor:who,startedAt:Date.now(),error:''};save();active=undefined;
 audit('lobby_timeline_started',who,{from:s.day,to});return timelineStatus();
}
function chunkData(index){
 if(cache.has(index))return cache.get(index);
 const c=timelineChunks[index];const rows=c.data.split(';').map(line=>line.split('.').map(v=>parseInt(v,36)));
 const key='warland:lobby_edits_'+index,raw=world.getDynamicProperty(key),overrides=new Set(raw===undefined?[]:JSON.parse(String(raw)));
 if([...overrides].some(n=>!Number.isInteger(n)||n<0||n>=rows.length))throw Error('Registro de construcciones no válido.');
 const value={rows,overrides,key};cache.set(index,value);
 while(cache.size>4){const first=cache.keys().next().value;if(first===active?.index){const old=cache.get(first);cache.delete(first);cache.set(first,old);}else cache.delete(first);}
 return value;
}
function preserve(c,index){if(!c.overrides.has(index)){c.overrides.add(index);world.setDynamicProperty(c.key,JSON.stringify([...c.overrides]));}}
function initPalette(){if(!perms)perms=timelinePalette.map(p=>p.source?nativePermutation(p.source):BlockPermutation.resolve(p.id,p.states));}
export function timelinePermutation(index){initPalette();return perms[index];}
function matches(block,p){
 if(block.typeId!==p.type.id)return false;
 // Native stair corners are derived from neighbours; leaf updates are engine-owned.
 const actual=block.permutation.getAllStates();
 return Object.entries(p.getAllStates()).every(([k,v])=>k==='minecraft:corner'||k==='update_bit'||actual[k]===v);
}
export function ensureTimelineLight(){
 const day=currentDay();if(lightDay===day)return;
 try{const b=d().getBlock({x:1240,y:76,z:-1368});if(!b)return;
 if(b.typeId.startsWith('minecraft:light_block_'))b.setType('minecraft:light_block_'+[15,14,11,8,4,1,0][day-1]);
 lightDay=day;}catch{}
}
function beginChunk(job){
 if(active?.index===job.chunk)return true;
 if(job.chunk>=timelineChunks.length)return false;
 removeArea();const c=timelineChunks[job.chunk],data=chunkData(job.chunk);
 const work=[];for(let i=0;i<data.rows.length;i++){const row=data.rows[i];if(row[2+job.from]!==row[2+job.to])work.push(i);}
 if(!work.length){job.chunk++;job.cursor=0;save();return false;}
 if(job.cursor>work.length)throw Error('Punto de recuperación no válido.');
 const x=c.x*16,z=c.z*16;
 d().runCommand(`tickingarea add ${x} 0 ${z} ${x+15} 0 ${z+15} ${AREA} true`);
 active={index:job.chunk,c,data,work};readyAt=system.currentTick+10;loadAttempts=0;return true;
}
function complete(){
 const j=state.job;state.day=j.to;state.history.push({from:j.from,to:j.to,actor:j.actor,at:Date.now(),changed:j.changed,preserved:j.preserved});state.history=state.history.slice(-30);state.job=null;save();
 removeArea();active=undefined;lightDay=0;ensureTimelineLight();
 audit('lobby_timeline_completed',j.actor,{from:j.from,to:j.to,changed:j.changed,preserved:j.preserved});
 for(const p of world.getAllPlayers())if(timelineAdmin(p))p.sendMessage('§aLobby actualizado · Semana '+weekOf(state.day)+' · Día '+dayInWeek(state.day));
}
function step(){
 if(fault)return;
 try{
  const s=readState(),j=s.job;if(!j||j.error)return;
  initPalette();if(j.chunk>=timelineChunks.length){complete();return;}
  if(!beginChunk(j)||system.currentTick<readyAt)return;
  const start=Date.now();let count=0;
  while(j.cursor<active.work.length&&count<64&&Date.now()-start<3){
   const idx=active.work[j.cursor],row=active.data.rows[idx];
   if(active.data.overrides.has(idx)){j.preserved++;j.cursor++;count++;continue;}
   const loc={x:active.c.x*16+row[0],y:row[1],z:active.c.z*16+row[2]};let b;
   try{b=d().getBlock(loc);}catch{}
   if(!b){if(++loadAttempts>100)throw Error('No se pudo cargar una parte del lobby. Puedes reintentar desde el panel.');readyAt=system.currentTick+10;break;}
   loadAttempts=0;const from=perms[row[2+j.from]],to=perms[row[2+j.to]];
   if(b.getComponent('minecraft:inventory')){preserve(active.data,idx);j.preserved++;}
   else if(matches(b,to)){/* Already written before a restart/checkpoint. */}
   else if(matches(b,from)){b.setPermutation(to);j.changed++;}
   else{preserve(active.data,idx);j.preserved++;}
   j.cursor++;count++;
  }
  save();
  if(j.cursor===active.work.length){j.chunk++;j.cursor=0;save();active=undefined;removeArea();}
 }catch(e){
  removeArea();active=undefined;
  if(loaded&&state?.job){state.job.error=String(e);try{save();}catch{fault=String(e);}}
  else fault=String(e);
  console.warn('[WARLAND_TIMELINE_PAUSED] '+String(e));
 }
}
export function retryTimeline(p){if(!timelineAdmin(p))throw Error('Solo administradores autorizados.');const s=readState();if(!s.job)return;s.job.error='';save();active=undefined;fault='';}
function rememberEdit(e,loc){
 if(e.dimension?.id!=='minecraft:overworld')return;
 const cx=Math.floor(loc.x/16),cz=Math.floor(loc.z/16),index=timelineChunks.findIndex(c=>c.x===cx&&c.z===cz);
 if(index<0)return;
 try{const c=chunkData(index),i=c.rows.findIndex(r=>r[0]===loc.x-cx*16&&r[1]===loc.y&&r[2]===loc.z-cz*16);if(i>=0)preserve(c,i);}catch(err){fault=String(err);removeArea();console.warn('[WARLAND_TIMELINE_PAUSED] '+fault);}
}
world.afterEvents.playerPlaceBlock.subscribe(e=>rememberEdit(e,e.block.location));
world.afterEvents.playerBreakBlock.subscribe(e=>rememberEdit(e,e.block.location));

export async function showTimeline(p){
 if(!timelineAdmin(p)||forms.has(p.id))return;forms.add(p.id);
 try{
  let page='weeks',week=weekOf(currentDay());
  while(p.isValid){
   const s=readState(),day=s.day;
   if(fault)throw Error(fault);
   if(s.job){
    const j=s.job,form=new ActionFormData().title('Línea del tiempo').body('Cambiando al día '+dayInWeek(j.to)+' · '+Math.floor(j.chunk/timelineChunks.length*100)+' %'+(j.error?'\n\nEl avance está guardado. '+j.error:''));
    if(j.error)form.button('Reintentar');form.button('Cerrar');const r=await form.show(p);
    if(!r.canceled&&r.selection===0&&j.error)retryTimeline(p);return;
   }
   if(page==='weeks'){
    const list=weeksFrom(day),f=new ActionFormData().title('Línea del tiempo').body('Semana '+weekOf(day)+' · Día '+dayInWeek(day)+'\n'+STAGE_TITLES[day-1]);
    for(const w of list)f.button('Semana '+w.week+(w.locked?'\nPor diseñar':'\nLobby'));
    f.button('Cerrar');const r=await f.show(p);if(r.canceled||r.selection>=list.length)return;
    week=list[r.selection].week;page='days';continue;
   }
   if(week<weekOf(day)){page='weeks';continue;}
   const days=daysAfter(day,week),f=new ActionFormData().title('Semana '+week).body(week>1?'Lobby pendiente de diseño.':days.length?'Elige el siguiente estado del lobby.':'Primera semana completada.');
   for(const n of days)f.button('Día '+n.label+'\n'+n.title);f.button('Volver');const r=await f.show(p);
   if(r.canceled)return;if(r.selection>=days.length){page='weeks';continue;}
   const selected=days[r.selection];if(selected.locked){await new ActionFormData().title('Por diseñar').body('Esta etapa todavía no está disponible.').button('Volver').show(p);continue;}
   const confirm=await new ActionFormData().title('Avanzar al día '+selected.label).body(selected.title+'\n\nCambiará el lobby para todos. Los días anteriores dejarán de aparecer.').button('Avanzar').button('Cancelar').show(p);
   if(!confirm.canceled&&confirm.selection===0){requestTimelineAdvance(p,selected.day,day);p.sendMessage('§7Actualizando el lobby…');return;}
  }
 }catch(e){try{p.sendMessage('§e'+String(e.message??e));}catch{}}finally{forms.delete(p.id);}
}
system.beforeEvents.startup.subscribe(({customCommandRegistry:r})=>r.registerCommand({name:'warland:linea_del_tiempo',description:'Administradores: avanzar el estado del lobby',permissionLevel:CommandPermissionLevel.Any,cheatsRequired:false},o=>{
 const p=o.sourceEntity;if(!(p instanceof Player))return{status:CustomCommandStatus.Failure,message:'Solo jugadores.'};
 // Client command callbacks can reject Player.name in restricted execution.
 // Resolve real-name permissions on the next tick, before opening any form.
 system.run(()=>{
  try{
   if(!p.isValid)return;
   if(!timelineAdmin(p)){p.sendMessage('§eSolo administradores autorizados.');return;}
   void showTimeline(p);
  }catch(e){console.warn('[WARLAND_TIMELINE_COMMAND] '+String(e));}
 });return{status:CustomCommandStatus.Success};
}));
world.afterEvents.worldLoad.subscribe(()=>system.run(()=>{removeArea();try{readState();ensureTimelineLight();}catch(e){fault=String(e);console.warn('[WARLAND_TIMELINE_PAUSED] '+fault);}}));
world.afterEvents.playerLeave.subscribe(({playerId})=>forms.delete(playerId));
system.runInterval(step,1);
