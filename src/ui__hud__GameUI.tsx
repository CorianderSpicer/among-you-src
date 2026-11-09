import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from './store__game';
import { useHud } from './store__hud';
import { useApp } from './store__app';
import { rt } from './game__runtime';
import { ROLE, FACTION_COLOR } from './game__roles__roles';
import { GAMES, TASKS } from './game__tasks__tasks';
import { SAB_NAME, EVENT_NAME } from './game__sim__sim';
import { roomName } from './game__maps__builder';
import { doAction, useAbility } from './game__actions';
import { Minimap } from './ui__hud__Minimap';
import { Panels } from './ui__hud__Panels';
import { Intro, Killed, PersonalWin, EscMenu, RoleCard, ChatPanel } from './ui__hud__Overlays';
import { MeetingUI, Ejection } from './ui__meetings__Meeting';
import { EndScreen } from './ui__end__EndScreen';
import { MinigameHost } from './ui__tasks__Minigames';
import { TouchControls } from './ui__hud__Touch';
import { sfx } from './game__audio__audio';
import { IconUse, IconReport, IconKill, IconVent, IconSab } from './ui__common__Icons';

export function GameUI() {
  const view = useGame(s => s.view); const G = useGame();
  const [esc, setEsc] = useState(false);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.code === 'Escape' && !G.minigame && !G.panel) setEsc(v => !v); }; addEventListener('keydown', h); return () => removeEventListener('keydown', h); }, [G.minigame, G.panel]);
  const phNow = view?.ph; useEffect(() => { if (phNow === 'meeting' || phNow === 'ended') setEsc(false); }, [phNow]);
  if (!view) return null;
  const ph = view.ph;
  return (
    <div className="absolute inset-0">
      {(ph === 'play' || ph === 'intro') && <Hud onMenu={() => setEsc(true)} />}
      <TouchControls />
      <Panels />
      <AnimatePresence>{G.minigame && <MinigameHost key={G.minigame.spot} />}</AnimatePresence>
      <AnimatePresence>{(ph === 'intro' || G.intro) && G.role && <Intro key="intro" />}</AnimatePresence>
      <AnimatePresence>{G.killed && <Killed key="killed" />}</AnimatePresence>
      <AnimatePresence>{(ph === 'meeting' || (G.meetingIntro && ph !== 'ejection' && ph !== 'play' && ph !== 'ended')) && <MeetingUI key="meeting" />}</AnimatePresence>
      <AnimatePresence>{G.ejection && ph === 'ejection' && <Ejection key="ej" />}</AnimatePresence>
      <AnimatePresence>{G.personalWin && <PersonalWin key="pw" />}</AnimatePresence>
      <AnimatePresence>{G.end && <EndScreen key="end" />}</AnimatePresence>
      <EscMenu open={esc} onClose={() => setEsc(false)} />
      <ConnBanner />
    </div>
  );
}

function ConnBanner() { const rc = useGame(s => s.reconnecting); return <AnimatePresence>{rc && <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} className="glass-dark fixed left-1/2 top-3 z-[70] -translate-x-1/2 border-amber/70 px-5 py-2.5 font-display text-amber">Connection lost — reconnecting…</motion.div>}</AnimatePresence>; }

