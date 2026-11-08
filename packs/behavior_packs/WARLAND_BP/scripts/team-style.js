export const plainTeamName = (name) => name.replace(/§[0-9a-u]/gi, '');
export const teamNameKey = (name) => plainTeamName(name).toLowerCase();
export function validateTeamName(name) {
    if (!name || name.length > 80 || !/^[A-Za-z0-9_-]{3,20}$/.test(plainTeamName(name)))
        throw Error('Nombre de 3–20 letras, números o guiones. Puedes añadir formato con §, por ejemplo §cEquipo.');
    return name;
}
export function teamTag(team) { return `[${team.name}§r]§r`; }
const clean = (s) => s.replace(/§./gu, '').replace(/[\r\n\u0000-\u001f]/g, ' ');
export function formatTeamChat(team, playerName, message) {
    return `${team ? teamTag(team) + ' ' : ''}§f${clean(playerName)}§r: ${message.replace(/[\r\n\u0000-\u001f]/g, ' ')}§r`;
}
//# sourceMappingURL=team-style.js.map