import { world, system, Player } from '@minecraft/server';
import { teamFor } from './core.js';
import { formatTeamChat } from './team-style.js';
// Adaptador opcional: no activa experimentos ni altera el chat si la API no existe.
export function registerTeamChat(teams, ready) {
    // Native prefixes preserve normal chat routing and filtering on authorized APIs.
    if ('chatNamePrefix' in Player.prototype)
        return true;
    const event = world.beforeEvents.chatSend;
    if (!event)
        return false;
    event.subscribe(e => {
        if (!ready() || e.cancel || e.targets !== undefined)
            return;
        const id = e.sender.getDynamicProperty('warland:player_id');
        const team = id ? teamFor(teams, id) : undefined;
        if (!team)
            return;
        const formatted = formatTeamChat(team, e.sender.name, e.message);
        e.cancel = true;
        system.run(() => world.sendMessage(formatted));
    });
    return true;
}
//# sourceMappingURL=team-chat.js.map