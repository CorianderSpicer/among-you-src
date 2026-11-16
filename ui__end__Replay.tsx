// Match replay viewer: re-renders the recorded frames (every 0.25 s) on the baked map with a timeline and event log.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from './store__game';
import { useApp } from './store__app';
import { rt, getMap } from './game__runtime';
import { bakedFor } from './game__scenes__WorldScene';
import { bakeMap } from './game__art__mapart';
import { drawGlim, poseFor } from './game__art__chars';
import { ROLE } from './game__roles__roles';
import { SAB_NAME } from './game__sim__sim';
import { Btn, Panel, ScreenHeader, Seg } from './ui__common__kit';

export function ReplayUI() {
  const stored = useGame(s => s.replay); const [file, setFile] = useState<any>(null); const R = file || stored; const go = useApp(s => s.go); const end = useGame(s => s.end);
  const back = () => go(end ? 'game' : 'menu');
  if (!R) return <div className="pe absolute inset-0 grid place-items-center"><Panel title="Replay"><div className="mb-3 text-mist">{end ? 'Fetching the replay from the host…' : 'Load a replay file (.json) to watch it.'}</div><input type="file" accept=".json" onChange={async e => { const f = e.target.files?.[0]; if (f) setFile(JSON.parse(await f.text())); }} /><div className="mt-3"><Btn onClick={back}>Back</Btn></div></Panel></div>;
  return <Viewer R={R} back={back} />;
}
function Viewer({ R, back }: { R: any; back: () => void }) {
  const m = useMemo(() => getMap(R.map), [R.map]); const frames: number[][] = R.frames; const T = frames.length ? frames[frames.length - 1][0] : 0; const t0 = frames[0]?.[0] || 0;
  const [t, setT] = useState(t0); const [play, setPlay] = useState(true); const [speed, setSpeed] = useState(2); const [follow, setFollow] = useState<number>(-1); const ref = useRef<HTMLCanvasElement>(null); const img = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => { const b = bakedFor(m.id); const g = (window as any).__game; const c = document.createElement('canvas'); const sc = 0.6; c.width = m.W * sc; c.height = m.H * sc; const x = c.getContext('2d')!; x.fillStyle = '#060914'; x.fillRect(0, 0, c.width, c.height);
    if (b && g) { for (const k of b.keys) if (g.textures.exists(k.k)) x.drawImage(g.textures.get(k.k).getSourceImage(), k.x * sc, k.y * sc, k.w / b.scale * sc, k.h / b.scale * sc); } else { const bk = bakeMap(m, 'low'); x.drawImage(bk.canvas, 0, 0, c.width, c.height); } img.current = c; }, [m.id]);
  useEffect(() => { if (!play) return; let last = performance.now(); let raf = 0; const loop = (n: number) => { const dt = (n - last) / 1000; last = n; setT(x => { const y = x + dt * speed; if (y >= T) { setPlay(false); return T; } return y; }); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf); }, [play, speed, T]);
  const roster = R.roster as any[]; const events = (R.events as any[]).filter(e => ['death', 'eject', 'meeting', 'sab', 'fixed', 'clean', 'extract', 'end', 'block', 'revive'].includes(e.k));
  useEffect(() => { const c = ref.current!; const W = c.clientWidth, H = c.clientHeight; const dpr = Math.min(2, devicePixelRatio || 1); c.width = W * dpr; c.height = H * dpr; const x = c.getContext('2d')!;
    let i = 0; while (i < frames.length - 1 && frames[i + 1][0] <= t) i++; const a = frames[i], b = frames[Math.min(frames.length - 1, i + 1)]; const k = b[0] > a[0] ? Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0]))) : 0;
    const pos = roster.map((r, j) => { const ax = a[1 + j * 3], ay = a[2 + j * 3], fl = a[3 + j * 3], bx = b[1 + j * 3], by = b[2 + j * 3]; return { r, x: ax + (bx - ax) * k, y: ay + (by - ay) * k, fl }; });
    let cx = m.W / 2, cy = m.H / 2, z = Math.min(W / m.W, H / m.H); if (follow >= 0 && pos[follow]) { cx = pos[follow].x; cy = pos[follow].y; z = Math.min(W, H) / 900; }
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#04060e'; x.fillRect(0, 0, W, H); x.translate(W / 2, H / 2); x.scale(z, z); x.translate(-cx, -cy); if (img.current) x.drawImage(img.current, 0, 0, m.W, m.H);
    // bodies from events: deaths visible until next meeting
    const lastMeeting = Math.max(-1, ...events.filter(e => e.k === 'meeting' && e.t <= t).map(e => e.t));
    pos.sort((p, q) => p.y - q.y).forEach(p => { const alive = p.fl & 1, ghost = p.fl & 2, vent = p.fl & 4, flip = p.fl & 8, mov = p.fl & 16; if (vent || (p.fl & 32)) return; x.save(); x.translate(p.x, p.y); if (flip) x.scale(-1, 1); x.globalAlpha = ghost ? 0.45 : 1; const fr = ghost ? 43 + Math.floor(t * 5) % 4 : mov ? 6 + Math.floor(t * 12) % 8 : Math.floor(t * 6) % 6; drawGlim(x, p.r.cos, poseFor(fr)); x.restore();
      x.font = '700 13px "Exo 2"'; x.textAlign = 'center'; x.lineWidth = 4; x.strokeStyle = '#060914'; x.fillStyle = p.r.faction === 'infiltrator' ? '#ff8b95' : '#fff'; x.globalAlpha = ghost ? 0.5 : 1; x.strokeText(p.r.name, p.x, p.y - 66); x.fillText(p.r.name, p.x, p.y - 66); x.globalAlpha = 1; });
    events.filter(e => e.k === 'death' && e.t <= t && e.t > lastMeeting && e.cause !== 'vote').forEach(e => { const j = roster.findIndex((r: any) => r.s === e.v); const f = frames.find(fr => fr[0] >= e.t); if (!f || j < 0) return; x.save(); x.translate(f[1 + j * 3], f[2 + j * 3]); drawGlim(x, roster[j].cos, poseFor(42)); x.restore(); });
  }, [t, follow]);
  const name = (s: number) => roster.find((r: any) => r.s === s)?.name || '?'; const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const label = (e: any) => e.k === 'death' ? `${name(e.v)} ${e.cause === 'guess' ? 'died to a guess' : 'was eliminated'}${e.by !== null && e.by !== undefined ? ' by ' + name(e.by) : ''}` : e.k === 'eject' ? `${name(e.v)} was ejected` : e.k === 'meeting' ? `${name(e.caller)} called a ${e.kind === 'report' ? 'body report' : 'meeting'}` : e.k === 'sab' ? `${name(e.by)} sabotaged: ${SAB_NAME[e.id as keyof typeof SAB_NAME]}` : e.k === 'fixed' ? `${SAB_NAME[e.id as keyof typeof SAB_NAME]} repaired` : e.k === 'clean' ? `${name(e.by)} cleaned ${name(e.v)}'s body` : e.k === 'extract' ? `${name(e.s)} extracted with the relics` : e.k === 'block' ? `${name(e.by)} blocked an attack on ${name(e.v)}` : e.k === 'revive' ? `${name(e.by)} revived ${name(e.v)}` : `Game over — ${e.winner} win`;
  return (
    <div className="pe absolute inset-0 flex flex-col gap-3 p-3 lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2"><Btn size="sm" onClick={back}>‹ Back</Btn><span className="h-display text-xl">Replay · {m.name}</span><span className="text-mist">{R.winner ? `${R.winner.winner} victory — ${R.winner.reason}` : ''}</span></div>
        <canvas ref={ref} className="min-h-[300px] w-full flex-1 rounded-xl border border-edge/60" data-testid="replay-canvas" />
        <div className="glass-dark flex flex-wrap items-center gap-3 px-3 py-2"><Btn size="sm" variant="primary" onClick={() => { if (t >= T) setT(t0); setPlay(p => !p); }}>{play ? 'Pause' : 'Play'}</Btn>
          <input type="range" min={t0} max={T} step={0.1} value={t} onChange={e => { setT(+e.target.value); }} className="ay-range min-w-[160px] flex-1" /><span className="font-display tabular-nums text-cyan">{fmt(t - t0)} / {fmt(T - t0)}</span>
          <Seg value={speed} onChange={setSpeed} options={[{ v: 1, l: '1×' }, { v: 2, l: '2×' }, { v: 4, l: '4×' }, { v: 8, l: '8×' }]} />
          <select className="field py-1.5" value={follow} onChange={e => setFollow(+e.target.value)}><option value={-1}>Whole map</option>{roster.map((r: any, i: number) => <option key={r.s} value={i}>Follow {r.name} ({ROLE[r.role]?.name})</option>)}</select></div>
      </div>
      <Panel title="Timeline" className="max-h-[40vh] w-full overflow-y-auto lg:max-h-none lg:w-[340px]">{events.map((e, i) => <button key={i} onClick={() => { setT(Math.max(t0, e.t - 2)); setPlay(false); }} className={`block w-full rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-cyan/10 ${e.t <= t ? 'text-ink' : 'text-mist/60'}`}><span className="mr-2 font-display text-cyan">{fmt(e.t - t0)}</span>{label(e)}</button>)}</Panel>
    </div>
  );
}
