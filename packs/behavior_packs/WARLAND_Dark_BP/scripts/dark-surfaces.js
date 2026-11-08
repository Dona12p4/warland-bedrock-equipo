import {world,system} from '@minecraft/server';
import {cfg} from './config.js';
let running=null;
export async function upgradeSurfaces(){
 if(world.getDynamicProperty('warland:dark_surfaces_v2'))return;
 if(running)return running;
 running=(async()=>{
  const c=cfg.center,r=cfg.radius,d=world.getDimension(cfg.dimension),expected=new Map();
  const put=(x,y,z,old,kind)=>expected.set(`${x},${y},${z}`,{pos:{x,y,z},old:'minecraft:'+old,next:'warland:umbral_'+kind});
  const fill=(x1,y1,z1,x2,y2,z2,old,kind)=>{for(let x=x1;x<=x2;x++)for(let y=y1;y<=y2;y++)for(let z=z1;z<=z2;z++)put(x,y,z,old,kind);};
  fill(c.x-r,cfg.floorY,c.z-r,c.x+r,cfg.floorY,c.z+r,'blackstone','stone');
  fill(c.x-r,cfg.ceilingY,c.z-r,c.x+r,cfg.ceilingY,c.z+r,'black_concrete','wall');
  for(const x of [c.x-r,c.x+r])fill(x,cfg.floorY-1,c.z-r,x,cfg.ceilingY,c.z+r,'black_concrete','wall');
  for(const z of [c.z-r,c.z+r])fill(c.x-r,cfg.floorY-1,z,c.x+r,cfg.ceilingY,z,'black_concrete','wall');
  for(let i=0;i<18;i++){const a=i*2.39996,rad=12+(i%3)*6,x=Math.round(c.x+Math.cos(a)*rad),z=Math.round(c.z+Math.sin(a)*rad),h=3+i%7;fill(x,191,z,x,190+h,z,i%2?'deepslate_bricks':'basalt',i%2?'brick':'pillar');if(i%3===0)fill(x-2,190+h,z,x+2,190+h,z,'deepslate_bricks','brick');if(i%3===1)fill(x,188+h,z,x+2,188+h,z,'basalt','pillar');}
  for(let x=-25;x<=25;x++)for(let z=-25;z<=25;z++)if((x*x+z*31+x*z)%17===0)put(c.x+x,190,c.z+z,'deepslate_tiles','tile');
  let changed=0,n=0;for(const {pos,old,next}of expected.values()){const b=d.getBlock(pos);if(!b)throw Error('Umbral surface chunk unavailable');if(b.typeId===old){b.setType(next);changed++;}if(++n%512===0)await new Promise(r=>system.runTimeout(r,1));}
  world.setDynamicProperty('warland:dark_surfaces_v2',true);console.warn('[WARLAND_DARK] surfaces-v2 '+changed);
 })();try{return await running;}finally{running=null;}
}
