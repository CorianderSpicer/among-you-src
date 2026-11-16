import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from './store__game';
import { rt } from './game__runtime';
import { Minimap } from './ui__hud__Minimap';
import { SAB_NAME, CRITICAL } from './game__sim__sim';
import { COLORS, TILE } from './game__core__constants';
import { bakedFor } from './game__scenes__WorldScene';
import { drawGlim, poseFor } from './game__art__chars';
import { Btn } from './ui__common__kit';
import { ChatPanel } from './ui__hud__Overlays';
import { sfx } from './game__audio__audio';
import type { SabotageId } from './game__core__types';

const SAB_ICON: Record<SabotageId, string> = { reactor: '☢', oxygen: 'O₂', comms: '📡', security: '◫', doors: '▮▮', gravity: '⇵', lifesupport: '♨', power: '⚡', flood: '≋', pressure: '◎' };
export function Panels() {
  const panel = useGame(s => s.panel); const set = useGame(s => s.set); const close = () => { if (panel === 'cams') rt.act({ k: 'cams', on: false }); if (panel === 'admin') rt.act({ k: 'admin', on: false }); set({ panel: null }); sfx('close'); };
  return <AnimatePresence>{panel && panel !== 'tasks' && <motion.div key={panel} className="pe fixed inset-0 z-40 grid place-items-center bg-[#02040c]/70 p-3 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
    <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} className="glass brackets relative max-h-[94vh] max-w-[96vw] overflow-auto p-4">
      <button onClick={close} className="absolute right-3 top-2 z-10 text-xl text-mist hover:text-ink" data-testid="panel-close">✕</button>
      {panel === 'map' && <MapPanel />}{panel === 'sabotage' && <SabPanel />}{panel === 'cams' && <CamsPanel />}{panel === 'admin' && <AdminPanel />}{panel === 'logs' && <LogsPanel />}{panel === 'audit' && <AuditPanel />}{panel === 'chat' && <div className="h-[60vh] w-[min(420px,88vw)]"><div className="label mb-2">Chat</div><ChatPanel className="h-[calc(100%-24px)]" /></div>}
    </motion.div></motion.div>}</AnimatePresence>;
}
const mapSize = () => Math.min(innerWidth - 80, (innerHeight - 140) * 1.5, 980);
function MapPanel() { return <div><div className="label mb-2">{rt.map.name} — map</div><Minimap size={mapSize()} /><div className="mt-2 flex gap-4 text-[12px] text-mist"><span><b className="text-[#ffd23f]">●</b> your tasks</span><span><b className="text-crimson">●</b> sabotage</span><span><b className="text-lime">▲</b> crew beacons</span></div></div>; }
function SabPanel() {
  const v = useGame(s => s.view)!; const sabs = rt.map.spec.sabotages.filter(s => s !== 'doors'); const cd = v.me.scd; const busy = !!v.sab;
  return (
    <div>
      <div className="label mb-2 text-amber">Sabotage {cd > 0 ? `· ready in ${Math.ceil(cd)} s` : busy ? '· a sabotage is active' : ''}</div>
      <div className="mb-3 flex flex-wrap gap-2">{sabs.map(id => <Btn key={id} testid={'sab-' + id} variant={CRITICAL[id] ? 'danger' : 'amber'} size="sm" disabled={cd > 0 || busy} onClick={() => { rt.act({ k: 'sab', id }); useGame.getState().set({ panel: null }); }}><span className="font-body">{SAB_ICON[id]}</span>{SAB_NAME[id]}</Btn>)}</div>
      {rt.map.spec.sabotages.includes('doors') && <div className="label mb-1">Door lockdown — click a room</div>}
      <Minimap size={mapSize() * 0.9} mode="sabotage" onRoom={rt.map.spec.sabotages.includes('doors') ? (room) => { if (rt.map.doors.some(d => d.room === room)) { rt.act({ k: 'sab', id: 'doors', room }); sfx('door'); } } : undefined} roomBadge={room => rt.map.doors.some(d => d.room === room) && rt.map.spec.sabotages.includes('doors') ? <span className="mt-0.5 rounded bg-amber/80 px-1 text-[9px] font-bold text-black">LOCK</span> : null} />
    </div>
  );
}
function AdminPanel() { const v = useGame(s => s.view)!; return <div><div className="label mb-2">Admin map — live crew locations {v.admin ? '' : '(offline)'}</div><Minimap size={mapSize()} mode="admin" /></div>; }
function LogsPanel() { const logs = useGame(s => s.logs) || []; return <div className="w-[min(520px,88vw)]"><div className="label mb-2">Access log — last 60 s</div>{!logs.length && <div className="text-mist">No entries.</div>}
  <div className="scroll-y max-h-[60vh] space-y-1">{logs.map((l, i) => <div key={i} className="flex items-center gap-3 rounded-lg bg-void/60 px-3 py-1.5 text-[13.5px]"><span className="h-3.5 w-3.5 rounded-full border border-white/40" style={{ background: COLORS[l.c].base }} /><span className="font-semibold">{COLORS[l.c].name}</span><span className="text-mist">entered</span><span>{l.room}</span><span className="ml-auto font-display text-mist">{l.t}s ago</span></div>)}</div></div>; }
