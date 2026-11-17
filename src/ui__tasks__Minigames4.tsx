// Station-signature minigames: one task that belongs to each of the five sci-fi maps, plus the
// sluice valve that Abyssal and Verdant were already asking for and never had.
//
// Same rules as the other minigame files: press-to-act rather than onClick (a second finger on the
// joystick never produces a click, so an onClick control is dead while you are moving), rAF rather
// than short intervals, completion fired from an effect rather than from inside a state updater.
import React, { useEffect, useRef, useState } from 'react';
import { GP, R, shuffle, Screen, Pad, useRaf, useOnce, useHold, press as onPress } from './ui__tasks__mgkit';
import { sfx } from './game__audio__audio';

// ── Abyssal Station / Verdant Drift · Sluice Valves ───────────────────────────────────────────
// Bleed the manifold to zero. Each valve dumps its own line but pushes part of its charge into its
// neighbours, so the order matters: open the wrong one and a neighbour redlines and the run resets.
function Valve({ done, assist }: GP) {
  const fire = useOnce(done);
  const N = assist ? 3 : 4;
  const LIMIT = 100, SPLIT = assist ? 0.6 : 0.55;
  const LO = assist ? 40 : 36, HI = assist ? 85 : 82;
  // Does any order of opening keep every line under the limit? N is 3 or 4, so checking the lot is
  // nothing — and without this check roughly one board in fourteen could not be solved at all,
  // which from the player's side is a task that simply refuses to finish.
  const solvable = (start: number[]): boolean => {
    const walk = (p: number[], open: boolean[]): boolean => {
      if (open.every(Boolean)) return true;
      for (let i = 0; i < p.length; i++) {
        if (open[i]) continue;
        const q = p.slice(), o = open.slice(), d = q[i];
        q[i] = 0; o[i] = true;
        const nb = [i - 1, i + 1].filter(j => j >= 0 && j < q.length && !o[j]);
        for (const j of nb) q[j] += d * SPLIT / nb.length;
        if (q.some((v, k) => !o[k] && v > LIMIT)) continue;
        if (walk(q, o)) return true;
      }
      return false;
    };
    return walk(start, Array(start.length).fill(false));
  };
  const mk = (): number[] => {
    for (let t = 0; t < 60; t++) {
      const c = Array.from({ length: N }, () => LO + R(HI - LO + 1));
      if (solvable(c)) return c;
    }
    return Array.from({ length: N }, () => LO);   // always solvable, and never reached in practice
  };
  const [p, setP] = useState<number[]>(mk);
  const [open, setOpen] = useState<boolean[]>(() => Array(N).fill(false));
  const [flash, setFlash] = useState(-1);
  const blown = flash >= 0;

  const pull = (i: number) => {
    if (open[i] || blown) return;
    setP(prev => {
      const next = prev.slice();
      const dumped = next[i];
      next[i] = 0;
      // half the charge has to go somewhere: it splits into the lines either side
      const nb = [i - 1, i + 1].filter(j => j >= 0 && j < N && !open[j]);
      for (const j of nb) next[j] = next[j] + dumped * SPLIT / nb.length;
      return next;
    });
    setOpen(prev => { const n = prev.slice(); n[i] = true; return n; });
    sfx('toggle');
  };

  // A redline is a failed run, not a lost task: flag it, lock the pads, and deal out a new board.
  // Spotting it and starting the delay are two separate effects on purpose. With one effect keyed
  // on the pressures, every further tap re-ran it and cleared its own pending timeout, so a player
  // tapping faster than the delay sailed through a board that had already blown — the same shape
  // of bug as the stabilise step that could never fire.
  useEffect(() => {
    if (blown) return;
    const bad = p.findIndex((v, i) => !open[i] && v > LIMIT);
    if (bad >= 0) { setFlash(bad); sfx('task_fail'); }
  }, [p, open, blown, LIMIT]);
  useEffect(() => {
    if (!blown) return;
    const t = setTimeout(() => { setP(mk()); setOpen(Array(N).fill(false)); setFlash(-1); }, 800);
    return () => clearTimeout(t);
  }, [blown]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!blown && open.every(Boolean)) fire(); }, [open, blown, fire]);

  return <Screen className="p-4">
    <div className="mb-3 text-center text-[12px] text-mist">Bleed every line. Venting a line pushes half its charge into the lines beside it.</div>
    <div className="flex items-end justify-center gap-3">
      {p.map((v, i) => {
        const over = !open[i] && v > LIMIT * 0.8;
        return <div key={i} className="flex w-16 flex-col items-center gap-2">
          <div className="relative h-32 w-9 overflow-hidden rounded-md border-2 border-[#2a3a6e] bg-[#070b18]">
            <div className="absolute inset-x-0 bottom-0 transition-[height] duration-200"
              style={{ height: `${Math.min(100, v / LIMIT * 100)}%`, background: open[i] ? '#2a4a60' : over ? '#ff4d6d' : '#5affd0' }} />
            <div className="absolute inset-x-0 border-t border-dashed border-[#ff4d6d]/70" style={{ bottom: '100%' }} />
          </div>
          <div className={`font-display text-sm ${flash === i ? 'text-rose' : over ? 'text-rose' : 'text-mist'}`}>{open[i] ? '—' : Math.round(v)}</div>
          <Pad className="h-11 w-14 text-[12px]" active={open[i]} disabled={open[i] || blown} onClick={() => pull(i)}>{open[i] ? 'VENT' : 'OPEN'}</Pad>
        </div>;
      })}
    </div>
  </Screen>;
}

