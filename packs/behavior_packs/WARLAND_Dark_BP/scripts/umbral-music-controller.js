export const MUSIC_OWNED='warland:umbral_music_owned_v1';
export const AMBIENT_OWNED='warland:umbral_ambient_owned_v2';
// One non-positional ambient sound per client. Uses sound volume, not music.
// Wall-clock duration matches streamed audio even if server ticks lag.
export function createUmbralMusicController(cfg,now=Date.now){
 const playing=new Map();
 const marked=p=>p.getDynamicProperty(AMBIENT_OWNED)===true;
 function migrate(p){
  if(p.getDynamicProperty(MUSIC_OWNED)===true){p.stopMusic();p.setDynamicProperty(MUSIC_OWNED,undefined);}
 }
 function stop(p){
  migrate(p);
  if(!playing.has(p.id)&&!marked(p))return false;
  p.runCommand('stopsound @s '+cfg.track);
  playing.delete(p.id);p.setDynamicProperty(AMBIENT_OWNED,undefined);return true;
 }
 function update(p,restart=false){
  if(p.isValid===false)return false;
  migrate(p);
  const inside=p.dimension.id==='minecraft:the_end';
  const alive=(p.getComponent('minecraft:health')?.currentValue??1)>0;
  if(!inside||!alive)return stop(p);
  const due=playing.get(p.id);
  if(due!==undefined&&!restart&&(!cfg.loop||now()<due))return false;
  if(marked(p))p.runCommand('stopsound @s '+cfg.track);
  p.playSound(cfg.track,{volume:cfg.volume,pitch:1});
  playing.set(p.id,now()+cfg.durationSeconds*1000);
  p.setDynamicProperty(AMBIENT_OWNED,true);return true;
 }
 return {update,stop,forget:id=>playing.delete(id),has:id=>playing.has(id)};
}
