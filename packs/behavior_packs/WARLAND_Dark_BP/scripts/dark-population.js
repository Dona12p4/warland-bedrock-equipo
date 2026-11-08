import {world,system} from '@minecraft/server';
import {cfg} from './config.js';
const C=cfg.population,c=cfg.center,r=cfg.radius;let next=0,last={};
export const populationSnapshot=()=>last;
export const inSector=e=>{try{return e.isValid!==false&&e.dimension.id==='minecraft:the_end'&&Math.abs(e.location.x-c.x)<r&&Math.abs(e.location.z-c.z)<r&&e.location.y>=cfg.floorY&&e.location.y<cfg.ceilingY;}catch{return false;}};
export function suppressVanilla(){const d=world.getDimension(cfg.dimension);for(const e of d.getEntities({type:'minecraft:enderman',location:c,maxDistance:r*1.6}))if(inSector(e))e.remove();}
export function populationTick(players,tick,random=Math.random){
 suppressVanilla();if(!cfg.automaticHostileSpawning)return null;
 const present=players.filter(p=>inSector(p));if(!present.length){next=tick+C.initialDelayTicks;return null;}
 if(!next){next=tick+C.initialDelayTicks;return null;}if(tick<next)return null;next=tick+C.intervalTicks;
 const d=world.getDimension(cfg.dimension),mobs=d.getEntities().filter(e=>inSector(e)&&C.types.includes(e.typeId));
 const cap=Math.min(C.maximumCap,C.baseCap+(present.length-1)*C.extraPerPlayer);last={tick,present:present.length,mobs:mobs.length,cap,blocked:0,errors:[]};if(mobs.length>=cap)return null;
 const counts=new Map(C.types.map(t=>[t,mobs.filter(e=>e.typeId===t).length]));const types=[...C.types].sort((a,b)=>counts.get(a)-counts.get(b));
 for(let attempt=0;attempt<80;attempt++){
  const anchor=present[Math.floor(random()*present.length)],a=random()*Math.PI*2,range=C.minimumDistance+random()*(C.maximumDistance-C.minimumDistance),pos={x:Math.floor(anchor.location.x+Math.cos(a)*range)+.5,y:cfg.floorY+1,z:Math.floor(anchor.location.z+Math.sin(a)*range)+.5};
  if(Math.abs(pos.x-c.x)>r-4||Math.abs(pos.z-c.z)>r-4||present.some(p=>Math.hypot(p.location.x-pos.x,p.location.z-pos.z)<C.minimumDistance)||mobs.some(e=>Math.hypot(e.location.x-pos.x,e.location.z-pos.z)<5))continue;
  try{let clear=true;for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(let dy=0;dy<5;dy++)if(!d.getBlock({x:Math.floor(pos.x)+dx,y:pos.y+dy,z:Math.floor(pos.z)+dz})?.isAir)clear=false;const floor=d.getBlock({...pos,y:pos.y-1});const safeFloor=['warland:umbral_stone','warland:umbral_tile','minecraft:blackstone','minecraft:deepslate_tiles'].includes(floor?.typeId);last.floor={type:floor?.typeId,safe:safeFloor};if(!clear||!safeFloor){last.blocked++;continue;}
   const e=d.spawnEntity(types[0],pos);e.addTag('wl_umbral_natural');return e;
  }catch(error){if(last.errors.length<3)last.errors.push(String(error));}
 }
 return null;
}
world.afterEvents.entitySpawn.subscribe(({entity})=>{if(entity.typeId==='minecraft:enderman'&&inSector(entity))system.run(()=>{try{if(entity.isValid&&inSector(entity))entity.remove();}catch{}});});
system.runInterval(()=>{if(world.getDynamicProperty('warland:dark_sector_v1'))populationTick(world.getAllPlayers(),system.currentTick);},20);
