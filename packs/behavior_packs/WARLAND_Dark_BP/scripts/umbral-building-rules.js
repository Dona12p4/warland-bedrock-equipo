import {world,system,ItemStack} from '@minecraft/server';
const notices=new Map(),waterActions=new Map();
const inUmbral=p=>p.dimension.id==='minecraft:the_end';
const waterBuckets=new Set(['minecraft:water_bucket','minecraft:axolotl_bucket','minecraft:cod_bucket','minecraft:salmon_bucket','minecraft:pufferfish_bucket','minecraft:tropical_fish_bucket','minecraft:tadpole_bucket']);
const offsets={Up:[0,1,0],Down:[0,-1,0],North:[0,0,-1],South:[0,0,1],East:[1,0,0],West:[-1,0,0]};
function say(p,text){if((notices.get(p.id)??-100)+40>system.currentTick)return;notices.set(p.id,system.currentTick);system.run(()=>{try{p.sendMessage(text);}catch{}});}
function opensBlock(p,b){return !p.isSneaking&&(!!b.getComponent('minecraft:inventory')||/:(.*door|.*button|lever|.*gate|crafting_table|enchanting_table|anvil|.*bed)$/.test(b.typeId));}
function evaporate(p,item,location){
 const tick=system.currentTick;if(waterActions.get(p.id)===tick)return;waterActions.set(p.id,tick);
 const slot=p.selectedSlotIndex;
 system.run(()=>{try{
  if(!p.isValid||!inUmbral(p))return;
  const creative=String(p.getGameMode()).toLowerCase().endsWith('creative');
  const inv=p.getComponent('minecraft:inventory')?.container,current=inv?.getItem(slot);
  // Empty only the plain water bucket, once, and only if the same slot/item
  // is still present. Animal buckets remain intact rather than deleting pets.
  if(!creative&&item.typeId==='minecraft:water_bucket'&&current?.typeId===item.typeId&&current.amount===item.amount)inv.setItem(slot,new ItemStack('minecraft:bucket'));
  p.dimension.spawnParticle('minecraft:basic_smoke_particle',location);
  p.playSound('random.fizz',{location,volume:.6,pitch:1.5});
 }catch{}});
 say(p,'§7El agua se evapora en el Umbral.');
}
export function restrictUmbralInteraction(e){
 const p=e.player,item=e.itemStack;if(e.cancel||!item||!inUmbral(p))return;
 const id=item.typeId,b=e.block,v=offsets[e.blockFace]??[0,1,0];
 const next={x:b.location.x+v[0],y:b.location.y+v[1],z:b.location.z+v[2]};
 if(opensBlock(p,b))return;
 if(waterBuckets.has(id)){
  e.cancel=true;if(e.isFirstEvent)evaporate(p,item,{x:next.x+.5,y:next.y+.5,z:next.z+.5});return;
 }
 // All block materials may be placed. Decay classifies confirmed placements;
 // foreign materials are temporary, not rejected or refunded here.
}
world.beforeEvents.playerInteractWithBlock.subscribe(restrictUmbralInteraction);
world.beforeEvents.itemUse.subscribe(e=>{
 if(e.cancel||!inUmbral(e.source)||!waterBuckets.has(e.itemStack.typeId))return;
 // Some touch/air-use bucket paths do not raise the block interaction event.
 const hit=e.source.getBlockFromViewDirection({maxDistance:6});
 if(hit&&opensBlock(e.source,hit.block))return;
 e.cancel=true;
 if(hit)evaporate(e.source,e.itemStack,{x:hit.block.location.x+.5,y:hit.block.location.y+1,z:hit.block.location.z+.5});
});
world.afterEvents.playerLeave.subscribe(({playerId})=>{notices.delete(playerId);waterActions.delete(playerId);});
