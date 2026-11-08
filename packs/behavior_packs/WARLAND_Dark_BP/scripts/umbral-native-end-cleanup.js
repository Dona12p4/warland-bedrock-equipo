import {world,system} from '@minecraft/server';
import {terrainAt,isGenerated} from './terrain.js';
const done=new Set(),pending=new Set(),PREFIX='warland:end_native_clean_v1_';
export function nativeStructureBlock(id,x,y,z){
 const radius=Math.hypot(x+.5,z+.5);
 return y>=32&&y<=125&&((radius>=36&&radius<=51&&['minecraft:obsidian','minecraft:iron_bars','minecraft:bedrock'].includes(id))||(Math.abs(x)<=5&&Math.abs(z)<=5&&['minecraft:bedrock','minecraft:end_portal','minecraft:torch'].includes(id)));
}
export function cleanNativeChunk(cx,cz){
 const key=PREFIX+cx+'_'+cz;if(done.has(key)||pending.has(key)||world.getDynamicProperty(key)===true||!isGenerated(cx,cz))return;
 if(cx < -4||cx>3||cz < -4||cz>3)return;
 pending.add(key);system.runJob((function*(){try{
  const d=world.getDimension('the_end');
  for(let x=cx*16;x<cx*16+16;x++)for(let z=cz*16;z<cz*16+16;z++){
   const radius=Math.hypot(x+.5,z+.5);if(!((radius>=36&&radius<=51)||(Math.abs(x)<=5&&Math.abs(z)<=5)))continue;
   const terrain=terrainAt(x+.5,z+.5);
   for(let y=32;y<=125;y++){
    const b=d.getBlock({x,y,z});if(!b)throw Error('Chunk unloaded');
    if(nativeStructureBlock(b.typeId,x,y,z))b.setType(terrain.solid?'warland:umbral_pillar':y<=terrain.floor||y>=terrain.ceiling?'warland:umbral_stone':'minecraft:air');
    if(y%24===0)yield;
   }yield;
  }
  done.add(key);world.setDynamicProperty(key,true);
 }catch{}finally{pending.delete(key);}})());
}
export function suppressEndBoss(e){
 try{if(e.dimension.id==='minecraft:the_end'&&['minecraft:ender_dragon','minecraft:ender_crystal','minecraft:dragon_fireball'].includes(e.typeId))e.remove();}catch{}
}
world.afterEvents.entitySpawn.subscribe(({entity})=>suppressEndBoss(entity));
world.afterEvents.entityLoad.subscribe(({entity})=>suppressEndBoss(entity));
system.runInterval(()=>{
 const d=world.getDimension('the_end');for(const type of ['minecraft:ender_dragon','minecraft:ender_crystal','minecraft:dragon_fireball'])for(const e of d.getEntities({type}))suppressEndBoss(e);
 // Clean only the fixed vanilla arena, only generated chunks, once. No reset.
 for(const p of d.getPlayers())if(Math.hypot(p.location.x,p.location.z)<128){
  let scheduled=0;for(let x=-4;x<=3&&scheduled<2;x++)for(let z=-4;z<=3&&scheduled<2;z++){
   const key=PREFIX+x+'_'+z;if(done.has(key)||pending.has(key)||world.getDynamicProperty(key)===true)continue;
   try{if(d.getBlock({x:x*16,y:80,z:z*16})&&isGenerated(x,z)){cleanNativeChunk(x,z);scheduled++;}}catch{}
  }
 }
},20);
