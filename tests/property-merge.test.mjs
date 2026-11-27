import test from 'node:test';
import assert from 'node:assert/strict';
import {mergePropertyTag} from '../tools/property_merge.mjs';
const compound=value=>({type:'compound',value}),str=value=>({type:'string',value});
test('world namespaces merge without replacing Base economy',()=>{
 const t=compound({base:compound({coins:str('saved balance')}),dark:compound({chunks:str('existing terrain')})});const counts={namespaces:0,properties:0};
 mergePropertyTag(t,{dark:'base'},counts);assert.deepEqual(Object.keys(t.value),['base']);assert.equal(t.value.base.value.coins.value,'saved balance');assert.equal(t.value.base.value.chunks.value,'existing terrain');assert.equal(counts.properties,1);
});
test('nested player, entity and item properties survive typed lists',()=>{
 const t=compound({Inventory:{type:'list',value:{type:'compound',value:[{DynamicProperties:compound({dark:compound({expiry:{type:'long',value:[1,234]}})})}]}},DynamicProperties:compound({mob:compound({owner:str('Alice')})})});
 mergePropertyTag(t,{dark:'base',mob:'base'});assert.equal(t.value.DynamicProperties.value.base.value.owner.value,'Alice');assert.deepEqual(t.value.Inventory.value.value[0].DynamicProperties.value.base.value.expiry.value,[1,234]);
});
test('different saved values sharing a name block migration rather than overwrite',()=>{
 const t=compound({base:compound({key:str('keep')}),dark:compound({key:str('other')})});assert.throws(()=>mergePropertyTag(t,{dark:'base'}),/Conflicting saved property/);
});
test('migration is idempotent and preserves unrelated namespaces',()=>{
 const t=compound({other:compound({value:str('external')}),dark:compound({value:str('ours')})});mergePropertyTag(t,{dark:'base'});const copy=structuredClone(t);mergePropertyTag(t,{dark:'base'});assert.deepEqual(t,copy);assert.equal(t.value.other.value.value.value,'external');
});
