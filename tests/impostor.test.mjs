import test from 'node:test';
import assert from 'node:assert/strict';
import { appearanceFor, choosePlayer, findPlayer, bindIdentity, restoreIdentity, ENTITY_TYPE, NAME_KEY } from '../packs/behavior_packs/WARLAND_Impostor_BP/scripts/identity.js';

const alice = { id: '1', name: 'Alice With Space', dimensionId: 'minecraft:overworld', gameMode: 'Survival' };
const bob = { id: '2', name: 'Bób', dimensionId: 'minecraft:the_end', gameMode: 'Survival' };
const spectator = { id: '3', name: 'Spectator', dimensionId: 'minecraft:overworld', gameMode: 'Spectator' };
test('selects a connected participant in this dimension, ignoring spectators', () => {
  assert.equal(choosePlayer([alice, bob, spectator], alice.dimensionId, () => 0.99), alice);
  assert.equal(choosePlayer([alice, bob], bob.dimensionId, () => 0), bob);
});
test('falls back to other connected dimensions and waits when nobody is online', () => {
  assert.equal(choosePlayer([bob], alice.dimensionId), bob);
  assert.equal(choosePlayer([], alice.dimensionId), undefined);
  assert.equal(choosePlayer([spectator], alice.dimensionId), undefined);
});
test('random selection reaches both players; invalid RNG cannot escape the array', () => {
  const players = [alice, { ...bob, dimensionId: alice.dimensionId }];
  assert.equal(choosePlayer(players, alice.dimensionId, () => 0), players[0]);
  assert.equal(choosePlayer(players, alice.dimensionId, () => 0.999), players[1]);
  assert.equal(choosePlayer(players, alice.dimensionId, () => 1), players[1]);
  assert.equal(choosePlayer(players, alice.dimensionId, () => NaN), players[0]);
});
test('exact names with spaces are supported and substring lookups are rejected', () => {
  assert.equal(findPlayer([alice, bob], ' alice with space '), alice);
  assert.equal(findPlayer([alice], 'Alice'), undefined);
  assert.equal(findPlayer([spectator], 'Spectator'), undefined);
});
test('bind and reload preserve exact identity; they never edit a real player', () => {
  const dynamic = new Map(), properties = new Map();
  const mob = { typeId: ENTITY_TYPE, setProperty: (k, v) => properties.set(k, v), setDynamicProperty: (k, v) => dynamic.set(k, v), getDynamicProperty: k => dynamic.get(k), nameTag: '' };
  assert.equal(bindIdentity(mob, alice), true);
  assert.equal(mob.nameTag, alice.name);
  assert.equal(dynamic.get(NAME_KEY), alice.name);
  mob.nameTag = 'incorrect';
  assert.equal(restoreIdentity(mob), true);
  assert.equal(mob.nameTag, alice.name);
  assert.equal(bindIdentity({ typeId: 'minecraft:player' }, alice), false);
  assert.equal(bindIdentity(mob, { name: '' }), false);
});
test('both default appearances are reachable and stable across reconnects', () => {
  assert.equal(appearanceFor('ALICE'), appearanceFor('alice'));
  const values = new Set(Array.from({ length: 30 }, (_, i) => appearanceFor('Jugador' + i)));
  assert.deepEqual([...values].sort(), [0, 1]);
});
