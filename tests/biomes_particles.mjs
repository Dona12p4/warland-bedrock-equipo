import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createState, emitAmbient, samplePlayer, limits } from '../packs/behavior_packs/WARLAND_BiomesParticles_BP/scripts/ambient.js';
import { chooseParticle } from '../packs/behavior_packs/WARLAND_BiomesParticles_BP/scripts/selection.js';
const known=new Set(fs.readdirSync(new URL('../packs/resource_packs/WARLAND_BiomesParticles_RP/particles/warland_biomes/',import.meta.url)).map(f=>'warland_biomes:'+f.slice(0,-5)));
let checks=0;
function check(test){test();checks++;}
function fake(id='minecraft:overworld') {
  const calls={biome:0,roof:0,emit:[]};
  const player={location:{x:0,y:70,z:0},getHeadLocation(){return {...this.location,y:this.location.y+1.6};},
    dimension:{id,getBlock(){return {typeId:'minecraft:air'};},getBiome(){calls.biome++;return {id:'minecraft:forest'};},
      getTopmostBlock(){calls.roof++;return {location:{y:69}};},spawnParticle(){throw Error('Must never broadcast');}},
    spawnParticle(...args){calls.emit.push(args);}};
  return {player,calls};
}
check(()=>{
  for(const biome of ['plains','desert','mesa','swamp','jungle','forest','snowy_plains','warped_forest','crimson_forest','soul_sand_valley'])
    for(const time of [6000,18000]) for(const rain of [false,true]) for(const water of [false,true]) for(let r=0;r<100;r++) {
      const id=chooseParticle('minecraft:'+biome,rain,water,biome.includes('forest')?'minecraft:nether':'minecraft:overworld',time,rain,()=>r/100);
      assert(!id||known.has(id),id);
    }
});
check(()=>{const {player,calls}=fake();const state=createState();
  for(let t=0;t<12000;t++)emitAmbient(player,state,t,6000,'Rain',()=>.6);
  assert(calls.emit.length>100);assert(state.active.length<=6);
  assert(calls.biome<=Math.ceil(12000/limits.cacheTicks));assert(calls.roof===calls.biome);
});
check(()=>{const {player,calls}=fake();const state=createState();
  assert(emitAmbient(player,state,0,6000,'Rain',()=>.6).emitted);
  assert.equal(emitAmbient(player,state,1,6000,'Rain',()=>.6).reason,'cooldown');assert.equal(calls.emit.length,1);
});
check(()=>{const {player}=fake();const s=createState();for(let t=0;t<120;t+=20)emitAmbient(player,s,t,6000,'Rain',()=>.6);
  assert.equal(emitAmbient(player,s,120,6000,'Rain',()=>.6).reason,'budget');assert(emitAmbient(player,s,180,6000,'Rain',()=>.6).emitted);
});
check(()=>{const {player,calls}=fake('minecraft:the_end');assert.equal(emitAmbient(player,createState(),0,6000,'Rain',()=>0).reason,'dimension');assert.equal(calls.biome,0);assert.equal(calls.emit.length,0);});
check(()=>{const {player}=fake();player.dimension.getTopmostBlock=()=>({location:{y:200}});assert.equal(emitAmbient(player,createState(),0,6000,'Rain',()=>0).reason,'roof');});
check(()=>{const {player}=fake();player.dimension.getTopmostBlock=()=>({location:{y:200}});player.dimension.getBlock=()=>({typeId:'minecraft:water'});const result=emitAmbient(player,createState(),0,6000,'Clear',()=>0);assert(result.effect.includes('underwater'));assert.equal(result.pos.y,71.6);});
check(()=>{const {player,calls}=fake();const a=samplePlayer(player,null,0);samplePlayer(player,a,20);assert.equal(calls.biome,1);player.location.x=5;samplePlayer(player,a,20);assert.equal(calls.biome,2);});
check(()=>{const {player}=fake();player.dimension.getBiome=()=>({id:'minecraft:frozen_peaks'});const s=createState();assert(emitAmbient(player,s,0,18000,'Clear',()=>0).effect.includes('northern_lights'));assert.equal(emitAmbient(player,s,20,18000,'Clear',()=>0).reason,'aurora-cooldown');assert(emitAmbient(player,s,1200,18000,'Clear',()=>0).emitted);});
check(()=>{const {player}=fake('minecraft:nether');player.dimension.getBiome=()=>({id:'minecraft:crimson_forest'});const r=emitAmbient(player,createState(),0,6000,'Rain',()=>0);assert(r.effect.includes('weeping'));});
check(()=>{const {player}=fake();player.dimension.getBlock=()=>undefined;assert.equal(emitAmbient(player,createState(),0,6000,'Rain').reason,'unloaded');});
check(()=>{const all=Array.from({length:100},()=>fake());for(const {player,calls} of all){emitAmbient(player,createState(),0,6000,'Rain',()=>.6);assert.equal(calls.emit.length,1);} });
console.log(JSON.stringify({passed:true,checks,knownEffects:known.size,limits}));
