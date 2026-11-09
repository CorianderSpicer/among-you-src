import React, { useEffect, useRef } from 'react';
import type { MapData } from './game__maps__builder';
import { THEMES } from './game__art__themes';
import { rt } from './game__runtime';
import { useGame } from './store__game';
import { COLORS, TILE } from './game__core__constants';

const baseCache = new Map<string, HTMLCanvasElement>();
function base(m: MapData, px: number) {
  const k = m.id + px; const hit = baseCache.get(k); if (hit) return hit; const th = THEMES[m.theme] || THEMES.orbital;
  const c = document.createElement('canvas'); c.width = m.w * px; c.height = m.h * px; const x = c.getContext('2d')!;
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) { const g = m.grid[ty * m.w + tx]; if (g === 1) { x.fillStyle = m.roomAt[ty * m.w + tx] >= 0 ? 'rgba(120,150,230,0.38)' : 'rgba(120,150,230,0.2)'; x.fillRect(tx * px, ty * px, px, px); } else if (g === 2) { x.fillStyle = 'rgba(160,190,255,0.55)'; x.fillRect(tx * px, ty * px, px, px); } }
  x.strokeStyle = th.accent; x.globalAlpha = 0.5; x.lineWidth = 1; for (const r of m.rooms) x.strokeRect(r.x / TILE * px + 0.5, r.y / TILE * px + 0.5, r.w / TILE * px - 1, r.h / TILE * px - 1); x.globalAlpha = 1;
  baseCache.set(k, c); return c;
}

export interface MinimapProps { size: number; labels?: boolean; mode?: 'hud' | 'map' | 'sabotage' | 'admin'; onRoom?: (room: string) => void; roomBadge?: (room: string) => React.ReactNode; className?: string }
export function Minimap({ size, labels = true, mode = 'hud', onRoom, roomBadge, className = '' }: MinimapProps) {
  const m = rt.map; const ref = useRef<HTMLCanvasElement>(null); const view = useGame(s => s.view);
  const px = 4; const W = m.w * px, H = m.h * px; const scale = size / Math.max(W, H); const cw = W * scale, ch = H * scale;
  useEffect(() => { let raf = 0; const c = ref.current!; const dpr = Math.min(2, devicePixelRatio || 1); c.width = cw * dpr; c.height = ch * dpr; const x = c.getContext('2d')!;
    const draw = (now: number) => { const v = rt.view; x.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0); x.clearRect(0, 0, W, H); x.drawImage(base(m, px), 0, 0); const comms = v?.sab?.id === 'comms' || v?.sab?.extra === 'comms';
      const P = (wx: number, wy: number) => [wx / TILE * px, wy / TILE * px];
      if (v && v.ph === 'play' && !comms) {
        for (const t of v.me.tasks) { if (t.done) continue; const sp = m.byId[t.steps[t.step]]; if (!sp) continue; const [a, b] = P(sp.x, sp.y); x.fillStyle = v.me.fake ? 'rgba(160,170,200,0.7)' : '#ffd23f'; x.beginPath(); x.arc(a, b - 3, 3.2, 0, 6.3); x.fill(); }
        for (const tr of v.traces) { const [a, b] = P(tr.x, tr.y); if (tr.k === 'marker') { x.fillStyle = '#8dff7a'; x.beginPath(); x.moveTo(a, b - 8); x.lineTo(a + 4, b - 2); x.lineTo(a - 4, b - 2); x.fill(); } if (tr.k === 'dark') { x.fillStyle = 'rgba(0,0,0,0.6)'; x.beginPath(); x.arc(a, b, (tr.r || 100) / TILE * px, 0, 6.3); x.fill(); } if (tr.k === 'beacon') { x.strokeStyle = '#ffe08a'; x.lineWidth = 2; x.beginPath(); x.arc(a, b, 6, 0, 6.3); x.stroke(); } }
        if (v.me.track) { const [a, b] = P(v.me.track.x, v.me.track.y); x.strokeStyle = '#9be14a'; x.lineWidth = 2; x.beginPath(); x.arc(a, b, 5 + Math.sin(now / 150) * 2, 0, 6.3); x.stroke(); }
      }
      if (v?.sab) for (const id of v.sab.spots) { if (v.sab.done.includes(id)) continue; const sp = m.byId[id]; const [a, b] = P(sp.x, sp.y); x.fillStyle = Math.sin(now / 160) > 0 ? '#ff4d6d' : '#ffb547'; x.beginPath(); x.arc(a, b - 3, 4.5, 0, 6.3); x.fill(); }
      if (v?.doors.length) { x.fillStyle = '#ff4d6d'; for (const d of m.doors) if (v.doors.includes(d.id)) { const [a, b] = P(d.x, d.y); x.fillRect(a, b, d.w / TILE * px, d.h / TILE * px); } }
      if (mode === 'admin' && v?.admin) for (const [rid, n] of Object.entries(v.admin)) { const r = m.roomById[rid]; if (!r) continue; const [a, b] = P(r.cx, r.cy); for (let i = 0; i < n; i++) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(a - (n - 1) * 4 + i * 8, b + 8, 3.2, 0, 6.3); x.fill(); } }
      // me
      if (v && !(mode === 'sabotage')) { const [a, b] = P(rt.me.x, rt.me.y); const col = COLORS[rt.roster[rt.slot]?.cos.color ?? 0]; x.fillStyle = col.base; x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.beginPath(); x.arc(a, b - 2, 4.5 + Math.sin(now / 200), 0, 6.3); x.fill(); x.stroke(); }
      if (comms && mode !== 'sabotage') { for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`; x.fillRect(Math.random() * W, Math.random() * H, 3, 1.5); } }
      raf = requestAnimationFrame(draw); };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf); }, [m.id, size, mode]);
  return (
    <div className={`relative ${className}`} style={{ width: cw, height: ch }}>
      <canvas ref={ref} style={{ width: cw, height: ch }} />
      {labels && m.rooms.map(r => (
        <div key={r.id} onClick={onRoom ? () => onRoom(r.id) : undefined} className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center ${onRoom ? 'pe cursor-pointer' : 'pointer-events-none'}`} style={{ left: r.cx / TILE * px * scale, top: r.cy / TILE * px * scale }}>
          <span className={`whitespace-nowrap rounded px-1 font-display font-semibold uppercase tracking-wider text-ink/85 ${size > 400 ? 'text-[11px]' : 'text-[8.5px]'}`} style={{ textShadow: '0 1px 3px #000' }}>{r.name}</span>
          {roomBadge?.(r.id)}
        </div>))}
    </div>
  );
}
