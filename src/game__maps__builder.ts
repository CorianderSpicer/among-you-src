// Map builder: turns a compact MapSpec (rooms + hall polylines in tiles) into a full tile grid with walls, doors,
// task spots, vents, fix panels, consoles, decor props and collision. Pure data — used by the host sim and by the renderer.
import { TILE } from './game__core__constants';
import type { MapId, SabotageId, Rect } from './game__core__types';
import { decorateRoom, PropSpec } from './game__maps__decor';

export interface RoomSpec { id: string; name: string; x: number; y: number; w: number; h: number; kind: string; tasks?: string[]; vent?: [number, number]; window?: boolean; floor?: string; outdoor?: boolean; restricted?: boolean; cam?: boolean }
export interface MapSpec {
  id: MapId; name: string; sub: string; theme: string; w: number; h: number; rooms: RoomSpec[]; halls: number[][][]; hallW?: number;
  vents: string[][]; emergency: string; spawn: string; sabotages: SabotageId[]; fix: Partial<Record<SabotageId, string[]>>;
  events: string[]; admin: string; camsRoom: string; logs: string; cams: [number, number, string][];
  zones?: { kind: 'ice' | 'water' | 'cold' | 'sand' | 'outdoor' | 'turret'; x: number; y: number; w: number; h: number }[];
  passages?: [number, number, number, number][]; extraProps?: PropSpec[]; keycard?: string;
}
export interface Room extends Rect { id: string; name: string; kind: string; idx: number; cx: number; cy: number; spec: RoomSpec }
export interface Door { id: string; room: string; x: number; y: number; w: number; h: number; tiles: number[]; horiz: boolean }
export interface Spot { id: string; kind: 'task' | 'fix' | 'emergency' | 'admin' | 'cams' | 'logs' | 'vent' | 'passage' | 'relic' | 'keycard'; game?: string; sab?: SabotageId; x: number; y: number; room: string; wall: boolean; links?: string[] }
export interface MapData {
  id: MapId; name: string; sub: string; theme: string; w: number; h: number; W: number; H: number;
  grid: Uint8Array;   // 0 void, 1 floor, 2 wall
  roomAt: Int16Array; rooms: Room[]; doors: Door[]; spots: Spot[]; props: PropSpec[]; solids: Rect[];
  spawn: { x: number; y: number }; cams: { id: string; x: number; y: number; name: string; room: string }[];
  zones: NonNullable<MapSpec['zones']>; spec: MapSpec; byId: Record<string, Spot>; roomById: Record<string, Room>; restricted: string[];
}

