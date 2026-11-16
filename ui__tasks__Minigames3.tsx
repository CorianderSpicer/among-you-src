// Carnival & biodome minigames — the themed tasks for Starlight Carnival and Verdant Drift.
// Every one is built touch-first: large targets, press-to-act (a second finger never gets a click
// event, so anything on onClick is dead while you are moving), and rAF rather than short intervals.
import React, { useEffect, useRef, useState } from 'react';
import { GP, R, shuffle, Screen, Pad, useRaf, useOnce, useHold } from './ui__tasks__mgkit';
import { sfx } from './game__audio__audio';

// ── 26. Ring toss — release the ring at the right swing angle to land it on a peg ──
function RingToss({ done }: GP) {
  const fire = useOnce(done);
  const ang = useRef(0), dir = useRef(1);
  const [rings, setRings] = useState(0);
  const [shot, setShot] = useState<{ t: number; a: number } | null>(null);
  const [msg, setMsg] = useState('');
  const NEED = 3;
  useRaf(dt => {
    ang.current += dir.current * dt * 1.7;
    if (ang.current > 1) { ang.current = 1; dir.current = -1; }
    if (ang.current < -1) { ang.current = -1; dir.current = 1; }
    if (shot) setShot(s => s && s.t > 1 ? null : s && { ...s, t: s.t + dt * 2.2 });
    tick(t => (t + 1) % 1e6);
  });
  const [, tick] = useState(0);
  const toss = () => {
    if (shot) return;
    const a = ang.current, hit = Math.abs(a) < 0.26;         // generous window
    setShot({ t: 0, a });
    if (hit) { sfx('task_step'); setRings(r => { const n = r + 1; if (n >= NEED) fire(); return n; }); setMsg('Ringer!'); }
    else { sfx('task_fail'); setMsg('Just wide'); }
    setTimeout(() => setMsg(''), 700);
  };
  const a = ang.current;
  return <Screen className="flex flex-col items-center gap-3 p-5">
    <div className="label">Land {NEED} rings on the centre peg</div>
    <svg viewBox="-100 -20 200 150" className="w-72 touch-none">
      {[-60, 0, 60].map(x => <g key={x}><rect x={x - 3} y={60} width="6" height="54" rx="3" fill="#c98b3a" /><ellipse cx={x} cy={116} rx="17" ry="6" fill="#7a4a1a" /></g>)}
      <circle cx="0" cy="56" r="4" fill="#ffe08a" />
      {/* the swinging hand */}
      <g transform={`translate(${a * 70} 24)`}><ellipse rx="19" ry="7" fill="none" stroke="#ffd23f" strokeWidth="5" /></g>
      {shot && <g transform={`translate(${shot.a * 70 * (1 - shot.t)} ${24 + shot.t * 86})`}><ellipse rx={19 - shot.t * 4} ry={7 - shot.t * 2} fill="none" stroke="#ffd23f" strokeWidth="4" /></g>}
    </svg>
    <div className="font-display text-lg text-amber">{msg}&nbsp;</div>
    <button data-press onPointerDown={e => { e.preventDefault(); toss(); }} className="h-16 w-48 rounded-2xl border-2 border-amber bg-amber/25 font-display text-xl font-bold text-amber active:brightness-150">TOSS</button>
    <div className="text-[13px] text-mist">{rings}/{NEED} ringers</div>
  </Screen>;
}

