// Horizontal, terrain-following wave. Pure geometry: no world generation or timers.
export const WAVE_DEFAULTS=Object.freeze({range:2048,sectorDegrees:90,lanes:33,blocksPerTick:2,raysPerTick:24,particlesPerTick:18,queriesPerTick:192,lifetimeSeconds:0.7});
export function waveSettings(overrides={}){
 const clamp=(v,a,b,f)=>Number.isFinite(v)?Math.min(b,Math.max(a,v)):f;
 return {...WAVE_DEFAULTS,range:clamp(overrides.range,16,2048,2048),sectorDegrees:clamp(overrides.sectorDegrees,30,100,90)};
}
export function createWave(origin,yaw,tick,settings=WAVE_DEFAULTS){
 const lanes=Array.from({length:settings.lanes},(_,i)=>{
  const angle=(yaw+(i/(settings.lanes-1)-.5)*settings.sectorDegrees)*Math.PI/180;
  return {dx:-Math.sin(angle),dz:Math.cos(angle),y:origin.y,active:true};
 });
 return {origin:{...origin},yaw,started:tick,radius:1,lanes,cursor:0,seen:new Set(),chunkState:new Map(),queue:[],settings,finished:false};
}
export function radialStep(radius){return radius<24?1:radius<64?2:radius<128?4:radius<256?8:16;}
export function nextGroundSample(wave,tick){
 if(wave.finished||wave.radius>(tick-wave.started)*wave.settings.blocksPerTick)return null;
 while(wave.cursor<wave.lanes.length){
  const index=wave.cursor++,lane=wave.lanes[index];if(!lane.active)continue;
  const x=Math.floor(wave.origin.x+lane.dx*wave.radius),z=Math.floor(wave.origin.z+lane.dz*wave.radius),key=x+','+z;
  if(wave.seen.has(key))continue;wave.seen.add(key);
  return {index,lane,x,z,radius:wave.radius};
 }
 // Complete each band before the next, even when several players share the budget.
 if(wave.queue.length)return null;
 wave.radius+=radialStep(wave.radius);wave.cursor=0;wave.seen.clear();
 if(wave.radius>wave.settings.range||!wave.lanes.some(l=>l.active))wave.finished=true;
 return null;
}
export function sampleGround(dimension,wave,sample,budget,isReady){
 const {lane,x,z}=sample,chunk=Math.floor(x/16)+','+Math.floor(z/16),height=dimension.heightRange??{min:0,max:256};
 let y=Math.min(height.max-2,Math.max(height.min+1,lane.y+1)),at={x:x+.5,y,z:z+.5};
 const fail=()=>{lane.active=false;return [];};
 try{
  budget.queries++;
  // Recheck loaded state as a player may walk away while the wave advances.
  if(!dimension.isChunkLoaded(at))return fail();
  let ready=wave.chunkState.get(chunk);
  if(ready===undefined){ready=isReady(Math.floor(x/16),Math.floor(z/16));wave.chunkState.set(chunk,ready);}
  if(!ready)return fail();
  // Start just above the previous floor, not above the cave roof. Climb small
  // ledges/trees locally; don't select the upper surface of the entire dimension.
  budget.queries++;let block=dimension.getBlock(at);
  for(let climb=0;block&&!block.isAir&&!block.isLiquid&&climb<4;climb++){
   y=Math.min(height.max-2,y+4);at={...at,y};budget.queries++;block=dimension.getBlock(at);
  }
  if(!block||(!block.isAir&&!block.isLiquid))return fail();
  budget.rays++;const hit=dimension.getBlockFromRay(at,{x:0,y:-1,z:0},{maxDistance:Math.min(96,y-height.min),includeLiquidBlocks:true,includePassableBlocks:false});
  // A real void has no invented ground. Keep the lane alive to inspect the next band.
  if(!hit)return [];
  const top=hit.block.location.y+1,delta=top-lane.y;lane.y=top;
  const result=[{axis:'y',sign:1,location:{x:x+.5,y:top+.035,z:z+.5},radius:sample.radius}];
  // One front-facing marker on a step/cliff helps read relief, bounded per sample.
  if(Math.abs(delta)>=2){const axis=Math.abs(lane.dx)>Math.abs(lane.dz)?'x':'z',sign=(axis==='x'?lane.dx:lane.dz)>0?-1:1,loc={x:x+.5,y:top-.5,z:z+.5};loc[axis]=(axis==='x'?x:z)+(sign>0?1:0)+sign*.035;result.push({axis,sign,location:loc,radius:sample.radius});}
  return result;
 }catch{return fail();}
}
