// Procedural character art: an original chibi astronaut ("Glim") — fishbowl bubble helmet with a face inside,
// little arms, chunky boots, antenna bulb and a back-mounted pack. Drawn with Canvas2D into sprite sheets.
import { COLORS } from './game__core__constants';
import type { Cosmetics } from './game__core__types';

export const FW = 72, FH = 88, FOOT_X = 36, FOOT_Y = 80; // frame box in world units, feet anchor
export const ANIMS: Record<string, { start: number; n: number; fps: number; loop: boolean }> = {
  idle: { start: 0, n: 6, fps: 6, loop: true }, walk: { start: 6, n: 8, fps: 12, loop: true }, run: { start: 14, n: 8, fps: 16, loop: true },
  death: { start: 22, n: 12, fps: 12, loop: false }, victory: { start: 34, n: 8, fps: 10, loop: true }, body: { start: 42, n: 1, fps: 1, loop: false },
  ghost: { start: 43, n: 4, fps: 5, loop: true },
};
export const FRAMES = 47, COLS = 8;

export interface Pose {
  bob: number; sq: number; legs: [number, number]; lift: [number, number]; arm: number; armFar: number; eye: 'normal' | 'blink' | 'wide' | 'happy' | 'x' | 'closed' | 'sad';
  crack: number; slump: number; tilt: number; ghost: boolean; wisp: number; hl: number; armsUp: number; t: number; spin?: number; noHelmet?: boolean;
}
const P0: Pose = { bob: 0, sq: 1, legs: [0, 0], lift: [0, 0], arm: 0.15, armFar: -0.1, eye: 'normal', crack: 0, slump: 0, tilt: 0, ghost: false, wisp: 0, hl: 0, armsUp: 0, t: 0 };

export function poseFor(frame: number, victory = 'jump'): Pose {
  const p: Pose = { ...P0, legs: [0, 0], lift: [0, 0] };
  const tau = Math.PI * 2;
  if (frame < 6) { const k = frame / 6; p.bob = -Math.sin(k * tau) * 0.9; p.sq = 1 + Math.sin(k * tau) * 0.025; p.hl = k; p.eye = frame === 4 ? 'blink' : 'normal'; p.arm = 0.15 + Math.sin(k * tau) * 0.05; p.t = k; }
  else if (frame < 14) { const k = (frame - 6) / 8, s = Math.sin(k * tau); p.legs = [s * 6, -s * 6]; p.lift = [Math.max(0, Math.cos(k * tau)) * 3, Math.max(0, -Math.cos(k * tau)) * 3]; p.bob = -Math.abs(Math.cos(k * tau)) * 2; p.arm = -s * 0.55; p.armFar = s * 0.45; p.tilt = 0.04; p.t = k; p.hl = 0.3; }
  else if (frame < 22) { const k = (frame - 14) / 8, s = Math.sin(k * tau); p.legs = [s * 9, -s * 9]; p.lift = [Math.max(0, Math.cos(k * tau)) * 5, Math.max(0, -Math.cos(k * tau)) * 5]; p.bob = -Math.abs(Math.cos(k * tau)) * 3.5; p.arm = -s * 0.95; p.armFar = s * 0.8; p.tilt = 0.12; p.t = k; p.hl = 0.5; }
  else if (frame < 34) { // death: shock → crack → shatter + slump → wisp leaves
    const i = frame - 22; p.eye = i < 3 ? 'wide' : i < 6 ? 'x' : 'closed';
    p.bob = i < 3 ? -[2, 5, 3][i] : 0; p.crack = i < 3 ? 0 : Math.min(1, (i - 2) / 3); p.slump = i < 5 ? 0 : Math.min(1, (i - 4) / 4); p.tilt = p.slump * 0.0;
    p.wisp = i < 7 ? 0 : (i - 6) / 5; p.arm = i < 3 ? -1.2 : 0.6 + p.slump; p.armFar = i < 3 ? 1.1 : 0.2;
  }
  else if (frame < 42) { const k = (frame - 34) / 8, s = Math.sin(k * tau);
    if (victory === 'spin') { p.spin = k; p.bob = -Math.abs(s) * 4; p.armsUp = 0.7; p.eye = 'happy'; }
    else if (victory === 'dance') { p.legs = [s * 5, -s * 5]; p.lift = [Math.max(0, s) * 4, Math.max(0, -s) * 4]; p.tilt = s * 0.15; p.arm = s * 1.2; p.armFar = -s * 1.2; p.eye = 'happy'; p.bob = -Math.abs(s) * 2; }
    else if (victory === 'flex') { p.armsUp = 0.55 + Math.abs(s) * 0.25; p.sq = 1 + Math.abs(s) * 0.05; p.eye = 'happy'; p.bob = -Math.abs(s); }
    else { p.bob = -Math.abs(s) * 10; p.armsUp = Math.abs(s); p.sq = 1 - Math.abs(Math.cos(k * tau)) * 0.06 + 0.03; p.eye = 'happy'; p.lift = [Math.abs(s) * 2, Math.abs(s) * 2]; }
    p.t = k; }
  else if (frame === 42) { p.crack = 1; p.slump = 1; p.eye = 'closed'; p.arm = 1.6; p.armFar = 0.2; }
  else { const k = (frame - 43) / 4; p.ghost = true; p.bob = -4 - Math.sin(k * tau) * 2.5; p.arm = 0.4 + Math.sin(k * tau) * 0.3; p.armFar = -0.2; p.t = k; p.hl = k; }
  return p;
}

const shade = (hex: string, amt: number) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt))); return `rgb(${f(r)},${f(g)},${f(b)})`; };
const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const ell = (c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) => { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2); };

