import { CONFIG, teamFor, validateClaim } from './core.js';
export const claimKey = (c) => `${c.dimension}:${c.x}:${c.z}`;
const plain = (c) => ({ dimension: c.dimension, x: c.x, z: c.z });
export function claimBounds(c, buffer = 0) { return { minX: c.x * 16 - buffer, maxX: c.x * 16 + 16 + buffer, minZ: c.z * 16 - buffer, maxZ: c.z * 16 + 16 + buffer }; }
export function areaBounds(c) { return { minX: Math.min(...c.map(v => v.x)) * 16, maxX: (Math.max(...c.map(v => v.x)) + 1) * 16, minZ: Math.min(...c.map(v => v.z)) * 16, maxZ: (Math.max(...c.map(v => v.z)) + 1) * 16 }; }
const neighbors = (c) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([x, z]) => ({ dimension: c.dimension, x: c.x + x, z: c.z + z }));
export function connectedArea(cells, root) {
    const left = new Map(cells.filter(c => c.dimension === root.dimension).map(c => [claimKey(c), plain(c)])), out = [], queue = [root];
    while (queue.length) {
        const c = queue.pop(), key = claimKey(c), found = left.get(key);
        if (!found)
            continue;
        left.delete(key);
        out.push(found);
        queue.push(...neighbors(c));
    }
    return out;
}
export function availableContribution(t, owner) { return Math.max(0, Math.min(CONFIG.chunksPerMember - t.claims.filter(c => c.contributor === owner).length, t.members.length * CONFIG.chunksPerMember - t.claims.length)); }
const signature = (c) => c.map(claimKey).sort().join('|');
function allowed(teams, t, c) { try {
    validateClaim(teams, t, c);
    return true;
}
catch {
    return false;
} }
function rectangleGrowth(teams, t, base, anchor, count) {
    const b = areaBounds(base), w = (b.maxX - b.minX) / 16, h = (b.maxZ - b.minZ) / 16;
    if (w * h !== base.length)
        return;
    const total = base.length + count, baseKeys = new Set(base.map(claimKey)), owned = new Set(t.claims.map(claimKey)), candidates = [];
    for (let width = w; width <= total; width++) {
        if (total % width)
            continue;
        const height = total / width;
        if (height < h)
            continue;
        for (let x0 = b.minX / 16 - (width - w); x0 <= b.minX / 16; x0++)
            for (let z0 = b.minZ / 16 - (height - h); z0 <= b.minZ / 16; z0++) {
                const cells = [];
                for (let x = x0; x < x0 + width; x++)
                    for (let z = z0; z < z0 + height; z++) {
                        const c = { dimension: anchor.dimension, x, z };
                        if (!baseKeys.has(claimKey(c)))
                            cells.push(c);
                    }
                if (cells.length !== count || cells.some(c => owned.has(claimKey(c)) || !allowed(teams, t, c)))
                    continue;
                candidates.push({ cells, shape: Math.abs(width - height), distance: cells.reduce((sum, c) => sum + (c.x - anchor.x) ** 2 + (c.z - anchor.z) ** 2, 0) });
            }
    }
    candidates.sort((a, b) => a.shape - b.shape || a.distance - b.distance || signature(a.cells).localeCompare(signature(b.cells)));
    return candidates[0]?.cells;
}
function grow(teams, t, base, anchor, count) {
    const rect = rectangleGrowth(teams, t, base, anchor, count);
    if (rect)
        return rect;
    const added = [], owned = new Set(t.claims.map(claimKey));
    for (let n = 0; n < count; n++) {
        const all = [...base, ...added], keys = new Set(all.map(claimKey)), frontier = new Map();
        for (const c of all)
            for (const v of neighbors(c))
                if (!keys.has(claimKey(v)) && !owned.has(claimKey(v)) && allowed(teams, t, v))
                    frontier.set(claimKey(v), v);
        const ranked = [...frontier.values()].map(c => { const b = areaBounds([...all, c]); return { c, waste: (b.maxX - b.minX) * (b.maxZ - b.minZ) / 256 - all.length - 1, touch: neighbors(c).filter(v => keys.has(claimKey(v))).length, distance: (c.x - anchor.x) ** 2 + (c.z - anchor.z) ** 2 }; });
        ranked.sort((a, b) => a.waste - b.waste || b.touch - a.touch || a.distance - b.distance || a.c.x - b.c.x || a.c.z - b.c.z);
        if (!ranked.length)
            break;
        added.push(ranked[0].c);
    }
    return added;
}
export function prepareSelection(teams, owner, anchor, y, expires, view = false) {
    const t = teamFor(teams, owner);
    if (!t)
        throw Error('Crea o únete a un equipo primero.');
    const nearby = t.claims.filter(c => c.dimension === anchor.dimension && Math.abs(c.x - anchor.x) <= 1 && Math.abs(c.z - anchor.z) <= 1).sort((a, b) => (a.x - anchor.x) ** 2 + (a.z - anchor.z) ** 2 - (b.x - anchor.x) ** 2 - (b.z - anchor.z) ** 2 || a.x - b.x || a.z - b.z);
    const root = nearby[0] ? plain(nearby[0]) : plain(anchor), base = nearby[0] ? connectedArea(t.claims, root) : [];
    if (view && !base.length)
        throw Error('Mira o sitúate dentro de un terreno de tu equipo.');
    const s = { owner, team: t.id, claim: plain(anchor), root, y, expires, additions: [], area: base, action: view ? 'view' : base.length ? 'expand' : 'new' };
    if (view)
        return s;
    const count = availableContribution(t, owner);
    if (!count) {
        s.error = t.claims.filter(c => c.contributor === owner).length >= CONFIG.chunksPerMember ? 'Ya aportaste tu superficie. Libera terreno antes de elegir otro.' : 'El equipo agotó su superficie disponible.';
        s.area = base.length ? base : [plain(anchor)];
        return s;
    }
    if (base.length) {
        s.additions = grow(teams, t, base, anchor, count);
        if (s.additions.length < count)
            s.error = 'No hay espacio contiguo libre para sumar tu superficie. Elige otro lugar.';
    }
    else {
        const width = Math.ceil(Math.sqrt(count));
        s.additions = Array.from({ length: count }, (_, i) => ({ dimension: anchor.dimension, x: anchor.x + i % width, z: anchor.z + Math.floor(i / width) }));
    }
    s.area = connectedArea([...t.claims, ...s.additions], root);
    if (!s.area.length)
        s.area = [plain(anchor)];
    return s;
}
export function selectedArea(teams, s) { if (s.action !== 'view' && !s.confirmed)
    return s.area; const t = teams.find(t => t.id === s.team); return t ? connectedArea(t.claims, s.root) : []; }
