// Shared movement, collision and line-of-sight. Used identically by the host (validation) and clients (prediction).
import { TILE, PLAYER_R } from './game__core__constants';
import type { MapData } from './game__maps__builder';
import type { Rect } from './game__core__types';

export class World {
  solidBuckets: Map<number, Rect[]> = new Map(); closed = new Set<number>(); // closed door tile indices
  constructor(public m: MapData) {
    for (const s of m.solids) { const x0 = Math.floor(s.x / TILE), x1 = Math.floor((s.x + s.w) / TILE), y0 = Math.floor(s.y / TILE), y1 = Math.floor((s.y + s.h) / TILE);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = y * m.w + x; (this.solidBuckets.get(k) || this.solidBuckets.set(k, []).get(k)!).push(s); } }
  }
  setDoors(closedDoorIds: Iterable<string>) { this.closed.clear(); const set = new Set(closedDoorIds); for (const d of this.m.doors) if (set.has(d.id)) d.tiles.forEach(t => this.closed.add(t)); }
  tileSolid(tx: number, ty: number, ignoreDoors = false) { const m = this.m; if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true; const i = ty * m.w + tx; return m.grid[i] !== 1 || (!ignoreDoors && this.closed.has(i)); }
  blocked(x: number, y: number, r = PLAYER_R, ignoreDoors = false) {
    const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE), y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (this.tileSolid(tx, ty, ignoreDoors)) { const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE)), cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE)); if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true; }
      const b = this.solidBuckets.get(ty * this.m.w + tx); if (b) for (const s of b) { const cx = Math.max(s.x, Math.min(x, s.x + s.w)), cy = Math.max(s.y, Math.min(y, s.y + s.h)); if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true; }
    }
    return false;
  }
  /** Slide-move a circle; returns the new position. */
  move(x: number, y: number, dx: number, dy: number, ghost = false, ignoreDoors = false): [number, number] {
    if (ghost) { const nx = Math.max(16, Math.min(this.m.W - 16, x + dx)), ny = Math.max(16, Math.min(this.m.H - 16, y + dy)); return [nx, ny]; }
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6)); const sx = dx / steps, sy = dy / steps;
    for (let i = 0; i < steps; i++) { if (!this.blocked(x + sx, y, PLAYER_R, ignoreDoors)) x += sx; if (!this.blocked(x, y + sy, PLAYER_R, ignoreDoors)) y += sy; }
    return [x, y];
  }
  /** Is a straight walk between two points free of walls (used to validate client movement). */
  pathClear(x1: number, y1: number, x2: number, y2: number, ignoreDoors = false) { const d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 8); for (let i = 1; i <= n; i++) { const t = i / n; if (this.blocked(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, PLAYER_R - 3, ignoreDoors)) return false; } return true; }
  /** Line of sight through walls/closed doors (props do not block sight). */
  los(x1: number, y1: number, x2: number, y2: number) {
    let tx = Math.floor(x1 / TILE), ty = Math.floor(y1 / TILE); const ex = Math.floor(x2 / TILE), ey = Math.floor(y2 / TILE);
    const dx = x2 - x1, dy = y2 - y1; const stx = Math.sign(dx), sty = Math.sign(dy);
    const tdx = dx ? Math.abs(TILE / dx) : Infinity, tdy = dy ? Math.abs(TILE / dy) : Infinity;
    let tmx = dx ? ((stx > 0 ? (tx + 1) * TILE - x1 : x1 - tx * TILE) / Math.abs(dx)) : Infinity, tmy = dy ? ((sty > 0 ? (ty + 1) * TILE - y1 : y1 - ty * TILE) / Math.abs(dy)) : Infinity;
    for (let i = 0; i < 400; i++) { if (tx === ex && ty === ey) return true; if (tmx < tmy) { tmx += tdx; tx += stx; } else { tmy += tdy; ty += sty; } if (this.losBlock(tx, ty)) return false; }
    return true;
  }
  losBlock(tx: number, ty: number) { const m = this.m; if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true; const i = ty * m.w + tx; return m.grid[i] === 2 || this.closed.has(i); }
  /** Visibility polygon around (x,y) up to radius r (for the darkness mask). */
  visPoly(x: number, y: number, r: number, rays = 200, throughWalls = false): number[] {
    const out: number[] = [];
    for (let i = 0; i < rays; i++) { const a = (i / rays) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); let d = r;
      if (!throughWalls) { let tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); const stx = Math.sign(ca), sty = Math.sign(sa); const tdx = ca ? Math.abs(TILE / ca) : Infinity, tdy = sa ? Math.abs(TILE / sa) : Infinity;
        let tmx = ca ? (stx > 0 ? (tx + 1) * TILE - x : x - tx * TILE) / Math.abs(ca) : Infinity, tmy = sa ? (sty > 0 ? (ty + 1) * TILE - y : y - ty * TILE) / Math.abs(sa) : Infinity;
        for (let k = 0; k < 64; k++) { let t: number; if (tmx < tmy) { t = tmx; tmx += tdx; tx += stx; } else { t = tmy; tmy += tdy; ty += sty; } if (t > r) break; if (this.losBlock(tx, ty)) { // see a little into the wall face so walls are visible
            d = Math.min(r, t + (this.m.grid[ty * this.m.w + tx] === 2 && sty < 0 && Math.abs(sa) > 0.3 ? TILE * 1.05 : 6)); break; } } }
      out.push(x + ca * d, y + sa * d); }
    return out;
  }
  /** A* on the tile grid (bots). Returns world-space waypoints. */
  path(x1: number, y1: number, x2: number, y2: number): { x: number; y: number }[] {
    const m = this.m, W = m.w; const s = Math.floor(y1 / TILE) * W + Math.floor(x1 / TILE), g = Math.floor(y2 / TILE) * W + Math.floor(x2 / TILE);
    const sw = this.staticWalk(); const walk = (i: number) => sw[i] === 1 && !this.closed.has(i);
    if (!walk(g)) return [{ x: x2, y: y2 }];
    const open = new MinHeap(); const came = new Int32Array(m.w * m.h).fill(-1); const cost = new Float32Array(m.w * m.h).fill(Infinity); cost[s] = 0; open.push(s, 0);
    const gx = g % W, gy = Math.floor(g / W); let found = false; let it = 0;
    while (open.size && it++ < 20000) { const cur = open.pop(); if (cur === g) { found = true; break; } const cx = cur % W, cy = Math.floor(cur / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; const ni = ny * W + nx; if (!walk(ni)) continue;
        if (dx && dy && (!walk(cy * W + nx) || !walk(ny * W + cx))) continue; // no corner cutting
        const nc = cost[cur] + (dx && dy ? 1.414 : 1) + (this.nearWall(nx, ny) ? 0.6 : 0); if (nc < cost[ni]) { cost[ni] = nc; came[ni] = cur; open.push(ni, nc + Math.hypot(nx - gx, ny - gy)); } } }
    if (!found) return [{ x: x2, y: y2 }];
    const pts: { x: number; y: number }[] = []; let c = g; while (c !== s && c >= 0) { pts.push({ x: (c % W + 0.5) * TILE, y: (Math.floor(c / W) + 0.5) * TILE }); c = came[c]; } pts.reverse();
    // string-pull with pathClear
    const out: { x: number; y: number }[] = []; let ax = x1, ay = y1; let i = 0;
    while (i < pts.length) { let j = pts.length - 1; while (j > i && !this.pathClear(ax, ay, pts[j].x, pts[j].y)) j--; out.push(pts[j]); ax = pts[j].x; ay = pts[j].y; i = j + 1; }
    out.push({ x: x2, y: y2 }); return out;
  }
  private _sw: Uint8Array | null = null;
  /** Tiles whose centre can hold a player circle without touching walls or props (cached; doors excluded). */
  staticWalk() { if (this._sw) return this._sw; const m = this.m; const a = new Uint8Array(m.w * m.h); const saved = this.closed; this.closed = new Set();
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) { const i = ty * m.w + tx; if (m.grid[i] !== 1) continue; const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE; if (!this.blocked(cx, cy, PLAYER_R - 1)) a[i] = 1; else { // allow tiles where a nearby point inside the tile is free
        for (const [dx, dy] of [[-8, 0], [8, 0], [0, -8], [0, 8]]) if (!this.blocked(cx + dx, cy + dy, PLAYER_R - 1)) { a[i] = 1; break; } } }
    this.closed = saved; this._sw = a; return a; }
  nearWall(tx: number, ty: number) { return this.tileSolid(tx + 1, ty) || this.tileSolid(tx - 1, ty) || this.tileSolid(tx, ty + 1) || this.tileSolid(tx, ty - 1); }
}
const pointIn = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
class MinHeap { a: number[] = []; p: number[] = []; get size() { return this.a.length; }
  push(v: number, pr: number) { this.a.push(v); this.p.push(pr); let i = this.a.length - 1; while (i > 0) { const j = (i - 1) >> 1; if (this.p[j] <= this.p[i]) break; [this.a[i], this.a[j]] = [this.a[j], this.a[i]]; [this.p[i], this.p[j]] = [this.p[j], this.p[i]]; i = j; } }
  pop() { const top = this.a[0]; const la = this.a.pop()!, lp = this.p.pop()!; if (this.a.length) { this.a[0] = la; this.p[0] = lp; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < this.a.length && this.p[l] < this.p[m]) m = l; if (r < this.a.length && this.p[r] < this.p[m]) m = r; if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; [this.p[i], this.p[m]] = [this.p[m], this.p[i]]; i = m; } } return top; } }