// ── Orbital Nexus · Airlock Cycle ─────────────────────────────────────────────────────────────
// Three interlocks that must be satisfied in order. Touching a later control before its interlock
// is green drops the whole cycle back to the start, which is what an airlock actually does.
const AIRLOCK = [
  { k: 'seal', label: 'SEAL INNER', note: 'Inner hatch dogged' },
  { k: 'equalise', label: 'EQUALISE', note: 'Pressure matched to outer' },
  { k: 'cycle', label: 'CYCLE', note: 'Outer hatch released' },
] as const;
function Airlock({ done, assist }: GP) {
  const fire = useOnce(done);
  const [stage, setStage] = useState(0);
  const [bar, setBar] = useState(0);        // equalise is a hold, not a tap
  const [held, hold] = useHold();
  const [warn, setWarn] = useState('');
  const NEED = assist ? 1.1 : 1.9;

  useRaf(dt => setBar(b => Math.max(0, Math.min(NEED, held ? b + dt : b - dt * 1.3))), stage === 1);
  useEffect(() => { if (stage === 1 && bar >= NEED) { setStage(2); sfx('task_step'); } }, [bar, stage, NEED]);
  useEffect(() => { if (stage >= 3) fire(); }, [stage, fire]);
  useEffect(() => { if (!warn) return; const t = setTimeout(() => setWarn(''), 900); return () => clearTimeout(t); }, [warn]);

  const act = (i: number) => {
    if (i !== stage) { setWarn(`${AIRLOCK[i].label} interlocked — ${AIRLOCK[stage].label} first`); setStage(0); setBar(0); sfx('task_fail'); return; }
    if (i === 1) return;                      // handled by the hold
    setStage(s => s + 1); sfx('task_step');
  };

  return <Screen className="p-4">
    <div className="mb-3 flex items-center justify-between px-1">
      <div className="label">Airlock 2 · Outbound</div>
      <div className={`font-display text-[12px] ${warn ? 'text-rose' : 'text-mist'}`}>{warn || `Step ${Math.min(stage + 1, 3)} of 3`}</div>
    </div>
    <div className="flex flex-col gap-2">
      {AIRLOCK.map((s, i) => {
        const okd = stage > i, now = stage === i;
        return <div key={s.k} className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 ${okd ? 'border-lime/60 bg-lime/10' : now ? 'border-cyan bg-cyan/10' : 'border-[#2a3a6e] bg-[#0a1020]'}`}>
          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 font-display ${okd ? 'border-lime text-lime' : now ? 'border-cyan text-cyan' : 'border-[#2a3a6e] text-mist'}`}>{okd ? '✓' : i + 1}</div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm text-ink">{s.label}</div>
            <div className="truncate text-[11px] text-mist">{s.note}</div>
          </div>
          {i === 1 && now
            ? <button className="h-11 w-24 select-none rounded-xl border-2 border-cyan bg-cyan/20 font-display text-[12px] text-cyan"
                onPointerDown={e => { e.preventDefault(); hold(e); }}>HOLD</button>
            : <Pad className="h-11 w-24 text-[12px]" disabled={okd} active={now} onClick={() => act(i)}>{okd ? 'DONE' : 'ENGAGE'}</Pad>}
        </div>;
      })}
    </div>
    {stage === 1 && <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#0a1020]"><div className="h-full bg-cyan transition-[width] duration-75" style={{ width: `${bar / NEED * 100}%` }} /></div>}
  </Screen>;
}

