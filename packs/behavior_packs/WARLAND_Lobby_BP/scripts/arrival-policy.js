// One shared timeline for the native camera, particles and the review viewer.
export const ARRIVAL = Object.freeze({ticks:222,descent:60,impact:160,underRoof:172,reveal:188,returnView:216,settle:4,cloudY:194,maxConcurrent:8,maxWait:1200});
// Cosmetic sky bolts only. No lightning entity, global weather or block damage.
export const ARRIVAL_STORM = Object.freeze([
 Object.freeze({tick:18,soundTick:26,offset:{x:-7,y:0,z:3},pitch:.82,volume:.6}),
 Object.freeze({tick:40,soundTick:48,offset:{x:7,y:.3,z:-2},pitch:.95,volume:.75})
]);
export const CINEMATIC_TAG='warland_lobby_cinematic';
export const RESPAWN_TAG='warland_lobby_respawn_pending';
export const HEART_TAG='warland_heart_spectator';
export const RECOVERY='warland:lobby_cinematic_v1';
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function lobbyRespawn(at,dimension,defaultSpawn,personalSpawn,cfg){
 if(dimension!=='minecraft:overworld'||distance(defaultSpawn,cfg.spawn)>4||distance(at,cfg.spawn)>4)return false;
 // A surviving nearby bed/anchor/custom spawn is still a personal spawn.
 // A stale broken bed far away must not veto the engine's lobby fallback.
 if(personalSpawn&&personalSpawn.dimension.id===dimension&&distance(personalSpawn,at)<3&&distance(personalSpawn,cfg.spawn)>1)return false;
 return true;
}
export function arrivalFrame(t,spawn){
 // Overworld clouds occupy Y192..196, independent of the lobby's altitude.
 const startHeight=ARRIVAL.cloudY-spawn.y;
 if(t<ARRIVAL.descent){
  const u=smooth(t/ARRIVAL.descent),angle=(-50+u*14)*Math.PI/180,radius=28-27.75*u;
  return {lightY:startHeight,location:{x:spawn.x+Math.sin(angle)*radius,y:ARRIVAL.cloudY+22-15*u,z:spawn.z-Math.cos(angle)*radius},facingLocation:{x:spawn.x,y:ARRIVAL.cloudY,z:spawn.z},phase:'vortex'};
 }
 const drop=smooth((t-ARRIVAL.descent)/(ARRIVAL.impact-ARRIVAL.descent));
 const lightY=1.1+(startHeight-1.1)*(1-drop);
 const lowering=smooth((t-ARRIVAL.impact)/(ARRIVAL.underRoof-ARRIVAL.impact));
 const opening=smooth((t-ARRIVAL.underRoof)/(ARRIVAL.reveal-ARRIVAL.underRoof));
 const orbit=smooth((t-ARRIVAL.reveal)/(ARRIVAL.returnView-ARRIVAL.reveal));
 // Follow ABOVE the descending light, through the opening. Widen only below
 // the roof, so neither the camera nor its light sightline crosses solid blocks.
 const angle=(-36+orbit*16)*Math.PI/180,radius=.25+3.35*opening-orbit*.8;
 return {
  lightY,
  location:{x:spawn.x+Math.sin(angle)*radius,y:spawn.y+lightY+7-5.5*lowering+Math.sin(orbit*Math.PI)*.7,z:spawn.z-Math.cos(angle)*radius},
  facingLocation:{x:spawn.x,y:spawn.y+Math.max(1.1,lightY),z:spawn.z},
  phase:t<ARRIVAL.impact?'descent':t<ARRIVAL.reveal?'formation':t<ARRIVAL.returnView?'reveal':'return'
 };
}
