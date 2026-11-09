import { useSticky } from './ui__common__sticky';
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from './store__game';
import { rt } from './game__runtime';
import { portrait } from './game__art__chars';
import { ROLES, ROLE } from './game__roles__roles';
import { Btn } from './ui__common__kit';
import { ChatPanel } from './ui__hud__Overlays';
import { GlimCanvas } from './ui__common__GlimCanvas';
import { COLORS } from './game__core__constants';
import { sfx } from './game__audio__audio';

export function MeetingUI() {
  const G = useGame(); const v = G.view; const mt = v?.meeting; const intro = G.meetingIntro; const [now, setNow] = useState(0); const [sel, setSel] = useState<number | 'skip' | null>(null); const [guess, setGuess] = useState<number | null>(null);
  useEffect(() => { const i = setInterval(() => setNow(x => x + 1), 200); return () => clearInterval(i); }, []);
  const [showIntro, setShowIntro] = useState(true); useEffect(() => { const t = setTimeout(() => setShowIntro(false), 3000); return () => clearTimeout(t); }, [intro?.caller, intro?.body]);
  const roster = G.roster; const me = v?.me;
  if (showIntro && intro) return <MeetingIntro intro={intro} />;
  if (!v || !mt || !me) return null;
  const t = v.t; const discussing = t < mt.discussEnd; const left = Math.max(0, Math.ceil((discussing ? mt.discussEnd : mt.voteEnd) - t)); const res = mt.result; const iVoted = mt.myVote !== null && mt.myVote !== undefined;
  const all = [...mt.alive, ...mt.dead].filter(s => roster[s]); const canVote = me.alive && !discussing && !iVoted && !res;
  const vote = (target: number | 'skip') => { rt.act({ k: 'vote', target }); setSel(null); sfx('vote'); };
  const votesFor = (s: number | 'skip') => res ? res.votes.filter(([, x]) => x === s).map(([voter]) => voter) : [];
  const psych = me.role === 'psychologist' && me.alive && (me.uses ?? 0) > 0; const assassin = me.role === 'assassin' && me.alive && (me.uses ?? 0) > 0;
  return (
    <motion.div className="pe fixed inset-0 z-50 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'radial-gradient(ellipse at 50% 0%, #1c2a5a 0%, #070b1a 60%, #04060e 100%)' }}>
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(110,140,220,.08) 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, rgba(110,140,220,.08) 0 1px, transparent 1px 28px)' }} />
      <div className="relative mx-auto flex min-h-full max-w-[1280px] flex-col gap-4 p-4 lg:flex-row lg:p-6">
        <div className="flex-1">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><div className="label text-cyan">{intro?.kind === 'report' ? 'Body reported' : 'Emergency meeting'} · called by {roster[mt.caller]?.name}</div><h2 className="h-display text-3xl text-ink">Who is the infiltrator?</h2></div>
            <div className={`glass-dark flex items-center gap-3 px-4 py-2 ${!discussing && left <= 10 && !res ? 'border-crimson/70' : ''}`}>
              <span className="label">{res ? 'Results' : discussing ? 'Discussion' : 'Voting ends'}</span>
              {!res && <span className={`font-display text-3xl font-bold tabular-nums ${!discussing && left <= 10 ? 'text-crimson anim-blink' : 'text-cyan'}`} data-testid="meeting-timer">{left}</span>}
            </div>
          </div>
          {!me.alive && <div className="glass-dark mb-3 px-4 py-2 text-[13.5px] text-mist">You are dead — you can watch, but you cannot vote. Ghost messages are only visible to other ghosts.</div>}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {all.map((s, i) => { const r = roster[s]; const dead = mt.dead.includes(s); const voted = mt.voted.includes(s); const isSel = sel === s; const isEj = res && res.ejected === s;
              return (
                <motion.div key={s} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} data-testid={'card-' + s}
                  onClick={() => { if (canVote && !dead) { setSel(s); sfx('click'); } }}
                  className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3 py-2.5 transition-colors ${dead ? 'border-edge/40 bg-void/40 opacity-55' : isSel ? 'border-cyan bg-cyan/15 shadow-glow' : canVote ? 'cursor-pointer border-edge/70 bg-hull/80 hover:border-cyan/50' : 'border-edge/70 bg-hull/70'} ${isEj ? 'border-crimson shadow-[0_0_24px_rgba(255,77,109,.5)]' : ''}`}>
                  <img src={portrait(r.cos, 96, { dead })} className="h-14 w-14 shrink-0" />
                  <div className="min-w-0 flex-1"><div className="truncate font-display text-[16px] font-semibold" style={{ color: me.faction === 'infiltrator' && G.role?.team.includes(s) ? '#ff6d86' : '#e8eeff' }}>{r.name}{s === rt.slot ? ' (you)' : ''}</div>
                    <div className="text-[11.5px] text-mist">{dead ? 'Eliminated' : s === mt.caller ? 'Called the meeting' : COLORS[r.cos.color].name}</div>
                    {res && <div className="mt-1 flex flex-wrap gap-0.5">{votesFor(s).map((vs, k) => <motion.img key={k} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + k * 0.25 }} src={vs >= 0 && roster[vs] ? portrait(roster[vs].cos, 40) : portrait({ ...r.cos, color: 13, hat: 'none' }, 40)} className="h-6 w-6" />)}</div>}
                  </div>
                  {voted && !res && <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} className="absolute right-2 top-2 rounded-md bg-lime/90 px-1.5 py-0.5 font-display text-[10px] font-bold uppercase text-black">voted</motion.span>}
                  {dead && <span className="absolute right-3 font-display text-3xl text-crimson/80">✕</span>}
                  {!dead && !res && s !== rt.slot && (psych || assassin) && <div className="absolute bottom-1.5 right-2 flex gap-1">
                    {psych && <button className="rounded-md bg-violet/30 px-2 py-0.5 text-[10.5px] font-bold uppercase text-violet hover:bg-violet/50" onClick={e => { e.stopPropagation(); rt.act({ k: 'session', target: s }); }}>Read ψ</button>}
                    {assassin && <button className="rounded-md bg-crimson/30 px-2 py-0.5 text-[10.5px] font-bold uppercase text-crimson hover:bg-crimson/50" onClick={e => { e.stopPropagation(); setGuess(s); }}>Guess ⚔</button>}</div>}
                  <AnimatePresence>{isSel && canVote && <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="ml-auto flex gap-1.5"><button data-testid="vote-confirm" onClick={e => { e.stopPropagation(); vote(s); }} className="grid h-10 w-10 place-items-center rounded-xl bg-lime font-bold text-black">✓</button><button onClick={e => { e.stopPropagation(); setSel(null); }} className="grid h-10 w-10 place-items-center rounded-xl bg-crimson font-bold text-white">✕</button></motion.div>}</AnimatePresence>
                </motion.div>);
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {me.alive && !res && <Btn testid="vote-skip" disabled={!canVote} variant={sel === 'skip' ? 'primary' : 'ghost'} onClick={() => sel === 'skip' ? vote('skip') : setSel('skip')}>{sel === 'skip' ? 'Confirm skip' : 'Skip vote'}</Btn>}
            {iVoted && !res && <span className="text-[14px] text-lime">Vote locked in ✓</span>}
            {discussing && <span className="text-[13.5px] text-mist">Voting opens in {left} s — talk it out.</span>}
            {res && <div className="flex items-center gap-2"><span className="label">Skipped</span>{votesFor('skip').map((vs, k) => <img key={k} src={vs >= 0 && roster[vs] ? portrait(roster[vs].cos, 40) : portrait({ ...roster[rt.slot].cos, color: 13 }, 40)} className="h-6 w-6" />)}</div>}
          </div>
          <MeetingResults />
        </div>
        <div className="glass flex h-[46vh] w-full flex-col p-3 lg:h-[calc(100vh-48px)] lg:w-[380px]"><div className="label mb-2">Discussion</div><ChatPanel className="flex-1" /></div>
      </div>
      <GuessModal target={guess} onClose={() => setGuess(null)} />
    </motion.div>
  );
}
function MeetingResults() { const res = useGame(s => s.results); const recent = res.filter(r => r.kind === 'session' && Date.now() - r.t < 60000); return <>{recent.map(r => <div key={r.id} className="glass-dark mt-3 border-l-4 border-violet px-4 py-2 text-[14px]"><span className="label mr-2 text-violet">Session</span>{r.text}</div>)}</>; }
function GuessModal({ target, onClose }: { target: number | null; onClose: () => void }) {
  const roster = useGame(s => s.roster); const opts = ROLES.filter(r => r.id !== 'crewmate');
  return <AnimatePresence>{target !== null && <motion.div className="pe fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <div className="glass max-h-[80vh] w-[min(720px,96vw)] overflow-y-auto p-4" onClick={e => e.stopPropagation()}><div className="label mb-1 text-crimson">Assassin’s guess</div><div className="mb-3 text-[14px] text-ink/85">Guess <b>{roster[target]?.name}</b>’s exact role. Right — they die. Wrong — you die.</div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">{opts.map(r => <button key={r.id} onClick={() => { rt.act({ k: 'guess', target, role: r.id }); onClose(); }} className="flex items-center gap-2 rounded-lg border border-edge/60 bg-void/50 px-2.5 py-1.5 text-left text-[13px] hover:border-crimson/70"><span style={{ color: r.color }}>{r.glyph}</span>{r.name}</button>)}</div></div>
  </motion.div>}</AnimatePresence>;
}
function MeetingIntro({ intro }: { intro: { caller: number; body: number | null; kind: string } }) {
  const roster = useGame(s => s.roster); const report = intro.kind === 'report'; const caller = roster[intro.caller]; const body = intro.body !== null ? roster[intro.body] : null;
  return (
    <motion.div className="pe fixed inset-0 z-50 grid place-items-center overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: report ? 'radial-gradient(circle, #3a0a18 0%, #0a0208 70%)' : 'radial-gradient(circle, #3a2a06 0%, #0a0702 70%)' }}>
      <motion.div className="absolute inset-0" animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ repeat: Infinity, duration: 0.8 }} style={{ background: `repeating-conic-gradient(from 0deg at 50% 50%, ${report ? 'rgba(255,77,109,.12)' : 'rgba(255,181,71,.12)'} 0 10deg, transparent 10deg 20deg)` }} />
      <div className="relative flex flex-col items-center text-center">
        <motion.div initial={{ scale: 3, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} className="h-display text-[clamp(44px,8vw,92px)] leading-none" style={{ color: report ? '#ff4d6d' : '#ffb547', textShadow: `0 0 40px ${report ? '#ff4d6d' : '#ffb547'}` }}>{report ? 'BODY REPORTED' : 'EMERGENCY MEETING'}</motion.div>
        <div className="mt-6 flex items-end gap-8">
          {caller && <motion.div initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-col items-center"><GlimCanvas cos={caller.cos} size={170} anims={['idle']} eye="wide" /><span className="font-display text-ink">{caller.name}</span></motion.div>}
          {body && <motion.div initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-col items-center"><img src={portrait(body.cos, 150, { dead: true })} className="h-36 w-36 opacity-90" /><span className="font-display text-crimson">{body.name}</span></motion.div>}
        </div>
      </div>
    </motion.div>
  );
}

export function Ejection() {
  const ej = useSticky(useGame(s => s.ejection))!; const [typed, setTyped] = useState(''); const full = ej.text;
  useEffect(() => { let i = 0; const t = setInterval(() => { i++; setTyped(full.slice(0, i)); if (i % 2) sfx('type'); if (i >= full.length) clearInterval(t); }, 55); return () => clearInterval(t); }, [full]);
  const stars = useMemo(() => Array.from({ length: 90 }, () => ({ x: Math.random() * 100, y: Math.random() * 100, s: Math.random() * 2 + 0.5, d: 2 + Math.random() * 4 })), []);
  return (
    <motion.div className="pe fixed inset-0 z-[52] overflow-hidden bg-[#02030a]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.8 } }}>
      {stars.map((s, i) => <motion.span key={i} className="absolute rounded-full bg-white" style={{ top: `${s.y}%`, width: s.s, height: s.s }} initial={{ left: `${s.x + 100}%` }} animate={{ left: `${s.x - 20}%` }} transition={{ duration: s.d * 3, ease: 'linear', repeat: Infinity }} />)}
      {ej.cos && <motion.div className="absolute top-[38%]" initial={{ left: '-20%', rotate: 0 }} animate={{ left: '120%', rotate: 720 }} transition={{ duration: 6, ease: 'linear' }}><GlimCanvas cos={ej.cos} size={170} anims={['idle']} eye="sad" showPet={false} /></motion.div>}
      <div className="absolute inset-x-0 top-[62%] text-center"><div className="h-display text-[clamp(26px,4vw,44px)] text-ink" data-testid="eject-text">{typed}<span className="anim-blink">▍</span></div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: full.length * 0.055 + 0.4 }} className="mt-2 text-[17px] text-mist">{ej.sub}</motion.div></div>
    </motion.div>
  );
}