function Hud({ onMenu }: { onMenu: () => void }) {
  const view = useGame(s => s.view)!; const role = useGame(s => s.role); const H = useHud(); const G = useGame(); const [tasksOpen, setTasksOpen] = useState(innerWidth > 700); const [card, setCard] = useState(false);
  const me = view.me; const R = ROLE[me.role]; const m = rt.map; const touch = useApp(s => s.prefs) && matchMedia('(pointer: coarse)').matches;
  const comms = view.sab?.id === 'comms' || view.sab?.extra === 'comms';
  return (
    <>
      {/* top-left: role + tasks */}
      <div className="pe absolute left-3 top-3 flex w-[min(320px,calc(100vw-180px))] flex-col gap-2" style={{ paddingLeft: 'env(safe-area-inset-left)' }}>
        <button onClick={() => { sfx('open'); setCard(true); }} className="glass-dark flex items-center gap-3 px-3 py-2 text-left hover:border-white/30" data-testid="role-chip">
          <span className="grid h-9 w-9 place-items-center rounded-lg font-display text-xl" style={{ background: R.color + '33', color: R.color, boxShadow: `0 0 14px ${R.color}55` }}>{R.glyph}</span>
          <span className="min-w-0"><span className="block font-display text-[15px] font-bold uppercase tracking-wider" style={{ color: R.color }}>{R.name}</span><span className="block truncate text-[11.5px] text-mist">{me.ghost ? 'Ghost · finish tasks & watch' : R.blurb}</span></span>
        </button>
        {view.bar >= 0 && <div className="glass-dark px-3 py-2"><div className="mb-1 flex justify-between font-display text-[11px] uppercase tracking-[0.15em] text-mist"><span>Total tasks</span><span>{Math.round(view.bar * 100)}%</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-void/80"><motion.div className="h-full rounded-full bg-gradient-to-r from-lime to-[#2fd16a]" animate={{ width: `${view.bar * 100}%` }} transition={{ type: 'spring', stiffness: 80 }} /></div></div>}
        <div className="glass-dark overflow-hidden">
          <button className="flex w-full items-center justify-between px-3 py-2 font-display text-[12px] uppercase tracking-[0.15em] text-mist" onClick={() => setTasksOpen(v => !v)}>{me.fake ? 'Fake tasks' : 'Tasks'} <span>{tasksOpen ? '−' : '+'}</span></button>
          <AnimatePresence>{tasksOpen && <motion.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="scroll-y max-h-[38vh] px-3 pb-2.5 text-[13px]">
            {comms && me.alive ? <li className="text-crimson anim-blink">Comms disrupted — task list unavailable</li> : me.tasks.map((t, i) => { const def = TASKS.find(x => x.id === t.id); const sp = m.byId[t.steps[t.step]]; const where = sp ? roomName(m, sp.room) : '';
              return <li key={i} className={`py-0.5 ${t.done ? 'text-lime/80 line-through decoration-lime/40' : t.step > 0 ? 'text-amber' : 'text-ink/90'}`}><b className="font-semibold">{where}</b>: {def?.name}{t.steps.length > 1 ? ` (${t.done ? t.steps.length : t.step}/${t.steps.length})` : ''}</li>; })}
            {me.role === 'relic' && <li className="text-[#ffe08a]">Relics: {me.relics}/4 {me.relics! >= 4 ? '— reach the beacon!' : ''}</li>}
            {me.role === 'bounty' && <li className="text-[#d9a930]">{me.done ? 'Contract complete ✓' : `Contract: ${rt.roster[me.bounty ?? -1]?.name ?? '—'}`}</li>}
            {role?.goal && <li className="text-violet">Objective: {role.goal}</li>}
          </motion.ul>}</AnimatePresence>
        </div>
        <Results />
      </div>
      {/* top-right: minimap + menu */}
      <div className="pe absolute right-3 top-3 flex flex-col items-end gap-2" style={{ paddingRight: 'env(safe-area-inset-right)' }}>
        <div className="flex gap-2">
          {rt.mode === 'guest' && <span className="chip"><span className={`h-2 w-2 rounded-full ${G.rtt < 90 ? 'bg-lime' : G.rtt < 200 ? 'bg-amber' : 'bg-crimson'}`} />{G.rtt} ms</span>}
          <button onClick={() => { sfx('open'); onMenu(); }} className="glass-dark grid h-9 w-9 place-items-center text-cyan hover:border-cyan/60" aria-label="Menu" data-testid="menu-btn">☰</button>
        </div>
        <button onClick={() => doAction('map')} className="glass-dark p-1.5 hover:border-cyan/50" data-testid="minimap"><Minimap size={innerWidth < 700 ? 130 : 200} labels={false} /></button>
        <div className="flex items-center gap-1.5"><button className="glass-dark grid h-7 w-7 place-items-center text-cyan" onClick={() => dispatchEvent(new CustomEvent('ay:zoom', { detail: -1 }))} aria-label="Zoom out">−</button><button className="glass-dark grid h-7 w-7 place-items-center text-cyan" onClick={() => dispatchEvent(new CustomEvent('ay:zoom', { detail: 1 }))} aria-label="Zoom in">+</button>
          <AnimatePresence mode="wait"><motion.div key={H.room} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="glass-dark px-3 py-1 font-display text-[12px] uppercase tracking-[0.15em] text-ink/90">{roomName(m, H.room)}</motion.div></AnimatePresence></div>
        {me.ghost && <Spectate />}
        {m.restricted.length > 0 && <div className={`glass-dark px-3 py-1 font-display text-[11px] uppercase tracking-[0.12em] ${me.access ? 'text-lime' : 'text-amber'}`}>{me.access ? 'Keycard ✓' : 'No keycard · get one in Tactical'}</div>}
      </div>
      <SabBanner />
      {/* bottom-right actions */}
      <Actions />
      <RoleCardModal open={card} onClose={() => setCard(false)} />
    </>
  );
}

function Spectate() {
  const v = useGame(s => s.view)!; const spec = useGame(s => s.spectate); const roster = useGame(s => s.roster); const set = useGame(s => s.set);
  const living = v.pl.filter(p => p.al && !p.gh && p.s < 1000).map(p => p.s).sort((a, b) => a - b); const cur = spec !== null && living.includes(spec) ? spec : null;
  const cycle = (d: number) => { if (!living.length) return; const i = cur === null ? (d > 0 ? 0 : living.length - 1) : (living.indexOf(cur) + d + living.length) % living.length; set({ spectate: living[i] }); sfx('toggle'); };
  return <div className="glass-dark flex items-center gap-2 px-2 py-1 text-[12px]" data-testid="spectate"><span className="label">Spectate</span><button className="text-cyan" onClick={() => cycle(-1)}>◀</button><span className="min-w-[80px] text-center font-semibold">{cur === null ? 'Free roam' : roster[cur]?.name}</span><button className="text-cyan" onClick={() => cycle(1)}>▶</button>{cur !== null && <button className="text-mist" onClick={() => set({ spectate: null })}>✕</button>}</div>;
}
function RoleCardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useGame(s => s.view?.me); if (!me) return null;
  return <AnimatePresence>{open && <motion.div className="pe fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()}><RoleCard id={me.role} /></motion.div></motion.div>}</AnimatePresence>;
}

function Results() {
  const res = useGame(s => s.results); const [, force] = useState(0); useEffect(() => { const i = setInterval(() => force(x => x + 1), 1000); return () => clearInterval(i); }, []);
  const live = res.filter(r => Date.now() - r.t < 20000);
  return <AnimatePresence>{live.map(r => <motion.div key={r.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="glass-dark border-l-4 border-cyan px-3 py-2 text-[13px]"><div className="label mb-0.5 text-cyan">{r.kind}</div>{r.text}</motion.div>)}</AnimatePresence>;
}

function SabBanner() {
  const v = useGame(s => s.view)!; const [, f] = useState(0); useEffect(() => { const i = setInterval(() => f(x => x + 1), 250); return () => clearInterval(i); }, []);
  const s = v.sab; const ev = v.ev && v.ev.until > v.t ? v.ev : null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>{s && <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }} className={`glass-dark flex items-center gap-3 px-5 py-2.5 ${s.until ? 'border-crimson/80 shadow-[0_0_30px_rgba(255,77,109,.45)]' : 'border-amber/70'}`}>
        <span className={`font-display text-lg ${s.until ? 'text-crimson anim-blink' : 'text-amber'}`}>⚠</span>
        <div><div className={`h-display text-[15px] uppercase tracking-wider ${s.until ? 'text-crimson' : 'text-amber'}`}>{SAB_NAME[s.id]}{s.extra ? ' + ' + SAB_NAME[s.extra] : ''}</div>
          <div className="text-[12px] text-ink/80">{s.id === 'reactor' ? `Two crewmates must hold both scanners · ${s.spots.filter(x => (s.holds[x] || 0) > 0).length}/2 held` : s.spots.length > 1 ? `Repair all panels · ${s.done.length}/${s.spots.length}` : 'Repair the flashing panel'}</div></div>
        {s.until && <div className="ml-2 font-display text-2xl font-bold tabular-nums text-crimson">{Math.max(0, Math.ceil(s.until - v.t))}</div>}
      </motion.div>}</AnimatePresence>
      <AnimatePresence>{ev && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-dark px-4 py-1.5 font-display text-[12.5px] uppercase tracking-wider text-sky-300">◈ {EVENT_NAME[ev.id]}</motion.div>}</AnimatePresence>
    </div>
  );
}

function ActBtn({ label, icon, onClick, disabled, cd, variant = 'ghost', hot, testid, badge, size = 74 }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; cd?: number; variant?: 'ghost' | 'danger' | 'primary' | 'amber' | 'violet'; hot?: boolean; testid?: string; badge?: string | number | null; size?: number }) {
  const C = { ghost: 'from-[#2a3a6e] to-[#141d3c] border-[#5b72b8]/50 text-ink', danger: 'from-[#ff6d86] to-[#b81f3c] border-[#ffb0be]/60 text-white', primary: 'from-[#4ff7e7] to-[#159d93] border-[#9ffcf3]/60 text-[#04131a]', amber: 'from-[#ffc970] to-[#d07d14] border-[#ffe1a8]/60 text-[#2a1600]', violet: 'from-[#b993ff] to-[#6a3ad0] border-[#dcc8ff]/60 text-white' };
  const off = disabled || (cd ?? 0) > 0;
  return (
    <motion.button data-testid={testid} whileHover={off ? {} : { scale: 1.06 }} whileTap={off ? {} : { scale: 0.92 }} onMouseEnter={() => !off && sfx('hover')} onClick={() => { if (!off) { onClick(); } }}
      className={`pe relative grid place-items-center rounded-2xl border-2 bg-gradient-to-b ${C[variant]} ${off ? 'opacity-35 grayscale' : ''} ${hot && !off ? 'shadow-[0_0_24px_rgba(255,255,255,.35)]' : ''}`} style={{ width: size, height: size }}>
      <span className="-mt-3 text-[26px] leading-none">{icon}</span>
      <span className="absolute bottom-1.5 font-display text-[10.5px] font-bold uppercase tracking-wider">{label}</span>
      {(cd ?? 0) > 0 && <span className="absolute inset-0 grid place-items-center rounded-2xl bg-black/55 font-display text-2xl font-bold text-white">{Math.ceil(cd!)}</span>}
      {badge !== null && badge !== undefined && <span className="absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full border border-white/40 bg-panel px-1 font-display text-[11px] text-ink">{badge}</span>}
    </motion.button>
  );
}