const HELMET_GLASS: Record<string, { tint: string; rim: string; alpha: number; face: boolean }> = {
  bubble: { tint: '#9fe8ff', rim: '#d9e3f2', alpha: 0.22, face: true }, gold: { tint: '#ffcd5a', rim: '#ffe7a1', alpha: 0.62, face: true },
  mirror: { tint: '#b8c6e0', rim: '#eef3ff', alpha: 0.86, face: false }, neon: { tint: '#5affea', rim: '#5affea', alpha: 0.25, face: true },
  retro: { tint: '#ffd9a8', rim: '#c79a5e', alpha: 0.25, face: true }, fin: { tint: '#9fe8ff', rim: '#d9e3f2', alpha: 0.22, face: true },
  scanner: { tint: '#ff4d6d', rim: '#c8d0e0', alpha: 0.3, face: true }, frost: { tint: '#e8f6ff', rim: '#ffffff', alpha: 0.55, face: true },
};

/** Draw one character pose. Origin = feet centre; facing right. Units = world px. */
export function drawGlim(c: CanvasRenderingContext2D, cos: Cosmetics, p: Pose) {
  const col = COLORS[cos.color % COLORS.length];
  const base = col.base, dark = col.dark, light = col.light, outl = shade(dark, -0.45);
  c.save();
  c.lineJoin = 'round'; c.lineCap = 'round';
  // ground shadow
  if (!p.ghost) { c.fillStyle = 'rgba(0,0,0,0.28)'; ell(c, 0, 0, 17 + p.slump * 8, 4.5 + p.slump, 0); c.fill(); }
  if (p.ghost) c.globalAlpha = 0.9;
  if (p.spin) { const s = Math.cos(p.spin * Math.PI * 2); c.scale(Math.abs(s) < 0.15 ? 0.15 * Math.sign(s || 1) : s, 1); }
  c.translate(0, p.bob);
  // slump: suit collapses and lies down
  const sl = p.slump;
  if (sl > 0) { c.translate(0, 0); c.rotate(-sl * 1.25); c.translate(sl * 2, 0); }
  c.rotate(p.tilt);
  c.scale(1, p.sq);
  const lw = 1.7; c.lineWidth = lw; c.strokeStyle = outl;

  // ── backpack (behind) ──
  if (cos.backpack !== 'none' && !p.ghost) drawBackpack(c, cos.backpack, base, dark, outl, p);
  // ── far arm ──
  if (!p.ghost) limb(c, -5, -24, p.armFar + p.armsUp * -2.3, 11, 6.5, shade(base, -0.3), outl);
  // ── legs / boots ──
  if (!p.ghost) {
    const boot = (dx: number, lift: number, far: boolean) => { const x = dx + (far ? -5 : 5), y = -3 - lift; c.fillStyle = far ? shade(dark, -0.15) : dark; rr(c, x - 6, y - 6, 12, 7.5, 3.5); c.fill(); c.stroke();
      c.fillStyle = far ? '#2d3446' : '#3a4258'; rr(c, x - 6.5, y - 1, 13, 3.4, 1.6); c.fill(); };
    boot(p.legs[1], p.lift[1], true); boot(p.legs[0], p.lift[0], false);
  } else { // ghost tail
    c.fillStyle = shade(base, 0.25); c.beginPath(); c.moveTo(-12, -10); c.quadraticCurveTo(-10, 4 + Math.sin(p.t * 6.28) * 3, -2, 2); c.quadraticCurveTo(4, -2, 8, 4 + Math.cos(p.t * 6.28) * 3); c.quadraticCurveTo(12, -2, 12, -10); c.closePath(); c.fill(); }
  // ── body ──
  const bx = -13, by = -30, bw = 26, bh = 26;
  const g = c.createLinearGradient(bx, by, bx + bw, by + bh); g.addColorStop(0, light); g.addColorStop(0.35, base); g.addColorStop(1, dark);
  c.fillStyle = g; rr(c, bx, by, bw, bh, 11); c.fill(); c.stroke();
  // suit details: belt + chest patch
  c.save(); rr(c, bx, by, bw, bh, 11); c.clip();
  c.fillStyle = shade(dark, -0.2); c.fillRect(bx, by + bh - 9, bw, 3.2);
  c.fillStyle = '#d6dbe8'; rr(c, 1, by + bh - 9.6, 5, 4.4, 1); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.18)'; ell(c, bx + 7, by + 7, 5, 8, -0.5); c.fill();
  if (cos.outfit !== 'none' && !p.ghost) drawOutfit(c, cos.outfit, bx, by, bw, bh, base, dark, p);
  c.restore();
  if (cos.outfit === 'scarf' && !p.ghost) drawScarfTail(c, p);
  // ── collar ring ──
  c.fillStyle = '#c4ccdc'; ell(c, 1, -30, 12.5, 3.6); c.fill(); c.stroke(); c.fillStyle = '#e9eef8'; ell(c, -1, -31, 7, 1.4); c.fill();
  // ── accessory below head (bowtie, medal, badge, bandana) ──
  if (!p.ghost) drawAccessoryBody(c, cos.accessory, p);
  // ── near arm ──
  if (!p.ghost) limb(c, 8, -24, p.arm + p.armsUp * 2.3, 11, 6.8, base, outl, light);
  // ── helmet + head ──
  drawHead(c, cos, p, base, light, outl);
  c.restore();
  // ── soul wisp (death) ──
  if (p.wisp > 0) { c.save(); const w = p.wisp; c.globalAlpha = Math.max(0, 1 - w * 0.9); c.translate(4, -40 - w * 34); const gg = c.createRadialGradient(0, 0, 1, 0, 0, 12);
    gg.addColorStop(0, 'rgba(255,255,255,0.95)'); gg.addColorStop(0.4, light); gg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gg; ell(c, 0, 0, 12, 12); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.moveTo(-4, 2); c.quadraticCurveTo(0, 14, 3, 8); c.quadraticCurveTo(6, 16, 5, 2); c.fill(); c.fillStyle = '#20263a'; ell(c, -2, -1, 1.1, 1.6); c.fill(); ell(c, 3, -1, 1.1, 1.6); c.fill(); c.restore(); }
}

function limb(c: CanvasRenderingContext2D, sx: number, sy: number, ang: number, len: number, w: number, fill: string, outl: string, hi?: string) {
  c.save(); c.translate(sx, sy); c.rotate(ang); c.fillStyle = fill; rr(c, -w / 2, -1.5, w, len, w / 2); c.fill(); c.stroke();
  c.fillStyle = '#e4e8f2'; ell(c, 0, len - 1.5, w / 2 + 0.6, w / 2 + 0.2); c.fill(); c.stroke(); // glove
  if (hi) { c.fillStyle = 'rgba(255,255,255,0.25)'; rr(c, -w / 2 + 1.3, 0, 1.6, len - 5, 1); c.fill(); }
  c.restore();
}