// ── 27. Balloon pop — pop only the colour called out ──
function BalloonPop({ done }: GP) {
  const fire = useOnce(done);
  const COLS = [['#ff4d6d', 'red'], ['#55b6ff', 'blue'], ['#8dff7a', 'green'], ['#ffd23f', 'yellow']] as const;
  const [want, setWant] = useState(() => R(4));
  const [balloons, setBalloons] = useState(() => Array.from({ length: 12 }, (_, i) => ({ i, c: R(4), gone: false, x: 8 + (i % 4) * 28, y: 12 + Math.floor(i / 4) * 30, bob: Math.random() * 6 })));
  const [score, setScore] = useState(0);
  const NEED = 5;
  const pop = (b: any) => {
    if (b.gone) return;
    if (b.c === want) { sfx('task_step'); setBalloons(x => x.map(y => y.i === b.i ? { ...y, gone: true } : y)); setScore(s => { const n = s + 1; if (n >= NEED) fire(); return n; }); setWant(R(4)); }
    else { sfx('task_fail'); setScore(s => Math.max(0, s - 1)); }
  };
  return <Screen className="flex flex-col items-center gap-2 p-4">
    <div className="label">Pop the <span style={{ color: COLS[want][0] }}>{COLS[want][1]}</span> balloons</div>
    <div className="grid grid-cols-4 gap-2">{balloons.map(b => (
      <button key={b.i} data-press disabled={b.gone} onPointerDown={e => { e.preventDefault(); pop(b); }}
        className={`grid h-16 w-16 place-items-center rounded-full transition-opacity ${b.gone ? 'opacity-10' : 'active:brightness-150'}`}
        style={{ background: b.gone ? '#10172e' : `radial-gradient(circle at 35% 30%, #ffffff55, ${COLS[b.c][0]})` }}>
        {!b.gone && <span className="text-[10px] text-black/40">◗</span>}
      </button>))}</div>
    <div className="mt-1 h-2 w-56 overflow-hidden rounded-full bg-void"><div className="h-full bg-lime" style={{ width: score / NEED * 100 + '%' }} /></div>
    <div className="text-[12px] text-mist">{score}/{NEED}</div>
  </Screen>;
}

// ── 28. Strength test — hammer the pad, then stop the striker in the bell zone ──
function StrengthTest({ done }: GP) {
  const fire = useOnce(done);
  const lvl = useRef(0); const [, tick] = useState(0); const [fail, setFail] = useState(false);
  const [held, startHold] = useHold(() => {
    const l = lvl.current;
    if (l >= 88) { sfx('task_done'); fire(); }
    else { sfx('task_fail'); setFail(true); setTimeout(() => { setFail(false); lvl.current = 0; }, 500); }
  });
  useRaf(dt => { lvl.current = Math.min(100, lvl.current + 52 * dt); tick(t => (t + 1) % 1e6); }, held);
  useRaf(dt => { if (lvl.current > 0) { lvl.current = Math.max(0, lvl.current - 26 * dt); tick(t => (t + 1) % 1e6); } }, !held);
  const l = lvl.current;
  return <Screen className="flex items-center justify-around p-5">
    <div className="relative h-56 w-16 overflow-hidden rounded-xl border-4 border-[#7a4a1a] bg-void">
      <div className="absolute inset-x-0 bg-lime/25" style={{ bottom: '88%', height: '12%' }} />
      <div className={`absolute inset-x-0 bottom-0 ${fail ? 'bg-crimson' : 'bg-gradient-to-t from-[#ff4d6d] to-[#ffd23f]'}`} style={{ height: l + '%' }} />
      <div className="absolute inset-x-0 top-1 text-center text-[20px]">🔔</div>
    </div>
    <div className="flex flex-col items-center gap-3">
      <div className="label">Ring the bell</div>
      <button data-press onPointerDown={e => { startHold(e); sfx('toggle'); }}
        className={`h-32 w-32 rounded-full border-4 font-display text-lg font-bold ${held ? 'border-amber bg-amber/40 text-amber' : 'border-[#7a4a1a] bg-[#2a1a10] text-ink'}`}>HOLD</button>
      <span className="max-w-[12rem] text-center text-[12px] text-mist">Hold to wind up, release in the green</span>
    </div>
  </Screen>;
}