// ── Frostfall Research · De-ice the Intake ────────────────────────────────────────────────────
// Sweep the heat wand over a frosted coil. Heat bleeds away from wherever you are not, so you have
// to work the whole grid rather than parking on one cell.
function Deice({ done, assist }: GP) {
  const fire = useOnce(done);
  const W = 6, H = 4;
  const [ice, setIce] = useState<number[]>(() => Array.from({ length: W * H }, () => 0.55 + Math.random() * 0.45));
  const at = useRef<number | null>(null);
  // The wand heats the cell under it and, at half strength, the cells it touches. Without that
  // spill a sweep could never keep ahead of the refreeze: one pass of the grid gives each cell only
  // a few frames of heat but a whole pass of refreezing, so the frost always won and the task
  // could not be finished at all.
  const MELT = assist ? 4.4 : 3.2, REFREEZE = assist ? 0.012 : 0.035;

  useRaf(dt => {
    setIce(prev => {
      const next = prev.slice(); let changed = false;
      const a = at.current;
      for (let i = 0; i < next.length; i++) {
        if (next[i] <= 0) continue;   // a cell you have cleared stays clear — otherwise the squares
                                      // you did first frost over while you work the rest, and
                                      // "all 24 clear at the same instant" never happens at all
        let rate = REFREEZE;
        if (a !== null) {
          const dx = Math.abs((i % W) - (a % W)), dy = Math.abs(Math.floor(i / W) - Math.floor(a / W));
          if (dx === 0 && dy === 0) rate = -MELT;
          else if (dx + dy === 1) rate = -MELT * 0.5;
        }
        const v = Math.max(0, Math.min(1, next[i] + rate * dt));
        if (v !== next[i]) { next[i] = v; changed = true; }
      }
      return changed ? next : prev;
    });
  });
  useEffect(() => { if (ice.every(v => v <= 0.001)) fire(); }, [ice, fire]);

  // The cell under the finger is worked out from the grid's own geometry rather than from
  // pointerenter on each cell. A touch gets implicit pointer capture on whatever it first landed
  // on, so every later move event is delivered to that one cell and the boundary events never
  // fire — dragging across the coil only ever heated the square you started on.
  const grid = useRef<HTMLDivElement>(null);
  const cellAt = (cx: number, cy: number) => {
    const el = grid.current; if (!el) return null;
    const r = el.getBoundingClientRect();
    if (cx < r.left || cy < r.top || cx > r.right || cy > r.bottom) return null;
    const gx = Math.min(W - 1, Math.max(0, Math.floor((cx - r.left) / (r.width / W))));
    const gy = Math.min(H - 1, Math.max(0, Math.floor((cy - r.top) / (r.height / H))));
    return gy * W + gx;
  };
  useEffect(() => {
    const off = () => { at.current = null; };
    const mv = (e: PointerEvent) => { if (at.current === null) return; at.current = cellAt(e.clientX, e.clientY) ?? at.current; };
    addEventListener('pointermove', mv); addEventListener('pointerup', off);
    addEventListener('pointercancel', off); addEventListener('blur', off);
    return () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', off); removeEventListener('pointercancel', off); removeEventListener('blur', off); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clear = ice.filter(v => v <= 0.001).length;
  return <Screen className="p-4">
    <div className="mb-2 flex justify-between px-1 text-[12px]"><span className="text-mist">Drag the heat wand across the coil</span><span className="font-display text-cyan">{clear}/{W * H}</span></div>
    <div ref={grid} className="grid touch-none gap-1.5" style={{ gridTemplateColumns: `repeat(${W}, minmax(0,1fr))` }}
      onPointerDown={e => { e.preventDefault(); at.current = cellAt(e.clientX, e.clientY); }}>
      {ice.map((v, i) => <div key={i} className="relative aspect-square touch-none overflow-hidden rounded-md border border-[#2a3a6e]"
        style={{ background: '#123040' }}>
        <div className="absolute inset-0" style={{ background: `rgba(226,244,255,${0.15 + v * 0.8})`, transition: 'background 60ms linear' }} />
        {v <= 0.001 && <div className="absolute inset-0 grid place-items-center text-[14px] text-lime">✓</div>}
      </div>)}
    </div>
  </Screen>;
}

// ── Abyssal Station · Sonar Sweep ─────────────────────────────────────────────────────────────
// A bearing line rotates; tag each contact as the line crosses it. Tagging empty water costs you
// the contact you were closest to, so it rewards waiting rather than spamming.
function Sonar({ done, assist }: GP) {
  const fire = useOnce(done);
  const NEED = assist ? 3 : 4;
  const ang = useRef(0);
  const [, tick] = useState(0);
  const [contacts, setContacts] = useState(() =>
    shuffle(Array.from({ length: 8 }, (_, i) => i * 45 + R(26) - 13)).slice(0, NEED).map(a => ({ a: (a + 360) % 360, got: false })));
  const [miss, setMiss] = useState(0);
  const TOL = assist ? 20 : 13;

  useRaf(dt => { ang.current = (ang.current + dt * 95) % 360; tick(t => (t + 1) % 1000); });
  useEffect(() => { if (contacts.every(c => c.got)) fire(); }, [contacts, fire]);

  const tag = () => {
    const a = ang.current;
    const i = contacts.findIndex(c => !c.got && Math.abs(((c.a - a + 540) % 360) - 180) > 180 - TOL);
    if (i >= 0) { setContacts(cs => cs.map((c, j) => j === i ? { ...c, got: true } : c)); sfx('task_step'); }
    else { setMiss(m => m + 1); sfx('task_fail'); }
  };

  const Rr = 86, cxp = 100, cyp = 100;
  return <Screen className="flex flex-col items-center p-4">
    <svg viewBox="0 0 200 200" className="h-52 w-52">
      <circle cx={cxp} cy={cyp} r={Rr} fill="#04141a" stroke="#2a6066" strokeWidth="2" />
      {[0.33, 0.66].map(f => <circle key={f} cx={cxp} cy={cyp} r={Rr * f} fill="none" stroke="#1d4a50" strokeWidth="1" />)}
      <line x1={cxp - Rr} y1={cyp} x2={cxp + Rr} y2={cyp} stroke="#1d4a50" strokeWidth="1" />
      <line x1={cxp} y1={cyp - Rr} x2={cxp} y2={cyp + Rr} stroke="#1d4a50" strokeWidth="1" />
      {contacts.map((c, i) => {
        const rad = c.a * Math.PI / 180, d = Rr * 0.62;
        return <g key={i}>
          <circle cx={cxp + Math.cos(rad) * d} cy={cyp + Math.sin(rad) * d} r={c.got ? 7 : 5}
            fill={c.got ? '#8dff7a' : '#5affd0'} opacity={c.got ? 1 : 0.55} />
        </g>;
      })}
      <line x1={cxp} y1={cyp} x2={cxp + Math.cos(ang.current * Math.PI / 180) * Rr} y2={cyp + Math.sin(ang.current * Math.PI / 180) * Rr}
        stroke="#5affd0" strokeWidth="2.5" />
    </svg>
    <div className="mt-1 mb-2 text-[12px] text-mist">Tag each contact as the bearing line crosses it{miss ? ` · ${miss} wasted ping${miss > 1 ? 's' : ''}` : ''}</div>
    <Pad className="h-14 w-40 text-base" onClick={tag}>PING</Pad>
  </Screen>;
}

// ── The Lost Colony · Clear the Intake Filters ────────────────────────────────────────────────
// Three cartridges, each: pull it, knock the dust out of it, seat it again. A cartridge left out
// starts silting up again, so you cannot pull all three and then deal with them.
function DustFilter({ done, assist }: GP) {
  const fire = useOnce(done);
  const N = 3, KNOCKS = assist ? 2 : 3;
  type F = { state: 'in' | 'out' | 'clean'; dust: number; knocks: number };
  const [f, setF] = useState<F[]>(() => Array.from({ length: N }, () => ({ state: 'in', dust: 1, knocks: 0 })));
  const SILT = assist ? 0.05 : 0.13;

  useRaf(dt => setF(prev => {
    let changed = false;
    const next = prev.map(c => {
      if (c.state !== 'out') return c;
      const d = Math.min(1, c.dust + SILT * dt);
      if (d === c.dust) return c; changed = true; return { ...c, dust: d };
    });
    return changed ? next : prev;
  }), f.some(c => c.state === 'out'));

  useEffect(() => { if (f.every(c => c.state === 'clean')) fire(); }, [f, fire]);

  const act = (i: number) => setF(prev => prev.map((c, j) => {
    if (j !== i) return c;
    if (c.state === 'in') return { ...c, state: 'out' };
    if (c.state === 'out') {
      const k = c.knocks + 1;
      const dust = Math.max(0, c.dust - 1 / KNOCKS);
      return k >= KNOCKS && dust <= 0.001 ? { state: 'clean', dust: 0, knocks: k } : { ...c, knocks: k, dust };
    }
    return c;
  }));
  const label = (c: F) => c.state === 'in' ? 'PULL' : c.state === 'out' ? 'KNOCK' : 'SEATED';

  return <Screen className="p-4">
    <div className="mb-3 text-center text-[12px] text-mist">Pull each cartridge, knock the dust out, and it re-seats itself. Out in the air, they silt up again.</div>
    <div className="flex justify-center gap-4">
      {f.map((c, i) => <div key={i} className="flex w-24 flex-col items-center gap-2">
        <div className={`relative h-28 w-full overflow-hidden rounded-lg border-2 ${c.state === 'clean' ? 'border-lime' : c.state === 'out' ? 'border-amber' : 'border-[#2a3a6e]'} bg-[#0a1020]`}
          style={{ transform: c.state === 'out' ? 'translateY(-6px)' : 'none', transition: 'transform 120ms' }}>
          <div className="absolute inset-x-0 bottom-0" style={{ height: `${c.dust * 100}%`, background: 'linear-gradient(#caa072,#8a6440)', transition: 'height 120ms' }} />
          {[0, 1, 2, 3].map(k => <div key={k} className="absolute inset-x-1 h-[2px] bg-[#2a3a6e]/80" style={{ top: `${18 + k * 20}%` }} />)}
          {c.state === 'clean' && <div className="absolute inset-0 grid place-items-center font-display text-2xl text-lime">✓</div>}
        </div>
        <Pad className="h-11 w-full text-[11px]" disabled={c.state === 'clean'} active={c.state === 'out'} onClick={() => act(i)}>{label(c)}</Pad>
      </div>)}
    </div>
  </Screen>;
}

// ── Helios Dreadnought · Load the Tubes ───────────────────────────────────────────────────────
// Each tube is keyed to one ordnance type. Drag the right round from the rack into the right tube;
// a wrong round bounces and the rack reshuffles, so read the tube before you commit.
const ORD = [
  { k: 'HE', col: '#ff8b4a' }, { k: 'AP', col: '#55b6ff' },
  { k: 'EM', col: '#a77bff' }, { k: 'IN', col: '#8dff7a' },
] as const;
function TorpedoLoad({ done, assist }: GP) {
  const fire = useOnce(done);
  const N = assist ? 3 : 4;
  const [tubes] = useState(() => shuffle(ORD.map(o => o.k)).slice(0, N));
  const [loaded, setLoaded] = useState<string[]>(() => Array(N).fill(''));
  const [rack, setRack] = useState(() => shuffle(ORD.map(o => o.k)));
  const [pick, setPick] = useState<string>('');
  const [bump, setBump] = useState(-1);

  useEffect(() => { if (loaded.every(Boolean)) fire(); }, [loaded, fire]);
  useEffect(() => { if (bump < 0) return; const t = setTimeout(() => setBump(-1), 450); return () => clearTimeout(t); }, [bump]);

  const intoTube = (i: number) => {
    if (!pick || loaded[i]) return;
    if (pick !== tubes[i]) { setBump(i); setPick(''); setRack(r => shuffle(r)); sfx('task_fail'); return; }
    setLoaded(l => l.map((v, j) => j === i ? pick : v)); setPick(''); sfx('task_step');
  };
  const col = (k: string) => ORD.find(o => o.k === k)?.col || '#8a90a0';

  return <Screen className="p-4">
    <div className="mb-3 text-center text-[12px] text-mist">Each tube takes one ordnance type. Select a round, then the tube.</div>
    <div className="mb-4 flex justify-center gap-3">
      {tubes.map((t, i) => <div key={i} {...onPress(() => intoTube(i))}
        className={`grid h-24 w-20 cursor-pointer place-items-center rounded-lg border-2 ${loaded[i] ? 'border-lime bg-lime/10' : 'border-[#3a3d48] bg-[#14161e]'}`}
        style={{ transform: bump === i ? 'translateY(4px)' : 'none', transition: 'transform 120ms' }}>
        <div className="text-center">
          <div className="label text-[10px]">TUBE {i + 1}</div>
          <div className="font-display text-xl" style={{ color: col(t) }}>{t}</div>
          <div className="mt-1 h-2 w-12 rounded-full" style={{ background: loaded[i] ? col(t) : '#2a2d38' }} />
        </div>
      </div>)}
    </div>
    <div className="label mb-1 text-center">Ready rack</div>
    <div className="flex justify-center gap-2">
      {rack.map(k => <Pad key={k} className="h-12 w-16 text-[13px]" active={pick === k} onClick={() => setPick(k)}>
        <span style={{ color: pick === k ? undefined : col(k) }}>{k}</span>
      </Pad>)}
    </div>
  </Screen>;
}

export const ALL4: Record<string, React.FC<GP>> = {
  valve: Valve, airlock: Airlock, deice: Deice, sonar: Sonar, dust_filter: DustFilter, torpedo_load: TorpedoLoad,
};