function drawHead(c: CanvasRenderingContext2D, cos: Cosmetics, p: Pose, base: string, light: string, outl: string) {
  const hx = 2, hy = -45, R = 16.5; const H = HELMET_GLASS[cos.helmet] || HELMET_GLASS.bubble;
  // antenna (behind hat)
  if (cos.helmet !== 'fin') { c.strokeStyle = '#9aa4ba'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(hx - 6, hy - R + 2); c.quadraticCurveTo(hx - 9, hy - R - 6, hx - 7.5, hy - R - 10); c.stroke();
    const bl = c.createRadialGradient(hx - 7.5, hy - R - 11, 0.5, hx - 7.5, hy - R - 11, 4.5); bl.addColorStop(0, '#fff'); bl.addColorStop(0.4, light); bl.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = bl; ell(c, hx - 7.5, hy - R - 11, 4.5, 4.5); c.fill(); c.fillStyle = base; ell(c, hx - 7.5, hy - R - 11, 2.2, 2.2); c.fill(); c.lineWidth = 1.7; c.strokeStyle = outl; }
  else { c.fillStyle = base; c.beginPath(); c.moveTo(hx - 10, hy - R + 4); c.quadraticCurveTo(hx - 12, hy - R - 12, hx - 1, hy - R - 9); c.lineTo(hx + 2, hy - R + 2); c.closePath(); c.fill(); c.stroke(); }
  if (p.noHelmet) return;
  // inner helmet back (darker glass)
  c.fillStyle = 'rgba(16,24,44,0.92)'; ell(c, hx, hy, R, R); c.fill();
  // face
  if (H.face) {
    const fx = hx + 4.5, fy = hy + 1;
    const fg = c.createRadialGradient(fx - 3, fy - 4, 2, fx, fy, 12); fg.addColorStop(0, '#fff6ea'); fg.addColorStop(1, '#f1d5c0');
    c.fillStyle = fg; ell(c, fx, fy, 11, 10.5); c.fill();
    c.fillStyle = 'rgba(255,120,140,0.35)'; ell(c, fx - 6.5, fy + 3.5, 2.6, 1.6); c.fill(); ell(c, fx + 7, fy + 3.5, 2.2, 1.5); c.fill();
    drawEyes(c, fx, fy, p.eye);
    drawAccessoryFace(c, cos.accessory, fx, fy);
  }
  // glass
  const gl = c.createRadialGradient(hx - 6, hy - 7, 2, hx, hy, R); gl.addColorStop(0, `rgba(255,255,255,${0.35 * (1 - H.alpha) + 0.1})`); gl.addColorStop(0.5, hexA(H.tint, H.alpha * 0.6)); gl.addColorStop(1, hexA(H.tint, Math.min(1, H.alpha + 0.25)));
  c.fillStyle = gl; ell(c, hx, hy, R, R); c.fill();
  if (cos.helmet === 'mirror' || cos.helmet === 'gold') { // reflective stripes
    c.save(); ell(c, hx, hy, R, R); c.clip(); c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(hx - R, hy + 2 + p.hl * 2); c.lineTo(hx + R, hy - 6 + p.hl * 2); c.lineTo(hx + R, hy - 2 + p.hl * 2); c.lineTo(hx - R, hy + 6 + p.hl * 2); c.fill(); c.restore(); }
  if (cos.helmet === 'scanner') { c.save(); ell(c, hx, hy, R, R); c.clip(); c.fillStyle = 'rgba(255,77,109,0.75)'; c.fillRect(hx - R, hy - 3 + Math.sin(p.hl * 6.28) * 5, R * 2, 2.2); c.restore(); }
  if (cos.helmet === 'retro') { c.strokeStyle = '#c79a5e'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(hx, hy - R); c.lineTo(hx, hy + R); c.stroke(); c.strokeStyle = outl; c.lineWidth = 1.7; }
  if (cos.helmet === 'frost') { c.save(); ell(c, hx, hy, R, R); c.clip(); c.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 9; i++) { ell(c, hx - R + ((i * 37) % (R * 2)), hy + R - (i * 7) % 10, 3, 2); c.fill(); } c.restore(); }
  // highlights
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(hx - 7 + p.hl * 1.5, hy - 8, 5, 2.6, -0.7, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.45)'; ell(c, hx + 9, hy + 8, 2, 1.2, -0.7); c.fill();
  // crack
  if (p.crack > 0) { c.save(); c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 1.2; c.beginPath(); const k = p.crack;
    const pts = [[hx + 2, hy - 2], [hx - 4, hy - 9], [hx - 9, hy - 11], [hx + 2, hy - 2], [hx + 9, hy - 6], [hx + 13, hy - 4], [hx + 2, hy - 2], [hx + 4, hy + 8], [hx + 1, hy + 13], [hx + 2, hy - 2], [hx - 8, hy + 4]];
    c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length * k; i++) { const q = pts[i]; if (q[0] === hx + 2 && q[1] === hy - 2) c.moveTo(q[0], q[1]); else c.lineTo(q[0], q[1]); } c.stroke();
    if (p.slump > 0) { c.fillStyle = 'rgba(200,240,255,0.8)'; for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4, d = R + 2 + p.slump * (4 + i * 2); c.beginPath(); c.moveTo(hx + Math.cos(a) * d, hy + Math.sin(a) * d); c.lineTo(hx + Math.cos(a) * d + 2.5, hy + Math.sin(a) * d + 1); c.lineTo(hx + Math.cos(a) * d + 0.5, hy + Math.sin(a) * d + 3); c.fill(); } }
    c.restore(); }
  // rim
  c.lineWidth = 2.6; c.strokeStyle = H.rim; ell(c, hx, hy, R, R); c.stroke();
  c.lineWidth = 1.2; c.strokeStyle = outl; ell(c, hx, hy, R + 1.4, R + 1.4); c.stroke();
  if (cos.helmet === 'neon') { c.save(); c.shadowColor = '#5affea'; c.shadowBlur = 8; c.strokeStyle = 'rgba(90,255,234,0.9)'; c.lineWidth = 1.5; ell(c, hx, hy, R - 0.5, R - 0.5); c.stroke(); c.restore(); }
  c.lineWidth = 1.7;
  if (!p.ghost) drawHat(c, cos.hat, hx, hy, R, p, base, outl);
}