// ── 29. Whack-a-gremlin — bop the gremlins, never the kittens ──
function Whack({ done }: GP) {
  const fire = useOnce(done);
  const [holes, setHoles] = useState<(null | 'g' | 'k')[]>(() => Array(9).fill(null));
  const [score, setScore] = useState(0);
  const t = useRef(0);
  const NEED = 8;
  useRaf(dt => {
    t.current += dt;
    if (t.current > 0.62) {
      t.current = 0;
      setHoles(() => { const h: (null | 'g' | 'k')[] = Array(9).fill(null); const spots = shuffle([...Array(9).keys()]).slice(0, 2 + R(2)); spots.forEach((s, i) => h[s] = i === 0 && Math.random() < 0.3 ? 'k' : 'g'); return h; });
    }
  });
  const bop = (i: number) => {
    const v = holes[i]; if (!v) return;
    setHoles(h => h.map((x, k) => k === i ? null : x));
    if (v === 'g') { sfx('task_step'); setScore(s => { const n = s + 1; if (n >= NEED) fire(); return n; }); }
    else { sfx('task_fail'); setScore(s => Math.max(0, s - 2)); }
  };
  return <Screen className="flex flex-col items-center gap-3 p-4">
    <div className="label">Bop the gremlins — spare the kittens</div>
    <div className="grid grid-cols-3 gap-2">{holes.map((v, i) => (
      <button key={i} data-press onPointerDown={e => { e.preventDefault(); bop(i); }}
        className="grid h-20 w-20 place-items-center rounded-full border-2 border-[#5a3a1a] bg-[#1a1208] text-3xl active:brightness-150">
        {v === 'g' ? '👹' : v === 'k' ? '🐱' : ''}
      </button>))}</div>
    <div className="h-2 w-56 overflow-hidden rounded-full bg-void"><div className="h-full bg-lime" style={{ width: Math.max(0, score / NEED * 100) + '%' }} /></div>
    <div className="text-[12px] text-mist">{score}/{NEED}</div>
  </Screen>;
}

// ── 30. Cotton candy — keep the cone spinning in the sweet spot while the sugar winds on ──
function CottonCandy({ done }: GP) {
  const fire = useOnce(done);
  const spin = useRef(0), fill = useRef(0); const [, tick] = useState(0);
  const [held, startHold] = useHold();
  useRaf(dt => {
    spin.current = Math.max(0, Math.min(100, spin.current + (held ? 46 : -38) * dt));
    const good = spin.current > 42 && spin.current < 82;
    fill.current = Math.min(100, fill.current + (good ? 34 : 0) * dt);
    if (fill.current >= 100) fire();
    tick(t => (t + 1) % 1e6);
  });
  const s = spin.current, good = s > 42 && s < 82;
  return <Screen className="flex items-center justify-around p-5">
    <div className="flex flex-col items-center gap-2">
      <div className="label">Spin speed</div>
      <div className="relative h-52 w-14 overflow-hidden rounded-full bg-void">
        <div className="absolute inset-x-0 bg-lime/25" style={{ bottom: '42%', height: '40%' }} />
        <div className={`absolute inset-x-1 bottom-1 rounded-full ${good ? 'bg-lime' : 'bg-crimson'}`} style={{ height: s + '%' }} />
      </div>
    </div>
    <div className="flex flex-col items-center gap-3">
      <div className="text-5xl" style={{ transform: `rotate(${s * 3.6}deg)` }}>🍭</div>
      <button data-press onPointerDown={e => { startHold(e); sfx('toggle'); }}
        className={`h-28 w-28 rounded-full border-4 font-display font-bold ${held ? 'border-[#ff8bd0] bg-[#ff8bd0]/35 text-[#ff8bd0]' : 'border-[#5a3a6a] bg-[#1e1030] text-ink'}`}>SPIN</button>
      <div className="h-2 w-40 overflow-hidden rounded-full bg-void"><div className="h-full bg-[#ff8bd0]" style={{ width: fill.current + '%' }} /></div>
      <span className="text-[12px] text-mist">Hold to spin — stay in the green</span>
    </div>
  </Screen>;
}

// ── 31. Duck shoot — tag the ducks as they glide past ──
function DuckShoot({ done }: GP) {
  const fire = useOnce(done);
  const ducks = useRef(Array.from({ length: 5 }, (_, i) => ({ i, x: -20 - i * 46, row: i % 3, hit: false, sp: 42 + R(22) })));
  const [, tick] = useState(0);
  const [score, setScore] = useState(0);
  const NEED = 4;
  useRaf(dt => {
    for (const d of ducks.current) { d.x += d.sp * dt; if (d.x > 320) { d.x = -30; d.hit = false; } }
    tick(t => (t + 1) % 1e6);
  });
  const shoot = (d: any) => { if (d.hit) return; d.hit = true; sfx('task_step'); setScore(s => { const n = s + 1; if (n >= NEED) fire(); return n; }); };
  return <Screen className="flex flex-col items-center gap-3 p-4">
    <div className="label">Tag {NEED} ducks</div>
    <div className="relative h-48 w-[300px] overflow-hidden rounded-xl border-2 border-[#3a4a80] bg-[#0b1430]">
      {[0, 1, 2].map(r => <div key={r} className="absolute inset-x-0 border-b border-[#24305a]" style={{ top: 34 + r * 48, height: 1 }} />)}
      {ducks.current.map(d => (
        <button key={d.i} data-press onPointerDown={e => { e.preventDefault(); shoot(d); }}
          className={`absolute grid h-12 w-12 place-items-center text-3xl ${d.hit ? 'opacity-20' : ''}`}
          style={{ left: d.x, top: 16 + d.row * 48 }}>{d.hit ? '💥' : '🦆'}</button>))}
    </div>
    <div className="text-[12px] text-mist">{score}/{NEED}</div>
  </Screen>;
}

