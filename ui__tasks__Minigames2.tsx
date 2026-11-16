// Minigames 16–25 and the sabotage repair games (handscan, keypad, switches, reboot, valve).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GP, R, shuffle, Screen, Pad, HoldPad, useRaf, useOnce, useHold } from './ui__tasks__mgkit';
import { sfx } from './game__audio__audio';
import { rt } from './game__runtime';
import { useGame } from './store__game';

// 16. Magnetic alignment — rotate magnets to match field arrows
function Magnet({ done, assist }: GP) {
  const [want] = useState(() => [R(8), R(8), R(8)]); const [rot, setRot] = useState(() => want.map((w, i) => assist && i < 2 ? w : (w + 2 + R(5)) % 8)); useEffect(() => { if (rot.every((r, i) => r === want[i])) setTimeout(done, 300); }, [rot]);
  return <Screen className="flex justify-around p-6">{rot.map((r, i) => <div key={i} className="flex flex-col items-center gap-2"><svg viewBox="-50 -50 100 100" className="w-24"><g stroke="#3ff0e0" strokeOpacity=".35" strokeWidth="1.5">{[-30, -15, 0, 15, 30].map(o => <line key={o} x1={-46} y1={o} x2={46} y2={o} transform={`rotate(${want[i] * 45})`} />)}</g>
    <g transform={`rotate(${r * 45})`} style={{ transition: 'transform .18s' }} onClick={() => { setRot(x => x.map((v, k) => k === i ? (v + 1) % 8 : v)); sfx('toggle'); }} className="cursor-pointer"><rect x="-30" y="-9" width="30" height="18" rx="3" fill="#ff4d6d" /><rect x="0" y="-9" width="30" height="18" rx="3" fill="#55b6ff" /><text x="-15" y="5" fontSize="12" textAnchor="middle" fill="#fff" fontWeight="700">N</text><text x="15" y="5" fontSize="12" textAnchor="middle" fill="#fff" fontWeight="700">S</text></g></svg>
    <span className={`text-[12px] ${r === want[i] ? 'text-lime' : 'text-mist'}`}>{r === want[i] ? 'aligned' : 'tap to rotate'}</span></div>)}</Screen>;
}
// 17. Fuel fill / burn — hold to fill, release in the green zone
function Fuel({ done, spot }: GP) {
  const burn = spot.endsWith('fuel_burn'); const [lvl, setLvl] = useState(0); const [fail, setFail] = useState(false);
  const fire = useOnce(done);
  const lvlRef = useRef(0); lvlRef.current = lvl;
  // Release is judged from a ref, and the hold ends on release anywhere — a finger sliding off the
  // button used to leave it filling until it overflowed and failed the task on its own.
  const [hold, startHold] = useHold(() => {
    const l = lvlRef.current;
    if (l >= 86 && l <= 100) fire(); else if (l > 4) { sfx('task_fail'); setTimeout(() => setLvl(0), 300); }
  });
  // rAF instead of a 40ms interval: frame-aligned, time-based, and it stops when the tab is hidden.
  useRaf(dt => setLvl(l => { const n = l + 40 * dt; if (n > 100) { setFail(true); sfx('task_fail'); setTimeout(() => { setFail(false); setLvl(0); }, 600); return 100; } return n; }), hold);
  return <Screen className="flex items-center justify-around p-5"><div className="relative h-48 w-24 overflow-hidden rounded-2xl border-4 border-[#5a6a94] bg-void"><div className="absolute inset-x-0 bg-lime/20" style={{ bottom: '86%', height: '14%' }} /><div className={`absolute inset-x-0 bottom-0 ${fail ? 'bg-crimson' : 'bg-gradient-to-t from-amber to-[#ffe08a]'}`} style={{ height: lvl + '%' }} /></div>
    <div className="flex flex-col items-center gap-2"><div className="label">{burn ? 'Engine intake' : 'Fuel canister'}</div><button data-press onPointerDown={e => { startHold(e); sfx('toggle'); }} className={`h-28 w-28 rounded-full border-4 font-display text-lg font-bold ${hold ? 'border-amber bg-amber/40 text-amber' : 'border-[#5a6a94] bg-[#1a2450] text-ink'}`}>HOLD</button><span className="text-[12px] text-mist">Release inside the green band</span></div></Screen>;
}
// 18. Database recovery — restore corrupted records over 3 waves
function DbRecover({ done }: GP) {
  const mk = () => { const c = Array(16).fill(false); shuffle([...Array(16).keys()]).slice(0, 3 + R(2)).forEach(i => c[i] = true); return c; }; const [wave, setWave] = useState(1); const [bad, setBad] = useState(mk); const names = useMemo(() => Array.from({ length: 16 }, (_, i) => `REC-${(1000 + i * 37) % 9000}`), []);
  useEffect(() => { if (bad.every(b => !b)) { if (wave >= 3) done(); else setTimeout(() => { setWave(w => w + 1); setBad(mk()); }, 350); } }, [bad]);
  const glitch = (s: string) => s.split('').map(ch => Math.random() > 0.5 ? '▓▒░#%&'[R(6)] : ch).join('');
  return <Screen className="p-4"><div className="mb-2 font-display text-[12px] text-mist">Wave {wave}/3 — click every corrupted record</div><div className="grid grid-cols-4 gap-1.5">{bad.map((b, i) => <button key={i} onClick={() => { if (b) { sfx('task_step'); setBad(x => x.map((y, k) => k === i ? false : y)); } else sfx('task_fail'); }} className={`rounded-md px-1 py-2 font-mono text-[12px] ${b ? 'bg-crimson/25 text-crimson' : 'bg-[#0f1a3a] text-lime/80'}`}>{b ? glitch(names[i]) : names[i]}</button>)}</div></Screen>;
}
// 19. Antenna adjustment — steer for strongest signal and hold
function Antenna({ done }: GP) {
  const [target] = useState(() => R(360)); const [ang, setAng] = useState(() => (target + 120 + R(120)) % 360); const [hold, setHold] = useState(0); const d = Math.min(Math.abs(ang - target), 360 - Math.abs(ang - target)); const sig = Math.max(0, 1 - d / 120); const ok = d < 8;
  useEffect(() => { if (!ok) { setHold(0); return; } const t = setInterval(() => setHold(h => { if (h >= 10) { clearInterval(t); done(); } return h + 1; }), 100); return () => clearInterval(t); }, [ok]);
  const svg = useRef<SVGSVGElement>(null); const drag = (e: React.PointerEvent) => { if (e.buttons !== 1 && e.pointerType === 'mouse') return; const r = svg.current!.getBoundingClientRect(); setAng((Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI + 450) % 360); };
  return <Screen className="flex items-center justify-around p-4"><svg ref={svg} viewBox="-100 -100 200 200" className="w-52 touch-none" onPointerDown={drag} onPointerMove={drag}><circle r="90" fill="#0a1228" stroke="#2a3a6e" strokeWidth="3" />{[0, 1, 2].map(i => <circle key={i} r={30 + i * 25} fill="none" stroke="#2a3a6e" />)}
    <g transform={`rotate(${ang})`}><line x1="0" y1="0" x2="0" y2="-80" stroke="#3ff0e0" strokeWidth="4" /><path d="M-22 -70 Q0 -96 22 -70" stroke="#3ff0e0" strokeWidth="4" fill="none" /></g><circle r="8" fill="#3ff0e0" /></svg>
    <div className="flex flex-col items-center gap-2"><div className="label">Signal</div><div className="flex h-36 items-end gap-1">{Array.from({ length: 8 }, (_, i) => <div key={i} className="w-3 rounded-sm" style={{ height: 12 + i * 15, background: sig * 8 > i ? (ok ? '#8dff7a' : '#3ff0e0') : '#1a2450' }} />)}</div><span className="text-[12px] text-mist">drag the dish</span></div></Screen>;
}
// 20. Door calibration — stop each bolt inside the open zone
function DoorCalib({ done }: GP) {
  const [stopped, setStopped] = useState<(number | null)[]>([null, null, null]); const [t, setT] = useState(0); const zones = useMemo(() => [0, 1, 2].map(() => 20 + R(55)), []); const i = stopped.findIndex(x => x === null);
  useEffect(() => { let raf = 0; const loop = (n: number) => { setT(n); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf); }, []);
  const pos = (k: number) => 50 + Math.sin(t / (380 - k * 60)) * 48; useEffect(() => { if (i === -1) setTimeout(done, 300); }, [i]);
  const stop = () => { if (i < 0) return; const p = pos(i); if (Math.abs(p - zones[i] - 7) <= 8) { sfx('task_step'); setStopped(s => s.map((v, k) => k === i ? p : v)); } else { sfx('task_fail'); setStopped([null, null, null]); } };
  return <Screen className="p-5" ><div className="space-y-4" onClick={stop}>{[0, 1, 2].map(k => <div key={k} className="relative h-10 rounded-lg bg-void"><div className="absolute inset-y-0 rounded bg-lime/25" style={{ left: zones[k] + '%', width: '14%' }} /><div className={`absolute top-1 h-8 w-4 -translate-x-1/2 rounded ${stopped[k] !== null ? 'bg-lime' : k === i ? 'bg-amber' : 'bg-[#4a5a94]'}`} style={{ left: (stopped[k] ?? (k === i ? pos(k) : 2)) + '%' }} /></div>)}</div><div className="mt-3 text-center"><Pad className="px-8 py-3" onClick={stop}>STOP</Pad></div></Screen>;
}
// 21. Cargo sorting — send each crate down the right chute
function CargoSort({ done }: GP) {
  const sym = ['▲', '●', '■']; const [queue, setQueue] = useState(() => Array.from({ length: 6 }, () => R(3))); const [shake, setShake] = useState(false); useEffect(() => { if (!queue.length) done(); }, [queue]);
  const send = (k: number) => { if (!queue.length) return; if (queue[0] === k) { sfx('task_step'); setQueue(q => q.slice(1)); } else { sfx('task_fail'); setShake(true); setTimeout(() => setShake(false), 300); } };
  return <Screen className="p-5"><div className="flex h-24 items-center gap-2 overflow-hidden">{queue.map((q, i) => <motion.div layout key={i + '-' + queue.length} animate={i === 0 && shake ? { x: [0, -8, 8, 0] } : {}} className={`grid h-16 w-16 shrink-0 place-items-center rounded-lg border-2 border-[#8a6232] bg-[#a8783e] font-bold text-[#2a1600] ${i === 0 ? 'scale-110 shadow-[0_0_16px_#ffb547]' : 'opacity-70'}`} style={{ fontSize: 28 }}>{sym[q]}</motion.div>)}</div>
    <div className="mt-4 grid grid-cols-3 gap-3">{sym.map((s, k) => <Pad key={k} className="py-5 text-3xl" onClick={() => send(k)}>{s}</Pad>)}</div></Screen>;
}
// 22. Sample analysis — spin the centrifuge, then pick the anomaly
function Sample({ done }: GP) {
  const [stage, setStage] = useState<'idle' | 'spin' | 'pick'>('idle'); const [p, setP] = useState(0); const [odd] = useState(() => R(5)); const [col] = useState(() => ['#55b6ff', '#8dff7a', '#ff6fae'][R(3)]);
  useEffect(() => { if (stage !== 'spin') return; const t = setInterval(() => setP(x => { if (x >= 100) { clearInterval(t); setStage('pick'); sfx('alert'); return 100; } return x + 1.4; }), 80); return () => clearInterval(t); }, [stage]);
  return <Screen className="grid place-items-center p-5">{stage !== 'pick' ? <div className="flex flex-col items-center gap-3"><motion.svg viewBox="-60 -60 120 120" className="w-40" animate={stage === 'spin' ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 0.5, ease: 'linear' }}><circle r="56" fill="#16204a" stroke="#4a5a94" strokeWidth="4" />{[0, 1, 2, 3, 4].map(i => <circle key={i} cx={Math.cos(i * 1.256) * 36} cy={Math.sin(i * 1.256) * 36} r="10" fill={col} opacity=".8" />)}</motion.svg>
    {stage === 'idle' ? <Pad className="px-6 py-3" onClick={() => setStage('spin')}>Start centrifuge</Pad> : <div className="w-56"><div className="h-3 overflow-hidden rounded-full bg-void"><div className="h-full bg-cyan" style={{ width: p + '%' }} /></div><div className="mt-1 text-center text-[12px] text-mist">Separating… {Math.round(p)}%</div></div>}</div>
    : <div className="flex flex-col items-center gap-3"><div className="text-[13px] text-mist">Select the anomalous sample</div><div className="flex gap-3">{[0, 1, 2, 3, 4].map(i => <motion.button data-press key={i} onClick={() => i === odd ? done() : (sfx('task_fail'), setStage('idle'), setP(0))} className="flex flex-col items-center"><svg viewBox="0 0 24 60" className="w-8"><rect x="2" y="2" width="20" height="56" rx="10" fill="rgba(220,240,255,.2)" stroke="#9ab" /><rect x="4" y={i === odd ? 18 : 30} width="16" height={i === odd ? 38 : 26} rx="8" fill={i === odd ? '#a77bff' : col} /></svg></motion.button>)}</div></div>}</Screen>;
}
// 23. Lock combination — dials with higher/lower feedback
function LockCombo({ done }: GP) {
  const [code] = useState(() => [R(10), R(10), R(10)]); const [d, setD] = useState([0, 0, 0]); const [fb, setFb] = useState<string[]>(['', '', '']); const [tries, setTries] = useState(0);
  const tryIt = () => { setTries(t => t + 1); const f = d.map((x, i) => x === code[i] ? '✓' : x < code[i] ? '▲' : '▼'); setFb(f); if (f.every(x => x === '✓')) setTimeout(done, 300); else sfx('task_fail'); };
  return <Screen className="flex flex-col items-center gap-4 p-5"><div className="flex gap-3">{d.map((x, i) => <div key={i} className="flex flex-col items-center gap-1"><Pad className="h-9 w-14" onClick={() => setD(a => a.map((y, k) => k === i ? (y + 1) % 10 : y))}>▲</Pad><div className="grid h-16 w-14 place-items-center rounded-lg bg-void font-display text-4xl text-cyan">{x}</div><Pad className="h-9 w-14" onClick={() => setD(a => a.map((y, k) => k === i ? (y + 9) % 10 : y))}>▼</Pad><span className={`h-5 font-display ${fb[i] === '✓' ? 'text-lime' : 'text-amber'}`}>{fb[i]}</span></div>)}</div>
    <Pad className="px-8 py-2.5" onClick={tryIt}>TRY ({tries})</Pad><span className="text-[12px] text-mist">▲ the digit is higher · ▼ lower</span></Screen>;
}
// 24. Generator startup — prime, crank, stabilise
function Generator({ done }: GP) {
  const [stage, setStage] = useState(0); const [primes, setPrimes] = useState(0); const [crank, setCrank] = useState(0); const last = useRef<number | null>(null); const [needle, setNeedle] = useState(50); const [ok, setOk] = useState(0); const svg = useRef<SVGSVGElement>(null);
  useEffect(() => { if (stage !== 2) return; const t = setInterval(() => setNeedle(n => Math.max(0, Math.min(100, n + (Math.random() - 0.45) * 9))), 90); return () => clearInterval(t); }, [stage]);
  useEffect(() => { if (stage !== 2) return; const good = needle > 40 && needle < 60; if (!good) { setOk(0); return; } const t = setTimeout(() => setOk(o => { if (o >= 25) { done(); return o; } return o + 1; }), 100); return () => clearTimeout(t); }, [needle, ok, stage]);
  const onCrank = (e: React.PointerEvent) => { if (stage !== 1 || (e.buttons !== 1 && e.pointerType === 'mouse')) return; const r = svg.current!.getBoundingClientRect(); const a = Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2); if (last.current !== null) { let da = a - last.current; if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2; if (da > 0) setCrank(c => { const n = c + da; if (n > Math.PI * 6) { setStage(2); sfx('task_step'); } return n; }); } last.current = a; };
  return <Screen className="p-5"><div className="mb-3 flex justify-center gap-2">{['Prime', 'Crank', 'Stabilise'].map((s, i) => <span key={s} className={`chip ${stage === i ? 'border-cyan text-cyan' : stage > i ? 'text-lime' : 'text-mist'}`}>{stage > i ? '✓ ' : ''}{s}</span>)}</div>
    {stage === 0 && <div className="flex flex-col items-center gap-3"><div className="flex gap-2">{[0, 1, 2].map(i => <div key={i} className={`h-4 w-10 rounded ${primes > i ? 'bg-amber' : 'bg-void'}`} />)}</div><Pad className="h-24 w-24 rounded-full text-lg" onClick={() => { const n = primes + 1; setPrimes(n); if (n >= 3) setTimeout(() => setStage(1), 250); }}>PRIME</Pad></div>}
    {stage === 1 && <div className="flex flex-col items-center"><svg ref={svg} viewBox="-60 -60 120 120" className="w-44 touch-none" onPointerDown={e => { last.current = null; onCrank(e); }} onPointerMove={onCrank}><circle r="55" fill="#16204a" stroke="#4a5a94" strokeWidth="4" /><g transform={`rotate(${crank * 180 / Math.PI})`}><line x1="0" y1="0" x2="0" y2="-42" stroke="#ffb547" strokeWidth="8" strokeLinecap="round" /><circle cx="0" cy="-42" r="10" fill="#ffd27a" /></g><circle r="8" fill="#ffb547" /></svg><span className="text-[12px] text-mist">Drag the handle clockwise · {Math.min(3, Math.floor(crank / (Math.PI * 2)))}/3 turns</span></div>}
    {stage === 2 && <div className="flex flex-col items-center gap-3"><div className="relative h-8 w-80 rounded-full bg-void"><div className="absolute inset-y-0 rounded-full bg-lime/25" style={{ left: '40%', width: '20%' }} /><div className="absolute top-0 h-8 w-2 -translate-x-1/2 rounded bg-cyan" style={{ left: needle + '%' }} /></div><div className="flex gap-2"><Pad className="h-12 w-16" onClick={() => setNeedle(n => n - 8)}>◀</Pad><Pad className="h-12 w-16" onClick={() => setNeedle(n => n + 8)}>▶</Pad></div><div className="h-2 w-60 overflow-hidden rounded-full bg-void"><div className="h-full bg-lime" style={{ width: ok / 25 * 100 + '%' }} /></div></div>}</Screen>;
}
// 25. Communication repair — re-seat the modules
function CommRepair({ done }: GP) {
  const shapes = ['circle', 'square', 'tri', 'hex']; const [mods, setMods] = useState(() => shuffle([0, 1, 2, 3])); const [placed, setPlaced] = useState<boolean[]>([false, false, false, false]); const [sel, setSel] = useState<number | null>(null); useEffect(() => { if (placed.every(Boolean)) setTimeout(done, 300); }, [placed]);
  const Shape = ({ k, fill }: { k: number; fill: string }) => <svg viewBox="-20 -20 40 40" className="w-10">{shapes[k] === 'circle' ? <circle r="14" fill={fill} /> : shapes[k] === 'square' ? <rect x="-13" y="-13" width="26" height="26" fill={fill} /> : shapes[k] === 'tri' ? <path d="M0 -15 L15 13 H-15z" fill={fill} /> : <path d="M-14 0 L-7 -12 H7 L14 0 L7 12 H-7z" fill={fill} />}</svg>;
  return <Screen className="p-5"><div className="mb-4 grid grid-cols-4 gap-3">{[0, 1, 2, 3].map(k => <button key={k} onClick={() => { if (sel === null) return; if (sel === k) { setPlaced(p => p.map((v, i) => i === k ? true : v)); sfx('task_step'); } else sfx('task_fail'); setSel(null); }} className={`grid h-20 place-items-center rounded-xl border-2 border-dashed ${placed[k] ? 'border-lime bg-lime/10' : 'border-[#4a5a94] bg-void'}`}><Shape k={k} fill={placed[k] ? '#8dff7a' : '#1f2a52'} /></button>)}</div>
    <div className="flex justify-center gap-3">{mods.map(k => !placed[k] && <motion.button data-press key={k} onClick={() => setSel(k)} className={`grid h-16 w-16 place-items-center rounded-xl border-2 ${sel === k ? 'border-cyan bg-cyan/20' : 'border-[#4a5a94] bg-[#16204a]'}`}><Shape k={k} fill="#3ff0e0" /></motion.button>)}</div></Screen>;
}
// ── sabotage repairs ──
function HandScan({ spot }: GP) {
  const [hold, setHold] = useState(false); const sab = useGame(s => s.view?.sab); const held = sab ? sab.spots.filter(x => (sab.holds[x] || 0) > 0).length : 0;
  const set = (on: boolean) => { setHold(on); rt.act({ k: 'hold', spot, on }); if (on) sfx('toggle'); };
  useEffect(() => () => { rt.act({ k: 'hold', spot, on: false }); }, []);
  return <Screen className="flex flex-col items-center gap-3 p-6"><motion.button data-press onPointerDown={() => set(true)} onPointerUp={() => set(false)} onPointerLeave={() => hold && set(false)} className={`relative grid h-44 w-44 place-items-center rounded-3xl border-4 ${hold ? 'border-lime bg-lime/15' : 'border-crimson/70 bg-crimson/10'}`} data-testid="handscan">
    <svg viewBox="0 0 24 24" className="w-24" fill="none" stroke={hold ? '#8dff7a' : '#ff8b95'} strokeWidth="1.4"><path d="M8 13V5.5a1.5 1.5 0 013 0V11m0-1V4a1.5 1.5 0 013 0v7m0-5.5a1.5 1.5 0 013 0V12m0-3.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1.5a6 6 0 01-4.6-2.2L4.3 15.5a1.6 1.6 0 012.4-2.1L8 15" /></svg>
    {hold && <motion.div className="absolute inset-x-3 h-1 rounded bg-lime shadow-[0_0_12px_#8dff7a]" animate={{ top: ['10%', '88%', '10%'] }} transition={{ repeat: Infinity, duration: 1.4 }} />}</motion.button>
    <div className="font-display text-[15px]">{hold ? (held >= 2 ? 'Both scanners held — stabilising…' : 'Holding… waiting for the second scanner') : 'Press and hold'}</div><div className="flex gap-2">{[0, 1].map(i => <span key={i} className={`h-3 w-10 rounded-full ${held > i ? 'bg-lime' : 'bg-void'}`} />)}</div></Screen>;
}
function Keypad({ done, assist }: GP) {
  const [code] = useState(() => String(10000 + R(90000))); const [inp, setInp] = useState(assist ? code.slice(0, 3) : '');
  const press = (d: string) => { if (d === 'C') return setInp(''); if (d === 'OK') { if (inp === code) done(); else { sfx('task_fail'); setInp(''); } return; } if (inp.length < 5) setInp(inp + d); };
  return <Screen className="flex items-center justify-around p-5"><div className="rotate-[-4deg] bg-[#ffe680] p-4 font-display text-[#3a2a00] shadow-lg"><div className="text-[11px] uppercase">today’s O₂ code</div><div className="text-2xl tracking-[0.25em]">{code}</div></div>
    <div><div className="mb-2 h-10 rounded-lg bg-void text-center font-display text-2xl leading-10 tracking-[0.35em] text-cyan">{inp.padEnd(5, '·')}</div><div className="grid grid-cols-3 gap-1.5">{['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map(d => <Pad key={d} className="h-11 w-14" onClick={() => press(d)}>{d}</Pad>)}</div></div></Screen>;
}
function Switches({ done, assist }: GP) {
  const [s, setS] = useState(() => { const a = Array.from({ length: 5 }, () => !!R(2)); if (a.every(Boolean)) a[R(5)] = false; if (assist) a.forEach((_, i) => { if (i < 3) a[i] = true; }); return a; }); useEffect(() => { if (s.every(Boolean)) setTimeout(done, 300); }, [s]);
  return <Screen className="flex justify-around p-6">{s.map((on, i) => <button key={i} onClick={() => { sfx('toggle'); setS(x => x.map((v, k) => k === i ? !v : v)); }} className="flex flex-col items-center gap-2"><div className="relative h-28 w-12 rounded-lg border-2 border-[#4a5a94] bg-void"><motion.div layout className={`absolute left-1 right-1 h-12 rounded-md ${on ? 'top-1 bg-lime shadow-[0_0_14px_#8dff7a]' : 'bottom-1 bg-[#5a6a94]'}`} /></div><span className={`h-2 w-2 rounded-full ${on ? 'bg-lime' : 'bg-crimson'}`} /></button>)}</Screen>;
}
function Reboot({ done, assist }: GP) {
  const [order] = useState(() => shuffle([0, 1, 2, 3])); const [n, setN] = useState(assist ? 2 : 0); const [hold, setHold] = useState(0); const [h, setH] = useState(false); const cols = ['#ff4d6d', '#55b6ff', '#ffd23f', '#8dff7a'];
  useEffect(() => { if (!h || n < 4) return; const t = setInterval(() => setHold(x => { if (x >= 10) { clearInterval(t); done(); } return x + 1; }), 100); return () => clearInterval(t); }, [h, n]);
  return <Screen className="flex flex-col items-center gap-4 p-5"><div className="flex gap-2">{order.map((o, i) => <span key={i} className={`grid h-8 w-8 place-items-center rounded-full font-display text-[13px] font-bold text-black ${i < n ? 'opacity-30' : ''}`} style={{ background: cols[o] }}>{i + 1}</span>)}</div>
    <div className="flex gap-3">{cols.map((c, i) => <motion.button data-press key={i} onClick={() => { if (n < 4 && order[n] === i) { setN(n + 1); sfx('task_step'); } else if (n < 4) { setN(0); sfx('task_fail'); } }} className="h-16 w-16 rounded-xl border-2 border-white/20" style={{ background: c, boxShadow: `0 0 16px ${c}66` }} />)}</div>
    <motion.button data-press onPointerDown={() => setH(true)} onPointerUp={() => { setH(false); setHold(0); }} onPointerLeave={() => { setH(false); setHold(0); }} disabled={n < 4} className={`w-56 rounded-xl border-2 py-3 font-display font-bold ${n < 4 ? 'border-[#3a4a80] text-mist opacity-50' : 'border-cyan text-cyan'}`} style={{ background: `linear-gradient(90deg, rgba(63,240,224,.35) ${hold * 10}%, transparent 0)` }}>HOLD TO REBOOT</motion.button></Screen>;
}
function Valve({ done, assist }: GP) {
  const [turn, setTurn] = useState(assist ? Math.PI * 2 : 0); const last = useRef<number | null>(null); const svg = useRef<SVGSVGElement>(null); useEffect(() => { if (turn >= Math.PI * 4) done(); }, [turn >= Math.PI * 4]);
  const mv = (e: React.PointerEvent) => { if (e.buttons !== 1 && e.pointerType === 'mouse') return; const r = svg.current!.getBoundingClientRect(); const a = Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2); if (last.current !== null) { let d = a - last.current; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; if (d > 0) setTurn(t => t + d); } last.current = a; };
  return <Screen className="flex flex-col items-center p-5"><svg ref={svg} viewBox="-60 -60 120 120" className="w-48 touch-none" onPointerDown={e => { last.current = null; mv(e); }} onPointerMove={mv}><g transform={`rotate(${turn * 180 / Math.PI})`}><circle r="48" fill="none" stroke="#c0304a" strokeWidth="10" />{[0, 1, 2, 3].map(i => <line key={i} x1="0" y1="0" x2={Math.cos(i * 1.57) * 48} y2={Math.sin(i * 1.57) * 48} stroke="#c0304a" strokeWidth="7" />)}<circle cx="0" cy="-48" r="7" fill="#ff8b95" /></g><circle r="10" fill="#7a1a2a" /></svg>
    <div className="mt-2 w-56"><div className="h-2 overflow-hidden rounded-full bg-void"><div className="h-full bg-cyan" style={{ width: Math.min(100, turn / (Math.PI * 4) * 100) + '%' }} /></div><div className="mt-1 text-center text-[12px] text-mist">Drag clockwise · {Math.min(2, Math.floor(turn / (Math.PI * 2)))}/2 turns</div></div></Screen>;
}
export const ALL2: Record<string, React.FC<GP>> = { magnet: Magnet, fuel_fill: Fuel, fuel_burn: Fuel, db_recover: DbRecover, antenna: Antenna, door_calib: DoorCalib, cargo_sort: CargoSort, sample: Sample, lock_combo: LockCombo, generator: Generator, comm_repair: CommRepair, handscan: HandScan, keypad: Keypad, switches: Switches, reboot: Reboot, valve: Valve };
