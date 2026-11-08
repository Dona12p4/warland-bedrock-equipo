// Revision 10: large, traversable landforms. Never reinterpret saved terrain.
// A persistent old chunk is an immutable boundary, not a reason to repaint it.
export function createUmbralRelief(world,cfg,noise,legacyTerrainAt,options){
 const revision=options.generationRevision,fade=t=>t*t*(3-2*t),clamp=t=>Math.max(0,Math.min(1,t));
 const revisions=new Map(),boundaries=new Map();
 function savedRevision(cx,cz){
  const k=`wl_umbral_c3_${cx}_${cz}`;
  if(!revisions.has(k))revisions.set(k,Number(world.getDynamicProperty(k+'_revision'))||(world.getDynamicProperty(k)===true?7:revision));
  return revisions.get(k);
 }
 function blendAt(x,z){
  const cx=Math.floor(x/16),cz=Math.floor(z/16),k=cx+','+cz;
  if(savedRevision(cx,cz)<revision)return 0;
  if(!boundaries.has(k)){
   const old=[];
   for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)if(savedRevision(cx+dx,cz+dz)<revision)old.push([(cx+dx)*16,(cz+dz)*16]);
   boundaries.set(k,old);
  }
  let distance=options.transitionBlocks;
  for(const [bx,bz]of boundaries.get(k))distance=Math.min(distance,Math.hypot(Math.max(bx-x,0,x-(bx+16)),Math.max(bz-z,0,z-(bz+16))));
  const arrival=Math.hypot(x-cfg.arrival.x,z-cfg.arrival.z);
  return fade(clamp(distance/options.transitionBlocks))*fade(clamp((arrival-options.arrivalQuietRadius)/options.arrivalBlendBlocks));
 }
 function terrainAt(x,z){
  const old=legacyTerrainAt(x,z),blend=blendAt(x,z);
  if(!blend)return old;
  // Two broad scales create basins/ridges; a local scale creates visible
  // terraces within a player's view. Soft steps keep connecting slopes.
  const broad=noise(x,z,116,411),middle=noise(x,z,42,412),detail=noise(x,z,18,413);
  const height=40+broad*37+middle*31+detail*7;
  const terrace=Math.floor(height/7)*7+fade(clamp((height%7-2)/5))*7;
  const floor=Math.round(old.floor+(terrace-old.floor)*blend);
  const vaulted=132+noise(x,z,70,414)*44;
  return {
   floor:Math.max(options.floorMinimum,Math.min(options.floorMaximum,floor)),
   ceiling:Math.max(floor+options.minimumHeadroom,Math.min(187,Math.round(old.ceiling+(vaulted-old.ceiling)*blend))),
   solid:old.solid
  };
 }
 return {terrainAt,blendAt};
}
