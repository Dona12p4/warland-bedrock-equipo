// Acquisition only. Retaining an already acquired target is a separate policy.
export function canAcquireGhostTarget(ghost,target,clearLine,fovDegrees=120){
 try{
  if(target.dimension.id!==ghost.dimension.id)return false;
  const from={x:ghost.location.x,y:ghost.location.y+2.3,z:ghost.location.z};
  const dx=target.location.x-from.x,dz=target.location.z-from.z,distance=Math.hypot(dx,dz);
  const facing=ghost.getViewDirection(),flat=Math.hypot(facing.x,facing.z);
  if(flat<.0001)return false;
  if(distance>.1&&(dx*facing.x+dz*facing.z)/(distance*flat)<Math.cos(fovDegrees*Math.PI/360))return false;
  // A visible head or chest suffices; solid walls cannot grant a new target.
  return [.9,1.6].some(y=>clearLine(ghost.dimension,from,{x:target.location.x,y:target.location.y+y,z:target.location.z}));
 }catch{return false;}
}