function drawEyes(c: CanvasRenderingContext2D, fx: number, fy: number, e: Pose['eye']) {
  const ex = [fx - 3.2, fx + 4.2], ey = fy - 1.5; c.fillStyle = '#1b2033'; c.strokeStyle = '#1b2033'; c.lineWidth = 1.6;
  for (const x of ex) {
    if (e === 'blink' || e === 'closed') { c.beginPath(); c.moveTo(x - 2, ey + 0.5); c.quadraticCurveTo(x, ey + 2, x + 2, ey + 0.5); c.stroke(); }
    else if (e === 'happy') { c.beginPath(); c.moveTo(x - 2.2, ey + 1); c.quadraticCurveTo(x, ey - 2.4, x + 2.2, ey + 1); c.stroke(); }
    else if (e === 'x') { c.beginPath(); c.moveTo(x - 2, ey - 2); c.lineTo(x + 2, ey + 2); c.moveTo(x + 2, ey - 2); c.lineTo(x - 2, ey + 2); c.stroke(); }
    else { const big = e === 'wide' ? 1.35 : 1; ell(c, x, ey, 2.1 * big, 3 * big); c.fill(); c.fillStyle = '#fff'; ell(c, x + 0.7, ey - 1.2, 0.8 * big, 0.9 * big); c.fill(); c.fillStyle = '#1b2033'; }
  }
  c.beginPath(); c.lineWidth = 1.2;
  if (e === 'wide') { ell(c, fx + 0.5, fy + 4.5, 1.5, 1.8); c.fill(); } else if (e === 'sad' || e === 'x' || e === 'closed') { c.moveTo(fx - 1.5, fy + 5.5); c.quadraticCurveTo(fx + 0.5, fy + 4, fx + 2.5, fy + 5.5); c.stroke(); }
  else { c.moveTo(fx - 1.5, fy + 4); c.quadraticCurveTo(fx + 0.5, fy + 5.8, fx + 2.5, fy + 4); c.stroke(); }
  c.lineWidth = 1.7;
}

