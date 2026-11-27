import {inPast,PAST} from './past-policy.js';
export const PAST_MUSIC={track:'warland.past.ambient',volume:0.5,durationSeconds:301.861,key:'warland:past_music_v1'};
// Same non-positional ambient channel and playback volume as the Umbral.
// The film's effects are a separate stem. Only the music continues exploring.
export function createPastMusic(now=Date.now){
 const playing=new Map();
 function stop(p){
  if(playing.has(p.id)||p.getDynamicProperty(PAST_MUSIC.key)){
   p.runCommand('stopsound @s '+PAST_MUSIC.track);playing.delete(p.id);p.setDynamicProperty(PAST_MUSIC.key,undefined);
  }
 }
 function update(p,restart=false){
  if(p.isValid===false)return;
  if(!inPast(p)||(p.getComponent('minecraft:health')?.currentValue??1)<=0){stop(p);return}
  const due=playing.get(p.id);
  if(!restart&&due!==undefined&&now()<due)return;
  stop(p);p.playSound(PAST_MUSIC.track,{volume:PAST_MUSIC.volume,pitch:1});
  p.setDynamicProperty(PAST_MUSIC.key,true);playing.set(p.id,now()+PAST_MUSIC.durationSeconds*1000);
 }
 return {update,stop,forget:id=>playing.delete(id)};
}
