import {world,system} from '@minecraft/server';
import {surfaceAt,ensureChunk,isGenerated,naturalGround} from './terrain.js';
import {exitCandidate} from './umbral-rift-policy.js';
import {openRiftArea,closeRiftArea} from './umbral-rift-return.js';
const wait=t=>new Promise(r=>system.runTimeout(r,t));
const bad=id=>/lava|magma|fire|cactus|campfire|powder_snow|sweet_berry|wither_rose|portal/.test(id??'');
export function safeColumn(d,x,z,hint,clearance=2){
 for(let y=Math.floor(hint)+6;y>=Math.floor(hint)-5;y--){
  const ground=d.getBlock({x,y:y-1,z});if(!ground||!naturalGround(ground.typeId)||ground.isLiquid||bad(ground.typeId))continue;
  let clear=true;for(let h=0;h<clearance;h++)if(!d.getBlock({x,y:y+h,z})?.isAir){clear=false;break;}
  if(clear)return {x:Math.floor(x)+.5,y,z:Math.floor(z)+.5};
 }
 return null;
}
// Destination checks use real blocks; the long expedition is explored normally.
// Only the destination neighborhood is loaded, never an 800+ block corridor.
let searchSerial=0;
export async function prepareRiftArrival(base){
 const d=world.getDimension('the_end'),area='wl_rift_search_'+(++searchSerial);
 openRiftArea(d,`tickingarea add circle ${base.x} 80 ${base.z} 3 ${area} true`,area);
 try{
  await wait(30);
  // The old quiet arrival basin has 2–3 block lips. Use its outer edge,
  // without altering a saved block or moving anyone already exploring.
  for(const [dx,dz]of [[32,0],[0,32],[-32,0],[0,-32],[32,16],[-32,-16]]){
   const x=base.x+dx,z=base.z+dz;await ensureChunk(Math.floor(x/16),Math.floor(z/16));
   const t=surfaceAt(x,z);if(t.solid)continue;
   const p=safeColumn(d,x,z,t.floor+1,4);if(p)return p;
  }
  return base;
 }finally{closeRiftArea(d,area);}
}
export async function distantExit(target,cfg,valid=()=>true,budget={remaining:cfg.maximumGeneratedChunksPerSearch}){
 if(!valid())return null;
 const predicted=surfaceAt(target.x,target.z);if(predicted.solid)return null;
 const d=world.getDimension('the_end'),area='wl_rift_search_'+(++searchSerial);
 const tx=Math.floor(target.x),tz=Math.floor(target.z),radius=cfg.approachRadius;
 const cx=Math.floor(tx/16),cz=Math.floor(tz/16);
 const minX=(cx-1)*16,minZ=(cz-1)*16,maxX=(cx+2)*16-1,maxZ=(cz+2)*16-1;
 let added=false;const cache=new Map(),chunks=new Set();let generated=0;
 const column=async(x,z,clearance=2)=>{
  if(Math.abs(x-tx)>radius||Math.abs(z-tz)>radius||!valid())return null;
  const key=x+','+z+','+clearance;if(cache.has(key))return cache.get(key);
  const cx=Math.floor(x/16),cz=Math.floor(z/16),ck=cx+','+cz;
  if(!chunks.has(ck)){
   let loaded=false;
   for(let attempt=0;attempt<20&&valid();attempt++){
    try{if(d.getBlock({x:cx*16,y:80,z:cz*16})){loaded=true;break;}}catch{}
    await wait(5);
   }
   if(!loaded){if(cfg.debug)console.warn('[RIFT_ROUTE] Unloaded '+ck+' bounds '+[minX,minZ,maxX,maxZ]);cache.set(key,null);return null;}
   if(!isGenerated(cx,cz)){
    if(generated>=cfg.maximumGeneratedChunksPerAttempt||budget.remaining<=0)return null;
    generated++;budget.remaining--;await ensureChunk(cx,cz);
   }
   if(!valid())return null;chunks.add(ck);
  }
  const t=surfaceAt(x+.5,z+.5);let p=null;
  try{if(!t.solid)p=safeColumn(d,x+.5,z+.5,t.floor+1,clearance);}catch{}
  cache.set(key,p);return p;
 };
 try{
  openRiftArea(d,`tickingarea add ${minX} 64 ${minZ} ${maxX} 64 ${maxZ} ${area} true`,area);added=true;await wait(30);
  const end=await column(tx,tz,4);if(!end||!valid())return null;
  const key=p=>Math.floor(p.x)+','+Math.floor(p.z);
  const open=[end],seen=new Set([key(end)]);let examined=0,reachesEdge=false;
  while(examined<open.length&&examined<cfg.maximumPathNodes&&valid()){
   const p=open[examined++];
   reachesEdge ||= Math.max(Math.abs(Math.floor(p.x)-tx),Math.abs(Math.floor(p.z)-tz))>=radius;
   // Reject tiny enclosed pockets: require an actual walkable approach and room.
   if(reachesEdge&&examined>=cfg.minimumApproachCells)return {...end,approachNodes:examined,generatedChunks:generated};
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const x=Math.floor(p.x)+dx,z=Math.floor(p.z)+dz;if(seen.has(x+','+z))continue;
    const next=await column(x,z);if(!next||Math.abs(next.y-p.y)>1)continue;
    // Upward steps also need head clearance above the lower standing cell.
    if(next.y!==p.y){const lower=next.y<p.y?next:p;if(!d.getBlock({...lower,y:lower.y+2})?.isAir)continue;}
    seen.add(key(next));open.push(next);
   }
   if(examined%48===0)await wait(1);
  }
  if(cfg.debug)console.warn('[RIFT_ROUTE] Enclosed destination '+JSON.stringify({examined,generated,target}));return null;
 }finally{if(added)closeRiftArea(d,area);}
}
export async function chooseRiftExit(origin,previous,cfg,valid=()=>true,random=Math.random){
 const budget={remaining:cfg.maximumGeneratedChunksPerSearch};
 for(let i=0;i<cfg.searchAttempts&&valid();i++){
  const candidate=exitCandidate(origin,previous,cfg,random);if(!candidate)continue;
  try{
   const p=await distantExit(candidate,cfg,valid,budget);
   if(p&&valid())return {...p,distanceFromEntry:Math.hypot(p.x-origin.x,p.z-origin.z)};
  }catch(e){if(cfg.debug)console.warn('[RIFT_ROUTE] Destination unavailable '+String(e));}
  await wait(10);
 }
 // Failed/blocked destinations are retried in the SAME distant band by runtime.
 // Never silently turn a long expedition into an exit next to the arrival.
 return null;
}
