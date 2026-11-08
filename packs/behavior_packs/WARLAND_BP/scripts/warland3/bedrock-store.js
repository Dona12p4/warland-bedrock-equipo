import { world } from "@minecraft/server";
// Usar después de worldLoad. runtime.ts migra saldos previos sin nueva emisión.
export const bedrockSeasonStore = {
    get(key) { const value = world.getDynamicProperty(key); if (value === undefined)
        return; if (typeof value !== "string")
        throw new Error("Tipo de dato de temporada inválido."); return value; },
    set(key, value) { world.setDynamicProperty(key, value); },
    keys() { return world.getDynamicPropertyIds(); },
};
//# sourceMappingURL=bedrock-store.js.map