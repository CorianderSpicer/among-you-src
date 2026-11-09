// Bakes a MapData into big canvases: floors per room style, 2.5D walls with windows, decor props, wall terminals,
// emergency table and vents. Returns animated-overlay descriptors for things that move.
import { TILE } from './game__core__constants';
import type { MapData, Spot } from './game__maps__builder';
import type { PropSpec } from './game__maps__decor';
import { THEMES, FLOOR_STYLE, Theme } from './game__art__themes';
import { rnd } from './game__art__space';

export interface AnimDesc { k: string; x: number; y: number; w?: number; h?: number; r?: number; col?: string; v?: number; room?: string; id?: string }
export interface Baked { canvas: HTMLCanvasElement; scale: number; anims: AnimDesc[]; lights: { x: number; y: number; r: number; col: string; room?: string }[] }

const sh = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); const f = (c: number) => Math.max(0, Math.min(255, Math.round(a < 0 ? c * (1 + a) : c + (255 - c) * a))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
const al = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
type C = CanvasRenderingContext2D;
const rr = (c: C, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); };

export function bakeMap(m: MapData, quality: string): Baked {
  const want = quality === 'low' ? 1 : quality === 'medium' ? 1.25 : 1.5; const scale = Math.min(want, Math.sqrt(15.5e6 / (m.W * m.H)));
  const cv = document.createElement('canvas'); cv.width = Math.ceil(m.W * scale); cv.height = Math.ceil(m.H * scale); const c = cv.getContext('2d')!; c.scale(scale, scale);
  const th = THEMES[m.theme] || THEMES.orbital; const anims: AnimDesc[] = []; const lights: Baked['lights'] = []; const R = rnd(m.id.length * 999 + m.w);
  const g = (x: number, y: number) => (x < 0 || y < 0 || x >= m.w || y >= m.h) ? 0 : m.grid[y * m.w + x];
  // ── floors ──
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) { if (g(tx, ty) !== 1) continue; const ri = m.roomAt[ty * m.w + tx]; const room = ri >= 0 ? m.rooms[ri] : null;
    const style = room ? (FLOOR_STYLE[room.kind] || 'plates') : 'hall'; floorTile(c, th, style, tx * TILE, ty * TILE, tx, ty, R, room?.spec.outdoor); }
  // hall edge hazard lines + room borders
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) { if (g(tx, ty) !== 1 || m.roomAt[ty * m.w + tx] >= 0) continue; const x = tx * TILE, y = ty * TILE;
    c.fillStyle = al(th.hallLine, 0.55); if (g(tx, ty - 1) === 2) c.fillRect(x, y + 3, TILE, 2); if (g(tx, ty + 1) === 2) c.fillRect(x, y + TILE - 5, TILE, 2); if (g(tx - 1, ty) === 2) c.fillRect(x + 3, y, 2, TILE); if (g(tx + 1, ty) === 2) c.fillRect(x + TILE - 5, y, 2, TILE); }
  // room trims, rugs, light pools
  for (const r of m.rooms) { if (r.spec.outdoor) continue; c.strokeStyle = al(th.trim, 0.12); c.lineWidth = 2; c.strokeRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12);
    const nl = Math.max(1, Math.round(r.w / (TILE * 7))); for (let i = 0; i < nl; i++) lights.push({ x: r.x + r.w * ((i + 0.5) / nl), y: r.y + r.h * 0.45, r: Math.min(r.w / nl, r.h) * 0.75, col: th.lamp, room: r.id }); }
  // ambient occlusion along walls
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) { if (g(tx, ty) !== 1) continue; const x = tx * TILE, y = ty * TILE;
    if (g(tx, ty - 1) === 2) { const gr = c.createLinearGradient(0, y, 0, y + TILE * 1.2); gr.addColorStop(0, 'rgba(0,0,10,0.45)'); gr.addColorStop(1, 'rgba(0,0,10,0)'); c.fillStyle = gr; c.fillRect(x, y, TILE, TILE * 1.2); }
    if (g(tx - 1, ty) === 2) { const gr = c.createLinearGradient(x, 0, x + 14, 0); gr.addColorStop(0, 'rgba(0,0,10,0.35)'); gr.addColorStop(1, 'rgba(0,0,10,0)'); c.fillStyle = gr; c.fillRect(x, y, 14, TILE); }
    if (g(tx + 1, ty) === 2) { const gr = c.createLinearGradient(x + TILE, 0, x + TILE - 14, 0); gr.addColorStop(0, 'rgba(0,0,10,0.35)'); gr.addColorStop(1, 'rgba(0,0,10,0)'); c.fillStyle = gr; c.fillRect(x + TILE - 14, y, 14, TILE); } }
  // zones (ice / water / sand drifts) painted on the floor
  for (const z of m.zones) { const x = z.x * TILE, y = z.y * TILE, w = z.w * TILE, h = z.h * TILE; c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    if (z.kind === 'water') { c.fillStyle = 'rgba(40,140,170,0.45)'; c.fillRect(x, y, w, h); anims.push({ k: 'water', x, y, w, h }); }
    if (z.kind === 'ice') { c.fillStyle = 'rgba(220,245,255,0.35)'; c.fillRect(x, y, w, h); c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1; for (let i = 0; i < w * h / 900; i++) { const px = x + R() * w, py = y + R() * h; c.beginPath(); c.moveTo(px, py); c.lineTo(px + 10 + R() * 20, py + (R() - 0.5) * 10); c.stroke(); } }
    if (z.kind === 'cold') { c.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < w * h / 500; i++) { c.beginPath(); c.ellipse(x + R() * w, y + R() * h, 8 + R() * 16, 3 + R() * 5, 0, 0, 6.28); c.fill(); } }
    if (z.kind === 'sand') { c.fillStyle = 'rgba(230,190,130,0.4)'; for (let i = 0; i < w * h / 700; i++) { c.beginPath(); c.ellipse(x + R() * w, y + R() * h, 14 + R() * 24, 4 + R() * 6, 0.1, 0, 6.28); c.fill(); } }
    if (z.kind === 'turret') { c.strokeStyle = 'rgba(255,77,109,0.35)'; c.setLineDash([6, 6]); c.lineWidth = 2; c.strokeRect(x + 3, y + 3, w - 6, h - 6); c.setLineDash([]); }
    c.restore(); }
  // ── floor-level props (flat) then vents/emergency/passages ──
  const flat = new Set(['rug', 'hazard', 'snowpile', 'puddle', 'dune', 'debris', 'scanner']);
  m.props.filter(p => flat.has(p.t)).forEach(p => drawProp(c, th, p, anims, R));
  m.spots.forEach(s => { if (s.kind === 'vent') drawVent(c, th, s, anims); if (s.kind === 'passage') drawHatch(c, th, s, anims); });
  // ── walls ──
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) { if (g(tx, ty) !== 2) continue; drawWall(c, m, th, tx, ty, g, anims, R); }
  // door frames
  for (const d of m.doors) { c.fillStyle = th.metalDark; if (d.horiz) { c.fillRect(d.x - 6, d.y - 4, 6, d.h + 8); c.fillRect(d.x + d.w, d.y - 4, 6, d.h + 8); } else { c.fillRect(d.x - 4, d.y - 6, d.w + 8, 6); c.fillRect(d.x - 4, d.y + d.h, d.w + 8, 6); } }
  // ── wall terminals & stations ──
  m.spots.forEach(s => { if (s.kind === 'task' || s.kind === 'fix' || s.kind === 'admin' || s.kind === 'cams' || s.kind === 'logs' || s.kind === 'keycard') drawStation(c, th, s, anims); if (s.kind === 'emergency') drawEmergency(c, th, s, anims); });
  // ── standing props, sorted by y for overlap ──
  m.props.filter(p => !flat.has(p.t)).sort((a, b) => (a.y + a.h) - (b.y + b.h)).forEach(p => drawProp(c, th, p, anims, R));
  return { canvas: cv, scale, anims, lights };
}

