export const ARRIVED='warland:lobby_arrived_v1';
export function insideLight(position,dimensionId,cfg){
 return dimensionId==='minecraft:overworld'&&Math.hypot(position.x-cfg.spawn.x,position.z-cfg.spawn.z)<=cfg.lightRadius&&Math.abs(position.y-cfg.spawn.y)<=1.1;
}
export function firstArrivalDecision(player,initialSpawn,cfg){
 if(!initialSpawn||player.getDynamicProperty(ARRIVED)===true)return 'keep';
 if(cfg.existingPlayerIds.includes(player.id)||cfg.existingPlayerNames.includes(player.name.toLowerCase()))return 'existing';
 return 'arrive';
}
export function safeArrival(dimension,point){
 try{for(const [dx,dz]of [[0,0],[-.25,-.25],[.25,.25]]){
  const x=Math.floor(point.x+dx),z=Math.floor(point.z+dz),feet=Math.floor(point.y);
  const floor=dimension.getBlock({x,y:feet-1,z});if(!floor||floor.isAir||floor.isLiquid||!['minecraft:chiseled_quartz_block','warland:cuna_chiseled__stained','warland:cuna_chiseled__dark'].includes(floor.typeId))return false;
  for(let y=feet;y<feet+2;y++){const b=dimension.getBlock({x,y,z});if(!b||!b.isAir)return false;}
 }return true;}catch{return false;}
}
