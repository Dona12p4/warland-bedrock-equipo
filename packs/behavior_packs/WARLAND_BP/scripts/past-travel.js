// Local bounded escape check. Never scans unloaded chunks or edits the map.
// A search reaching its budget is inconclusive, not evidence of a trap.
const PASS=/(?:^minecraft:(?:air|cave_air|water|flowing_water|light_block|short_grass|tallgrass|fern|large_fern|deadbush|vine|glow_lichen|torch|redstone_torch|soul_torch|redstone_wire|rail|golden_rail|detector_rail|activator_rail|trip_wire|tripwire_hook|standing_sign|wall_sign|yellow_flower|red_flower|snow_layer|seagrass|tall_seagrass|kelp|ladder)$|_flower$|_sapling$|_button$|_pressure_plate$|_sign$)/;
function open(b){return !!b&&(b.isAir||b.isLiquid||PASS.test(b.typeId)||(/(?:door|fence_gate)$/.test(b.typeId)&&b.permutation?.getState('open_bit')===true))}
const FLOOR_BAD=/water|lava|fence|wall$|door$|gate$|cactus|campfire|magma|powder_snow/;
export function escapeProbe(d,p,budget=256){
 const ox=Math.floor(p.x),oz=Math.floor(p.z),oy=Math.floor(p.y+.1),cache=new Map();let reads=0;
 const block=(x,y,z)=>{const k=x+':'+y+':'+z;if(!cache.has(k)){try{cache.set(k,d.getBlock({x,y,z}));reads++}catch{cache.set(k,undefined)}}return cache.get(k)};
 const stand=(x,y,z)=>{const a=block(x,y,z),b=block(x,y+1,z),floor=block(x,y-1,z);if(!a||!b||!floor)throw Error('unloaded');return open(a)&&open(b)&&!open(floor)&&!FLOOR_BAD.test(floor.typeId)};
 try{
  // Swimming/climbing, stairs, slabs and airborne motion are not a proven trap.
  if(!stand(ox,oy,oz))return {trapped:false,known:false,reads};
  const q=[[ox,oy,oz]],seen=new Set([ox+':'+oy+':'+oz]);
  for(let i=0;i<q.length;i++){
   if(i>=budget)return {trapped:false,known:false,reads};
   const [x,y,z]=q[i];if(Math.abs(x-ox)>=6||Math.abs(z-oz)>=6)return {trapped:false,known:true,reads};
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])for(const dy of [0,1,-1,-2]){
    const nx=x+dx,nz=z+dz,ny=y+dy,key=nx+':'+ny+':'+nz;
    if(seen.has(key)||!stand(nx,ny,nz))continue;
    if(dy===1&&!open(block(x,y+2,z)))continue;
    seen.add(key);q.push([nx,ny,nz]);break;
   }
  }
  return {trapped:true,known:true,reads,nodes:q.length};
 }catch{return {trapped:false,known:false,reads}}
}
export function safeLanding(d,p){
 try{const b=d.getBlock({x:Math.floor(p.x),y:Math.floor(p.y),z:Math.floor(p.z)}),h=d.getBlock({x:Math.floor(p.x),y:Math.floor(p.y)+1,z:Math.floor(p.z)});return open(b)&&open(h)}catch{return false}
}