// ── 32. Pollination — carry pollen between the flowers that match ──
function Pollinate({ done }: GP) {
  const fire = useOnce(done);
  const COLS = ['#ff8bd0', '#ffd23f', '#a77bff', '#8dff7a'];
  const [flowers] = useState(() => { const base = [0, 1, 2, 3, 0, 1, 2, 3]; return shuffle(base).map((c, i) => ({ i, c })); });
  const [held, setHeld] = useState<number | null>(null);
  const [donePairs, setDone] = useState<number[]>([]);
  const pick = (f: any) => {
    if (donePairs.includes(f.i)) return;
    if (held === null) { setHeld(f.i); sfx('toggle'); return; }
    if (held === f.i) { setHeld(null); return; }
    const a = flowers[held];
    if (a.c === f.c) { sfx('task_step'); const nd = [...donePairs, held, f.i]; setDone(nd); setHeld(null); if (nd.length >= flowers.length) fire(); }
    else { sfx('task_fail'); setHeld(null); }
  };
  return <Screen className="flex flex-col items-center gap-3 p-4">
    <div className="label">Match each bloom to its pair</div>
    <div className="grid grid-cols-4 gap-2">{flowers.map(f => {
      const spent = donePairs.includes(f.i), on = held === f.i;
      return <button key={f.i} data-press onPointerDown={e => { e.preventDefault(); pick(f); }}
        className={`grid h-16 w-16 place-items-center rounded-2xl border-2 text-3xl ${spent ? 'border-lime/60 bg-lime/10 opacity-50' : on ? 'border-ink bg-white/10' : 'border-[#3a5a3a] bg-[#0f2015]'}`}>
        <span style={{ color: COLS[f.c] }}>{spent ? '✿' : '❀'}</span></button>;
    })}</div>
    <div className="text-[12px] text-mist">{donePairs.length / 2}/{flowers.length / 2} pairs</div>
  </Screen>;
}

// ── 33. Irrigation — open the valves so every bed gets water ──
function Irrigate({ done }: GP) {
  const fire = useOnce(done);
  const [want] = useState(() => Array.from({ length: 5 }, () => R(2) === 1));
  const [open, setOpen] = useState(() => Array(5).fill(false));
  useEffect(() => { if (open.every((o, i) => o === want[i]) && want.some(Boolean)) fire(); }, [open]);
  return <Screen className="flex flex-col items-center gap-4 p-5">
    <div className="label">Open only the beds that are dry</div>
    <div className="flex gap-3">{want.map((wv, i) => (
      <div key={i} className="flex flex-col items-center gap-2">
        <div className={`grid h-14 w-14 place-items-center rounded-lg border-2 text-2xl ${wv ? 'border-amber/70 bg-amber/10' : 'border-[#2a6a4a] bg-[#0d2a20]'}`}>{wv ? '🌱' : '💧'}</div>
        <Pad className="h-14 w-14" active={open[i]} onClick={() => setOpen(o => o.map((x, k) => k === i ? !x : x))}>{open[i] ? '◉' : '○'}</Pad>
      </div>))}</div>
    <div className="text-[12px] text-mist">Open the valve under every dry bed, close the rest</div>
  </Screen>;
}

export const ALL3: Record<string, React.FC<GP>> = {
  ring_toss: RingToss, balloon_pop: BalloonPop, strength_test: StrengthTest, whack: Whack,
  cotton_candy: CottonCandy, duck_shoot: DuckShoot, pollinate: Pollinate, irrigate: Irrigate,
};
