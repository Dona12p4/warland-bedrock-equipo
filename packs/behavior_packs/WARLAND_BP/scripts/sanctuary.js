let sanctuary;
export function configureSanctuary(value) { sanctuary = value; }
export function sanctuaryConfig() { return sanctuary; }
export function inSanctuary(dimension, position, extra = 0) {
    return !!sanctuary && dimension === sanctuary.dimension && Math.hypot(position.x - sanctuary.x, position.z - sanctuary.z) <= sanctuary.radius + extra;
}
export function claimTouchesSanctuary(c, buffer = 0) {
    if (!sanctuary || c.dimension !== sanctuary.dimension)
        return false;
    const x = Math.max(c.x * 16 - buffer, Math.min(c.x * 16 + 16 + buffer, sanctuary.x));
    const z = Math.max(c.z * 16 - buffer, Math.min(c.z * 16 + 16 + buffer, sanctuary.z));
    return inSanctuary(c.dimension, { x, z });
}
//# sourceMappingURL=sanctuary.js.map