function drawHat(c: CanvasRenderingContext2D, id: string, hx: number, hy: number, R: number, p: Pose, base: string, outl: string) {
  const top = hy - R; c.save(); c.strokeStyle = outl; c.lineWidth = 1.5;
  const t = p.t * Math.PI * 2;
  switch (id) {
    case 'beanie': { c.fillStyle = '#e85d75'; c.beginPath(); c.moveTo(hx - 13, top + 7); c.quadraticCurveTo(hx - 12, top - 9, hx + 1, top - 9); c.quadraticCurveTo(hx + 14, top - 9, hx + 14, top + 7); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffd1da'; rr(c, hx - 14, top + 3, 29, 6, 3); c.fill(); c.stroke(); c.fillStyle = '#fff'; ell(c, hx + 1, top - 10, 4, 4); c.fill(); c.stroke(); break; }
    case 'cap': { c.fillStyle = '#2f6fd8'; c.beginPath(); c.moveTo(hx - 12, top + 6); c.quadraticCurveTo(hx - 10, top - 7, hx + 2, top - 7); c.quadraticCurveTo(hx + 13, top - 6, hx + 13, top + 6); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#1d4ea3'; c.beginPath(); c.moveTo(hx + 8, top + 4); c.quadraticCurveTo(hx + 24, top + 2, hx + 25, top + 7); c.lineTo(hx + 10, top + 8); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#ffd23f'; ell(c, hx + 1, top - 1, 3, 3); c.fill(); break; }
    case 'tophat': { c.fillStyle = '#20232e'; rr(c, hx - 9, top - 18, 19, 21, 2); c.fill(); c.stroke(); c.fillStyle = '#c0304a'; c.fillRect(hx - 9, top - 3, 19, 4); c.fillStyle = '#20232e'; ell(c, hx + 0.5, top + 3, 15, 3.5); c.fill(); c.stroke(); break; }
    case 'crown': { c.fillStyle = '#ffcf3d'; c.beginPath(); c.moveTo(hx - 11, top + 5); c.lineTo(hx - 12, top - 8); c.lineTo(hx - 5, top - 2); c.lineTo(hx + 1, top - 12); c.lineTo(hx + 6, top - 2); c.lineTo(hx + 13, top - 8); c.lineTo(hx + 12, top + 5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#e8394d'; ell(c, hx + 1, top + 1, 2.2, 2.2); c.fill(); c.fillStyle = '#55b6ff'; ell(c, hx - 7, top + 2, 1.6, 1.6); c.fill(); ell(c, hx + 8, top + 2, 1.6, 1.6); c.fill(); break; }
    case 'headphones': { c.lineWidth = 3.5; c.strokeStyle = '#2a2f3e'; c.beginPath(); c.arc(hx, hy, R + 2, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); c.lineWidth = 1.5; c.strokeStyle = outl;
      c.fillStyle = '#ff4d6d'; rr(c, hx - R - 5, hy - 5, 7, 12, 3); c.fill(); c.stroke(); rr(c, hx + R - 2, hy - 5, 7, 12, 3); c.fill(); c.stroke(); break; }
    case 'flower': { c.fillStyle = '#3cb371'; c.fillRect(hx + 3, top - 9, 2, 10); const k = Math.sin(t) * 0.15; c.translate(hx + 4, top - 11); c.rotate(k);
      c.fillStyle = '#ff8fd0'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ell(c, Math.cos(a) * 4, Math.sin(a) * 4, 3.2, 2.2, a); c.fill(); } c.fillStyle = '#ffe066'; ell(c, 0, 0, 2.6, 2.6); c.fill(); break; }
    case 'horns': { c.fillStyle = '#ff6a3d'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(hx + s * 7, top + 3); c.quadraticCurveTo(hx + s * 14, top - 2, hx + s * 12, top - 10); c.quadraticCurveTo(hx + s * 9, top - 3, hx + s * 3, top + 2); c.closePath(); c.fill(); c.stroke(); } break; }
    case 'halo': { c.shadowColor = '#ffe680'; c.shadowBlur = 8; c.strokeStyle = '#ffe680'; c.lineWidth = 3; ell(c, hx, top - 7 + Math.sin(t) * 1.5, 11, 3.2); c.stroke(); break; }
    case 'chef': { c.fillStyle = '#fafbff'; ell(c, hx - 6, top - 8, 7, 7); c.fill(); c.stroke(); ell(c, hx + 6, top - 9, 7, 7); c.fill(); c.stroke(); ell(c, hx, top - 13, 7, 7); c.fill(); c.stroke(); rr(c, hx - 10, top - 6, 21, 10, 2); c.fill(); c.stroke(); break; }
    case 'propeller': { c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(hx, top + 5, 12, Math.PI, 0); c.fill(); c.stroke(); c.fillStyle = '#e8394d'; c.beginPath(); c.moveTo(hx, top + 5); c.arc(hx, top + 5, 12, Math.PI, Math.PI * 1.5); c.fill(); c.fillStyle = '#3c5cf0'; c.beginPath(); c.moveTo(hx, top + 5); c.arc(hx, top + 5, 12, Math.PI * 1.5, 0); c.fill();
      c.fillStyle = '#555'; c.fillRect(hx - 0.8, top - 10, 1.6, 4); const w = Math.cos(t * 3) * 11; c.fillStyle = '#e9eef7'; ell(c, hx, top - 10, Math.abs(w) + 1, 2); c.fill(); c.stroke(); break; }
    case 'party': { c.fillStyle = '#a77bff'; c.beginPath(); c.moveTo(hx - 9, top + 4); c.lineTo(hx + 3, top - 18); c.lineTo(hx + 11, top + 4); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) { ell(c, hx - 3 + i * 5, top - 1 - i * 5, 1.7, 1.7); c.fill(); } c.fillStyle = '#ff6fae'; ell(c, hx + 3, top - 19, 3, 3); c.fill(); break; }
    case 'cowboy': { c.fillStyle = '#9a6a4a'; ell(c, hx + 1, top + 4, 20, 4.5); c.fill(); c.stroke(); c.beginPath(); c.moveTo(hx - 9, top + 3); c.quadraticCurveTo(hx - 9, top - 12, hx + 1, top - 9); c.quadraticCurveTo(hx + 11, top - 12, hx + 11, top + 3); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#553420'; c.fillRect(hx - 9, top - 1, 20, 3); break; }
    case 'wizard': { c.fillStyle = '#3c3fa8'; c.beginPath(); c.moveTo(hx - 13, top + 5); c.quadraticCurveTo(hx - 2, top - 10, hx + 7, top - 26); c.quadraticCurveTo(hx + 6, top - 6, hx + 14, top + 5); c.closePath(); c.fill(); c.stroke(); ell(c, hx, top + 5, 17, 3.5); c.fill(); c.stroke();
      c.fillStyle = '#ffe066'; star(c, hx + 1, top - 5, 3.5); star(c, hx + 5, top - 15, 2.2); break; }
    case 'ears': { c.fillStyle = base; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(hx + s * 4, top + 3); c.lineTo(hx + s * 12, top - 9); c.lineTo(hx + s * 14, top + 6); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#ffb3c8'; c.beginPath(); c.moveTo(hx + s * 7, top + 3); c.lineTo(hx + s * 11.5, top - 4); c.lineTo(hx + s * 12.5, top + 4); c.closePath(); c.fill(); c.fillStyle = base; } break; }
    case 'sprout': { c.strokeStyle = '#3cb371'; c.lineWidth = 2; c.beginPath(); c.moveTo(hx + 1, top + 1); c.quadraticCurveTo(hx + 3, top - 7, hx + 1, top - 11); c.stroke(); const k = Math.sin(t) * 0.25;
      c.fillStyle = '#6ee08a'; c.save(); c.translate(hx + 1, top - 10); c.rotate(-0.6 + k); ell(c, -5, 0, 5.5, 2.6); c.fill(); c.restore(); c.save(); c.translate(hx + 1, top - 10); c.rotate(0.6 + k); ell(c, 5, 0, 5.5, 2.6); c.fill(); c.restore(); break; }
  }
  c.restore();
}
function star(c: CanvasRenderingContext2D, x: number, y: number, r: number) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); } c.closePath(); c.fill(); }