function floorTile(c: C, th: Theme, style: string, x: number, y: number, tx: number, ty: number, R: () => number, outdoor?: boolean) {
  const T = TILE; const alt = (tx + ty) % 2 === 0;
  switch (style) {
    case 'hall': c.fillStyle = th.hall; c.fillRect(x, y, T, T); c.fillStyle = sh(th.hall, -0.18); for (let i = 4; i < T; i += 7) c.fillRect(x, y + i, T, 1.5); c.fillStyle = sh(th.hall, 0.06); c.fillRect(x, y, T, 1); break;
    case 'tiles': c.fillStyle = alt ? sh(th.floor, 0.1) : sh(th.floor, -0.02); c.fillRect(x, y, T, T); c.strokeStyle = th.seam; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1); c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(x + 2, y + 2, T - 4, 3); break;
    case 'white': c.fillStyle = alt ? '#e4ebf5' : '#d6e0ee'; c.fillRect(x, y, T, T); c.strokeStyle = '#b7c4d8'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1); if ((tx * 7 + ty * 3) % 11 === 0) { c.fillStyle = al(th.accent, 0.35); c.fillRect(x + 12, y + 12, 8, 8); } break;
    case 'carpet': c.fillStyle = sh(th.floor2, -0.08); c.fillRect(x, y, T, T); c.fillStyle = al(th.accent, 0.05); if ((tx + ty) % 4 === 0) c.fillRect(x + 6, y + 6, 20, 20); c.fillStyle = 'rgba(255,255,255,0.025)'; for (let i = 0; i < 6; i++) c.fillRect(x + R() * T, y + R() * T, 2, 2); break;
    case 'grate': c.fillStyle = sh(th.floor, -0.35); c.fillRect(x, y, T, T); c.fillStyle = sh(th.floor, -0.05); for (let i = 3; i < T; i += 6) c.fillRect(x + 2, y + i, T - 4, 3); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x, y, 2, T); c.fillRect(x, y, T, 2); break;
    case 'cargo': c.fillStyle = alt ? th.floor : th.floor2; c.fillRect(x, y, T, T); c.strokeStyle = th.seam; c.lineWidth = 1.5; c.strokeRect(x + 1, y + 1, T - 2, T - 2); c.fillStyle = sh(th.floor, 0.12); for (const [a, b] of [[4, 4], [T - 6, 4], [4, T - 6], [T - 6, T - 6]]) c.fillRect(x + a, y + b, 2, 2); if (tx % 6 === 0) { c.fillStyle = 'rgba(255,200,60,0.35)'; c.fillRect(x + 14, y, 4, T); } break;
    case 'grass': { c.fillStyle = alt ? '#2f6b45' : '#2a6140'; c.fillRect(x, y, T, T); c.fillStyle = '#3e8a58'; for (let i = 0; i < 7; i++) { const px = x + R() * T, py = y + R() * T; c.fillRect(px, py, 1.5, 4); c.fillRect(px + 2, py + 1, 1.5, 3); } if (R() < 0.08) { c.fillStyle = ['#ffd23f', '#ff8fd0', '#ffffff'][Math.floor(R() * 3)]; c.beginPath(); c.arc(x + R() * T, y + R() * T, 1.8, 0, 6.28); c.fill(); } break; }
    case 'ice': c.fillStyle = alt ? '#d9ecf8' : '#cfe4f4'; c.fillRect(x, y, T, T); c.strokeStyle = 'rgba(150,190,220,0.6)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(x + 3, y + 3, 6, 1.5); if (R() < 0.15) { c.strokeStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.moveTo(x + R() * T, y + R() * T); c.lineTo(x + R() * T, y + R() * T); c.stroke(); } break;
    case 'snow': c.fillStyle = '#eef6fc'; c.fillRect(x, y, T, T); c.fillStyle = 'rgba(160,190,215,0.35)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(x + R() * T, y + R() * T, 6 + R() * 8, 2 + R() * 3, 0, 0, 6.28); c.fill(); } break;
    case 'sand': c.fillStyle = alt ? (th.outdoorFloor || '#d9b07a') : sh(th.outdoorFloor || '#d9b07a', -0.04); c.fillRect(x, y, T, T); c.fillStyle = 'rgba(120,80,40,0.18)'; for (let i = 0; i < 6; i++) c.fillRect(x + R() * T, y + R() * T, 2, 1.5); if (R() < 0.05) { c.fillStyle = '#8a6a4a'; c.beginPath(); c.ellipse(x + R() * T, y + R() * T, 3, 2, 0, 0, 6.28); c.fill(); } break;
    case 'wood': c.fillStyle = (ty % 2 ? '#6b4a32' : '#74513a'); c.fillRect(x, y, T, T); c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x, y + T - 2, T, 2); if ((tx + ty * 3) % 3 === 0) c.fillRect(x + T - 1, y, 1, T); c.fillStyle = 'rgba(255,220,180,0.06)'; c.fillRect(x, y + 4, T, 2); break;
    default: c.fillStyle = alt ? th.floor : th.floor2; c.fillRect(x, y, T, T); c.strokeStyle = th.seam; c.lineWidth = 1; if (tx % 2 === 0) c.strokeRect(x + 0.5, y + 0.5, T * 2 - 1, T - 1); c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(x + 3, y + 3, 2, 2); c.fillRect(x + T - 5, y + T - 5, 2, 2);
  }
}

