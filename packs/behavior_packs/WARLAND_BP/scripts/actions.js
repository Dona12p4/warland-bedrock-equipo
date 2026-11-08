const actions = new Map();
// Comandos y botones comparten validación, permisos y transacciones.
export function registerAction(name, action) { actions.set(name, action); }
export function performAction(name, player, arg) {
    const action = actions.get(name);
    if (!action)
        throw Error('Esta función todavía no está disponible.');
    action(player, arg);
}
//# sourceMappingURL=actions.js.map