const monsters = new Set(['zombie', 'husk', 'drowned', 'skeleton', 'stray', 'bogged', 'wither_skeleton', 'creeper', 'spider', 'cave_spider', 'witch', 'slime', 'magma_cube', 'blaze', 'ghast', 'piglin_brute', 'hoglin', 'zoglin', 'pillager', 'vindicator', 'evoker', 'ravager', 'phantom', 'silverfish', 'endermite', 'guardian', 'elder_guardian', 'breeze', 'warden', 'enderman', 'wither'].map(s => 'minecraft:' + s));
for (const name of ['shadow_boss', 'thermal_creeper', 'palpador', 'rastreador', 'apagavelas', 'garganta_abierta'])
    monsters.add('warland:' + name + '_prototype');
for(const n of ['ender','ghost','magma','mummy','sculk','skeleton'])monsters.add('warland:'+n+'_creeper');
export function isHostileDefenseTarget(e) {
    if (!monsters.has(e.typeId))
        return false;
    try {
        if (e.getComponent('minecraft:tameable')?.isTamed)
            return false;
    }
    catch {
        return false;
    }
    return true;
}
const defenseItems = new Set(['minecraft:bow', 'minecraft:crossbow', 'minecraft:trident', 'minecraft:shield', 'minecraft:potion', 'minecraft:milk_bucket', 'warland:vision_umbral']);
export const defenseUseAllowed = (id) => defenseItems.has(id);
//# sourceMappingURL=hostile-defense.js.map