function drawWall(c: C, m: MapData, th: Theme, tx: number, ty: number, g: (x: number, y: number) => number, anims: AnimDesc[], R: () => number) {
  const x = tx * TILE, y = ty * TILE, T = TILE;
  const below = g(tx, ty + 1), below2 = g(tx, ty + 2);
  if (below === 1) { // front face
    const gr = c.createLinearGradient(0, y, 0, y + T); gr.addColorStop(0, th.faceTop); gr.addColorStop(1, th.faceBot); c.fillStyle = gr; c.fillRect(x, y, T, T);
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(x, y + 4, T, 1.5); c.fillStyle = 'rgba(0,0,0,0.25)'; if (tx % 3 === 0) c.fillRect(x, y, 1.5, T);
    c.fillStyle = sh(th.faceBot, -0.35); c.fillRect(x, y + T - 5, T, 5); // baseboard
    c.fillStyle = al(th.trim, 0.65); c.fillRect(x, y + T - 7, T, 1.5);
    // windows on room top walls
    const ri = m.roomAt[(ty + 1) * m.w + tx]; const room = ri >= 0 ? m.rooms[ri] : null;
    if (room && room.spec.window && ty + 1 === room.spec.y && (tx - room.spec.x) % 5 >= 1 && (tx - room.spec.x) % 5 <= 3 && tx > room.spec.x && tx < room.spec.x + room.spec.w - 1 && !m.spots.some(s => s.wall && Math.abs(s.x - (x + T / 2)) < T * 1.5 && s.room === room.id)) {
      c.clearRect(x, y + 6, T, T - 16); c.fillStyle = al('#9fe8ff', 0.08); c.fillRect(x, y + 6, T, T - 16); c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.moveTo(x + 4, y + T - 11); c.lineTo(x + 14, y + 7); c.lineTo(x + 18, y + 7); c.lineTo(x + 8, y + T - 11); c.fill();
      c.fillStyle = th.metalDark; c.fillRect(x, y + 5, T, 2); c.fillRect(x, y + T - 11, T, 2); if ((tx - room.spec.x) % 5 === 1) c.fillRect(x, y + 5, 2, T - 14);
      if ((tx - room.spec.x) % 5 === 3) c.fillRect(x + T - 2, y + 5, 2, T - 14);
    } else if ((tx * 13 + ty * 7) % 9 === 0) { // wall lamp
      c.fillStyle = th.metalDark; rr(c, x + 10, y + 8, 12, 6, 2); c.fill(); c.fillStyle = th.lamp; rr(c, x + 11, y + 9, 10, 3, 1.5); c.fill(); anims.push({ k: 'lamp', x: x + 16, y: y + 11, col: th.lamp, v: tx * 31 + ty });
    } else if ((tx * 5 + ty) % 7 === 0) { c.strokeStyle = sh(th.faceTop, -0.3); c.lineWidth = 3; c.beginPath(); c.moveTo(x, y + 14); c.lineTo(x + T, y + 14); c.stroke(); c.fillStyle = sh(th.faceTop, 0.15); c.fillRect(x, y + 12, T, 1.2); }
    return;
  }
  // cap
  c.fillStyle = th.top; c.fillRect(x, y, T, T);
  c.fillStyle = 'rgba(255,255,255,0.03)'; if ((tx + ty) % 2) c.fillRect(x + 4, y + 4, T - 8, T - 8);
  c.fillStyle = th.topEdge; const e = 3;
  if (below2 === 1 && below === 2) c.fillRect(x, y + T - e, T, e);              // lip above a front face
  if (g(tx, ty - 1) === 1) c.fillRect(x, y, T, e);                               // bottom wall top edge
  if (g(tx - 1, ty) === 1 || (g(tx - 1, ty) === 0 && false)) c.fillRect(x, y, e, T);
  if (g(tx + 1, ty) === 1) c.fillRect(x + T - e, y, e, T);
  if (g(tx, ty - 1) === 1) { c.fillStyle = al(th.trim, 0.4); c.fillRect(x, y + e, T, 1); }
  // outer edge toward void
  c.fillStyle = 'rgba(0,0,0,0.35)'; if (g(tx, ty + 1) === 0) c.fillRect(x, y + T - 2, T, 2); if (g(tx - 1, ty) === 0) c.fillRect(x, y, 2, T); if (g(tx + 1, ty) === 0) c.fillRect(x + T - 2, y, 2, T); if (g(tx, ty - 1) === 0) c.fillRect(x, y, T, 2);
}

function drawVent(c: C, th: Theme, s: Spot, anims: AnimDesc[]) {
  const x = s.x - 16, y = s.y - 11; c.fillStyle = 'rgba(0,0,0,0.35)'; rr(c, x - 2, y - 1, 36, 26, 6); c.fill();
  c.fillStyle = th.metalDark; rr(c, x, y, 32, 22, 5); c.fill(); c.fillStyle = '#0b0f1a'; rr(c, x + 3, y + 3, 26, 16, 3); c.fill();
  c.fillStyle = th.metal; for (let i = 0; i < 4; i++) c.fillRect(x + 4, y + 5 + i * 3.8, 24, 1.8);
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x + 1, y + 1, 30, 1.5); anims.push({ k: 'vent', x: s.x, y: s.y, id: s.id });
}
function drawHatch(c: C, th: Theme, s: Spot, anims: AnimDesc[]) {
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(s.x, s.y + 2, 19, 13, 0, 0, 6.28); c.fill(); c.fillStyle = '#6a5a48'; c.beginPath(); c.ellipse(s.x, s.y, 17, 12, 0, 0, 6.28); c.fill();
  c.strokeStyle = '#3a2e22'; c.lineWidth = 2; c.stroke(); c.beginPath(); c.moveTo(s.x - 10, s.y); c.lineTo(s.x + 10, s.y); c.stroke(); c.fillStyle = 'rgba(200,170,120,0.35)'; c.beginPath(); c.ellipse(s.x - 4, s.y - 4, 6, 2, -0.3, 0, 6.28); c.fill();
  anims.push({ k: 'hatch', x: s.x, y: s.y, id: s.id });
}
function drawEmergency(c: C, th: Theme, s: Spot, anims: AnimDesc[]) {
  const x = s.x, y = s.y; c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(x, y + 22, 56, 22, 0, 0, 6.28); c.fill();
  const gr = c.createLinearGradient(0, y - 30, 0, y + 30); gr.addColorStop(0, sh(th.metal, 0.2)); gr.addColorStop(1, th.metalDark); c.fillStyle = gr; c.beginPath(); c.ellipse(x, y + 6, 52, 30, 0, 0, 6.28); c.fill();
  c.fillStyle = sh(th.floor, 0.25); c.beginPath(); c.ellipse(x, y, 52, 28, 0, 0, 6.28); c.fill(); c.strokeStyle = al(th.trim, 0.8); c.lineWidth = 2; c.stroke();
  c.fillStyle = '#4a0d1a'; c.beginPath(); c.ellipse(x, y - 2, 16, 10, 0, 0, 6.28); c.fill(); c.fillStyle = '#ff2e4d'; c.beginPath(); c.ellipse(x, y - 5, 13, 8, 0, 0, 6.28); c.fill(); c.fillStyle = '#ff9aa8'; c.beginPath(); c.ellipse(x - 4, y - 8, 5, 2.5, -0.3, 0, 6.28); c.fill();
  c.strokeStyle = 'rgba(200,240,255,0.7)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y - 8, 17, 13, 0, Math.PI, 0); c.stroke();
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.fillStyle = sh(th.floor2, -0.2); c.beginPath(); c.ellipse(x + Math.cos(a) * 66, y + 4 + Math.sin(a) * 38, 8, 6, 0, 0, 6.28); c.fill(); c.fillStyle = al(th.accent, 0.4); c.beginPath(); c.ellipse(x + Math.cos(a) * 66, y + 2 + Math.sin(a) * 38, 6, 4, 0, 0, 6.28); c.fill(); }
  anims.push({ k: 'emergency', x, y: y - 5 });
}

