// Persist membership across disconnects: a server restart is not an expedition exit.
export const RIFT_STATE='warland:rift_visit_v1';
export const inRiftDimension=p=>['the_end','minecraft:the_end'].includes(p.dimension.id);
export function readVisit(raw){
 try{const v=typeof raw==='string'?JSON.parse(raw):raw;
  if(v?.schema===1&&Number.isSafeInteger(v.serial)&&Array.isArray(v.members)&&['idle','preparing','active'].includes(v.phase))return v;
 }catch{}
 return {schema:1,serial:0,phase:'idle',members:[],position:null,previous:null,origin:null};
}
export function joinVisit(state,id,origin){
 if(state.phase==='idle'){state.serial++;state.phase='preparing';state.origin={x:origin.x,y:origin.y,z:origin.z};state.position=null;}
 if(!state.members.includes(id))state.members.push(id);
 return state;
}
export function leaveVisit(state,id){
 state.members=state.members.filter(x=>x!==id);
 if(!state.members.length&&state.phase!=='idle'){
  state.previous=state.position??state.previous;state.position=null;state.phase='idle';state.origin=null;
 }
 return state;
}
export function activateVisit(state,serial,position){
 if(state.serial!==serial||state.phase!=='preparing'||!state.members.length)return false;
 state.position={...position};state.phase='active';return true;
}
export function exitCandidate(origin,previous,cfg,random=Math.random){
 // Keep a block of margin so rounding to block centers cannot create a short exit.
 const margin=Math.min(1,(cfg.maximumDistance-cfg.minimumDistance)/2);
 const a=random()*Math.PI*2,r=cfg.minimumDistance+margin+random()*(cfg.maximumDistance-cfg.minimumDistance-margin*2);
 const p={x:Math.floor(origin.x+Math.cos(a)*r)+.5,z:Math.floor(origin.z+Math.sin(a)*r)+.5};
 const distance=Math.hypot(p.x-origin.x,p.z-origin.z);
 if(distance<cfg.minimumDistance||distance>cfg.maximumDistance)return null;
 return previous&&Math.hypot(p.x-previous.x,p.z-previous.z)<cfg.previousExitSeparation?null:p;
}
export function touchingRift(player,position,radius){
 if(!position||!inRiftDimension(player))return false;
 const p=player.location;return Math.hypot(p.x-position.x,p.z-position.z)<=radius&&p.y>=position.y-.5&&p.y<=position.y+2.8;
}
// A celestial-style, private projection preserves the exit bearing even when
// its chunk is outside the mobile render distance. It never marks a second exit.
export function signalProjection(head,exit,distance=10){
 const dx=exit.x-head.x,dz=exit.z-head.z,r=Math.hypot(dx,dz),scale=Math.min(1,distance/Math.max(r,.01));
 return {x:head.x+dx*scale,y:head.y+5,z:head.z+dz*scale};
}

// Migrate only a legacy active exit outside the currently approved distant band.
export function repairDistantVisit(state,cfg){
 if(state.phase!=='active')return false;
 const p=state.position,o=state.origin,dist=p&&o?Math.hypot(p.x-o.x,p.z-o.z):NaN;
 if(Number.isFinite(dist)&&Number.isFinite(p.y)&&dist>=cfg.minimumDistance&&dist<=cfg.maximumDistance)return false;
 state.previous=p??state.previous;state.position=null;state.phase=state.members.length?'preparing':'idle';return true;
}
