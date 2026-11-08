// Large root bridges and broken double arches, computed from global anchors.
// Writes are clipped to the chunk being generated; no reads of neighbour blocks.
export function* decorateUmbralLandmarks(d,x0,z0,{surfaceAt,biomeAt,hash,blendAt,BlockPermutation}){
 const put=(x,y,z,id)=>{
  x=Math.round(x);y=Math.round(y);z=Math.round(z);
  if(x<x0||x>=x0+16||z<z0||z>=z0+16||y<33||y>189)return;
  const b=d.getBlock({x,y,z});if(b&&(b.isAir||b.typeId==='warland:umbral_leaves'||b.typeId==='warland:umbral_hanging'))b.setPermutation(BlockPermutation.resolve(id));
 };
 const reach=20,cell=48;
 for(let gx=Math.floor((x0-reach)/cell);gx<=Math.floor((x0+15+reach)/cell);gx++)for(let gz=Math.floor((z0-reach)/cell);gz<=Math.floor((z0+15+reach)/cell);gz++){
  const ax=gx*cell+16+Math.floor(hash(gx,gz,430)*16),az=gz*cell+16+Math.floor(hash(gx,gz,431)*16),id=biomeAt(ax,az).id;
  if(!['roots','watch','sepulcher'].includes(id)||blendAt(ax,az)<.999)continue;
  const turn=hash(gx,gz,432)>.5,at=(u,v)=>({x:ax+(turn?v:u),z:az+(turn?u:v)}),g=(u,v)=>surfaceAt(at(u,v).x,at(u,v).z);
  if([-16,0,16].some(u=>g(u,0).solid))continue;
  const block=(u,y,v,type)=>{const p=at(u,v);put(p.x,y,p.z,type);};
  if(id==='roots'||id==='watch'){
   const material=id==='roots'?'warland:umbral_rootwood':'warland:umbral_blackwood',left=g(-15,0).floor,right=g(15,0).floor;
   const crown=Math.max(left,right,g(0,0).floor)+14+Math.floor(hash(gx,gz,433)*5);
   // Stair-stepped connected arch; ends descend into the actual terrain.
   let previous=left;
   for(let u=-15;u<=15;u++){
    const f=(u+15)/30,y=Math.round(left+(right-left)*f+Math.sin(f*Math.PI)*(crown-(left+right)/2));
    for(let v=-1;v<=1;v++)for(let h=Math.min(previous,y);h<=Math.max(previous,y)+2;h++)block(u,h,v,material);
    if(u%6===0)for(let j=1;j<=4;j++)block(u,y-j,0,'warland:umbral_hanging');
    previous=y;yield;
   }
  }else{
   const base=Math.max(g(-8,-4).floor,g(8,-4).floor,g(-8,4).floor,g(8,4).floor),top=base+16;
   for(const v of [-5,5]){
    for(const u of [-8,8])for(let w=0;w<2;w++){
     const bottom=g(u,v+w).floor;
     for(let y=bottom+1;y<=top-4;y++)for(let width=0;width<2;width++)block(u+width,y,v+w,'warland:umbral_ruin');
     yield;
    }
    for(let u=-7;u<=8;u++){
     const y=top-Math.ceil(Math.abs(u)/2);
     // Small crown breaks, supported by complete lower voussoirs.
     for(let w=0;w<2;w++)for(let h=0;h<(hash(gx+u,gz,434)>.75?1:2);h++)block(u,y+h,v+w,'warland:umbral_ruin_cracked');
    }yield;
   }
  }
 }
}