const TERM_STYLE: Record<string, string> = { wires: 'box', auth: 'keypad', lock_combo: 'keypad', fuel_fill: 'valve', fuel_burn: 'valve', pressure: 'gauge', oxygen_calib: 'gauge', temperature: 'gauge', generator: 'gauge', reactor_align: 'ring', magnet: 'ring', antenna: 'dish', frequency: 'scope', signal_trace: 'scope', circuit: 'box', comm_repair: 'box', cargo_sort: 'chute', door_calib: 'keypad' };
function drawStation(c: C, th: Theme, s: Spot, anims: AnimDesc[]) {
  const x = s.x, y = s.y; const wy = s.wall ? y - TILE * 1.25 : y - 20; // panel sits on the wall face above the spot
  const style = s.kind === 'keycard' ? 'keycard' : s.kind === 'fix' ? 'fix' : s.kind === 'admin' ? 'admin' : s.kind === 'cams' ? 'cams' : s.kind === 'logs' ? 'logs' : TERM_STYLE[s.game || ''] || 'screen';
  c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 6; c.shadowOffsetY = 3;
  const pw = style === 'admin' || style === 'cams' ? 46 : 26, ph = 24;
  if (!s.wall) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(x, y + 4, pw * 0.6, 7, 0, 0, 6.28); c.fill(); c.fillStyle = th.metalDark; c.fillRect(x - 5, wy + ph / 2 - 2, 10, y - wy - ph / 2 + 2); c.fillStyle = sh(th.metal, -0.2); rr(c, x - pw / 2 - 2, y - 6, pw + 4, 8, 3); c.fill(); } c.fillStyle = s.kind === 'fix' ? '#3a1520' : th.metalDark; rr(c, x - pw / 2, wy - ph / 2, pw, ph, 4); c.fill(); c.restore();
  c.strokeStyle = s.kind === 'fix' ? '#ff4d6d' : sh(th.metal, 0.1); c.lineWidth = 1.5; rr(c, x - pw / 2, wy - ph / 2, pw, ph, 4); c.stroke();
  const sx = x - pw / 2 + 3, sy = wy - ph / 2 + 3, sw = pw - 6, shh = ph - 6;
  switch (style) {
    case 'box': ['#ff4d6d', '#ffd23f', '#55b6ff', '#a77bff'].forEach((col, i) => { c.fillStyle = col; c.fillRect(sx + 1, sy + 1 + i * 4.3, 6, 2.6); c.fillRect(sx + sw - 7, sy + 1 + ((i + 2) % 4) * 4.3, 6, 2.6); }); break;
    case 'keypad': c.fillStyle = '#0b1220'; c.fillRect(sx, sy, sw, 6); c.fillStyle = th.screen; c.fillRect(sx + 1, sy + 1, sw * 0.6, 4); for (let i = 0; i < 9; i++) { c.fillStyle = sh(th.metal, 0.2); c.fillRect(sx + 2 + (i % 3) * 7, sy + 8 + Math.floor(i / 3) * 3.6, 5, 2.4); } break;
    case 'valve': c.fillStyle = '#c0304a'; c.beginPath(); c.arc(x, wy, 8, 0, 6.28); c.fill(); c.strokeStyle = '#ff8b95'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 7, wy); c.lineTo(x + 7, wy); c.moveTo(x, wy - 7); c.lineTo(x, wy + 7); c.stroke(); break;
    case 'gauge': c.fillStyle = '#eef3ff'; c.beginPath(); c.arc(x, wy, 8.5, 0, 6.28); c.fill(); c.strokeStyle = '#1b2033'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, wy); c.lineTo(x + 5, wy - 4); c.stroke(); c.strokeStyle = '#8dff7a'; c.lineWidth = 2; c.beginPath(); c.arc(x, wy, 6, -2.4, -1.2); c.stroke(); break;
    case 'ring': c.strokeStyle = th.screen; c.lineWidth = 2; c.beginPath(); c.arc(x, wy, 8, 0, 6.28); c.stroke(); c.beginPath(); c.arc(x, wy, 4.5, 0, 6.28); c.stroke(); break;
    case 'dish': c.fillStyle = sh(th.metal, 0.3); c.beginPath(); c.arc(x, wy + 2, 8, Math.PI, 0); c.fill(); c.fillStyle = th.screen; c.fillRect(x - 1, wy - 8, 2, 8); break;
    case 'scope': c.fillStyle = '#071018'; c.fillRect(sx, sy, sw, shh); c.strokeStyle = '#8dff7a'; c.lineWidth = 1.3; c.beginPath(); for (let i = 0; i <= sw; i += 2) c.lineTo(sx + i, sy + shh / 2 + Math.sin(i * 0.6) * 5); c.stroke(); break;
    case 'chute': c.fillStyle = '#0b1220'; c.fillRect(sx, sy + 6, sw, shh - 6); c.fillStyle = '#ffb547'; for (let i = 0; i < 3; i++) c.fillRect(sx + 2 + i * 7, sy + 1, 5, 4); break;
    case 'fix': c.fillStyle = '#1a0a10'; c.fillRect(sx, sy, sw, shh); c.fillStyle = '#ffb547'; c.beginPath(); c.moveTo(x, sy + 2); c.lineTo(x + 7, sy + shh - 2); c.lineTo(x - 7, sy + shh - 2); c.closePath(); c.fill(); c.fillStyle = '#1a0a10'; c.fillRect(x - 1, sy + 7, 2, 6); c.fillRect(x - 1, sy + 14.5, 2, 2); break;
    case 'keycard': c.fillStyle = '#ffd23f'; c.fillRect(sx + 3, sy + 2, sw - 6, shh - 8); c.fillStyle = '#1b1b22'; c.fillRect(sx + 3, sy + 6, sw - 6, 3); c.fillStyle = '#8dff7a'; c.fillRect(sx + sw / 2 - 2, sy + shh - 4, 4, 3); break;
    case 'admin': c.fillStyle = '#071018'; c.fillRect(sx, sy, sw, shh); c.strokeStyle = th.screen; c.lineWidth = 1; for (let i = 0; i < 5; i++) c.strokeRect(sx + 2 + (i % 3) * 13, sy + 2 + Math.floor(i / 3) * 8, 10, 6); break;
    case 'cams': for (let i = 0; i < 4; i++) { c.fillStyle = '#071018'; c.fillRect(sx + (i % 2) * (sw / 2 + 1), sy + Math.floor(i / 2) * (shh / 2 + 1), sw / 2 - 1, shh / 2 - 1); } break;
    default: c.fillStyle = '#071018'; c.fillRect(sx, sy, sw, shh); c.fillStyle = al(th.screen, 0.8); for (let i = 0; i < 3; i++) c.fillRect(sx + 2, sy + 3 + i * 5, sw * (0.4 + ((x + i) % 5) / 10), 2);
  }
  if (style !== 'valve' && style !== 'gauge' && style !== 'ring' && style !== 'dish' && style !== 'keycard') anims.push({ k: 'screen', x: sx, y: sy, w: sw, h: shh, col: s.kind === 'fix' ? '#ff4d6d' : th.screen, id: s.id });
  anims.push({ k: 'station', x, y: wy, id: s.id, w: pw, h: ph });
}

// ────────────────────────────── decor props ──────────────────────────────
function shadow(c: C, x: number, y: number, w: number, h: number) { c.fillStyle = 'rgba(0,0,12,0.32)'; c.beginPath(); c.ellipse(x + w / 2, y + h - 2, w * 0.55, Math.max(5, h * 0.18), 0, 0, 6.28); c.fill(); }
function box3d(c: C, x: number, y: number, w: number, h: number, top: string, front: string, depth = 10, r = 4) { c.fillStyle = front; rr(c, x, y + depth, w, h - depth, r); c.fill(); c.fillStyle = top; rr(c, x, y, w, h - depth + 2, r); c.fill(); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x + 3, y + 2, w - 6, 1.5); }