export function selectionStatus(teams, s, owner) {
    if (owner !== s.owner)
        return { kind: 'blocked', message: 'Solo quien colocó esta selección puede confirmarla.' };
    const t = teamFor(teams, owner);
    if (!t || t.id !== s.team)
        return { kind: 'blocked', message: 'Tu equipo cambió. Vuelve a elegir terreno.' };
    if (s.action === 'view' || s.confirmed)
        return selectedArea(teams, s).length ? { kind: 'owned', message: 'Ya protegido por tu equipo' } : { kind: 'blocked', message: 'Este terreno ya no pertenece a tu equipo.' };
    if (s.error)
        return { kind: 'blocked', message: s.error };
    if (!s.additions.length || s.additions.length > availableContribution(t, owner))
        return { kind: 'blocked', message: 'Cambió la superficie disponible. Golpea para actualizar la selección.' };
    try {
        const staged = { ...t, claims: [...t.claims] }, all = teams.map(v => v === t ? staged : v);
        for (const c of s.additions) {
            validateClaim(all, staged, c);
            staged.claims.push(plain(c));
        }
        if (signature(connectedArea(staged.claims, s.root)) !== signature(s.area))
            throw Error('Los límites cambiaron. Golpea para revisar la ampliación.');
        return { kind: 'available', message: 'Disponible' };
    }
    catch (e) {
        return { kind: 'blocked', message: e instanceof Error ? e.message : String(e) };
    }
}
export function confirmSelection(teams, s, owner, dimension, position, now, persist) {
    if (owner !== s.owner)
        throw Error('Solo quien colocó esta selección puede confirmarla.');
    if (now > s.expires)
        throw Error('La selección caducó. Vuelve a elegir terreno.');
    if (dimension !== s.claim.dimension)
        throw Error('Cambiaste de dimensión. Vuelve a elegir terreno.');
    const b = claimBounds(s.claim), dx = Math.max(b.minX - position.x, 0, position.x - b.maxX), dz = Math.max(b.minZ - position.z, 0, position.z - b.maxZ);
    if (dx * dx + dz * dz > 4096)
        throw Error('Acércate al terreno antes de confirmar.');
    const status = selectionStatus(teams, s, owner);
    if (status.kind !== 'available')
        throw Error(status.message);
    const t = teamFor(teams, owner), before = t.claims.length;
    t.claims.push(...s.additions.map(c => ({ ...plain(c), contributor: owner })));
    try {
        persist(t);
    }
    catch (e) {
        t.claims.splice(before);
        throw e;
    }
    s.confirmed = true;
    return t;
}
function edges(cells) {
    const unique = new Map(cells.map(c => [claimKey(c), c])), groups = new Map();
    function add(effect, fixed, start, end) { const key = effect + ':' + fixed; if (!groups.has(key))
        groups.set(key, { effect, fixed, parts: [] }); groups.get(key).parts.push([start, end]); }
    for (const c of unique.values()) {
        const x = c.x * 16, z = c.z * 16, has = (dx, dz) => unique.has(claimKey({ dimension: c.dimension, x: c.x + dx, z: c.z + dz }));
        if (!has(0, -1))
            add('x', z, x, x + 16);
        if (!has(0, 1))
            add('x', z + 16, x, x + 16);
        if (!has(-1, 0))
            add('z', x, z, z + 16);
        if (!has(1, 0))
            add('z', x + 16, z, z + 16);
    }
    const out = [];
    for (const g of groups.values()) {
        g.parts.sort((a, b) => a[0] - b[0]);
        let [start, end] = g.parts[0];
        for (const [a, b] of g.parts.slice(1)) {
            if (a === end)
                end = b;
            else {
                out.push({ effect: g.effect, fixed: g.fixed, start, end });
                start = a;
                end = b;
            }
        }
        out.push({ effect: g.effect, fixed: g.fixed, start, end });
    }
    return out;
}
export function outlineSegments(cells, y) {
    const area = Array.isArray(cells) ? cells : [cells], boundary = edges(area), corners = new Map(), out = [];
    function line(e, height, buffer) { const mid = (e.start + e.end) / 2; out.push({ effect: e.effect, x: e.effect === 'x' ? mid : e.fixed, y: height, z: e.effect === 'x' ? e.fixed : mid, half: (e.end - e.start) / 2, buffer }); }
    for (const e of boundary) {
        line(e, y, false);
        line(e, y + 3, false);
        for (const p of [e.start, e.end]) {
            const x = e.effect === 'x' ? p : e.fixed, z = e.effect === 'x' ? e.fixed : p;
            corners.set(x + ':' + z, { x, z });
        }
    }
    const expanded = [], margin = CONFIG.bufferBlocks / 16;
    for (const c of area)
        for (let dx = -margin; dx <= margin; dx++)
            for (let dz = -margin; dz <= margin; dz++)
                expanded.push({ dimension: c.dimension, x: c.x + dx, z: c.z + dz });
    for (const e of edges(expanded))
        line(e, y + .05, true);
    for (const c of corners.values())
        out.push({ effect: 'post', x: c.x, y: y + 1.5, z: c.z, half: 1.5, buffer: false });
    return out;
}
//# sourceMappingURL=territory-selection.js.map