function drawOutfit(c: CanvasRenderingContext2D, id: string, bx: number, by: number, bw: number, bh: number, base: string, dark: string, p: Pose) {
  c.lineWidth = 1.2;
  switch (id) {
    case 'labcoat': c.fillStyle = '#f4f7fd'; c.fillRect(bx, by, bw, bh); c.fillStyle = base; c.beginPath(); c.moveTo(bx + 9, by); c.lineTo(bx + 13, by + 12); c.lineTo(bx + 17, by); c.fill(); c.strokeStyle = '#b9c2d6'; c.beginPath(); c.moveTo(bx + 13, by + 12); c.lineTo(bx + 13, by + bh); c.stroke(); c.fillStyle = '#5c9cff'; c.fillRect(bx + 18, by + 13, 2, 5); break;
    case 'vest': c.fillStyle = '#4a5a3a'; c.fillRect(bx + 2, by + 4, bw - 4, bh - 10); c.fillStyle = '#3a4a2c'; for (let i = 0; i < 3; i++) c.fillRect(bx + 4 + i * 7, by + 12, 5, 5); c.fillStyle = '#c9a227'; c.fillRect(bx + 2, by + 4, bw - 4, 2); break;
    case 'poncho': c.fillStyle = '#d97a3a'; c.beginPath(); c.moveTo(bx - 2, by + 20); c.lineTo(bx + bw / 2, by); c.lineTo(bx + bw + 2, by + 20); c.closePath(); c.fill(); c.fillStyle = '#f2c14e'; for (let i = 0; i < 4; i++) c.fillRect(bx + 2 + i * 6, by + 14, 3, 3); c.fillStyle = '#7a3a1a'; c.fillRect(bx, by + 19, bw, 2); break;
    case 'hazmat': c.fillStyle = '#ffd23f'; c.fillRect(bx, by + 9, bw, 7); c.fillStyle = '#20232e'; for (let i = -2; i < 6; i++) { c.beginPath(); c.moveTo(bx + i * 6, by + 16); c.lineTo(bx + i * 6 + 4, by + 9); c.lineTo(bx + i * 6 + 7, by + 9); c.lineTo(bx + i * 6 + 3, by + 16); c.fill(); } break;
    case 'captain': c.fillStyle = '#1d2c5e'; c.fillRect(bx, by, bw, bh); c.fillStyle = '#ffcf3d'; for (let i = 0; i < 3; i++) { ell(c, bx + 10, by + 7 + i * 5, 1.4, 1.4); c.fill(); ell(c, bx + 17, by + 7 + i * 5, 1.4, 1.4); c.fill(); } c.fillRect(bx + 1, by + 3, 6, 2); c.fillRect(bx + bw - 7, by + 3, 6, 2); break;
    case 'scarf': c.fillStyle = '#e8394d'; c.fillRect(bx, by, bw, 6); c.fillStyle = '#fff'; c.fillRect(bx, by + 2, bw, 1.4); break;
    case 'hoodie': c.fillStyle = '#7a86a8'; c.fillRect(bx, by, bw, bh); c.fillStyle = '#5f6a8a'; rr(c, bx + 6, by + 13, 14, 7, 3); c.fill(); c.strokeStyle = '#e9eef7'; c.lineWidth = 1; c.beginPath(); c.moveTo(bx + 10, by + 1); c.lineTo(bx + 9, by + 9); c.moveTo(bx + 16, by + 1); c.lineTo(bx + 17, by + 9); c.stroke(); break;
    case 'circuit': { c.strokeStyle = `rgba(90,255,234,${0.55 + 0.4 * Math.sin(p.t * 6.28)})`; c.lineWidth = 1.2; c.beginPath(); c.moveTo(bx + 3, by + 6); c.lineTo(bx + 9, by + 6); c.lineTo(bx + 9, by + 14); c.lineTo(bx + 18, by + 14); c.moveTo(bx + 20, by + 3); c.lineTo(bx + 20, by + 10); c.lineTo(bx + 25, by + 10); c.moveTo(bx + 4, by + 19); c.lineTo(bx + 14, by + 19); c.stroke();
      c.fillStyle = '#5affea'; for (const [x, y] of [[9, 6], [18, 14], [20, 3], [14, 19]]) { ell(c, bx + x, by + y, 1.4, 1.4); c.fill(); } break; }
    case 'tux': c.fillStyle = '#20232e'; c.fillRect(bx, by, bw, bh); c.fillStyle = '#f4f7fd'; c.beginPath(); c.moveTo(bx + 8, by); c.lineTo(bx + 13, by + 16); c.lineTo(bx + 18, by); c.fill(); c.fillStyle = '#e8394d'; c.beginPath(); c.moveTo(bx + 10, by + 3); c.lineTo(bx + 13, by + 5); c.lineTo(bx + 16, by + 3); c.lineTo(bx + 16, by + 7); c.lineTo(bx + 13, by + 5); c.lineTo(bx + 10, by + 7); c.fill(); break;
  }
  c.lineWidth = 1.7;
}
function drawScarfTail(c: CanvasRenderingContext2D, p: Pose) { c.save(); c.fillStyle = '#e8394d'; c.strokeStyle = '#7a1a2a'; c.lineWidth = 1.1; const w = Math.sin(p.t * 6.28) * 3; c.beginPath(); c.moveTo(-10, -29); c.quadraticCurveTo(-20, -27 + w, -26, -22 + w); c.lineTo(-24, -18 + w); c.quadraticCurveTo(-18, -22, -9, -25); c.closePath(); c.fill(); c.stroke(); c.restore(); }