export function buildMap(spec: MapSpec): MapData {
  const { w, h } = spec; const grid = new Uint8Array(w * h); const roomAt = new Int16Array(w * h).fill(-1);
  const hw = spec.hallW || 3;
  const rooms: Room[] = spec.rooms.map((r, idx) => ({ id: r.id, name: r.name, kind: r.kind, idx, x: r.x * TILE, y: r.y * TILE, w: r.w * TILE, h: r.h * TILE, cx: (r.x + r.w / 2) * TILE, cy: (r.y + r.h / 2) * TILE, spec: r }));
  rooms.forEach((r, i) => { const s = r.spec; for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) { grid[y * w + x] = 1; roomAt[y * w + x] = i; } });
  // halls
  const hallRects: Rect[] = [];
  for (const pl of spec.halls) for (let i = 0; i < pl.length - 1; i++) {
    const [x1, y1] = pl[i], [x2, y2] = pl[i + 1]; const lo = Math.floor((hw - 1) / 2), hi = hw - 1 - lo;
    const r = { x: Math.min(x1, x2) - lo, y: Math.min(y1, y2) - lo, w: Math.abs(x2 - x1) + hw, h: Math.abs(y2 - y1) + hw }; hallRects.push(r);
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (x >= 0 && y >= 0 && x < w && y < h) grid[y * w + x] = 1;
  }
  // walls
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (grid[y * w + x]) continue; let near = false;
    for (let dy = -1; dy <= 2 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && grid[yy * w + xx] === 1 && !(dy === 2 && dx !== 0)) { near = true; break; } }
    if (near) grid[y * w + x] = 2; }
  // doors: hall tiles hugging a room edge (one per room/side/hall)
  const doors: Door[] = []; const seen = new Set<string>();
  rooms.forEach(r => { const s = r.spec; if (s.outdoor) return;
    const sides: [number, number, number, number, boolean][] = [[s.x, s.y - 1, s.w, 1, true], [s.x, s.y + s.h, s.w, 1, true], [s.x - 1, s.y, 1, s.h, false], [s.x + s.w, s.y, 1, s.h, false]];
    sides.forEach(([sx, sy, sw, sh, horiz], si) => { let run: number[] = [];
      const flush = () => { if (run.length >= 2) { const key = r.id + si + run[0]; if (!seen.has(key)) { seen.add(key); const xs = run.map(i => i % w), ys = run.map(i => Math.floor(i / w));
        const minx = Math.min(...xs), miny = Math.min(...ys); doors.push({ id: `${r.id}-d${doors.filter(d => d.room === r.id).length}`, room: r.id, x: minx * TILE, y: miny * TILE, w: (Math.max(...xs) - minx + 1) * TILE, h: (Math.max(...ys) - miny + 1) * TILE, tiles: run.slice(), horiz }); } } run = []; };
      for (let k = 0; k < sw * sh; k++) { const x = sx + (horiz ? k : 0), y = sy + (horiz ? 0 : k); const i = y * w + x; if (x >= 0 && y >= 0 && x < w && y < h && grid[i] === 1 && roomAt[i] < 0) run.push(i); else flush(); } flush(); }); });
  // spots
  const spots: Spot[] = []; const props: PropSpec[] = [];
  const wallSlots = (r: Room) => { // usable x positions along the top wall (tile x) avoiding doors
    const s = r.spec; const out: number[] = []; for (let x = s.x + 1; x < s.x + s.w - 1; x++) { const above = (s.y - 1) * w + x; if (grid[above] === 2) out.push(x); } return out; };
  const used = new Map<string, Set<number>>();
  const takeSlot = (r: Room, pref?: number) => { const sl = wallSlots(r); const u = used.get(r.id) || new Set(); used.set(r.id, u);
    const ok = sl.filter(x => !u.has(x) && !u.has(x - 1) && !u.has(x + 1)); if (!ok.length) return null;
    let pick = ok[Math.floor(ok.length / 2)]; if (pref !== undefined) pick = ok.reduce((a, b) => Math.abs(b - pref) < Math.abs(a - pref) ? b : a);
    else { const order = [0.2, 0.8, 0.5, 0.35, 0.65, 0.1, 0.9]; const idx = u.size % order.length; const target = r.spec.x + r.spec.w * order[idx]; pick = ok.reduce((a, b) => Math.abs(b - target) < Math.abs(a - target) ? b : a); }
    u.add(pick); return pick; };
  const addWall = (r: Room, kind: Spot['kind'], id: string, extra: Partial<Spot> = {}) => { const tx = takeSlot(r); if (tx === null) { // fall back to floor placement
      const fx = r.cx + ((spots.length * 37) % 5 - 2) * TILE, fy = r.cy; const sp: Spot = { id, kind, x: fx, y: fy, room: r.id, wall: false, ...extra }; spots.push(sp); return sp; }
    const sp: Spot = { id, kind, x: (tx + 0.5) * TILE, y: (r.spec.y + 0.75) * TILE, room: r.id, wall: true, ...extra }; spots.push(sp); return sp; };
  const R = (id: string) => { const r = rooms.find(r => r.id === id); if (!r) throw new Error('room ' + id + ' in ' + spec.id); return r; };
  const em = R(spec.emergency); spots.push({ id: 'emergency', kind: 'emergency', x: em.cx, y: em.cy, room: em.id, wall: false });
  addWall(R(spec.admin), 'admin', 'admin'); addWall(R(spec.camsRoom), 'cams', 'cams'); addWall(R(spec.logs), 'logs', 'logs'); if (spec.keycard) addWall(R(spec.keycard), 'keycard', 'keycard');
  for (const [sab, list] of Object.entries(spec.fix) as [SabotageId, string[]][]) list.forEach((rid, i) => addWall(R(rid), 'fix', `fix:${sab}:${i}`, { sab }));
  rooms.forEach(r => (r.spec.tasks || []).forEach(g => addWall(r, 'task', `${r.id}:${g}`, { game: g })));
  // vents
  spec.vents.forEach((grp, gi) => grp.forEach(rid => { const r = R(rid); const off = r.spec.vent || [r.spec.w * 0.75, r.spec.h * 0.72];
    spots.push({ id: `vent:${rid}`, kind: 'vent', x: (r.spec.x + off[0]) * TILE, y: (r.spec.y + off[1]) * TILE, room: rid, wall: false, links: grp.filter(o => o !== rid).map(o => `vent:${o}`) }); }));
  (spec.passages || []).forEach(([x1, y1, x2, y2], i) => { const a = `pass:${i}:a`, b = `pass:${i}:b`; const ra = roomAtPx(x1 * TILE, y1 * TILE), rb = roomAtPx(x2 * TILE, y2 * TILE);
    spots.push({ id: a, kind: 'passage', x: x1 * TILE, y: y1 * TILE, room: ra, wall: false, links: [b] }, { id: b, kind: 'passage', x: x2 * TILE, y: y2 * TILE, room: rb, wall: false, links: [a] }); });
  function roomAtPx(px: number, py: number) { const i = Math.floor(py / TILE) * w + Math.floor(px / TILE); return roomAt[i] >= 0 ? rooms[roomAt[i]].id : 'hall'; }
  // decor
  const solids: Rect[] = [];
  rooms.forEach(r => { const keep: Rect[] = [];
    doors.filter(d => d.room === r.id).forEach(d => keep.push({ x: d.x - TILE * 2, y: d.y - TILE * 2, w: d.w + TILE * 4, h: d.h + TILE * 4 }));
    spots.filter(s => s.room === r.id).forEach(s => keep.push({ x: s.x - TILE * 1.5, y: s.y - TILE * (s.wall ? 1 : 1.5), w: TILE * 3, h: TILE * (s.wall ? 2.8 : 3) }));
    // keep walking lanes from every door toward the middle so rooms never become mazes
    const soft: Rect[] = []; doors.filter(d => d.room === r.id).forEach(d => { const cx = d.x + d.w / 2, cy = d.y + d.h / 2; soft.push({ x: Math.min(cx, r.cx) - TILE * 1.4, y: Math.min(cy, r.cy) - TILE * 1.4, w: Math.abs(cx - r.cx) + TILE * 2.8, h: Math.abs(cy - r.cy) + TILE * 2.8 }); });
    const placed = decorateRoom(r, spec.theme, keep, spots.filter(s => s.room === r.id), soft); props.push(...placed); });
  (spec.extraProps || []).forEach(p => props.push(p));
  for (const p of props) if (p.solid) solids.push(p.solid);
  const cams = spec.cams.map(([x, y, name], i) => ({ id: 'cam' + i, x: x * TILE, y: y * TILE, name, room: roomAtPx(x * TILE, y * TILE) }));
  const sr = R(spec.spawn);
  const byId: Record<string, Spot> = {}; spots.forEach(s => byId[s.id] = s);
  const roomById: Record<string, Room> = {}; rooms.forEach(r => roomById[r.id] = r);
  return { id: spec.id, name: spec.name, sub: spec.sub, theme: spec.theme, w, h, W: w * TILE, H: h * TILE, grid, roomAt, rooms, doors, spots, props, solids, spawn: { x: sr.cx, y: sr.cy + TILE }, cams, zones: spec.zones || [], spec, byId, roomById, restricted: doors.filter(d => roomById[d.room]?.spec.restricted).map(d => d.id) };
}

/** Which room (id) contains a world point — 'hall' for corridors. */
export function roomOf(m: MapData, x: number, y: number): string { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return 'hall'; const i = m.roomAt[ty * m.w + tx]; return i >= 0 ? m.rooms[i].id : 'hall'; }
export function roomName(m: MapData, id: string) { return m.roomById[id]?.name || 'Corridor'; }
