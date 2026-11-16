// Minigame host + games 1–15. Every game is its own interactive mechanic (pointer/touch friendly).
import { useSticky } from './ui__common__sticky';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from './store__game';
import { rt } from './game__runtime';
import { GAMES } from './game__tasks__tasks';
import { SAB_NAME } from './game__sim__sim';
import { sfx } from './game__audio__audio';
import { GP, R, shuffle, Screen, Pad, HoldPad, useRaf, useOnce } from './ui__tasks__mgkit';

const SAB_GAME_TITLE: Record<string, string> = { handscan: 'Reactor scanners', keypad: 'Oxygen keypad', switches: 'Power switches', reboot: 'Security reboot', valve: 'Pump valve' };

export function MinigameHost() {
  const mg = useSticky(useGame(s => s.minigame))!; const set = useGame(s => s.set); const [ok, setOk] = useState(false); const role = useGame(s => s.view?.me.role);
  const Comp = (ALL as any)[mg.game] || ALL.wires;
  const close = () => { if (mg.game === 'handscan') rt.act({ k: 'hold', spot: mg.spot, on: false }); set({ minigame: null }); };
  const done = () => { if (ok) return; setOk(true); sfx(mg.kind === 'task' ? 'task_step' : 'fixed'); if (mg.kind === 'task') rt.act({ k: 'task_done', spot: mg.spot }); else rt.act({ k: 'fix', spot: mg.spot }); setTimeout(close, 900); };
  const title = mg.kind === 'fix' ? (SAB_GAME_TITLE[mg.game] || GAMES[mg.game]?.name) + ' · ' + SAB_NAME[mg.sab as keyof typeof SAB_NAME] : GAMES[mg.game]?.name;
  return (
    <motion.div className="pe fixed inset-0 z-[45] grid place-items-center bg-[#02040c]/75 p-3 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }} className="relative w-[min(560px,96vw)] rounded-[22px] border-2 border-[#4a5a94] bg-gradient-to-b from-[#2a3766] to-[#141c3a] p-3 shadow-panel" data-testid="minigame">
        <div className="mb-2 flex items-center justify-between px-1"><div><div className={`label ${mg.kind === 'fix' ? 'text-crimson' : 'text-cyan'}`}>{mg.kind === 'fix' ? 'Emergency repair' : 'Task'}</div><div className="h-display text-[18px] text-ink">{title}</div></div>
          <button onClick={close} className="grid h-11 w-11 place-items-center rounded-lg border border-edge bg-void/60 text-mist hover:text-ink" data-testid="mg-close">✕</button></div>
        <div className="mb-2 px-1 text-[12.5px] text-mist">{GAMES[mg.game]?.hint || ({ handscan: 'Hold your hand on the scanner. Someone else must hold the other one at the same time.', keypad: 'Enter the code from the note.', switches: 'Flip every switch up.', reboot: 'Press the buttons in the order shown, then hold Reboot.', valve: 'Turn the valve two full rotations.' } as any)[mg.game]}{mg.kind === 'fix' && role === 'technician' ? ' · Technician: half-solved for you.' : ''}</div>
        <div className="relative"><Comp done={done} spot={mg.spot} kind={mg.kind} assist={role === 'technician' && mg.kind === 'fix'} />
          <AnimatePresence>{ok && <motion.div initial={{ opacity: 0, scale: 1.4 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 grid place-items-center rounded-xl bg-[#04130f]/80"><div className="h-display text-4xl text-lime" style={{ textShadow: '0 0 30px #8dff7a' }}>{mg.kind === 'task' ? 'TASK COMPLETE' : 'REPAIRED'}</div></motion.div>}</AnimatePresence></div>
      </motion.div>
    </motion.div>
  );
}

// 1. Wire connection — drag from left plugs to matching right sockets
function Wires({ done }: GP) {
  const cols = ['#ff4d6d', '#ffd23f', '#55b6ff', '#d453e0']; const right = useMemo(() => shuffle([0, 1, 2, 3]), []); const [links, setLinks] = useState<Record<number, number>>({}); const [drag, setDrag] = useState<{ i: number; x: number; y: number } | null>(null); const svg = useRef<SVGSVGElement>(null);
  const pt = (e: React.PointerEvent) => { const r = svg.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 400, y: (e.clientY - r.top) / r.height * 280 }; };
  useEffect(() => { if (Object.keys(links).length === 4 && Object.entries(links).every(([a, b]) => +a === right[b])) done(); }, [links]);
  const Y = (i: number) => 40 + i * 64;
  return <Screen><svg ref={svg} viewBox="0 0 400 280" className="w-full touch-none" onPointerMove={e => drag && setDrag({ ...drag, ...pt(e) })} onPointerUp={e => { if (!drag) return; const p = pt(e); const j = [0, 1, 2, 3].find(k => Math.abs(p.y - Y(k)) < 26 && p.x > 320); if (j !== undefined && right[j] === drag.i) { setLinks(l => ({ ...l, [drag.i]: j })); sfx('task_step'); } else if (j !== undefined) sfx('task_fail'); setDrag(null); }}>
    <rect x="20" y="10" width="40" height="260" rx="8" fill="#2a3150" /><rect x="340" y="10" width="40" height="260" rx="8" fill="#2a3150" />
    {[0, 1, 2, 3].map(i => <g key={i}><rect x="40" y={Y(i) - 10} width="34" height="20" rx="5" fill={cols[i]} onPointerDown={e => { (e.target as Element).setPointerCapture?.(e.pointerId); setDrag({ i, ...pt(e) }); }} style={{ cursor: 'grab' }} /><rect x="326" y={Y(i) - 10} width="34" height="20" rx="5" fill={cols[right[i]]} opacity={0.9} /><circle cx="330" cy={Y(i)} r="5" fill="#0a1020" /></g>)}
    {Object.entries(links).map(([a, b]) => <path key={a} d={`M74 ${Y(+a)} C 200 ${Y(+a)}, 200 ${Y(b)}, 326 ${Y(b)}`} stroke={cols[+a]} strokeWidth="9" fill="none" strokeLinecap="round" />)}
    {drag && <path d={`M74 ${Y(drag.i)} C ${(74 + drag.x) / 2} ${Y(drag.i)}, ${(74 + drag.x) / 2} ${drag.y}, ${drag.x} ${drag.y}`} stroke={cols[drag.i]} strokeWidth="9" fill="none" strokeLinecap="round" />}
  </svg></Screen>;
}
// 2. Reactor alignment — rotate rings until the slots line up
function ReactorAlign({ done }: GP) {
  const [rot, setRot] = useState(() => [1 + R(7), 1 + R(7), 1 + R(7)]); useEffect(() => { if (rot.every(r => r % 8 === 0)) done(); }, [rot]);
  return <Screen className="grid place-items-center py-4"><svg viewBox="-110 -110 220 220" className="w-[260px]">{[95, 70, 45].map((r, i) => <g key={i} transform={`rotate(${rot[i] * 45})`} onClick={() => { setRot(x => x.map((v, k) => k === i ? v + 1 : v)); sfx('toggle'); }} style={{ cursor: 'pointer', transition: 'transform .2s' }}>
    <circle r={r} fill="none" stroke={rot[i] % 8 === 0 ? '#8dff7a' : '#3ff0e0'} strokeWidth="16" strokeDasharray={`${2 * Math.PI * r - 30} 30`} strokeDashoffset={-(2 * Math.PI * r) * 0.75 + 15} opacity="0.85" /></g>)}
    <line x1="0" y1="-110" x2="0" y2="-20" stroke="#ffd23f" strokeWidth="2" strokeDasharray="4 4" /><circle r="16" fill="#ffb547" /></svg><div className="pb-1 text-[12px] text-mist">Click a ring to rotate it. Gaps must meet the yellow line.</div></Screen>;
}
// 3. Memory sequence
function Memory({ done }: GP) {
  const [seq] = useState(() => Array.from({ length: 5 }, () => R(9))); const [round, setRound] = useState(1); const [rep, setRep] = useState(0); const [show, setShow] = useState<number | null>(null); const [inp, setInp] = useState<number[]>([]); const [playing, setPlaying] = useState(true);
  useEffect(() => { setPlaying(true); setInp([]); let i = 0; const t = setInterval(() => { if (i >= round) { setShow(null); setPlaying(false); clearInterval(t); return; } setShow(seq[i]); sfx('countdown'); setTimeout(() => setShow(null), 380); i++; }, 600); return () => clearInterval(t); }, [round, rep]);
  const press = (k: number) => { if (playing) return; const n = [...inp, k]; if (seq[n.length - 1] !== k) { sfx('task_fail'); setRep(r => r + 1); return; } setInp(n); if (n.length === round) { if (round === 4) done(); else setTimeout(() => setRound(r => r + 1), 400); } };
  return <Screen className="flex items-center justify-around gap-4 p-5"><div className="grid grid-cols-3 gap-2">{Array.from({ length: 9 }, (_, i) => <div key={i} className={`h-14 w-14 rounded-lg transition-colors ${show === i ? 'bg-cyan shadow-glow' : 'bg-[#16204a]'}`} />)}</div>
    <div><div className="mb-2 text-center font-display text-mist">Round {round}/4</div><div className="grid grid-cols-3 gap-2">{Array.from({ length: 9 }, (_, i) => <Pad key={i} className="h-14 w-14" active={inp.length > 0 && inp[inp.length - 1] === i} onClick={() => press(i)} disabled={playing} />)}</div></div></Screen>;
}
// 4. Data transfer (download / upload)
function Transfer({ done, spot }: GP) {
  const up = spot.endsWith(':upload'); const [p, setP] = useState(-1); useEffect(() => { if (p < 0 || p >= 100) { if (p >= 100) done(); return; } const t = setTimeout(() => setP(x => Math.min(100, x + 2 + R(4))), 90); return () => clearTimeout(t); }, [p]);
  return <Screen className="p-6"><div className="flex items-center justify-between"><Folder label={up ? 'Your tablet' : 'Station core'} /><div className="relative h-16 flex-1">{p >= 0 && p < 100 && [0, 1, 2].map(i => <motion.div key={i} className="absolute top-4 h-6 w-5 rounded bg-cyan/80" animate={{ left: ['10%', '85%'], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.33 }} />)}</div><Folder label={up ? 'Command uplink' : 'Your tablet'} /></div>
    <div className="mt-4 h-4 overflow-hidden rounded-full bg-void"><div className="h-full rounded-full bg-gradient-to-r from-cyan to-lime transition-all" style={{ width: Math.max(0, p) + '%' }} /></div>
    <div className="mt-4 text-center">{p < 0 ? <Pad className="px-6 py-3" onClick={() => setP(0)}>{up ? 'Upload' : 'Download'}</Pad> : <span className="font-display text-cyan">{p}% · {up ? 'uploading' : 'downloading'}…</span>}</div></Screen>;
}
const Folder = ({ label }: { label: string }) => <div className="flex w-24 flex-col items-center gap-1"><svg viewBox="0 0 48 40" className="w-14"><path d="M2 8h16l4 4h24v26H2z" fill="#ffb547" /><path d="M2 14h44v24H2z" fill="#ffd27a" /></svg><span className="text-center text-[11px] text-mist">{label}</span></div>;
// 5. Power routing — rotate pipe tiles
function PowerRoute({ done }: GP) {
  const N = 4; const [grid, setGrid] = useState(() => { // build a path from (0,r0) to (N-1,r1)
    const g = Array.from({ length: N * N }, () => ({ t: R(2) ? 'I' : 'L', r: R(4), on: false })); let r = R(N); let c = 0; const path: [number, number][] = [[c, r]];
    while (c < N - 1) { if (R(2) && r > 0 && !path.some(p => p[0] === c && p[1] === r - 1)) r--; else if (R(2) && r < N - 1 && !path.some(p => p[0] === c && p[1] === r + 1)) r++; else c++; path.push([c, r]); }
    path.forEach(([x, y], i) => { const prev = i ? path[i - 1] : [x - 1, y], next = i < path.length - 1 ? path[i + 1] : [x + 1, y]; const straight = prev[0] === next[0] || prev[1] === next[1]; g[y * N + x].t = straight ? 'I' : 'L'; });
    (g as any).start = path[0][1]; (g as any).end = path[path.length - 1][1]; return g; });
  const conn = (t: string, r: number) => { const base = t === 'I' ? [0, 2] : [0, 1]; return base.map(d => (d + r) % 4); }; // 0=left,1=up,2=right,3=down
  const lit = useMemo(() => { const on = new Set<number>(); const sr = (grid as any).start; let x = 0, y = sr, from = 0; for (let k = 0; k < 40; k++) { if (x < 0 || y < 0 || x >= N || y >= N) break; const c = grid[y * N + x]; const cn = conn(c.t, c.r); if (!cn.includes(from)) break; on.add(y * N + x); const out = cn.find(d => d !== from)!; if (x === N - 1 && y === (grid as any).end && out === 2) { on.add(-1); break; } if (out === 0) x--; if (out === 2) x++; if (out === 1) y--; if (out === 3) y++; from = (out + 2) % 4; } return on; }, [grid]);
  useEffect(() => { if (lit.has(-1)) done(); }, [lit]);
  return <Screen className="flex items-center justify-center gap-2 p-5"><div className="h-6 w-6 rounded-full bg-amber shadow-[0_0_16px_#ffb547]" style={{ marginTop: (((grid as any).start) - 1.5) * 66 }} />
    <div className="grid grid-cols-4 gap-1.5">{grid.map((c, i) => <button key={i} onClick={() => { setGrid(g => { const n = g.slice() as any; n.start = (g as any).start; n.end = (g as any).end; n[i] = { ...g[i], r: (g[i].r + 1) % 4 }; return n; }); sfx('toggle'); }} className="h-16 w-16 rounded-lg bg-[#121a38]"><svg viewBox="-30 -30 60 60" style={{ transform: `rotate(${c.r * 90}deg)`, transition: 'transform .15s' }}>{c.t === 'I' ? <line x1="-30" y1="0" x2="30" y2="0" stroke={lit.has(i) ? '#ffd23f' : '#4a5a94'} strokeWidth="10" /> : <path d="M-30 0 H0 V-30" fill="none" stroke={lit.has(i) ? '#ffd23f' : '#4a5a94'} strokeWidth="10" />}</svg></button>)}</div>
    <div className={`h-6 w-6 rounded-full ${lit.has(-1) ? 'bg-lime shadow-[0_0_16px_#8dff7a]' : 'bg-[#2a3150]'}`} style={{ marginTop: (((grid as any).end) - 1.5) * 66 }} /></Screen>;
}
// 6. Frequency matching — two dials
function Frequency({ done, assist }: GP) {
  const [tf] = useState(() => 2 + R(5)); const [ta] = useState(() => 30 + R(40)); const [f, setF] = useState(assist ? tf - 1 : 1); const [a, setA] = useState(assist ? ta : 15); const okF = Math.abs(f - tf) < 0.25, okA = Math.abs(a - ta) < 4; const held = useRef(0);
  useEffect(() => { if (okF && okA) { held.current = window.setTimeout(done, 700); } return () => clearTimeout(held.current); }, [okF, okA]);
  const path = (fr: number, am: number) => Array.from({ length: 101 }, (_, i) => `${i ? 'L' : 'M'}${i * 4} ${100 - Math.sin(i / 100 * Math.PI * 2 * fr) * am}`).join(' ');
  return <Screen className="p-4"><svg viewBox="0 0 400 200" className="w-full"><path d={path(tf, ta)} stroke="#8dff7a" strokeOpacity="0.45" strokeWidth="6" fill="none" /><path d={path(f, a)} stroke={okF && okA ? '#8dff7a' : '#3ff0e0'} strokeWidth="2.5" fill="none" /></svg>
    <div className="mt-2 grid grid-cols-2 gap-4"><label className="text-[12px] text-mist">Frequency<input type="range" min={1} max={7} step={0.05} value={f} onChange={e => setF(+e.target.value)} className="ay-range w-full" /></label><label className="text-[12px] text-mist">Amplitude<input type="range" min={5} max={90} value={a} onChange={e => setA(+e.target.value)} className="ay-range w-full" /></label></div></Screen>;
}
// 7. Oxygen calibration — keep all three gauges in the green band
function OxygenCalib({ done }: GP) {
  // Rebuilt for touch. Was: 36px buttons, +-7 per discrete tap, three needles drifting on a 60ms
  // interval through CSS transitions, and a green band only 20 wide — unplayable with a thumb on an
  // iPad, and the repeat could stick on if the finger slid off a button.
  const fire = useOnce(done);
  const vals = useRef([20, 80, 50]);
  const drift = useRef([0.5 + Math.random(), -(0.5 + Math.random()), 0.8]);
  const held = useRef([0, 0, 0]);          // -1/0/+1 per gauge, set by the hold pads
  const stable = useRef(0);
  const [, tick] = useState(0);            // one repaint per frame, not three per state write
  const LO = 52, HI = 78, NEED = 1.3;      // a little wider and a little shorter than before

  useRaf(dt => {
    const v = vals.current;
    for (let i = 0; i < 3; i++) {
      const d = drift.current[i] * Math.sin(performance.now() / 900 + i) * 26 * dt; // drift, now time-based
      v[i] = Math.max(0, Math.min(100, v[i] + d + held.current[i] * 62 * dt));      // and holding is smooth
    }
    stable.current = v.every(x => x > LO && x < HI) ? stable.current + dt : 0;
    if (stable.current >= NEED) fire();
    tick(t => (t + 1) % 1000000);
  });

  const v = vals.current, okNow = v.every(x => x > LO && x < HI);
  const hold = (i: number, dir: number) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); held.current[i] = dir; },
    onPointerUp: () => { held.current[i] = 0; }, onPointerLeave: () => { held.current[i] = 0; }, onPointerCancel: () => { held.current[i] = 0; },
  });
  return <Screen className="p-5"><div className="flex justify-around">{v.map((x, i) => <div key={i} className="flex flex-col items-center gap-2">
    <div className="relative h-44 w-12 overflow-hidden rounded-full bg-void"><div className="absolute inset-x-0 bg-lime/25" style={{ bottom: LO + '%', height: (HI - LO) + '%' }} />
      {/* no CSS transition: the rAF loop already moves this every frame */}
      <div className={`absolute inset-x-1 bottom-1 rounded-full bg-gradient-to-t ${x > LO && x < HI ? 'from-lime to-lime/70' : 'from-sky-400 to-cyan'}`} style={{ height: x + '%' }} /></div>
    {/* 56px targets, press-and-hold to slew. Release is also watched on the window, so sliding a
        finger off the pad always stops it. */}
    <div className="flex gap-2"><HoldPad className="h-14 w-14" {...hold(i, -1)} onPress={() => { }}>−</HoldPad><HoldPad className="h-14 w-14" {...hold(i, 1)} onPress={() => { }}>+</HoldPad></div></div>)}</div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-void"><div className={`h-full ${okNow ? 'bg-lime' : 'bg-amber'}`} style={{ width: Math.min(100, stable.current / NEED * 100) + '%' }} /></div>
    <div className="mt-1 text-center text-[12px] text-mist">Hold − / + to steer all three needles into the green</div></Screen>;
}
// 8. Circuit repair — replace burnt components
function Circuit({ done }: GP) {
  const [cells, setCells] = useState(() => { const c = Array.from({ length: 20 }, () => ({ burnt: false, kind: R(3) })); shuffle([...Array(20).keys()]).slice(0, 5).forEach(i => c[i].burnt = true); return c; });
  useEffect(() => { if (cells.every(c => !c.burnt)) done(); }, [cells]);
  return <Screen className="p-4"><div className="grid grid-cols-5 gap-2">{cells.map((c, i) => <motion.button data-press key={i} onClick={() => { if (c.burnt) { sfx('task_step'); setCells(x => x.map((y, k) => k === i ? { ...y, burnt: false } : y)); } else sfx('task_fail'); }} className={`relative grid h-14 place-items-center rounded-lg border ${c.burnt ? 'border-[#5a2a1a] bg-[#2a1208]' : 'border-[#2a6a4a] bg-[#0d2a20]'}`}>
    <svg viewBox="0 0 40 24" className="w-10">{c.kind === 0 ? <rect x="8" y="6" width="24" height="12" rx="2" fill={c.burnt ? '#3a2a20' : '#55b6ff'} /> : c.kind === 1 ? <circle cx="20" cy="12" r="8" fill={c.burnt ? '#3a2a20' : '#ffd23f'} /> : <path d="M6 12h6l3-7 5 14 4-10 3 3h7" stroke={c.burnt ? '#3a2a20' : '#8dff7a'} strokeWidth="2.5" fill="none" />}</svg>
    {c.burnt && <motion.span className="absolute right-1 top-0 text-[11px] text-amber" animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}>✶</motion.span>}</motion.button>)}</div></Screen>;
}
// 9. Chemical mixing — pour in the order shown
function ChemMix({ done }: GP) {
  const cols = ['#ff4d6d', '#55b6ff', '#ffd23f', '#8dff7a']; const [recipe] = useState(() => shuffle([0, 1, 2, 3]).slice(0, 3)); const [poured, setPoured] = useState<number[]>([]);
  const pour = (i: number) => { const n = [...poured, i]; if (recipe[n.length - 1] !== i) { sfx('task_fail'); setPoured([]); return; } sfx('task_step'); setPoured(n); if (n.length === recipe.length) setTimeout(done, 300); };
  return <Screen className="flex items-end justify-around p-5"><div className="flex flex-col gap-1"><span className="label">Recipe</span>{recipe.map((c, i) => <div key={i} className="flex items-center gap-2 text-[13px]"><span className="h-4 w-4 rounded-full" style={{ background: cols[c] }} />{i + 1}.</div>)}</div>
    <div className="flex gap-2">{cols.map((c, i) => <motion.button data-press key={i} onClick={() => pour(i)} className="flex flex-col items-center"><svg viewBox="0 0 30 60" className="w-9"><path d="M10 4h10v16l8 34H2l8-34z" fill="rgba(220,240,255,.25)" stroke="#bcd" /><path d="M5 40h20l3 14H2z" fill={c} /></svg></motion.button>)}</div>
    <div className="relative h-32 w-20 overflow-hidden rounded-b-3xl border-2 border-[#9ab] bg-[rgba(220,240,255,.08)]">{poured.map((c, i) => <motion.div key={i} initial={{ height: 0 }} animate={{ height: '30%' }} className="absolute inset-x-0" style={{ bottom: `${i * 30}%`, background: cols[c], opacity: 0.85 }} />)}</div></Screen>;
}
// 10. Security authentication — type the badge code
function Auth({ done }: GP) {
  const [code] = useState(() => String(1000 + R(9000))); const [inp, setInp] = useState(''); const [bad, setBad] = useState(false);
  const press = (d: string) => { if (d === 'C') return setInp(''); if (d === 'OK') { if (inp === code) done(); else { setBad(true); sfx('task_fail'); setTimeout(() => { setBad(false); setInp(''); }, 500); } return; } if (inp.length < 4) setInp(inp + d); };
  return <Screen className="flex items-center justify-around gap-4 p-5"><div className="rounded-xl bg-[#e9eef7] p-3 text-[#1b2033] shadow-lg"><div className="text-[10px] font-bold uppercase tracking-widest">Crew ID</div><div className="mt-1 h-10 w-24 rounded bg-[#3c5cf0]/20" /><div className="mt-2 font-display text-xl tracking-[0.3em]">{code}</div></div>
    <div><div className={`mb-2 h-10 rounded-lg bg-void text-center font-display text-2xl leading-10 tracking-[0.4em] ${bad ? 'text-crimson' : 'text-cyan'}`}>{inp.padEnd(4, '·')}</div><div className="grid grid-cols-3 gap-1.5">{['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map(d => <Pad key={d} className="h-11 w-14" onClick={() => press(d)}>{d}</Pad>)}</div></div></Screen>;
}
// 11. Navigation — click waypoints in order to plot a course
function Navigation({ done }: GP) {
  const [pts] = useState(() => Array.from({ length: 5 }, (_, i) => ({ x: 60 + i * 70 + R(20), y: 40 + R(200) }))); const [n, setN] = useState(0); useEffect(() => { if (n === pts.length) setTimeout(done, 400); }, [n]);
  return <Screen><svg viewBox="0 0 420 280" className="w-full">{Array.from({ length: 40 }, (_, i) => <circle key={i} cx={(i * 97) % 420} cy={(i * 53) % 280} r="1" fill="#fff" opacity=".5" />)}
    <polyline points={[{ x: 20, y: 140 }, ...pts.slice(0, n)].map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#3ff0e0" strokeWidth="3" strokeDasharray="6 4" />
    <path d="M10 130 l22 10 -22 10 6 -10z" fill="#e9eef7" />
    {pts.map((p, i) => <g key={i} onClick={() => { if (i === n) { setN(n + 1); sfx('task_step'); } else sfx('task_fail'); }} style={{ cursor: 'pointer' }}><circle cx={p.x} cy={p.y} r="16" fill={i < n ? '#8dff7a' : i === n ? '#ffd23f' : '#2a3a6e'} opacity=".9" /><text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#0a1020">{i + 1}</text></g>)}</svg></Screen>;
}
// 12. Signal tracing — trace the path without leaving it
function SignalTrace({ done }: GP) {
  const pts = useMemo(() => { const a: { x: number; y: number }[] = []; let y = 140; for (let x = 30; x <= 390; x += 10) { y += (Math.random() - 0.5) * 30; y = Math.max(40, Math.min(240, y)); a.push({ x, y }); } return a; }, []); const [prog, setProg] = useState(0); const [on, setOn] = useState(false); const svg = useRef<SVGSVGElement>(null);
  const move = (e: React.PointerEvent) => { if (!on) return; const r = svg.current!.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 420, y = (e.clientY - r.top) / r.height * 280; const near = pts.findIndex((p, i) => i >= prog && i <= prog + 3 && Math.hypot(p.x - x, p.y - y) < 22);
    if (near >= 0) { setProg(near); if (near === pts.length - 1) { setOn(false); done(); } } else if (!pts.slice(Math.max(0, prog - 2), prog + 2).some(p => Math.hypot(p.x - x, p.y - y) < 26)) { setOn(false); setProg(0); sfx('task_fail'); } };
  return <Screen><svg ref={svg} viewBox="0 0 420 280" className="w-full touch-none" onPointerMove={move} onPointerUp={() => { if (on) { setOn(false); setProg(0); } }}>
    <polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#2a3a6e" strokeWidth="26" strokeLinejoin="round" strokeLinecap="round" />
    <polyline points={pts.slice(0, prog + 1).map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#8dff7a" strokeWidth="8" strokeLinecap="round" />
    <circle cx={pts[0].x} cy={pts[0].y} r="16" fill="#ffd23f" onPointerDown={e => { (e.target as Element).setPointerCapture?.(e.pointerId); setOn(true); setProg(0); }} style={{ cursor: 'grab' }} /><circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="14" fill="#55b6ff" /></svg>
    <div className="pb-2 text-center text-[12px] text-mist">Press the yellow node and drag along the channel to the blue node.</div></Screen>;
}
// 13. File sorting — pick a file, then a folder
function FileSort({ done }: GP) {
  const kinds = [{ k: 'img', c: '#ff6fae', l: 'Images' }, { k: 'doc', c: '#55b6ff', l: 'Documents' }, { k: 'aud', c: '#8dff7a', l: 'Audio' }]; const [files, setFiles] = useState(() => shuffle([0, 0, 1, 1, 2, 2]).map((k, i) => ({ id: i, k }))); const [sel, setSel] = useState<number | null>(null);
  useEffect(() => { if (!files.length) done(); }, [files]);
  const drop = (k: number) => { if (sel === null) return; const f = files.find(x => x.id === sel)!; if (f.k === k) { setFiles(fs => fs.filter(x => x.id !== sel)); sfx('task_step'); } else sfx('task_fail'); setSel(null); };
  return <Screen className="p-4"><div className="flex min-h-[90px] flex-wrap justify-center gap-2">{files.map(f => <motion.button data-press layout key={f.id} onClick={() => setSel(f.id)} className={`flex h-20 w-16 flex-col items-center justify-center rounded-lg border-2 ${sel === f.id ? 'border-cyan bg-cyan/20' : 'border-transparent bg-[#16204a]'}`}><svg viewBox="0 0 30 36" className="w-8"><path d="M2 2h18l8 8v24H2z" fill="#e9eef7" /><rect x="7" y="16" width="16" height="10" rx="2" fill={kinds[f.k].c} /></svg><span className="text-[10px] text-mist">.{kinds[f.k].k}</span></motion.button>)}</div>
    <div className="mt-3 grid grid-cols-3 gap-2">{kinds.map((k, i) => <Pad key={k.k} className="flex flex-col items-center py-3" onClick={() => drop(i)}><svg viewBox="0 0 48 40" className="w-10"><path d="M2 8h16l4 4h24v26H2z" fill={k.c} /></svg><span className="text-[12px]">{k.l}</span></Pad>)}</div></Screen>;
}
// 14. Pressure balancing — two coupled chambers
function Pressure({ done, assist }: GP) {
  const [t] = useState(() => [40 + R(30), 30 + R(40)]); const [p, setP] = useState(() => assist ? [t[0] + 8, t[1] - 8] : [R(100), R(100)]); const ok = Math.abs(p[0] - t[0]) <= 3 && Math.abs(p[1] - t[1]) <= 3; useEffect(() => { if (ok) { const x = setTimeout(done, 600); return () => clearTimeout(x); } }, [ok]);
  const adj = (i: number, d: number) => setP(q => q.map((v, k) => Math.max(0, Math.min(100, v + (k === i ? d : -d * 0.35)))));
  return <Screen className="flex justify-around p-5">{[0, 1].map(i => <div key={i} className="flex flex-col items-center gap-2"><div className="label">Chamber {i ? 'B' : 'A'}</div><div className="relative h-44 w-16 overflow-hidden rounded-2xl border-2 border-[#4a5a94] bg-void"><div className="absolute inset-x-0 border-t-2 border-dashed border-lime" style={{ bottom: t[i] + '%' }} /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-violet/80 to-violet/30 transition-all" style={{ height: p[i] + '%' }} /></div>
    <div className="font-display text-cyan">{Math.round(p[i])} / {t[i]}</div><div className="flex gap-1">{[-10, -2, 2, 10].map(d => <Pad key={d} className="h-9 w-10 text-[12px]" onClick={() => adj(i, d)}>{d > 0 ? '+' : ''}{d}</Pad>)}</div></div>)}</Screen>;
}
// 15. Temperature control — set the thermostat; reading lags behind
function Temperature({ done, assist }: GP) {
  const [target] = useState(() => -20 + R(60)); const [set, setSet] = useState(assist ? target + 6 : 20); const [cur, setCur] = useState(assist ? target + 6 : 20); const [hold, setHold] = useState(0);
  // Frame-aligned exponential approach instead of a 60ms interval, so the needle reads smoothly
  // on a 120Hz iPad instead of stepping, and costs nothing while the tab is hidden.
  useRaf(dt => setCur(c => c + (set - c) * (1 - Math.exp(-2.1 * dt))));
  const ok = Math.abs(cur - target) < 1 && Math.abs(set - target) < 1; useEffect(() => { if (!ok) { setHold(0); return; } const t = setInterval(() => setHold(h => { if (h >= 10) { clearInterval(t); done(); } return h + 1; }), 100); return () => clearInterval(t); }, [ok]);
  return <Screen className="flex items-center justify-around p-5"><div className="text-center"><div className="label">Target</div><div className="font-display text-4xl text-amber">{target}°</div></div>
    <div className="relative grid h-40 w-40 place-items-center rounded-full border-8 border-[#2a3a6e]" style={{ background: `conic-gradient(${cur > target ? '#ff6d3d' : '#55b6ff'} ${Math.min(100, Math.abs(cur + 40) / 100 * 100)}%, #0a1020 0)` }}><div className="grid h-28 w-28 place-items-center rounded-full bg-[#0a1020]"><div className={`font-display text-3xl ${ok ? 'text-lime' : 'text-ink'}`}>{cur.toFixed(1)}°</div></div></div>
    <div className="flex flex-col gap-1.5">{[5, 1, -1, -5].map(d => <Pad key={d} className="h-12 w-16" onClick={() => setSet(s => s + d)}>{d > 0 ? '▲' : '▼'}{Math.abs(d)}</Pad>)}<div className="text-center text-[11px] text-mist">set {set}°</div></div></Screen>;
}

import { ALL2 } from './ui__tasks__Minigames2';
import { ALL3 } from './ui__tasks__Minigames3';
export const ALL: Record<string, React.FC<GP>> = { wires: Wires, reactor_align: ReactorAlign, memory: Memory, download: Transfer, upload: Transfer, power_route: PowerRoute, frequency: Frequency, oxygen_calib: OxygenCalib, circuit: Circuit, chem_mix: ChemMix, auth: Auth, navigation: Navigation, signal_trace: SignalTrace, file_sort: FileSort, pressure: Pressure, temperature: Temperature, ...ALL2, ...ALL3 };