function drawAccessoryBody(c: CanvasRenderingContext2D, id: string, p: Pose) {
  c.save(); c.lineWidth = 1.2; c.strokeStyle = '#1b2033';
  if (id === 'bowtie') { c.fillStyle = '#e8394d'; c.beginPath(); c.moveTo(2, -27); c.lineTo(-4, -30.5); c.lineTo(-4, -23.5); c.closePath(); c.moveTo(2, -27); c.lineTo(8, -30.5); c.lineTo(8, -23.5); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#9f1f33'; ell(c, 2, -27, 1.6, 1.8); c.fill(); }
  if (id === 'medal') { c.fillStyle = '#3c5cf0'; c.fillRect(4, -27, 3, 8); c.fillStyle = '#ffcf3d'; ell(c, 5.5, -17, 3.6, 3.6); c.fill(); c.stroke(); }
  if (id === 'badge') { c.fillStyle = '#ffcf3d'; star(c, 6, -20, 4.2); }
  if (id === 'bandana') { c.fillStyle = '#2f6fd8'; c.beginPath(); c.moveTo(-9, -28); c.lineTo(11, -28); c.lineTo(3, -19); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fff'; ell(c, 2, -25, 1, 1); c.fill(); ell(c, 5, -23, 0.8, 0.8); c.fill(); }
  c.restore();
}
function drawAccessoryFace(c: CanvasRenderingContext2D, id: string, fx: number, fy: number) {
  c.save(); c.lineWidth = 1.3; c.strokeStyle = '#1b2033';
  if (id === 'goggles') { c.strokeStyle = '#6b4a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(fx - 11, fy - 3); c.lineTo(fx + 11, fy - 3); c.stroke(); c.fillStyle = 'rgba(120,220,255,0.6)'; c.strokeStyle = '#c79a5e'; c.lineWidth = 1.6; ell(c, fx - 3.2, fy - 2, 3.6, 3.4); c.fill(); c.stroke(); ell(c, fx + 4.6, fy - 2, 3.6, 3.4); c.fill(); c.stroke(); }
  if (id === 'monocle') { c.strokeStyle = '#ffcf3d'; ell(c, fx + 4.2, fy - 1.5, 3.8, 3.8); c.stroke(); c.beginPath(); c.moveTo(fx + 7.5, fy + 1); c.quadraticCurveTo(fx + 9, fy + 6, fx + 7, fy + 9); c.stroke(); }
  if (id === 'glasses') { ell(c, fx - 3.2, fy - 1.5, 3.4, 3.2); c.stroke(); ell(c, fx + 4.2, fy - 1.5, 3.4, 3.2); c.stroke(); c.beginPath(); c.moveTo(fx + 0.2, fy - 1.8); c.lineTo(fx + 0.8, fy - 1.8); c.stroke(); }
  c.restore();
}

function drawBackpack(c: CanvasRenderingContext2D, id: string, base: string, dark: string, outl: string, p: Pose) {
  c.save(); c.lineWidth = 1.5; c.strokeStyle = outl;
  switch (id) {
    case 'tank': { const g = c.createLinearGradient(-22, 0, -10, 0); g.addColorStop(0, '#8e98b0'); g.addColorStop(0.5, '#d9dfeb'); g.addColorStop(1, '#8e98b0'); c.fillStyle = g; rr(c, -22, -30, 12, 22, 5); c.fill(); c.stroke(); c.fillStyle = base; c.fillRect(-22, -22, 12, 4); c.fillStyle = '#5affea'; ell(c, -16, -26, 1.5, 1.5); c.fill(); break; }
    case 'jetpack': { c.fillStyle = '#7d879e'; rr(c, -24, -31, 14, 22, 4); c.fill(); c.stroke(); c.fillStyle = '#4a5268'; rr(c, -23, -11, 5, 5, 1); c.fill(); rr(c, -16, -11, 5, 5, 1); c.fill(); const f = 4 + Math.sin(p.t * 18) * 2;
      c.fillStyle = 'rgba(255,170,60,0.85)'; c.beginPath(); c.moveTo(-23, -6); c.lineTo(-20.5, -6 + f); c.lineTo(-18, -6); c.fill(); c.beginPath(); c.moveTo(-16, -6); c.lineTo(-13.5, -6 + f); c.lineTo(-11, -6); c.fill(); break; }
    case 'satchel': c.fillStyle = '#9a6a4a'; rr(c, -21, -24, 12, 15, 3); c.fill(); c.stroke(); c.fillStyle = '#7a4a2a'; c.fillRect(-21, -24, 12, 5); c.fillStyle = '#ffcf3d'; c.fillRect(-16, -20, 2, 2); break;
    case 'wings': { c.fillStyle = 'rgba(230,240,255,0.92)'; const fl = Math.sin(p.t * 6.28) * 0.15; c.save(); c.translate(-10, -24); c.rotate(-0.4 + fl); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-20, -14, -26, 2); c.quadraticCurveTo(-16, 0, -12, 8); c.quadraticCurveTo(-6, 4, 0, 6); c.closePath(); c.fill(); c.stroke(); c.restore(); break; }
    case 'rocket': { c.fillStyle = '#e9eef7'; c.beginPath(); c.moveTo(-16, -36); c.quadraticCurveTo(-23, -28, -22, -12); c.lineTo(-10, -12); c.quadraticCurveTo(-9, -28, -16, -36); c.fill(); c.stroke(); c.fillStyle = '#e8394d'; c.beginPath(); c.moveTo(-22, -16); c.lineTo(-26, -9); c.lineTo(-20, -12); c.fill(); c.beginPath(); c.moveTo(-10, -16); c.lineTo(-6, -9); c.lineTo(-12, -12); c.fill();
      c.fillStyle = '#55b6ff'; ell(c, -16, -25, 2.6, 2.6); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,170,60,0.8)'; ell(c, -16, -9 + Math.sin(p.t * 20), 2.5, 3 + Math.abs(Math.sin(p.t * 20)) * 2); c.fill(); break; }
    case 'plush': c.fillStyle = '#ffb3c8'; ell(c, -17, -20, 8, 9); c.fill(); c.stroke(); ell(c, -22, -29, 3, 3); c.fill(); c.stroke(); ell(c, -12, -29, 3, 3); c.fill(); c.stroke(); c.fillStyle = '#1b2033'; ell(c, -19, -21, 1, 1.2); c.fill(); ell(c, -15, -21, 1, 1.2); c.fill(); break;
    case 'radio': { c.fillStyle = '#4a5a3a'; rr(c, -23, -30, 13, 20, 2); c.fill(); c.stroke(); c.strokeStyle = '#2a2f3e'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-20, -30); c.lineTo(-24, -44); c.stroke(); c.fillStyle = Math.sin(p.t * 6.28) > 0 ? '#ff4d6d' : '#5a2a32'; ell(c, -24, -44, 1.6, 1.6); c.fill(); c.fillStyle = '#2a3322'; for (let i = 0; i < 3; i++) c.fillRect(-21, -26 + i * 4, 9, 1.4); break; }
  }
  c.restore();
}

export function drawPet(c: CanvasRenderingContext2D, id: string, t: number, color = '#5affea') {
  const tau = Math.PI * 2, b = Math.sin(t * tau) * 2; c.save(); c.lineWidth = 1.3; c.strokeStyle = '#1b2033'; c.lineJoin = 'round';
  c.fillStyle = 'rgba(0,0,0,0.25)'; ell(c, 0, 0, 7, 2); c.fill();
  switch (id) {
    case 'drone': c.translate(0, -16 + b); c.fillStyle = '#c4ccdc'; rr(c, -7, -4, 14, 8, 4); c.fill(); c.stroke(); c.fillStyle = color; ell(c, 2, 0, 2.4, 2.4); c.fill(); c.strokeStyle = '#7d879e'; c.beginPath(); c.moveTo(-9, -6); c.lineTo(-3, -4); c.moveTo(9, -6); c.lineTo(3, -4); c.stroke(); c.fillStyle = 'rgba(220,230,255,0.7)'; ell(c, -9, -6, 4 * Math.abs(Math.cos(t * 40)) + 1, 1); c.fill(); ell(c, 9, -6, 4 * Math.abs(Math.sin(t * 40)) + 1, 1); c.fill(); break;
    case 'jelly': c.translate(0, -14 + b); c.fillStyle = 'rgba(255,140,220,0.85)'; c.beginPath(); c.arc(0, 0, 7, Math.PI, 0); c.lineTo(7, 2); c.lineTo(-7, 2); c.fill(); c.stroke(); c.strokeStyle = 'rgba(255,140,220,0.8)'; c.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 4, 2); c.quadraticCurveTo(i * 4 + Math.sin(t * tau + i) * 3, 7, i * 4, 11); c.stroke(); } c.fillStyle = '#1b2033'; ell(c, -2, -2, 0.9, 1.2); c.fill(); ell(c, 2.5, -2, 0.9, 1.2); c.fill(); break;
    case 'rock': c.translate(0, -5 + Math.max(0, b)); c.fillStyle = '#8a8f9e'; c.beginPath(); c.moveTo(-7, 3); c.lineTo(-6, -4); c.lineTo(-1, -7); c.lineTo(6, -5); c.lineTo(7, 3); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#1b2033'; ell(c, 0, -2, 0.9, 1.3); c.fill(); ell(c, 3.5, -2, 0.9, 1.3); c.fill(); c.fillStyle = '#6ee08a'; ell(c, -3, -6, 2, 1); c.fill(); break;
    case 'sprite': { c.translate(0, -18 + b * 1.5); c.fillStyle = '#ffe680'; c.shadowColor = '#ffe680'; c.shadowBlur = 8; star(c, 0, 0, 6.5); c.shadowBlur = 0; c.fillStyle = '#1b2033'; ell(c, -1.5, 0, 0.8, 1.1); c.fill(); ell(c, 2, 0, 0.8, 1.1); c.fill(); break; }
    case 'pup': c.translate(0, -6 + Math.max(0, b) * 0.6); c.fillStyle = '#d9dfeb'; rr(c, -7, -6, 14, 8, 3); c.fill(); c.stroke(); rr(c, 3, -11, 8, 7, 3); c.fill(); c.stroke(); c.fillStyle = '#7d879e'; c.fillRect(-6, 2, 2, 3); c.fillRect(3, 2, 2, 3); c.fillStyle = color; ell(c, 8, -8, 1.2, 1.2); c.fill(); c.strokeStyle = '#7d879e'; c.beginPath(); c.moveTo(-7, -4); c.lineTo(-10, -8 + Math.sin(t * tau * 2) * 2); c.stroke(); break;
    case 'slime': { c.translate(0, -1); const sq = 1 + Math.sin(t * tau) * 0.12; c.scale(1 / sq, sq); c.fillStyle = 'rgba(141,255,122,0.9)'; c.beginPath(); c.moveTo(-8, 0); c.quadraticCurveTo(-8, -11, 0, -11); c.quadraticCurveTo(8, -11, 8, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.6)'; ell(c, -3, -7, 2, 1.2); c.fill(); c.fillStyle = '#1b2033'; ell(c, -1.5, -4, 0.9, 1.3); c.fill(); ell(c, 2.5, -4, 0.9, 1.3); c.fill(); break; }
    case 'owl': c.translate(0, -15 + b); c.fillStyle = '#9a6a4a'; ell(c, 0, 0, 6.5, 7.5); c.fill(); c.stroke(); c.fillStyle = '#fff'; ell(c, -2.5, -2, 2.4, 2.4); c.fill(); ell(c, 2.5, -2, 2.4, 2.4); c.fill(); c.fillStyle = '#1b2033'; ell(c, -2.3, -2, 1, 1); c.fill(); ell(c, 2.7, -2, 1, 1); c.fill(); c.fillStyle = '#ffb547'; c.beginPath(); c.moveTo(-0.8, 0.5); c.lineTo(0.8, 0.5); c.lineTo(0, 2.2); c.fill(); c.fillStyle = '#c79a5e'; const w = Math.sin(t * tau * 2) * 0.5; c.save(); c.translate(-6, 0); c.rotate(w); ell(c, -2, 0, 3, 1.5); c.fill(); c.restore(); c.save(); c.translate(6, 0); c.rotate(-w); ell(c, 2, 0, 3, 1.5); c.fill(); c.restore(); break;
  }
  c.restore();
}

