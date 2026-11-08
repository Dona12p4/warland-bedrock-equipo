import {clearSightActive,echoFogPhase,ECHO_FOG_STEPS} from './umbral-clear-sight.js';
import {system,world} from '@minecraft/server';
import {isGenerated} from './terrain.js';
// Hide vanilla terrain until the replacement generator has finished that chunk.
// No extra ticking areas or blindness: the radius grows with completed terrain.
export function safeGeneratedRadius(position,generated=isGenerated,max=144){
 const cx=Math.floor(position.x/16),cz=Math.floor(position.z/16),r=Math.ceil(max/16);let nearest=max;
 for(let x=cx-r;x<=cx+r;x++)for(let z=cz-r;z<=cz+r;z++){
  if(generated(x,z))continue;
  const dx=Math.max(x*16-position.x,0,position.x-(x*16+16));
  const dz=Math.max(z*16-position.z,0,position.z-(z*16+16));
  nearest=Math.min(nearest,Math.hypot(dx,dz));
 }return Math.max(0,nearest-4);
}
const cached=new Map();
world.afterEvents.playerLeave.subscribe(({playerId})=>cached.delete(playerId));
export function generationFogFor(p){
 // Smooth transitions do not multiply the terrain scan rate for a stationary
 // player. Recompute promptly after movement or the existing 10-tick cadence.
 const pos=p.location;
 if(!isGenerated(Math.floor(pos.x/16),Math.floor(pos.z/16)))return 'generation_0';
 const key=`${Math.floor(pos.x)},${Math.floor(pos.z)},${Math.floor(system.currentTick/10)}`;
 let c=cached.get(p.id);if(c?.key!==key){c={key,distance:safeGeneratedRadius(pos)};cached.set(p.id,c);}
 const cap=[0,4,8,16,24,32,48,64,80,96,112,128].filter(v=>v<=c.distance).at(-1)??0;
 if(clearSightActive(p))return 'clear_generation_'+cap;
 const phase=echoFogPhase(p);
 return (phase===ECHO_FOG_STEPS?'generation_':`soft_${phase}_`)+cap;
}
