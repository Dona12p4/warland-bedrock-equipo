import {decorateMobileRoots} from './mobile-roots-features.js';
import {BlockPermutation} from '@minecraft/server';
// Feature writes belong to one chunk. Neighbouring trees are recomputed from
// their seed and clipped, so chunk load order never cuts or overwrites a tree.
export function* decorate(d,x0,z0,{surfaceAt,biomeAt,noise,hash}){
 const owns=(x,z)=>x>=x0&&x<x0+16&&z>=z0&&z<z0+16;
 const put=(x,y,z,id,states,airOnly=true)=>{x=Math.floor(x);y=Math.floor(y);z=Math.floor(z);if(!owns(x,z)||y<32||y>190)return;const b=d.getBlock({x,y,z});if(b&&(!airOnly||b.isAir||b.typeId==='warland:umbral_leaves'))b.setPermutation(BlockPermutation.resolve(id,states));};
 for(let x=x0;x<x0+16;x++)for(let z=z0;z<z0+16;z++){
  const t=surfaceAt(x,z);if(t.solid)continue;const id=biomeAt(x,z).id,y=t.floor;
  if(id==='silent'){
   const patch=noise(x,z,19,83)+noise(x,z,5,84)*.24;
   put(x,y,z,patch>.48?'minecraft:sculk':'minecraft:deepslate',undefined,false);
   if(patch>.63)put(x,y-1,z,'minecraft:sculk',undefined,false);
   if(patch>.38&&patch<=.48&&hash(x,z,86)>.3)put(x,y+1,z,'minecraft:sculk_vein',{multi_face_direction_bits:1});
   if(patch>.56){const n=hash(x,z,87);
    if(n>.975)put(x,y+1,z,'minecraft:sculk_sensor');
    else if(n>.960)put(x,y+1,z,'minecraft:sculk_shrieker',{can_summon:true,active:false});
   }
   // Sculk hugs the lower cave formations as well as the floor.
   if(hash(x,z,89)>.82&&noise(x,z,12,90)>.62)put(x,t.ceiling-1,z,'minecraft:sculk');
  }else if(id==='roots')put(x,y,z,'warland:umbral_root_soil',undefined,false);
  else if(id==='watch')put(x,y,z,'warland:umbral_black_soil',undefined,false);
  else if(id==='sepulcher')put(x,y,z,hash(x,z,91)>.2?'warland:umbral_slate':'warland:umbral_moss',undefined,false);
  else if(id==='ash'&&Math.hypot(x-8,z-8)>30)put(x,y,z,noise(x,z,11,92)>.4?'warland:umbral_ash_ground':'warland:umbral_stone',undefined,false);
  if(z%4===0)yield;
 }
 // Broad, uneven deepslate shelves replace the old repeated little posts.
 for(let gx=Math.floor((x0-7)/24);gx<=Math.floor((x0+22)/24);gx++)for(let gz=Math.floor((z0-7)/24);gz<=Math.floor((z0+22)/24);gz++){
  const ax=gx*24+5+Math.floor(hash(gx,gz,100)*14),az=gz*24+5+Math.floor(hash(gx,gz,101)*14),t=surfaceAt(ax,az);
  if(t.solid||biomeAt(ax,az).id!=='silent'||hash(gx,gz,102)<.3)continue;
  for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++){
   const v=1-Math.hypot(dx/4,dz/3);if(v<=0)continue;const x=ax+dx,z=az+dz,ground=surfaceAt(x,z);if(ground.solid)continue;
   const h=Math.max(1,Math.floor(v*4));for(let j=1;j<=h;j++)put(x,ground.floor+j,z,j===h&&hash(x,z,103)>.3?'minecraft:sculk':'minecraft:cobbled_deepslate');
  }yield;
 }
 yield* decorateMobileRoots(put,x0,z0,{surfaceAt,biomeAt,hash});
 // Tall, sparse black silhouettes leave long lines of sight between trunks.
 for(let gx=Math.floor((x0-8)/13);gx<=Math.floor((x0+23)/13);gx++)for(let gz=Math.floor((z0-8)/13);gz<=Math.floor((z0+23)/13);gz++){
  const ax=gx*13+3+Math.floor(hash(gx,gz,190)*7),az=gz*13+3+Math.floor(hash(gx,gz,191)*7),t=surfaceAt(ax,az);
  if(t.solid||biomeAt(ax,az).id!=='watch'||hash(gx,gz,192)<.12)continue;
  const h=24+Math.floor(hash(gx,gz,193)*14),sx=hash(gx,gz,194)>.5?1:-1;
  for(let j=1;j<=h;j++){const x=ax+sx*Math.floor(j/16);put(x,t.floor+j,az,'warland:umbral_blackwood');if(j<7)put(x+1,t.floor+j,az,'warland:umbral_blackwood');}
  const tx=ax+sx*Math.floor(h/16),ty=t.floor+h;
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
   for(let k=1;k<=4;k++)put(tx+dx*k,ty-3+Math.floor(k/2),az+dz*k,'warland:umbral_blackwood');
   for(let k=2;k<=5;k++)for(let w=-1;w<=1;w++){
    const x=tx+dx*k+(dz?w:0),z=az+dz*k+(dx?w:0);put(x,ty-1,z,'warland:umbral_black_leaves');
    if(hash(x,z,195)>.5)for(let drop=1;drop<=5;drop++)put(x,ty-1-drop,z,'warland:umbral_hanging');
   }
  }yield;
 }
 // Porous chimneys camouflage the creeper. Most vents remain dark; occasional
 // contained lava pockets and single flames are the only hot light sources.
 for(let gx=Math.floor((x0-6)/24);gx<=Math.floor((x0+21)/24);gx++)for(let gz=Math.floor((z0-6)/24);gz<=Math.floor((z0+21)/24);gz++){
  const ax=gx*24+6+Math.floor(hash(gx,gz,201)*12),az=gz*24+6+Math.floor(hash(gx,gz,202)*12),t=surfaceAt(ax,az);
  if(t.solid||biomeAt(ax,az).id!=='ash'||Math.hypot(ax-8,az-8)<38||hash(gx,gz,203)<.2)continue;
  const h=7+Math.floor(hash(gx,gz,204)*12);
  for(let j=1;j<=h;j++)for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
   const r=j<3?2:1;if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;
   if(j>h-2&&hash(ax+dx,az+dz,j)<.27)continue;put(ax+dx,t.floor+j,az+dz,'warland:umbral_cinder');
  }
  put(ax,t.floor+h-3,az,'warland:umbral_cinder',undefined,false);
  put(ax,t.floor+h-2,az,'minecraft:campfire',{extinguished:false},false);
  for(let y=t.floor+h-1;y<=t.floor+h+2;y++)put(ax,y,az,'minecraft:air',undefined,false);
  for(let dx=-5;dx<=5;dx++)for(let dz=-5;dz<=5;dz++)if(Math.hypot(dx,dz)<4+hash(ax+dx,az+dz,205)*2){const q=surfaceAt(ax+dx,az+dz);if(!q.solid)put(ax+dx,q.floor,az+dz,'warland:umbral_ash_ground',undefined,false);}
  yield;
 }
 // One small, stone-lined pocket per 32-block cell at most. Keep the entire
 // feature in ash and away from arrival; the rim prevents liquid spreading.
 for(let gx=Math.floor(x0/32);gx<=Math.floor((x0+15)/32);gx++)for(let gz=Math.floor(z0/32);gz<=Math.floor((z0+15)/32);gz++){
  const ax=gx*32+8,az=gz*32+8,t=surfaceAt(ax,az);
  if(!owns(ax,az)||t.solid||Math.hypot(ax-8,az-8)<48||hash(gx,gz,240)<.35)continue;
  if(![[0,0],[-4,-3],[4,-3],[-4,3],[4,3]].every(([dx,dz])=>biomeAt(ax+dx,az+dz).id==='ash'&&!surfaceAt(ax+dx,az+dz).solid&&Math.abs(surfaceAt(ax+dx,az+dz).floor-t.floor)<=2))continue;
  for(let dx=-3;dx<=3;dx++)for(let dz=-2;dz<=2;dz++){
   put(ax+dx,t.floor-1,az+dz,'minecraft:basalt',undefined,false);
   put(ax+dx,t.floor,az+dz,'minecraft:basalt',undefined,false);
   for(let j=1;j<=3;j++)put(ax+dx,t.floor+j,az+dz,'minecraft:air',undefined,false);
  }
  for(let dx=-1;dx<=1;dx++)put(ax+dx,t.floor,az,'minecraft:lava',undefined,false);
  put(ax+3,t.floor,az+1,'minecraft:netherrack',undefined,false);
  put(ax+3,t.floor+1,az+1,'minecraft:fire',undefined,false);
  yield;
 }
 // Small ruined precincts rather than treasure cities. Staggered arch crowns,
 // broken walls and open courtyards remain traversable for players and mobs.
 for(let gx=Math.floor((x0-14)/30);gx<=Math.floor((x0+29)/30);gx++)for(let gz=Math.floor((z0-14)/30);gz<=Math.floor((z0+29)/30);gz++){
  const ax=gx*30+10,az=gz*30+10,t=surfaceAt(ax,az);if(t.solid||biomeAt(ax,az).id!=='sepulcher')continue;
  const turn=hash(gx,gz,220)>.5,block=(u,y,v,id='warland:umbral_ruin')=>put(ax+(turn?v:u),y,az+(turn?u:v),id);
  for(const v of [-4,4]){
   for(const u of [-4,4])for(let j=1;j<=6;j++)for(let w=0;w<2;w++)block(u,t.floor+j,v+w);
   for(let u=-3;u<=3;u++)for(let w=0;w<2;w++)block(u,t.floor+7+(Math.abs(u)<2?1:0),v+w);
  }
  for(let u=-9;u<=9;u++){const g=surfaceAt(ax+(turn?9:u),az+(turn?u:9)),h=1+Math.floor(hash(gx*30+u,gz,221)*4);if(g.solid)continue;for(let j=1;j<=h;j++)block(u,g.floor+j,9,hash(u,gz,j)>.65?'warland:umbral_ruin_cracked':'warland:umbral_ruin');}
  for(let i=0;i<5;i++){const u=-7+i*3,v=-9+(i%2)*2,g=surfaceAt(ax+(turn?v:u),az+(turn?u:v));if(g.solid)continue;block(u,g.floor+1,v,'warland:umbral_ruin_cracked');if(i%2)block(u,g.floor+2,v,'warland:umbral_ruin');}
  yield;
 }
 for(let x=x0;x<x0+16;x++)for(let z=z0;z<z0+16;z++){
  const t=surfaceAt(x,z);if(t.solid)continue;const id=biomeAt(x,z).id,n=hash(x,z,161);
  if(id==='roots'&&n>.93)put(x,t.floor+1,z,'warland:umbral_dry_fern');
  else if((id==='ash'||id==='sepulcher')&&n>.95&&Math.hypot(x-8,z-8)>30)put(x,t.floor+1,z,'warland:umbral_pale_scrub');
  else if(id==='watch'&&n>.94)put(x,t.floor+1,z,'warland:umbral_fern');
  if(z%4===0)yield;
 }
}
