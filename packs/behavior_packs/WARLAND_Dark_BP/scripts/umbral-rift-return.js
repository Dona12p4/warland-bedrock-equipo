import {world,system} from '@minecraft/server';
const wait=t=>new Promise(r=>system.runTimeout(r,t));
const danger=id=>/lava|magma|fire|cactus|campfire|powder_snow|sweet_berry|wither_rose|portal/.test(id??'');
const AREA_KEY='warland:rift_temporary_areas_v1';
function savedAreas(){try{return JSON.parse(world.getDynamicProperty(AREA_KEY)??'[]');}catch{return [];}}
function recordAreas(areas){world.setDynamicProperty(AREA_KEY,JSON.stringify(areas));}
export function openRiftArea(d,command,name){
 const saved=savedAreas().filter(a=>a.name!==name);saved.push({dimension:d.id,name});recordAreas(saved);
 try{const result=d.runCommand(command);if(result.successCount===0)throw Error('No se pudo cargar el área temporal '+name);}
 catch(e){recordAreas(saved.filter(a=>a.name!==name));throw e;}
}
export function closeRiftArea(d,name){try{d.runCommand('tickingarea remove '+name);}catch{}finally{recordAreas(savedAreas().filter(a=>a.name!==name));}}
world.afterEvents?.worldLoad?.subscribe(()=>{
 for(const a of savedAreas())if(/^wl_rift_(search|return)_\d+$/.test(a.name)&&['minecraft:overworld','minecraft:nether','minecraft:the_end'].includes(a.dimension)){
  try{world.getDimension(a.dimension).runCommand('tickingarea remove '+a.name);}catch{}
 }
 recordAreas([]);
});
export function safeSpawnFeet(d,p){
 const ground=d.getBlock({x:p.x,y:p.y-1,z:p.z}),feet=d.getBlock(p),head=d.getBlock({...p,y:p.y+1});
 if(!ground||ground.isAir||ground.isLiquid||danger(ground.typeId)||!feet?.isAir||!head?.isAir)return false;
 // Stable 2.10 has no Block.isSolid. A collision ray distinguishes actual
 // support from flowers/vines and other passable blocks without a guessed list.
 const hit=d.getBlockFromRay({...p,y:p.y+.01},{x:0,y:-1,z:0},{maxDistance:1.2,includeLiquidBlocks:false,includePassableBlocks:false});
 return !!hit&&hit.block.location.y===Math.floor(p.y)-1;
}
function nearbySpawn(d,point){
 for(let r=0;r<=4;r++)for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
  if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;
  for(const dy of [0,1,-1,2,-2,3,-3]){
   const p={x:Math.floor(point.x)+dx+.5,y:Math.floor(point.y)+dy,z:Math.floor(point.z)+dz+.5};
   try{if(safeSpawnFeet(d,p))return p;}catch{}
  }
 }
 return null;
}
let serial=0,queue=Promise.resolve();
export function returnToSpawn(player){
 const job=queue.then(()=>performReturn(player));queue=job.catch(()=>{});return job;
}
async function performReturn(player){
 const valid=()=>player.isValid&&player.dimension.id==='minecraft:the_end'&&(player.getComponent('minecraft:health')?.currentValue??1)>0;
 if(!valid())return false;
 let own;try{own=player.getSpawnPoint();}catch{}
 const candidates=[];
 if(own&&!['the_end','minecraft:the_end'].includes(own.dimension.id))candidates.push({dimension:own.dimension,point:own,global:false});
 candidates.push({dimension:world.getDimension('overworld'),point:world.getDefaultSpawnLocation(),global:true});
 for(const target of candidates){
  if(!valid())return false;const d=target.dimension,area='wl_rift_return_'+(++serial);let added=false;
  try{
   openRiftArea(d,`tickingarea add circle ${Math.floor(target.point.x)} 64 ${Math.floor(target.point.z)} 1 ${area} true`,area);added=true;await wait(30);
   for(let i=0;i<20&&valid();i++){let loaded=false;try{loaded=!!d.getBlock({x:Math.floor(target.point.x),y:64,z:Math.floor(target.point.z)});}catch{}if(loaded)break;await wait(5);}
   let destination=nearbySpawn(d,target.point);
   if(!destination&&target.global){
    for(let r=0;r<=12&&!destination;r+=2)for(let dx=-r;dx<=r&&!destination;dx+=2)for(let dz=-r;dz<=r&&!destination;dz+=2){
     if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;
     const x=Math.floor(target.point.x)+dx,z=Math.floor(target.point.z)+dz,top=d.getTopmostBlock({x,z});
     if(top){const p={x:x+.5,y:top.location.y+1,z:z+.5};if(safeSpawnFeet(d,p))destination=p;}
    }
   }
   if(destination&&valid()&&player.tryTeleport(destination,{dimension:d,checkForBlocks:true}))return true;
  }catch(e){console.warn('[UMBRAL] Regreso seguro: '+String(e));}
  finally{if(added)closeRiftArea(d,area);}
 }
 if(valid())player.sendMessage('§7Tu spawn está bloqueado. Despeja un lugar seguro.');return false;
}
