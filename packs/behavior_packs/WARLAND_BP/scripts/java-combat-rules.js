// Weapon values adapted from the user-supplied Raiyon JavaCombat 2.6.5 tables.
// Only Minecraft items; no JC items, menus, titles, entities or player overrides.
const materials=['wooden','golden','stone','copper','iron','diamond','netherite'];
export const WEAPONS={};
for(const [tool,damage,speed] of [
 ['sword',[4,4,5,5,6,7,8],[1.6,1.6,1.6,1.6,1.6,1.6,1.6]],
 ['axe',[7,7,9,9,9,9,10],[.8,1,.8,.8,.9,1,1]],
 ['pickaxe',[2,2,3,3,4,5,6],[1.2,1.2,1.2,1.2,1.2,1.2,1.2]],
 ['shovel',[2.5,2.5,3.5,3.5,4.5,5.5,6.5],[1,1,1,1,1,1,1]],
 ['hoe',[1,1,1,1,1,1,1],[1,1,2,2,3,4,4]],
])materials.forEach((m,i)=>{WEAPONS['minecraft:'+m+'_'+tool]={damage:damage[i],speed:speed[i],tool};});
WEAPONS['minecraft:trident']={damage:9,speed:1.1,tool:'trident'};
WEAPONS['minecraft:mace']={damage:6,speed:.6,tool:'mace'};
export const UNARMED={damage:1,speed:4,tool:'hand'};
export const clamp01=n=>Math.max(0,Math.min(1,n));
export const chargeAt=(ticks,speed)=>clamp01((ticks+.5)/(20/speed));
export const chargedDamage=(base,enchantment,charge,critical)=>Math.max(0,base)*(.2+.8*charge*charge)*(critical?1.5:1)+enchantment*charge;
export function nativeBase(item){
 const id=item?.typeId??'',v=WEAPONS[id];if(!v)return 1;
 if(v.tool==='sword'||v.tool==='pickaxe')return v.damage+1;
 if(v.tool==='shovel')return v.damage-.5;
 if(v.tool==='axe'){const material=id.slice(10).split('_')[0];return ({wooden:4,golden:4,stone:5,copper:5,iron:6,diamond:7,netherite:8})[material]??1;}
 if(v.tool==='hoe'){const material=id.slice(10).split('_')[0];return ({wooden:3,golden:3,stone:4,copper:4,iron:5,diamond:6,netherite:7})[material]??1;}
 if(v.tool==='trident')return 9;
 return 6;
}