function Actions() {
  const v = useGame(s => s.view)!; const H = useHud(); const me = v.me; const R = ROLE[me.role]; const ab = R.ability; const touch = matchMedia('(pointer: coarse)').matches; const sz = innerWidth < 520 ? 56 : touch ? 70 : 74;
  if (v.ph !== 'play') return null;
  const useLbl = H.use ? (H.use.kind === 'task' || H.use.kind === 'fake' ? 'Use' : H.use.kind === 'fix' ? 'Repair' : H.use.kind === 'emergency' ? 'Call' : H.use.kind === 'cams' ? 'Cams' : H.use.kind === 'admin' ? 'Admin' : H.use.kind === 'logs' ? 'Logs' : 'Use') : 'Use';
  return (
    <div className="pe absolute bottom-4 right-4 flex flex-col items-end gap-2.5" style={{ paddingRight: 'env(safe-area-inset-right)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {H.use && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass-dark px-3 py-1 text-[12.5px] text-ink/90">{H.use.label}</motion.div>}
      <div className="flex items-end gap-2.5">
        {ab && !ab.meeting && me.alive && me.role !== 'engineer' && <ActBtn testid="btn-ability" size={sz} label={ab.name.split(' ')[0]} icon={<span className="font-display text-[30px] font-bold" style={{ color: '#fff', textShadow: `0 0 12px ${R.color}` }}>{R.glyph}</span>} variant="violet" onClick={() => useAbility()} cd={me.acd} disabled={me.jam > 0 || (me.uses !== null && me.uses <= 0) || (me.role === 'security' && (me.battery ?? 0) < 1)} badge={me.uses !== null ? me.uses : me.role === 'security' ? Math.floor(me.battery ?? 0) + 's' : me.active > 0 ? Math.ceil(me.active) + 's' : null} />}
        {me.faction === 'infiltrator' && me.alive && <ActBtn testid="btn-sabotage" size={sz} label="Sabotage" icon={<IconSab />} variant="amber" onClick={() => doAction('sabotage')} cd={me.scd} />}
        {R.vents && me.alive && <ActBtn testid="btn-vent" size={sz} label={me.vent ? 'Exit' : 'Vent'} icon={<IconVent />} onClick={() => doAction('vent')} disabled={!H.vent} hot={!!H.vent} />}
      </div>
      <div className="flex items-end gap-2.5">
        {me.alive && <ActBtn testid="btn-report" size={sz} label="Report" icon={<IconReport />} variant="danger" onClick={() => doAction('report')} disabled={H.report === null} hot={H.report !== null} />}
        {R.kills && me.alive && <ActBtn testid="btn-kill" size={sz} label={me.role === 'bounty' ? 'Contract' : 'Eliminate'} icon={<IconKill />} variant="danger" onClick={() => doAction('kill')} cd={me.kcd} disabled={H.kill === null} hot={H.kill !== null} />}
        <ActBtn testid="btn-use" size={sz + 10} label={useLbl} icon={<IconUse />} variant="primary" onClick={() => doAction('use')} disabled={!H.use} hot={!!H.use} />
      </div>
    </div>
  );
}
