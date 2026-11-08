// Sparse, connected trees: broad bases, tapering trunks, rooted buttresses and
// branch-supported crowns. All writes are clipped by the caller to one chunk.
export function* decorateMobileRoots(put,x0,z0,{surfaceAt,biomeAt,hash}){
 const ground=(x,z)=>surfaceAt(Math.floor(x),Math.floor(z));
 const log=(x,y,z)=>put(x,y,z,'warland:umbral_rootwood');
 function line(a,b,radius=0){
  const n=Math.ceil(Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y),Math.abs(b.z-a.z))*2);let last;
  for(let i=0;i<=n;i++){
   const f=n?i/n:0,p={x:Math.round(a.x+(b.x-a.x)*f),y:Math.round(a.y+(b.y-a.y)*f),z:Math.round(a.z+(b.z-a.z)*f)};
   // A 6-connected path, including diagonals; no detached corner-only logs.
   if(last){log(p.x,last.y,last.z);log(p.x,p.y,last.z);}log(p.x,p.y,p.z);
   if(radius)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])log(p.x+dx,p.y,p.z+dz);
   last=p;
  }
 }
 // The reach (14) includes the widest roots/crowns in neighbouring chunks.
 for(let gx=Math.floor((x0-14)/24);gx<=Math.floor((x0+29)/24);gx++)for(let gz=Math.floor((z0-14)/24);gz<=Math.floor((z0+29)/24);gz++){
  const ax=gx*24+8+Math.floor(hash(gx,gz,311)*8),az=gz*24+8+Math.floor(hash(gx,gz,312)*8),t=ground(ax,az);
  if(t.solid||biomeAt(ax,az).id!=='roots'||hash(gx,gz,313)<.12)continue;
  const h=23+Math.floor(hash(gx,gz,314)*12),angle=hash(gx,gz,315)*Math.PI*2,lean=2+hash(gx,gz,316)*2;
  const trunk=y=>({x:ax+Math.round(Math.cos(angle)*lean*(y/h)**1.6),y:t.floor+y,z:az+Math.round(Math.sin(angle)*lean*(y/h)**1.6)});
  for(let y=1;y<=h;y++){
   const p=trunk(y),r=y<4?2:y<h*.65?1:0;
   for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)if(dx*dx+dz*dz<=r*r+.3)log(p.x+dx,p.y,p.z+dz);
   if(y>1)line(trunk(y-1),p);yield;
  }
  for(let i=0;i<5;i++){
   const a=angle+i*Math.PI*2/5,len=5+Math.floor(hash(gx+i,gz,317)*4),x=ax+Math.round(Math.cos(a)*len),z=az+Math.round(Math.sin(a)*len),g=ground(x,z);
   if(g.solid||Math.abs(g.floor-t.floor)>5)continue;
   const mid={x:ax+Math.round(Math.cos(a)*len*.45),z:az+Math.round(Math.sin(a)*len*.45),y:Math.max(t.floor,g.floor)+2};
   line({x:ax,y:t.floor+3,z:az},mid,1);line(mid,{x,y:g.floor+1,z});
  }
  const crowns=[{...trunk(h),r:4}];
  for(let i=0;i<3;i++){
   const a=angle+i*Math.PI*2/3,len=4+Math.floor(hash(gx,gz+i,318)*3),base=trunk(Math.floor(h*.68)),mid={x:base.x+Math.round(Math.cos(a)*len*.5),z:base.z+Math.round(Math.sin(a)*len*.5),y:base.y+2},end={x:base.x+Math.round(Math.cos(a)*len),z:base.z+Math.round(Math.sin(a)*len),y:base.y+4};
   line(base,mid,1);line(mid,end);crowns.push({...end,r:3+Math.floor(hash(gx+i,gz,319)*2)});
  }
  for(const c of crowns){
   for(let dx=-c.r;dx<=c.r;dx++)for(let dz=-c.r;dz<=c.r;dz++)for(let dy=-1;dy<=2;dy++){
    if((dx*dx+dz*dz)/(c.r*c.r)+dy*dy/5>1.12)continue;
    put(c.x+dx,c.y+dy,c.z+dz,'warland:umbral_leaves');
   }
   // Ordinary dark vines remain fine and passable; light belongs to fungi.
   for(const [dx,dz]of [[-2,0],[1,2]]){
    const length=2+Math.floor(hash(c.x+dx,c.z+dz,321)*3);
    for(let j=1;j<=length;j++)put(c.x+dx,c.y-j,c.z+dz,'warland:umbral_hanging');
   }
   yield;
  }
  // Shelf fungus follows the actual bent trunk instead of floating beside it.
  for(let j=3;j<=9;j+=3){const p=trunk(j),side=hash(gx,gz,j+340)>.5?1:-1,attach=j<4?3:j<h*.65?2:1;for(let reach=0;reach<3;reach++)for(let width=-1;width<=1;width++){if(reach===2&&width!==0)continue;put(p.x+side*(reach+attach),p.y,p.z+width,'warland:umbral_shelf');}}
 }
 // Clearings of grouped mushrooms, not evenly sprinkled isolated pixels.
 for(let gx=Math.floor((x0-4)/10);gx<=Math.floor((x0+19)/10);gx++)for(let gz=Math.floor((z0-4)/10);gz<=Math.floor((z0+19)/10);gz++){
  const x=gx*10+4,z=gz*10+4;if(biomeAt(x,z).id!=='roots'||hash(gx,gz,330)<.32)continue;
  for(const [dx,dz]of [[0,0],[2,1],[-1,2],[1,-2]]){const g=ground(x+dx,z+dz);if(g.solid)continue;put(x+dx,g.floor+1,z+dz,dx===0?'warland:umbral_glowcap':'warland:umbral_ivory_fungus');}
  yield;
 }
}
