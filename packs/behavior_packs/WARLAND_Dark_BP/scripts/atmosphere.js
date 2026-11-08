import './umbral-music.js';
import {world,system} from '@minecraft/server';
import {cfg} from './void-config.js';
export {POTION,drinkUmbralVision} from './vision.js';

// Falling ash is local to each observer. No beams, light, thunder or damage.
export function emitUmbralAsh(player,random=Math.random){
 if(player.dimension.id!=='minecraft:the_end')return 0;
 const head=player.getHeadLocation();let count=0;
 for(let i=0;i<cfg.atmosphere.particlesPerEmission;i++){
  const a=random()*Math.PI*2,r=1.5+random()*(cfg.atmosphere.radius-1.5);
  const p={x:head.x+Math.cos(a)*r,y:head.y-.4+random()*2.8,z:head.z+Math.sin(a)*r};
  try{if(player.dimension.getBlock(p)?.isAir){player.spawnParticle('warland:umbral_ash',p);count++;}}catch{}
 }
 return count;
}
system.runInterval(()=>{for(const p of world.getAllPlayers())try{emitUmbralAsh(p);}catch{}},cfg.atmosphere.intervalTicks);
