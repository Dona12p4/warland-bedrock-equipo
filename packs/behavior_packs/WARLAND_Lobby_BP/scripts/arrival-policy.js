// One shared timeline for the native camera, particles and the review viewer.
export const ARRIVAL = Object.freeze({ticks:110,impact:48,reveal:76,returnView:104,settle:4,height:26,maxConcurrent:8,maxWait:1200});
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
 const drop=smooth(t/ARRIVAL.impact),orbit=smooth((t-ARRIVAL.impact)/(ARRIVAL.returnView-ARRIVAL.impact));
 const angle=(-36+orbit*16)*Math.PI/180,radius=8-orbit*2.4;
 return {
  lightY:1.1+ARRIVAL.height*(1-drop),
  location:{x:spawn.x+Math.sin(angle)*radius,y:spawn.y+2.6+Math.sin(orbit*Math.PI)*.7,z:spawn.z-Math.cos(angle)*radius},
  facingLocation:{x:spawn.x,y:spawn.y+Math.max(1.15,1.1+ARRIVAL.height*(1-drop)),z:spawn.z},
  phase:t<ARRIVAL.impact?'descent':t<ARRIVAL.reveal?'formation':t<ARRIVAL.returnView?'reveal':'return'
 };
}
