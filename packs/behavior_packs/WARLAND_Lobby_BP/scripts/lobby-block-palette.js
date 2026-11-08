import {BlockPermutation} from '@minecraft/server';
const fallbacks={
 quartz:['quartz_block',{chisel_type:'smooth'}],pillar:['quartz_block',{chisel_type:'lines'}],chiseled:['quartz_block',{chisel_type:'chiseled'}],
 grass:['grass',{}],wood:['wood',{wood_type:'dark_oak'}],oakroot:['wood',{wood_type:'oak'}],
 peeled:['stripped_oak_log',{}],leaves:['leaves',{old_leaf_type:'oak'}],
 stone_slab:['stone_block_slab',{stone_slab_type:'stone_brick'}],slab:['stone_block_slab',{stone_slab_type:'quartz'}],
 root_slab:['wooden_slab',{wood_type:'dark_oak'}],moss_slab:['stone_block_slab4',{stone_slab_type_4:'mossy_stone_brick'}],
 brick:['stonebrick',{stone_brick_type:'default'}],mossbrick:['stonebrick',{stone_brick_type:'mossy'}],stone_carved:['stonebrick',{stone_brick_type:'chiseled'}],
 flower:['red_flower',{flower_type:'oxeye'}],blueflower:['red_flower',{flower_type:'orchid'}],purpleflower:['red_flower',{flower_type:'allium'}],yellowflower:['yellow_flower',{}],fern:['tallgrass',{tall_grass_type:'fern'}]
};
export function nativePermutation(p){
 let q;try{q=BlockPermutation.resolve(p.id);}catch(e){const f=fallbacks[p.key];if(!f)throw e;q=BlockPermutation.resolve('minecraft:'+f[0],f[1]);}
 const states=q.getAllStates(),s={};
 if('weirdo_direction'in states){s.weirdo_direction={east:0,west:1,south:2,north:3}[p.facing];s.upside_down_bit=false;}
 if('top_slot_bit'in states)s.top_slot_bit=false;
 if('minecraft:vertical_half'in states)s['minecraft:vertical_half']='bottom';
 if('persistent_bit'in states)s.persistent_bit=true;
 if('update_bit'in states)s.update_bit=false;
 if('vine_direction_bits'in states)s.vine_direction_bits={south:1,west:2,north:4,east:8}[p.facing];
 if('hanging'in states)s.hanging=false;
 return Object.entries(s).reduce((v,[k,t])=>v.withState(k,t),q);
}
