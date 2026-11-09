// Space backdrops: star fields, nebulae, planets, ships — Canvas2D, used by the menu and as the outside of maps.
export const rnd = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const cv = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export function starfield(w: number, h: number, n: number, seed: number, maxR = 1.6, tint = ['#ffffff', '#cfe3ff', '#ffe9c9', '#c9fff6']) {
  const c = cv(w, h), x = c.getContext('2d')!, r = rnd(seed);
  for (let i = 0; i < n; i++) { const px = r() * w, py = r() * h, s = Math.pow(r(), 3) * maxR + 0.3, a = 0.35 + r() * 0.65; x.globalAlpha = a; x.fillStyle = tint[Math.floor(r() * tint.length)];
    x.beginPath(); x.arc(px, py, s, 0, Math.PI * 2); x.fill(); if (s > 1.2) { x.globalAlpha = a * 0.25; x.beginPath(); x.arc(px, py, s * 3.5, 0, Math.PI * 2); x.fill(); x.globalAlpha = a * 0.5; x.fillRect(px - s * 4, py - 0.4, s * 8, 0.8); x.fillRect(px - 0.4, py - s * 4, 0.8, s * 8); } }
  return c;
}
export function nebula(w: number, h: number, seed: number, cols: string[]) {
  const c = cv(w, h), x = c.getContext('2d')!, r = rnd(seed); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) { const px = r() * w, py = r() * h, rad = (0.15 + r() * 0.35) * Math.max(w, h), col = cols[i % cols.length];
    const g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, col + '30'); g.addColorStop(0.5, col + '12'); g.addColorStop(1, col + '00'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
  x.globalCompositeOperation = 'destination-in'; const m = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.5); m.addColorStop(0, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = m; x.fillRect(0, 0, w, h);
  return c;
}
/** Shaded planet with optional rings & clouds. */
export function planet(size: number, opts: { base: string; dark: string; light: string; atmo: string; ring?: string; bands?: boolean; seed?: number; craters?: boolean; ice?: boolean }) {
  const pad = opts.ring ? size * 0.9 : size * 0.25, W = size + pad * 2, c = cv(W, opts.ring ? Math.round(size * 1.3) + pad : W), x = c.getContext('2d')!, R = size / 2, cx = W / 2, cy = c.height / 2; const r = rnd(opts.seed || 7);
  const ring = (front: boolean) => { if (!opts.ring) return; x.save(); x.translate(cx, cy); x.rotate(-0.32); x.scale(1, 0.28); for (let i = 0; i < 18; i++) { const rr = R * (1.35 + i * 0.045); x.strokeStyle = opts.ring; x.globalAlpha = 0.1 + (i % 3) * 0.12; x.lineWidth = R * 0.04; x.beginPath(); x.arc(0, 0, rr, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); x.stroke(); } x.restore(); };
  ring(false);
  const ag = x.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.35); ag.addColorStop(0, opts.atmo + 'aa'); ag.addColorStop(1, opts.atmo + '00'); x.fillStyle = ag; x.beginPath(); x.arc(cx, cy, R * 1.35, 0, Math.PI * 2); x.fill();
  x.save(); x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.clip();
  const g = x.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.1, cx, cy, R * 1.05); g.addColorStop(0, opts.light); g.addColorStop(0.55, opts.base); g.addColorStop(1, opts.dark); x.fillStyle = g; x.fillRect(cx - R, cy - R, size, size);
  if (opts.bands) for (let i = 0; i < 14; i++) { x.globalAlpha = 0.12 + r() * 0.18; x.fillStyle = r() > 0.5 ? opts.light : opts.dark; const y = cy - R + r() * size; x.beginPath(); x.ellipse(cx, y, R * 1.2, R * (0.02 + r() * 0.06), 0.05, 0, Math.PI * 2); x.fill(); }
  if (opts.craters) for (let i = 0; i < 22; i++) { const a = r() * 6.28, d = r() * R * 0.9, s = R * (0.03 + r() * 0.09); x.globalAlpha = 0.25; x.fillStyle = opts.dark; x.beginPath(); x.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, 0, 6.28); x.fill(); x.globalAlpha = 0.18; x.fillStyle = opts.light; x.beginPath(); x.arc(cx + Math.cos(a) * d - s * 0.25, cy + Math.sin(a) * d - s * 0.25, s * 0.7, 0, 6.28); x.fill(); }
  if (opts.ice) { x.globalAlpha = 0.7; x.fillStyle = '#f4fbff'; x.beginPath(); x.ellipse(cx, cy - R * 0.92, R * 0.7, R * 0.22, 0, 0, 6.28); x.fill(); }
  x.globalAlpha = 1; const sh = x.createLinearGradient(cx - R, cy - R, cx + R, cy + R); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.55, 'rgba(0,0,0,0.05)'); sh.addColorStop(1, 'rgba(0,0,10,0.75)'); x.fillStyle = sh; x.fillRect(cx - R, cy - R, size, size);
  x.restore(); ring(true);
  return c;
}
/** A long side-view starship silhouette with lit windows (menu flyby). */
export function ship(w: number, h: number) {
  const c = cv(w, h), x = c.getContext('2d')!; const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a3866'); g.addColorStop(0.5, '#18213f'); g.addColorStop(1, '#0d1330');
  x.fillStyle = g; x.strokeStyle = 'rgba(120,160,255,0.35)'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(w * 0.02, h * 0.55); x.quadraticCurveTo(w * 0.06, h * 0.2, w * 0.22, h * 0.18); x.lineTo(w * 0.7, h * 0.12); x.quadraticCurveTo(w * 0.93, h * 0.15, w * 0.99, h * 0.5); x.quadraticCurveTo(w * 0.93, h * 0.85, w * 0.7, h * 0.86); x.lineTo(w * 0.22, h * 0.84); x.quadraticCurveTo(w * 0.06, h * 0.82, w * 0.02, h * 0.55); x.fill(); x.stroke();
  x.fillStyle = '#1f2a52'; x.fillRect(w * 0.3, h * 0.02, w * 0.18, h * 0.16); x.fillRect(w * 0.55, h * 0.86, w * 0.14, h * 0.12);
  for (let i = 0; i < 46; i++) { const wx = w * (0.15 + (i % 23) * 0.033), wy = h * (i < 23 ? 0.36 : 0.56); x.fillStyle = Math.random() > 0.25 ? '#ffd98a' : '#5affea'; x.globalAlpha = 0.65 + Math.random() * 0.35; x.fillRect(wx, wy, w * 0.012, h * 0.06); }
  x.globalAlpha = 1; const e = x.createRadialGradient(w * 0.02, h * 0.55, 1, w * 0.02, h * 0.55, h * 0.4); e.addColorStop(0, '#bff9ff'); e.addColorStop(0.3, '#3ff0e0aa'); e.addColorStop(1, '#3ff0e000'); x.fillStyle = e; x.fillRect(0, 0, w * 0.2, h);
  x.fillStyle = '#ff4d6d'; x.beginPath(); x.arc(w * 0.985, h * 0.5, 3, 0, 6.28); x.fill();
  return c;
}
export function softDot(size: number, color = '#ffffff') { const c = cv(size, size), x = c.getContext('2d')!; const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); g.addColorStop(0, color); g.addColorStop(0.35, color + 'aa'); g.addColorStop(1, color + '00'); x.fillStyle = g; x.fillRect(0, 0, size, size); return c; }
