import { world } from '@minecraft/server';
export const isBeta = () => world.getDynamicProperty('warland:beta') === true;
export const freeBetaShop = () => isBeta() && world.getDynamicProperty('warland:beta_free_shop') === true;
//# sourceMappingURL=beta-policy.js.map