function AuditPanel() { const pick = (sys: string) => { rt.act({ k: 'ability', sys }); useGame.getState().set({ panel: null }); }; return <div className="w-[min(420px,88vw)]"><div className="label mb-3">Audit a system</div><div className="grid grid-cols-2 gap-2">{[['vents', 'Vent network'], ['sabotage', 'Sabotage panels'], ['cams', 'Camera grid'], ['admin', 'Admin map']].map(([k, l]) => <Btn key={k} onClick={() => pick(k)}>{l}</Btn>)}</div></div>; }

/** Live security camera grid: renders the host's camera feed (players near each camera) on little canvases. */
function CamsPanel() {
  const v = useGame(s => s.view)!; const ref = useRef<HTMLCanvasElement>(null); const cams = rt.map.cams; const W = Math.min(innerWidth - 80, 920), H = Math.min(innerHeight - 150, 560);
  useEffect(() => { let raf = 0; const c = ref.current!; const dpr = Math.min(2, devicePixelRatio || 1); c.width = W * dpr; c.height = H * dpr; const x = c.getContext('2d')!; const base = document.createElement('canvas');
    // static map snapshot for camera backgrounds
    const sc = 0.5; base.width = rt.map.W * sc; base.height = rt.map.H * sc; const bx = base.getContext('2d')!; const g = (window as any).__game; const bk = bakedFor(rt.map.id);
    if (bk) for (const k of bk.keys) { if (!g.textures.exists(k.k)) continue; const src = g.textures.get(k.k).getSourceImage(); bx.drawImage(src, k.x * sc, k.y * sc, k.w / bk.scale * sc, k.h / bk.scale * sc); }
    const draw = (now: number) => { const vv = rt.view; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#04060e'; x.fillRect(0, 0, W, H); const cols = 2, rows = Math.ceil(cams.length / 2); const cw = W / cols - 6, ch = H / rows - 6;
      cams.forEach((cam, i) => { const ox = (i % cols) * (cw + 6) + 3, oy = Math.floor(i / cols) * (ch + 6) + 3; const span = 9 * TILE; const s = Math.min(cw, ch) / span;
        x.save(); x.beginPath(); x.rect(ox, oy, cw, ch); x.clip(); x.fillStyle = '#0a0f1e'; x.fillRect(ox, oy, cw, ch);
        x.translate(ox + cw / 2, oy + ch / 2); x.scale(s, s); x.translate(-cam.x, -cam.y);
        x.drawImage(base, 0, 0, base.width, base.height, 0, 0, rt.map.W, rt.map.H);
        const off = !vv?.cams; if (!off) for (const p of vv!.cams!) { const cos = rt.roster[p.cos ?? p.s]?.cos; if (!cos) continue; x.save(); x.translate(p.x, p.y); if (p.f < 0) x.scale(-1, 1); const pose = poseFor(p.al ? (p.a === 'idle' ? Math.floor(now / 160) % 6 : 6 + Math.floor(now / 80) % 8) : 42); drawGlim(x, cos, pose); x.restore(); }
        x.restore();
        x.fillStyle = 'rgba(140,255,200,0.05)'; for (let yy = oy; yy < oy + ch; yy += 3) x.fillRect(ox, yy, cw, 1);
        if (off) { for (let k = 0; k < 400; k++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.4})`; x.fillRect(ox + Math.random() * cw, oy + Math.random() * ch, 2, 2); } }
        x.strokeStyle = 'rgba(63,240,224,0.5)'; x.lineWidth = 1.5; x.strokeRect(ox, oy, cw, ch); x.fillStyle = '#e8eeff'; x.font = '600 12px "Chakra Petch"'; x.fillText(cam.name.toUpperCase(), ox + 8, oy + 18);
        if (Math.floor(now / 600) % 2) { x.fillStyle = '#ff4d6d'; x.beginPath(); x.arc(ox + cw - 14, oy + 14, 5, 0, 6.3); x.fill(); } });
      raf = requestAnimationFrame(draw); };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf); }, []);
  return <div><div className="label mb-2">Security cameras {v.me.role === 'security' && v.me.battery !== undefined ? `· battery ${Math.max(0, v.me.battery).toFixed(0)} s` : ''}</div><canvas ref={ref} style={{ width: W, height: H }} className="rounded-lg" /></div>;
}
