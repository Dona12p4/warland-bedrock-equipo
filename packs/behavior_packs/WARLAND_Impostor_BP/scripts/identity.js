// Pure selection logic, shared by the native pack and tests.
export const ENTITY_TYPE = 'warland:impostor';
export const NAME_KEY = 'warland:impostor_name';
export const OWNER_KEY = 'warland:impostor_source';
export const SKIN_KEY = 'warland:appearance';

export function appearanceFor(name) {
  let hash = 2166136261;
  for (const character of name.toLowerCase()) hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
  return (hash >>> 0) % 2;
}

export function choosePlayer(players, dimensionId, random = Math.random) {
  const candidates = players.filter(p => p && typeof p.name === 'string' && p.name.trim() && p.gameMode !== 'Spectator' && p.gameMode !== 'spectator');
  const nearbyDimension = candidates.filter(p => p.dimensionId === dimensionId);
  const pool = nearbyDimension.length ? nearbyDimension : candidates;
  if (!pool.length) return undefined;
  const value = random();
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor((Number.isFinite(value) ? value : 0) * pool.length)));
  return pool[index];
}

export function findPlayer(players, name) {
  const normalized = name.trim().toLowerCase();
  return players.find(p => p.name.toLowerCase() === normalized && p.gameMode !== 'Spectator' && p.gameMode !== 'spectator');
}

export function bindIdentity(entity, player) {
  if (entity.typeId !== ENTITY_TYPE || !player?.name?.trim()) return false;
  entity.setProperty(SKIN_KEY, appearanceFor(player.name));
  entity.setDynamicProperty(NAME_KEY, player.name);
  entity.setDynamicProperty(OWNER_KEY, String(player.id));
  entity.nameTag = player.name;
  return true;
}

export function restoreIdentity(entity) {
  const name = entity.getDynamicProperty(NAME_KEY);
  if (typeof name !== 'string' || !name.trim()) return false;
  entity.nameTag = name;
  entity.setProperty(SKIN_KEY, appearanceFor(name));
  return true;
}