function drawProp(c: C, th: Theme, p: PropSpec, anims: AnimDesc[], R: () => number) {
  const { x, y, w, h } = p; const cx = x + w / 2, cy = y + h / 2; const v = p.v || 0;
  switch (p.t) {
    case 'rug': c.fillStyle = al(th.accent, 0.12); rr(c, x, y, w, h, 10); c.fill(); c.strokeStyle = al(th.accent, 0.35); c.lineWidth = 2; rr(c, x + 5, y + 5, w - 10, h - 10, 8); c.stroke(); break;
    case 'hazard': { c.save(); rr(c, x, y + 8, w, h - 16, 4); c.clip(); c.fillStyle = '#ffb547'; c.fillRect(x, y, w, h); c.fillStyle = '#1b1b22'; for (let i = -2; i < w / 8 + 2; i++) { c.beginPath(); c.moveTo(x + i * 16, y + h); c.lineTo(x + i * 16 + 8, y + h); c.lineTo(x + i * 16 + 24, y); c.lineTo(x + i * 16 + 16, y); c.fill(); } c.restore(); c.globalAlpha = 1; break; }
    case 'scanner': { c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(cx, cy + 4, w * 0.48, h * 0.32, 0, 0, 6.28); c.fill(); c.fillStyle = th.metalDark; c.beginPath(); c.ellipse(cx, cy, w * 0.46, h * 0.3, 0, 0, 6.28); c.fill(); c.fillStyle = al(th.accent, 0.4); c.beginPath(); c.ellipse(cx, cy - 2, w * 0.36, h * 0.22, 0, 0, 6.28); c.fill(); anims.push({ k: 'scan', x: cx, y: cy - 2, r: w * 0.36 }); break; }
    case 'snowpile': c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(cx, cy, w * 0.5, h * 0.4, 0, 0, 6.28); c.fill(); c.fillStyle = 'rgba(200,225,245,0.8)'; c.beginPath(); c.ellipse(cx + 4, cy + 3, w * 0.35, h * 0.2, 0, 0, 6.28); c.fill(); break;
    case 'puddle': c.fillStyle = 'rgba(60,170,200,0.45)'; c.beginPath(); c.ellipse(cx, cy, w * 0.5, h * 0.42, 0.1, 0, 6.28); c.fill(); c.strokeStyle = 'rgba(180,240,255,0.5)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(cx - 6, cy - 2, w * 0.18, h * 0.12, 0.1, 0, 6.28); c.stroke(); break;
    case 'dune': c.fillStyle = 'rgba(235,195,140,0.7)'; c.beginPath(); c.ellipse(cx, cy, w * 0.5, h * 0.45, 0, 0, 6.28); c.fill(); c.fillStyle = 'rgba(180,130,80,0.35)'; c.beginPath(); c.ellipse(cx + 6, cy + 4, w * 0.35, h * 0.2, 0, 0, 6.28); c.fill(); break;
    case 'debris': c.fillStyle = '#6a5a4a'; for (let i = 0; i < 4; i++) { c.save(); c.translate(x + R() * w, y + R() * h); c.rotate(R() * 3); c.fillRect(-5, -2, 8 + R() * 6, 4); c.restore(); } break;
    case 'chair': shadow(c, x + 4, y + 4, w - 8, h - 6); c.fillStyle = sh(th.metalDark, -0.1); rr(c, x + 7, y + 4, w - 14, 10, 4); c.fill(); c.fillStyle = th.accent2; rr(c, x + 6, y + 12, w - 12, h - 18, 5); c.fill(); c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(x + 9, y + 14, w - 18, 2); break;
    case 'console': { shadow(c, x, y, w, h); box3d(c, x, y, w, h, sh(th.metal, -0.1), th.metalDark, 12); c.fillStyle = '#0a1020'; rr(c, x + 5, y + 3, w - 10, h - 17, 3); c.fill(); anims.push({ k: 'screen', x: x + 6, y: y + 4, w: w - 12, h: h - 19, col: th.screen }); c.fillStyle = th.accent2; c.fillRect(x + 8, y + h - 7, 4, 2); c.fillStyle = th.accent; c.fillRect(x + 16, y + h - 7, 4, 2); break; }
    case 'holotable': { shadow(c, x, y, w, h); c.fillStyle = th.metalDark; c.beginPath(); c.ellipse(cx, cy + 6, w * 0.48, h * 0.42, 0, 0, 6.28); c.fill(); c.fillStyle = sh(th.metal, -0.2); c.beginPath(); c.ellipse(cx, cy, w * 0.48, h * 0.4, 0, 0, 6.28); c.fill(); c.fillStyle = al(th.accent, 0.35); c.beginPath(); c.ellipse(cx, cy, w * 0.36, h * 0.28, 0, 0, 6.28); c.fill(); anims.push({ k: 'holo', x: cx, y: cy, r: Math.min(w, h * 1.6) * 0.32, col: th.accent }); break; }
    case 'rack': { shadow(c, x, y, w, h); box3d(c, x + 2, y, w - 4, h, sh(th.metalDark, 0.15), sh(th.metalDark, -0.3), 8); c.fillStyle = '#080c18'; c.fillRect(x + 6, y + 5, w - 12, h - 16); for (let i = 0; i < 6; i++) anims.push({ k: 'blink', x: x + 9 + (i % 2) * (w - 18), y: y + 9 + Math.floor(i / 2) * ((h - 22) / 3), col: i % 3 ? th.accent : '#8dff7a', v: v + i }); break; }
    case 'crate': { shadow(c, x, y, w, h); box3d(c, x + 2, y + 2, w - 4, h - 4, '#a8783e', '#7a5226', 9, 3); c.strokeStyle = '#5a3a18'; c.lineWidth = 1.5; c.strokeRect(x + 5, y + 5, w - 10, h - 17); c.beginPath(); c.moveTo(x + 5, y + 5); c.lineTo(x + w - 5, y + h - 12); c.stroke(); break; }
    case 'crates': { shadow(c, x, y, w, h); box3d(c, x + 2, y + h * 0.35, w * 0.55, h * 0.62, '#6d86b8', '#465c8a', 10); box3d(c, x + w * 0.45, y + h * 0.3, w * 0.52, h * 0.66, '#a8783e', '#7a5226', 10); box3d(c, x + w * 0.2, y + 2, w * 0.55, h * 0.5, '#c79a5e', '#8a6232', 10); c.fillStyle = th.accent2; c.fillRect(x + w * 0.3, y + 8, 10, 4); break; }
    case 'barrel': { shadow(c, x, y, w, h); const col = v % 3 === 0 ? '#3c6fd8' : v % 3 === 1 ? '#d8763c' : '#4a9a5a'; c.fillStyle = sh(col, -0.35); c.beginPath(); c.ellipse(cx, y + h - 9, w * 0.38, 6, 0, 0, 6.28); c.fill(); c.fillStyle = col; c.fillRect(cx - w * 0.38, y + 8, w * 0.76, h - 17); c.fillStyle = sh(col, 0.25); c.beginPath(); c.ellipse(cx, y + 8, w * 0.38, 6, 0, 0, 6.28); c.fill(); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(cx - w * 0.38, y + 14, w * 0.76, 2); c.fillRect(cx - w * 0.38, y + h - 16, w * 0.76, 2); break; }
    case 'plant': case 'alienplant': { shadow(c, x, y, w, h); c.fillStyle = p.t === 'plant' ? '#8a6040' : '#6a4a3a'; rr(c, cx - 8, y + h - 16, 16, 13, 3); c.fill(); const leaf = p.t === 'plant' ? ['#3fae6a', '#5fd08a', '#2e8a52'] : ['#a77bff', '#ff8fd0', '#55b6ff'];
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42; c.fillStyle = leaf[i % 3]; c.save(); c.translate(cx, y + h - 15); c.rotate(a + Math.PI / 2); c.beginPath(); c.ellipse(0, -11, 4, 11, 0, 0, 6.28); c.fill(); c.restore(); } anims.push({ k: 'sway', x: cx, y: y + h - 14, v }); break; }
    case 'bed': case 'ruinbed': case 'bunk': { shadow(c, x, y, w, h); box3d(c, x, y, w, h, p.t === 'ruinbed' ? '#8a7a68' : '#e9eef7', p.t === 'ruinbed' ? '#5a4a3a' : '#9aa6ba', 8); c.fillStyle = p.t === 'bunk' ? '#5a6a4a' : th.accent; rr(c, x + w * 0.35, y + 3, w * 0.6, h - 13, 4); c.fill(); c.fillStyle = '#ffffff'; rr(c, x + 4, y + 4, w * 0.26, h - 15, 5); c.fill(); break; }
    case 'cabinet': case 'locker': case 'shelf': { shadow(c, x, y, w, h); box3d(c, x + 3, y, w - 6, h, sh(th.metal, 0.1), th.metalDark, 7); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx, y + 3); c.lineTo(cx, y + h - 9); c.stroke(); c.fillStyle = p.t === 'cabinet' ? '#ff4d6d' : th.accent2; c.fillRect(cx - 5, y + 6, 3, 3); break; }
    case 'table_round': { shadow(c, x, y, w, h); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + 0.3; c.fillStyle = th.accent2; c.beginPath(); c.ellipse(cx + Math.cos(a) * w * 0.44, cy + Math.sin(a) * h * 0.36 + 4, 7, 5, 0, 0, 6.28); c.fill(); }
      c.fillStyle = th.metalDark; c.beginPath(); c.ellipse(cx, cy + 6, w * 0.34, h * 0.26, 0, 0, 6.28); c.fill(); c.fillStyle = '#e9eef7'; c.beginPath(); c.ellipse(cx, cy, w * 0.34, h * 0.26, 0, 0, 6.28); c.fill(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(cx - 8, cy - 5, 10, 4, -0.3, 0, 6.28); c.fill();
      c.fillStyle = ['#ff8a2a', '#55b6ff', '#8dff7a'][v % 3]; c.beginPath(); c.arc(cx + 6, cy + 2, 4, 0, 6.28); c.fill(); break; }
    case 'vending': { shadow(c, x, y, w, h); box3d(c, x + 2, y - 6, w - 4, h + 6, '#c0304a', '#7a1a2a', 6); c.fillStyle = '#0a1020'; c.fillRect(x + 6, y - 2, w - 12, h - 14); for (let i = 0; i < 3; i++) { c.fillStyle = ['#ffd23f', '#55b6ff', '#8dff7a'][i]; c.fillRect(x + 8, y + 1 + i * 5, w - 16, 3); } anims.push({ k: 'blink', x: cx, y: y + h - 6, col: '#8dff7a', v }); break; }
    case 'bin': shadow(c, x, y, w, h); c.fillStyle = '#5a6a8a'; rr(c, cx - 9, y + 6, 18, h - 10, 4); c.fill(); c.fillStyle = '#7a8aaa'; rr(c, cx - 10, y + 4, 20, 5, 2); c.fill(); break;
    case 'reactor': { shadow(c, x, y, w, h); c.fillStyle = th.metalDark; c.beginPath(); c.ellipse(cx, cy + 10, w * 0.45, h * 0.4, 0, 0, 6.28); c.fill(); c.fillStyle = sh(th.metal, -0.15); c.beginPath(); c.ellipse(cx, cy, w * 0.42, h * 0.36, 0, 0, 6.28); c.fill();
      c.strokeStyle = '#ffb547'; c.lineWidth = 3; c.setLineDash([10, 8]); c.beginPath(); c.ellipse(cx, cy, w * 0.38, h * 0.32, 0, 0, 6.28); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#0b1530'; c.beginPath(); c.ellipse(cx, cy - 4, w * 0.22, h * 0.2, 0, 0, 6.28); c.fill(); for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + 0.78; c.fillStyle = th.metal; c.fillRect(cx + Math.cos(a) * w * 0.3 - 5, cy + Math.sin(a) * h * 0.26 - 5, 10, 10); }
      anims.push({ k: 'pulse', x: cx, y: cy - 4, r: Math.min(w, h) * 0.22, col: th.accent }); break; }
    case 'engine': case 'generator': { shadow(c, x, y, w, h); box3d(c, x, y, w, h, sh(th.metal, -0.05), th.metalDark, 14, 10); c.fillStyle = '#0b1220'; c.beginPath(); c.arc(cx, cy - 6, Math.min(w, h) * 0.32, 0, 6.28); c.fill(); c.strokeStyle = th.accent2; c.lineWidth = 3; c.stroke();
      c.fillStyle = th.metalDark; for (let i = 0; i < 6; i++) c.fillRect(x + 6 + i * (w - 12) / 6, y + h - 12, (w - 12) / 6 - 3, 6); anims.push({ k: 'fan', x: cx, y: cy - 6, r: Math.min(w, h) * 0.28, col: th.accent }); break; }
    case 'pipes_v': { c.fillStyle = sh(th.metal, -0.2); for (let i = 0; i < 2; i++) { const px = x + 6 + i * 12; c.fillRect(px, y, 8, h); c.fillStyle = sh(th.metal, 0.15); c.fillRect(px + 1, y, 2, h); c.fillStyle = sh(th.metal, -0.2); c.fillRect(px - 2, y + h * 0.3, 12, 5); c.fillRect(px - 2, y + h * 0.75, 12, 5); } anims.push({ k: 'steam', x: x + 10, y: y + h * 0.3, v }); break; }
    case 'labbench': case 'bench_seat': { shadow(c, x, y, w, h); box3d(c, x, y, w, h, p.t === 'labbench' ? '#e9eef7' : sh(th.metal, -0.1), p.t === 'labbench' ? '#9aa6ba' : th.metalDark, 10); if (p.t === 'labbench') { const cols = ['#5affea', '#ff6fae', '#ffd23f', '#8dff7a']; for (let i = 0; i < 4; i++) { const fx = x + 10 + i * (w - 20) / 4; c.fillStyle = 'rgba(220,240,255,0.7)'; rr(c, fx, y + 2, 9, 13, 3); c.fill(); c.fillStyle = cols[(i + v) % 4]; rr(c, fx + 1, y + 8, 7, 6, 2); c.fill(); } anims.push({ k: 'bubbles', x: x + 14, y: y + 4, w: w - 28, h: 8 }); } break; }
    case 'tank': case 'oxytank': { shadow(c, x, y, w, h); c.fillStyle = th.metalDark; rr(c, x + 4, y + h - 10, w - 8, 8, 3); c.fill(); c.fillStyle = p.t === 'tank' ? 'rgba(120,255,220,0.35)' : '#cfd8e8'; rr(c, x + 5, y - 6, w - 10, h - 4, 8); c.fill(); c.strokeStyle = sh(th.metal, 0.2); c.lineWidth = 1.5; c.stroke();
      if (p.t === 'tank') { c.fillStyle = ['#a77bff', '#ff8fd0', '#8dff7a'][v % 3]; c.beginPath(); c.ellipse(cx, cy, 5, 6, 0, 0, 6.28); c.fill(); anims.push({ k: 'bubbles', x: x + 7, y: y - 4, w: w - 14, h: h - 8 }); } else { c.fillStyle = '#3c6fd8'; c.fillRect(x + 5, cy - 2, w - 10, 5); } break; }
    case 'garden_bed': { shadow(c, x, y, w, h); box3d(c, x, y, w, h, '#4a3220', '#2e1e12', 8); c.fillStyle = '#3a2618'; rr(c, x + 4, y + 3, w - 8, h - 14, 4); c.fill(); for (let i = 0; i < 5; i++) { c.fillStyle = ['#5fd08a', '#3fae6a', '#8dff7a'][i % 3]; c.beginPath(); c.ellipse(x + 10 + i * (w - 20) / 4, y + 6, 6, 8, 0, 0, 6.28); c.fill(); } anims.push({ k: 'sway', x: cx, y: y + 4, v }); break; }
    case 'tree': { shadow(c, x, y, w, h); c.fillStyle = '#6a4a2a'; c.fillRect(cx - 4, cy, 8, h / 2 - 4); c.fillStyle = '#2e8a52'; c.beginPath(); c.arc(cx, cy - 4, w * 0.42, 0, 6.28); c.fill(); c.fillStyle = '#3fae6a'; c.beginPath(); c.arc(cx - 6, cy - 10, w * 0.28, 0, 6.28); c.fill(); c.fillStyle = '#ff8fd0'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(cx - 14 + R() * 28, cy - 18 + R() * 20, 2.5, 0, 6.28); c.fill(); } anims.push({ k: 'sway', x: cx, y: cy, v }); break; }
    case 'dish': { shadow(c, x, y, w, h); c.fillStyle = th.metalDark; rr(c, cx - 10, cy + 4, 20, h / 2 - 6, 4); c.fill(); anims.push({ k: 'dish', x: cx, y: cy - 2, r: Math.min(w, h) * 0.42, col: th.accent }); break; }
    case 'telescope': { shadow(c, x, y, w, h); c.fillStyle = th.metalDark; c.beginPath(); c.arc(cx, cy + 8, 14, 0, 6.28); c.fill(); c.save(); c.translate(cx, cy); c.rotate(-0.6); c.fillStyle = sh(th.metal, 0.1); rr(c, -8, -38, 16, 44, 6); c.fill(); c.fillStyle = '#0a1020'; c.beginPath(); c.ellipse(0, -38, 8, 3, 0, 0, 6.28); c.fill(); c.restore(); break; }
    case 'icecrystal': { shadow(c, x, y, w, h); const cols = ['#bfeaff', '#e9f8ff', '#8fd4f5']; for (let i = 0; i < 4; i++) { c.fillStyle = cols[i % 3]; c.beginPath(); const bx = x + 6 + i * (w - 12) / 4, hh = 14 + ((v + i * 7) % 12); c.moveTo(bx, y + h - 6); c.lineTo(bx + 4, y + h - 6 - hh); c.lineTo(bx + 9, y + h - 6); c.fill(); } c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(x + 9, y + h - 20, 1.5, 8); anims.push({ k: 'glint', x: cx, y: y + h - 20, v }); break; }
    case 'cryopod': { shadow(c, x, y, w, h); c.fillStyle = th.metalDark; rr(c, x + 3, y, w - 6, h, 10); c.fill(); c.fillStyle = 'rgba(160,230,255,0.55)'; rr(c, x + 7, y + 5, w - 14, h - 14, 8); c.fill(); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x + 10, y + 8, 3, h - 22); anims.push({ k: 'blink', x: cx, y: y + h - 5, col: '#9ff6ee', v }); break; }
    case 'heater': { shadow(c, x, y, w, h); box3d(c, x + 3, y, w - 6, h, '#b0484a', '#6a2224', 6); c.fillStyle = '#ffb547'; for (let i = 0; i < 3; i++) c.fillRect(x + 7, y + 4 + i * 5, w - 14, 2); anims.push({ k: 'heat', x: cx, y: y + 2, v }); break; }
    case 'sled': shadow(c, x, y, w, h); c.fillStyle = '#c0304a'; rr(c, x + 6, y + 6, w - 12, h - 18, 8); c.fill(); c.strokeStyle = '#9aa6ba'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 2, y + h - 6); c.lineTo(x + w - 2, y + h - 6); c.stroke(); break;
    case 'aquarium': { shadow(c, x, y, w, h); c.fillStyle = th.metalDark; rr(c, x, y + h - 12, w, 12, 3); c.fill(); c.fillStyle = 'rgba(30,140,190,0.75)'; rr(c, x + 2, y - 8, w - 4, h - 2, 6); c.fill(); c.strokeStyle = 'rgba(200,250,255,0.6)'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#ff9a4a'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x + 10 + i * (w - 20) / 3, y + h - 16, 4, Math.PI, 0); c.fill(); }
      anims.push({ k: 'fish', x: x + 6, y: y - 4, w: w - 12, h: h - 14 }); anims.push({ k: 'bubbles', x: x + 6, y: y - 4, w: w - 12, h: h - 14 }); break; }
    case 'pool': { c.fillStyle = th.metalDark; rr(c, x - 4, y - 4, w + 8, h + 8, 10); c.fill(); c.fillStyle = '#0f4f6a'; rr(c, x, y, w, h, 8); c.fill(); anims.push({ k: 'water', x, y, w, h }); anims.push({ k: 'sub', x: x + w / 2, y: y + h / 2, w: w * 0.6, h: h * 0.4 }); break; }
    case 'coral': { shadow(c, x, y, w, h); const col = ['#ff6fae', '#ff9a4a', '#a77bff'][v % 3]; c.strokeStyle = col; c.lineWidth = 4; c.lineCap = 'round'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(cx, y + h - 4); c.quadraticCurveTo(cx + (i - 1.5) * 8, cy, cx + (i - 1.5) * 10, y + 4 + (i % 2) * 6); c.stroke(); } c.lineCap = 'butt'; anims.push({ k: 'sway', x: cx, y: y + h - 4, v }); break; }
    case 'gauges': { shadow(c, x, y, w, h); box3d(c, x + 2, y, w - 4, h, th.metal, th.metalDark, 6); for (let i = 0; i < 2; i++) { c.fillStyle = '#eef3ff'; c.beginPath(); c.arc(cx, y + 12 + i * 20, 7, 0, 6.28); c.fill(); anims.push({ k: 'needle', x: cx, y: y + 12 + i * 20, v: v + i }); } break; }
    case 'fountain': { shadow(c, x, y, w, h); c.fillStyle = '#a0603a'; c.beginPath(); c.ellipse(cx, cy + 6, w * 0.46, h * 0.38, 0, 0, 6.28); c.fill(); c.fillStyle = '#c99a6a'; c.beginPath(); c.ellipse(cx, cy, w * 0.44, h * 0.36, 0, 0, 6.28); c.fill(); c.fillStyle = '#6a8a7a'; c.beginPath(); c.ellipse(cx, cy, w * 0.34, h * 0.26, 0, 0, 6.28); c.fill(); c.fillStyle = '#8a6040'; c.fillRect(cx - 5, cy - 26, 10, 26); c.fillStyle = '#5a7a6a'; c.beginPath(); c.ellipse(cx, cy - 24, 14, 6, 0, 0, 6.28); c.fill(); anims.push({ k: 'glint', x: cx, y: cy - 20, v }); break; }
    case 'rock': { shadow(c, x, y, w, h); c.fillStyle = '#8a6a4a'; c.beginPath(); c.moveTo(x + 4, y + h - 4); c.lineTo(x + 6, y + 10); c.lineTo(cx, y + 2); c.lineTo(x + w - 4, y + 12); c.lineTo(x + w - 2, y + h - 4); c.closePath(); c.fill(); c.fillStyle = '#a8845e'; c.beginPath(); c.moveTo(x + 8, y + 12); c.lineTo(cx, y + 4); c.lineTo(cx + 2, y + 14); c.closePath(); c.fill(); break; }
    case 'drill': { shadow(c, x, y, w, h); box3d(c, x, y + h * 0.3, w, h * 0.7, '#ffb547', '#a8701e', 10); c.fillStyle = th.metal; c.fillRect(cx - 4, y, 8, h * 0.5); c.fillStyle = th.metalDark; c.beginPath(); c.moveTo(cx - 10, y + 6); c.lineTo(cx + 10, y + 6); c.lineTo(cx, y - 8); c.fill(); anims.push({ k: 'fan', x: cx, y: y + h * 0.55, r: 10, col: '#ffb547' }); break; }
    case 'cart': { shadow(c, x, y, w, h); c.strokeStyle = '#5a4a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 6, y + h - 4); c.lineTo(x + w + 6, y + h - 4); c.stroke(); box3d(c, x + 2, y + 2, w - 4, h - 4, '#7a6a5a', '#4a3a2a', 8); c.fillStyle = '#5affea'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + 10 + i * 9, y + 6, 3.5, 0, 6.28); c.fill(); } break; }
    case 'tent': { shadow(c, x, y, w, h); c.fillStyle = '#c9783a'; c.beginPath(); c.moveTo(x + 2, y + h - 4); c.lineTo(cx, y); c.lineTo(x + w - 2, y + h - 4); c.fill(); c.fillStyle = '#7a4420'; c.beginPath(); c.moveTo(cx - 8, y + h - 4); c.lineTo(cx, y + 12); c.lineTo(cx + 8, y + h - 4); c.fill(); break; }
    case 'solar': { shadow(c, x, y, w, h); c.fillStyle = '#1d3a7a'; c.save(); c.translate(cx, cy); c.transform(1, 0, -0.3, 1, 0, 0); c.fillRect(-w / 2 + 4, -h / 2 + 2, w - 8, h - 6); c.strokeStyle = '#6f9fff'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-w / 2 + 4 + i * (w - 8) / 4, -h / 2 + 2); c.lineTo(-w / 2 + 4 + i * (w - 8) / 4, h / 2 - 4); c.stroke(); } c.restore(); break; }
    case 'turret': { shadow(c, x, y, w, h); c.fillStyle = th.metalDark; c.beginPath(); c.arc(cx, cy + 4, w * 0.42, 0, 6.28); c.fill(); anims.push({ k: 'turret', x: cx, y: cy, v }); break; }
    case 'weaponrack': { shadow(c, x, y, w, h); box3d(c, x + 2, y, w - 4, h, '#3a3d48', '#22242c', 6); for (let i = 0; i < 3; i++) { c.fillStyle = '#8a90a0'; c.fillRect(x + 6, y + 6 + i * (h - 14) / 3, w - 12, 4); c.fillStyle = '#ff4d6d'; c.fillRect(x + w - 10, y + 6 + i * (h - 14) / 3, 3, 4); } break; }
    case 'cell': { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x, y, w, h); c.fillStyle = '#5a5e70'; for (let i = 0; i <= 6; i++) c.fillRect(x + i * (w - 3) / 6, y, 3, h); c.fillRect(x, y, w, 4); c.fillRect(x, y + h - 4, w, 4); anims.push({ k: 'blink', x: x + w - 6, y: y + 6, col: '#ff4d6d', v }); break; }
    case 'jet': { shadow(c, x, y, w, h); c.fillStyle = '#6a6e80'; c.beginPath(); c.moveTo(x + 4, cy); c.lineTo(x + w * 0.3, y + 6); c.lineTo(x + w * 0.4, cy - 6); c.lineTo(x + w - 6, cy - 4); c.lineTo(x + w, cy); c.lineTo(x + w - 6, cy + 4); c.lineTo(x + w * 0.4, cy + 6); c.lineTo(x + w * 0.3, y + h - 6); c.closePath(); c.fill(); c.fillStyle = '#9096a8'; c.beginPath(); c.moveTo(x + w * 0.25, cy); c.lineTo(x + w * 0.95, cy - 2); c.lineTo(x + w * 0.95, cy + 2); c.fill(); c.fillStyle = 'rgba(120,200,255,0.7)'; c.beginPath(); c.ellipse(x + w * 0.75, cy, 14, 6, 0, 0, 6.28); c.fill(); c.fillStyle = '#ff4d6d'; c.fillRect(x + w * 0.32, y + 10, 6, 6); break; }
    case 'flag': { c.fillStyle = th.metal; c.fillRect(cx - 1, y - 14, 2, h + 10); c.fillStyle = th.accent; c.beginPath(); c.moveTo(cx + 1, y - 14); c.lineTo(cx + 16, y - 9); c.lineTo(cx + 1, y - 2); c.fill(); anims.push({ k: 'sway', x: cx, y: y - 8, v }); break; }
    case 'desk': { shadow(c, x, y, w, h); box3d(c, x, y, w, h, '#7a5236', '#4a3220', 10); c.fillStyle = '#0a1020'; rr(c, cx - 10, y - 6, 20, 12, 2); c.fill(); anims.push({ k: 'screen', x: cx - 9, y: y - 5, w: 18, h: 10, col: th.screen }); break; }
    case 'sofa': { shadow(c, x, y, w, h); c.fillStyle = sh(th.accent, -0.35); rr(c, x, y - 4, w, h, 8); c.fill(); c.fillStyle = sh(th.accent, -0.15); rr(c, x + 4, y + 4, w - 8, h - 10, 6); c.fill(); c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(x + 8, y + 6, w - 16, 2); break; }
    case 'lamp': c.fillStyle = th.metalDark; c.fillRect(cx - 2, y - 4, 4, 14); anims.push({ k: 'lamp', x: cx, y: y - 4, col: th.lamp, v }); break;
    default: shadow(c, x, y, w, h); box3d(c, x, y, w, h, th.metal, th.metalDark, 8);
  }
}
