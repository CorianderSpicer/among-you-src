// Character movement model (smooth acceleration/deceleration, slippery surfaces, slows). Shared by players and bots.
import { BASE_SPEED, TILE } from './game__core__constants';
import type { World } from './game__sim__physics';
import type { MapData } from './game__maps__builder';

export interface MoveState { x: number; y: number; vx: number; vy: number }
export interface MoveMods { speed: number; slow: boolean; slippery: boolean; ghost: boolean; bypass: boolean; drift?: { x: number; y: number }; flood?: boolean }
export function zoneAt(m: MapData, x: number, y: number) { const tx = x / TILE, ty = y / TILE; for (const z of m.zones) if (tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h) return z.kind; return null; }
export function stepMove(w: World, st: MoveState, ix: number, iy: number, dt: number, mods: MoveMods) {
  const len = Math.hypot(ix, iy); if (len > 1) { ix /= len; iy /= len; }
  let sp = BASE_SPEED * mods.speed * (mods.ghost ? 1.25 : 1); if (mods.slow) sp *= 0.55;
  const z = mods.ghost ? null : zoneAt(w.m, st.x, st.y); if (z === 'water') sp *= 0.62; if (z === 'cold') sp *= 0.8; if (z === 'sand') sp *= 0.85;
  if (mods.flood && !mods.ghost && z !== 'water') { const tx = Math.floor(st.x / TILE), ty = Math.floor(st.y / TILE); if (w.m.roomAt[ty * w.m.w + tx] < 0) sp *= 0.6; }
  const slip = mods.slippery || z === 'ice'; const acc = slip ? 2.4 : 16;
  const k = 1 - Math.exp(-acc * dt); st.vx += (ix * sp - st.vx) * k; st.vy += (iy * sp - st.vy) * k;
  if (mods.drift) { st.vx += mods.drift.x * dt; st.vy += mods.drift.y * dt; }
  const vmax = sp * 1.35; const vl = Math.hypot(st.vx, st.vy); if (vl > vmax) { st.vx *= vmax / vl; st.vy *= vmax / vl; }
  if (Math.abs(st.vx) < 1 && !ix) st.vx = 0; if (Math.abs(st.vy) < 1 && !iy) st.vy = 0;
  const [nx, ny] = w.move(st.x, st.y, st.vx * dt, st.vy * dt, mods.ghost, mods.bypass);
  if (Math.abs(nx - (st.x + st.vx * dt)) > 0.01) st.vx *= slip ? -0.3 : 0; if (Math.abs(ny - (st.y + st.vy * dt)) > 0.01) st.vy *= slip ? -0.3 : 0;
  st.x = nx; st.y = ny; return Math.hypot(st.vx, st.vy);
}
