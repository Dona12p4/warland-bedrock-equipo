import { world, system } from '@minecraft/server';
import { ENTITY_TYPE, bindIdentity, choosePlayer, findPlayer, restoreIdentity } from './identity.js';
import {trackMovement} from './movement.js';

// Only unassigned impostors are polled, in bounded batches. The engine handles walking.
const waiting = new Map();
const ADMINS = new Set(['danielgamersc', 'hatsudemiku']);

export function connectedPlayers() {
  return world.getAllPlayers().map(p => {
    try { return { id: p.id, name: p.name, dimensionId: p.dimension.id, gameMode: p.getGameMode() }; }
    catch { return undefined; }
  }).filter(Boolean);
}

export function initialize(entity, players = connectedPlayers()) {
  if (!entity?.isValid || entity.typeId !== ENTITY_TYPE) return false;
  trackMovement(entity);
  if (restoreIdentity(entity)) { waiting.delete(entity.id); return true; }
  const source = choosePlayer(players, entity.dimension.id);
  if (source && bindIdentity(entity, source)) { waiting.delete(entity.id); return true; }
  entity.nameTag = 'Impostor';
  waiting.set(entity.id, entity);
  return false;
}

function safelyInitialize(entity) {
  try { initialize(entity); }
  catch (error) { console.warn('[WARLAND Impostor] No se pudo asignar identidad: ' + String(error)); }
}

world.afterEvents.entitySpawn.subscribe(({ entity }) => {
  if (entity.typeId === ENTITY_TYPE) system.run(() => safelyInitialize(entity));
});
world.afterEvents.entityLoad.subscribe(({ entity }) => {
  if (entity.typeId === ENTITY_TYPE) system.run(() => safelyInitialize(entity));
});
world.afterEvents.entityRemove.subscribe(({ removedEntityId }) => waiting.delete(removedEntityId));
world.afterEvents.worldLoad.subscribe(() => system.run(() => {
  for (const id of ['overworld', 'nether', 'the_end']) {
    for (const entity of world.getDimension(id).getEntities({ type: ENTITY_TYPE })) safelyInitialize(entity);
  }
}));

system.runInterval(() => {
  if (!waiting.size) return;
  const players = connectedPlayers();
  let processed = 0;
  for (const [id, entity] of [...waiting]) {
    if (++processed > 16) break;
    waiting.delete(id);
    if (entity.isValid) {
      try { initialize(entity, players); } catch { /* Entity may have unloaded during this tick. */ }
    }
  }
}, 40);

// Explicit local test control. Never changes chat authors, scoreboard, accounts or player data.
system.afterEvents.scriptEventReceive.subscribe(event => {
  if (event.id !== 'warland:impostor') return;
  const caller = event.sourceEntity;
  if (!caller || caller.typeId !== 'minecraft:player' || !ADMINS.has(caller.name.toLowerCase())) return;
  const name = event.message.trim();
  const source = findPlayer(connectedPlayers(), name);
  if (!source) { caller.sendMessage('Ese jugador no está conectado o está en espectador.'); return; }
  const mob = caller.dimension.getEntities({ type: ENTITY_TYPE, location: caller.location, maxDistance: 16, closest: 1 })[0];
  if (!mob) { caller.sendMessage('No hay un impostor cerca.'); return; }
  try { bindIdentity(mob, source); waiting.delete(mob.id); caller.sendMessage('Impostor: ' + source.name); }
  catch { caller.sendMessage('No se pudo cambiar el impostor.'); }
});
