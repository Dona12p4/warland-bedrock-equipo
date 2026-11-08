import {world,system,BlockVolume} from '@minecraft/server';
import {generatedBiomeAt,surfaceAt,isGenerated} from './terrain.js';

// Cosmetic local atmosphere only. It never applies an effect, changes the
// accepted spectral vision, damages players or illuminates the cavern.
export function emitHabitatAtmosphere(player,random=Math.random){
 if(player.dimension.id!=='minecraft:the_end')return 0;
 const d=player.dimension,p=player.location,id=generatedBiomeAt(p.x,p.z).id;let count=0;
 if(id==='sepulcher')for(let i=0;i<6;i++){
  const a=random()*Math.PI*2,r=4+random()*9,x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r,t=surfaceAt(x,z);
  if(t.solid||!isGenerated(Math.floor(x/16),Math.floor(z/16)))continue;
  const pos={x,y:t.floor+1.2,z};try{if(d.getBlock(pos)?.isAir){player.spawnParticle('warland:umbral_low_mist',pos);count++;}}catch{}
 }
 if(id==='ash')try{
  const v=new BlockVolume({x:Math.floor(p.x-16),y:Math.max(1,Math.floor(p.y-4)),z:Math.floor(p.z-16)},{x:Math.floor(p.x+16),y:Math.min(190,Math.floor(p.y+22)),z:Math.floor(p.z+16)});
  const blocks=d.getBlocks(v,{includeTypes:['warland:umbral_vent'],location:p,closest:3},true);
  for(const b of blocks.getBlockLocationIterator()){
   const pos={x:b.x+.5,y:b.y+1.08,z:b.z+.5};if(d.getBlock(pos)?.isAir){player.spawnParticle('warland:umbral_vent_vapor',pos);count++;}
  }
 }catch{}
 return count;
}
system.runInterval(()=>{for(const p of world.getAllPlayers())try{emitHabitatAtmosphere(p);}catch{}},40);
