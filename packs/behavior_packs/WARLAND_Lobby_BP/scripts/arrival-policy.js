// One shared timeline for the native camera, particles and the review viewer.
export const ARRIVAL = Object.freeze({ticks:158,descent:48,cut:40,impact:96,reveal:124,returnView:152,settle:4,height:26,maxConcurrent:8,maxWait:1200});
// Cosmetic sky bolts only. No lightning entity, global weather or block damage.
export const ARRIVAL_STORM = Object.freeze([
 Object.freeze({tick:6,soundTick:12,offset:{x:-8,y:19,z:7},pitch:.82,volume:.6}),
 Object.freeze({tick:28,soundTick:34,offset:{x:9,y:21,z:4},pitch:.95,volume:.75})
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
 if(t<ARRIVAL.cut){
  const u=smooth(t/ARRIVAL.cut),angle=(-36+u*5)*Math.PI/180,radius=26-u*3;
  return {lightY:27.1,location:{x:spawn.x+Math.sin(angle)*radius,y:spawn.y+20-u*2,z:spawn.z-Math.cos(angle)*radius},facingLocation:{x:spawn.x,y:spawn.y+9,z:spawn.z},phase:'omen'};
 }
 const local=Math.max(0,t-ARRIVAL.descent),drop=smooth(local/(ARRIVAL.impact-ARRIVAL.descent)),orbit=smooth((t-ARRIVAL.impact)/(ARRIVAL.returnView-ARRIVAL.impact));
 // Look through the central opening first; the original wide angle hit the roof.
 const opening=smooth((local-24)/24);
 const angle=(-36+orbit*16)*Math.PI/180,radius=t<ARRIVAL.impact?.25+3.35*opening:3.6-orbit*.8;
 return {
  lightY:1.1+ARRIVAL.height*(1-drop),
  location:{x:spawn.x+Math.sin(angle)*radius,y:spawn.y+2.6+Math.sin(orbit*Math.PI)*.7,z:spawn.z-Math.cos(angle)*radius},
  facingLocation:{x:spawn.x,y:spawn.y+Math.max(1.15,1.1+ARRIVAL.height*(1-drop)),z:spawn.z},
  phase:t<ARRIVAL.descent?'omen':t<ARRIVAL.impact?'descent':t<ARRIVAL.reveal?'formation':t<ARRIVAL.returnView?'reveal':'return'
 };
}
