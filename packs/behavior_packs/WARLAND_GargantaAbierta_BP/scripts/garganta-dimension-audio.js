import {world,system,MolangVariableMap} from '@minecraft/server';
const TYPE='warland:garganta_abierta_prototype',pending=new Map(),waves=new Map();let serial=0;
export const audioRange={echo:1024,alarm:Infinity};
// Send the cue to players, not only clients tracking the emitter's chunk.
// Project a nearby source in the real direction so a distant cry retains stereo.
export function listenerSound(origin,listener,alarm){
 const delta={x:origin.x-listener.x,y:origin.y-listener.y,z:origin.z-listener.z},distance=Math.hypot(delta.x,delta.y,delta.z);
 if(!alarm&&distance>audioRange.echo)return null;
 const factor=Math.min(1,4/Math.max(.001,distance));
 return {location:{x:listener.x+delta.x*factor,y:listener.y+delta.y*factor,z:listener.z+delta.z*factor},volume:alarm?1:.95,pitch:1};
}
export function ringFrame(e){const d=e.getViewDirection(),l=Math.hypot(d.x,d.y,d.z)||1,direction={x:d.x/l,y:d.y/l,z:d.z/l};return {direction,origin:{x:e.location.x+direction.x*1.5,y:e.location.y+1.5+direction.y*1.5,z:e.location.z+direction.z*1.5}};}
export function emitScreamRing(e){
 const {direction,origin}=ringFrame(e),v=new MolangVariableMap();
 for(const axis of ['x','y','z'])v.setFloat('variable.wl_d'+axis,direction[axis]);
 e.dimension.spawnParticle('warland:garganta_scream_white',origin,v);return {direction,origin};
}
export function broadcastCall(e,clip){
 if(!e?.isValid)return 0;
 const origin={...e.location,y:e.location.y+1.4};let count=0;
 for(const p of e.dimension.getPlayers())try{
  const options=listenerSound(origin,p.getHeadLocation(),clip==='alarm');if(!options)continue;
  p.playSound('warland.garganta.'+clip,options);count++;
 }catch{}return count;
}
export function scheduleCall(e,eventId){
 if(e.typeId!==TYPE||!['warland:scan','warland:alarm'].includes(eventId))return false;
 const alarm=eventId==='warland:alarm',token=++serial;pending.set(e.id,token);
 if(alarm)waves.set(e.id,{e,next:system.currentTick+23,end:system.currentTick+135,left:16});else waves.delete(e.id);
 const clip=alarm?'alarm':'echo_0'+Math.min(3,Math.max(1,Number(e.getProperty('warland:echo'))||1));
 system.runTimeout(()=>{try{
  if(pending.get(e.id)!==token)return;pending.delete(e.id);
  if(e.isValid&&e.getProperty('warland:phase')===(alarm?2:1)&&(e.getComponent('minecraft:health')?.currentValue??0)>0)broadcastCall(e,clip);
 }catch{}},alarm?21:3);
 return true;
}
world.afterEvents.dataDrivenEntityTrigger.subscribe(({entity,eventId})=>scheduleCall(entity,eventId),{entityTypes:[TYPE],eventTypes:['warland:scan','warland:alarm']});
world.afterEvents.entityDie.subscribe(({deadEntity})=>{pending.delete(deadEntity.id);waves.delete(deadEntity.id);});
system.runInterval(()=>{let emitted=0;for(const [id,s]of waves)try{
 if(!s.e.isValid||s.e.getProperty('warland:phase')!==2||system.currentTick>s.end||s.left<=0){waves.delete(id);continue;}
 if(system.currentTick>=s.next&&emitted<6){emitScreamRing(s.e);s.left--;s.next+=7;emitted++;}
 }catch{waves.delete(id);}},2);
world.afterEvents.playerDimensionChange.subscribe(({player})=>{
 // Do not carry cries into the Overworld or another dimension after leaving.
 for(const clip of ['alarm','echo_01','echo_02','echo_03'])try{player.runCommand('stopsound @s warland.garganta.'+clip);}catch{}
});