const hexA = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

/** Build a full sprite sheet for a cosmetics set. scale = pixel density (1.5 recommended). */
export function buildSheet(cos: Cosmetics, scale = 1.5): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = Math.ceil(FW * scale) * COLS; cv.height = Math.ceil(FH * scale) * Math.ceil(FRAMES / COLS);
  const c = cv.getContext('2d')!; const fw = Math.ceil(FW * scale), fh = Math.ceil(FH * scale);
  for (let f = 0; f < FRAMES; f++) { c.save(); c.translate((f % COLS) * fw + FOOT_X * scale, Math.floor(f / COLS) * fh + FOOT_Y * scale); c.scale(scale, scale); drawGlim(c, cos, poseFor(f, cos.victory)); c.restore(); }
  return cv;
}

/** Head-and-shoulders portrait (for meeting cards, rosters). Returns a data URL. */
const portraitCache = new Map<string, string>();
export function portrait(cos: Cosmetics, size = 96, opts: { dead?: boolean; eye?: Pose['eye'] } = {}): string {
  const key = JSON.stringify(cos) + size + (opts.dead ? 'd' : '') + (opts.eye || ''); const hit = portraitCache.get(key); if (hit) return hit;
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d')!; const s = size / 64;
  c.translate(size / 2 - 2 * s, size * 1.18); c.scale(s * 1.18, s * 1.18);
  const p = poseFor(0); if (opts.dead) { p.crack = 1; p.eye = 'closed'; } if (opts.eye) p.eye = opts.eye; p.hl = 0.2;
  drawGlim(c, cos, p); const url = cv.toDataURL(); portraitCache.set(key, url); return url;
}
