import { useSticky } from './ui__common__sticky';
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from './store__game';
import { useApp } from './store__app';
import { rt } from './game__runtime';
import { ROLE, FACTION_COLOR } from './game__roles__roles';
import { portrait } from './game__art__chars';
import { GlimCanvas } from './ui__common__GlimCanvas';
import { Btn, Modal, Panel } from './ui__common__kit';
import { SettingsBody } from './ui__settings__Settings';
import { blurField, fullscreenSupported, isFullscreen, toggleFullscreen } from './game__viewport';
import { COLORS } from './game__core__constants';
import { sfx } from './game__audio__audio';

export function RoleCard({ id, compact }: { id: string; compact?: boolean }) {
  const R = ROLE[id]; const fc = FACTION_COLOR[R.faction];
  return (
    <div className="glass brackets pe w-[min(520px,calc(100vw-32px))] p-5" style={{ borderColor: R.color + '66' }}>
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl font-display text-4xl" style={{ background: R.color + '22', color: R.color, boxShadow: `0 0 30px ${R.color}55, inset 0 0 0 1px ${R.color}66` }}>{R.glyph}</span>
        <div><div className="label" style={{ color: fc }}>{R.faction === 'crew' ? 'Crew' : R.faction === 'infiltrator' ? 'Infiltrator' : 'Neutral'}</div><div className="h-display text-3xl" style={{ color: R.color }}>{R.name}</div><div className="text-[14px] text-ink/85">{R.blurb}</div></div>
      </div>
      {!compact && <div className="mt-4 grid gap-2.5 text-[13.5px]">
        {R.ability && <Row k="Ability" v={<><b className="text-ink">{R.ability.name}</b> — {R.ability.desc} <span className="text-mist">({R.ability.cd ? `${R.ability.cd}s cooldown` : 'no cooldown'}{R.ability.dur ? ` · ${R.ability.dur}s` : ''}{R.ability.uses ? ` · ${R.ability.uses} use${R.ability.uses > 1 ? 's' : ''}${R.ability.perRound ? ' per round' : ''}` : ''})</span></>} />}
        {R.passive && <Row k="Passive" v={R.passive} />}
        {R.kills && <Row k="Eliminate" v={id === 'bounty' ? 'Only your contract target.' : 'Eliminate crew within range when your cooldown is ready. Use vents to escape.'} />}
        <Row k="Limits" v={R.limits} /><Row k="Counterplay" v={R.counter} /><Row k="Win" v={R.win} />
      </div>}
    </div>
  );
}
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="grid grid-cols-[96px_1fr] gap-3"><span className="label pt-0.5">{k}</span><span className="text-ink/85">{v}</span></div>;

export function Intro() {
  const role = useSticky(useGame(s => s.role))!; const R = ROLE[role.role]; const set = useGame(s => s.set); const roster = useGame(s => s.roster); const view = useGame(s => s.view);
  useEffect(() => { const t = setTimeout(() => set({ intro: false }), 5600); return () => clearTimeout(t); }, []);
  const team = role.faction === 'infiltrator' ? role.team : role.faction === 'crew' ? Object.keys(roster).map(Number).filter(s => roster[s]) : [rt.slot];
  const fc = FACTION_COLOR[role.faction];
  return (
    <motion.div className="pe fixed inset-0 z-[55] grid place-items-center overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.6 } }} onClick={() => set({ intro: false })} style={{ background: `radial-gradient(ellipse at 50% 60%, ${fc}33, #02040c 70%)` }}>
      <div className="flex flex-col items-center px-4 text-center">
        <motion.div initial={{ opacity: 0, letterSpacing: '1em' }} animate={{ opacity: 1, letterSpacing: '0.35em' }} transition={{ duration: 1 }} className="label text-[13px]" style={{ color: fc }}>{role.faction === 'crew' ? 'There are infiltrators among you' : role.faction === 'infiltrator' ? 'You are an infiltrator' : 'You walk your own path'}</motion.div>
        <motion.div initial={{ scale: 2.2, opacity: 0, filter: 'blur(14px)' }} animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }} transition={{ delay: 0.5, type: 'spring', stiffness: 120 }} className="h-display mt-2 text-[clamp(48px,9vw,96px)] leading-none" style={{ color: R.color, textShadow: `0 0 40px ${R.color}aa` }}>{R.name.toUpperCase()}</motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="mt-3 max-w-xl text-[16px] text-ink/90">{R.blurb}{role.goal ? ` ${role.goal}` : ''}{role.bounty !== undefined && role.bounty !== null && R.id === 'bounty' ? ` Your contract: ${roster[role.bounty]?.name}.` : ''}</motion.div>
        <div className="mt-8 flex flex-wrap items-end justify-center gap-1">
          {team.slice(0, 15).map((s, i) => roster[s] && <motion.div key={s} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 + i * 0.06 }} className="flex flex-col items-center">
            <GlimCanvas cos={roster[s].cos} size={s === rt.slot ? 150 : 100} anims={['idle']} showPet={false} />
            <span className={`-mt-2 font-display text-[13px] font-semibold ${s === rt.slot ? 'text-ink' : 'text-mist'}`} style={role.faction === 'infiltrator' ? { color: '#ff6d86' } : undefined}>{roster[s].name}</span></motion.div>)}
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 2.4 }} className="mt-8 text-[12px] text-mist">Map: {rt.map.name} · tap to skip</motion.div>
      </div>
    </motion.div>
  );
}

export function Killed() {
  const k = useSticky(useGame(s => s.killed))!; const roster = useGame(s => s.roster); const set = useGame(s => s.set); const by = roster[k.by];
  useEffect(() => { const t = setTimeout(() => set({ killed: null }), 3400); return () => clearTimeout(t); }, []);
  return (
    <motion.div className="pe fixed inset-0 z-[56] grid place-items-center bg-[#12020a]/85" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} onClick={() => set({ killed: null })}>
      <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} className="absolute inset-x-0 top-1/2 h-48 -translate-y-1/2 bg-gradient-to-r from-crimson/0 via-crimson/40 to-crimson/0" />
      <div className="relative flex items-center gap-10">
        {by && <motion.img initial={{ x: -120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }} src={portrait(by.cos, 180, { eye: 'normal' })} className="h-44 w-44 drop-shadow-[0_0_30px_rgba(255,77,109,.6)]" />}
        <motion.div initial={{ scale: 3, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ delay: 0.25, type: 'spring' }} className="h-display text-6xl text-crimson" style={{ textShadow: '0 0 30px #ff4d6d' }}>✖</motion.div>
        <motion.img initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }} src={portrait(roster[rt.slot].cos, 180, { dead: true })} className="h-44 w-44" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="absolute bottom-[18%] text-center"><div className="h-display text-3xl text-ink">You were eliminated</div><div className="mt-1 text-mist">You are now a ghost — you can still finish tasks and watch. Living players can’t see or hear you.</div></motion.div>
    </motion.div>
  );
}

export function PersonalWin() { const t = useSticky(useGame(s => s.personalWin))!; const set = useGame(s => s.set); useEffect(() => { const x = setTimeout(() => set({ personalWin: null }), 4500); return () => clearTimeout(x); }, []);
  return <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }} className="glass pe fixed left-1/2 top-24 z-[57] -translate-x-1/2 border-[#ffe08a]/70 px-6 py-4 text-center shadow-[0_0_40px_rgba(255,224,138,.4)]"><div className="label text-[#ffe08a]">Personal victory</div><div className="h-display text-2xl text-ink">{t}</div></motion.div>; }

export function EscMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'main' | 'settings'>('main'); const code = useGame(s => s.code);
  return (
    <Modal open={open} onClose={onClose} z={65} className="w-[min(960px,calc(100vw-32px))]">
      <Panel title={tab === 'main' ? 'Paused (the match continues)' : 'Settings'} right={<button className="text-mist hover:text-ink" onClick={onClose}>✕</button>} className="max-h-[86vh] overflow-y-auto">
        {tab === 'main' ? <div className="flex flex-col gap-2.5">
          {code && <div className="mb-1 text-[14px] text-mist">Room code <b className="ml-1 font-display tracking-[0.3em] text-cyan">{code}</b></div>}
          <Btn variant="primary" onClick={onClose}>Resume</Btn><Btn onClick={() => setTab('settings')}>Settings</Btn>
          {fullscreenSupported() && <Btn onClick={() => toggleFullscreen()} testid="fullscreen">{isFullscreen() ? 'Exit fullscreen' : 'Fullscreen'}</Btn>}
          {rt.isHost && rt.view?.ph !== 'lobby' && <Btn variant="amber" onClick={() => { onClose(); rt.backToLobby(); }} testid="end-match">End match · back to lobby</Btn>}
          <Btn variant="danger" onClick={() => { onClose(); rt.leave(); }} testid="leave">{rt.isHost && rt.mode === 'host' ? 'Close room & leave' : 'Leave game'}</Btn>
        </div> : <><SettingsBody /><div className="mt-4"><Btn onClick={() => setTab('main')}>‹ Back</Btn></div></>}
      </Panel>
    </Modal>
  );
}

export function ChatPanel({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const chat = useGame(s => s.chat); const roster = useGame(s => s.roster); const me = useGame(s => s.view?.me); const ph = useGame(s => s.view?.ph); const [text, setText] = useState(''); const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [chat.length]);
  const canChat = ph === 'lobby' || ph === 'meeting' || ph === 'ended' || me?.ghost; const blocked = ph === 'meeting' && !me?.alive && !me?.ghost;
  // Blur after sending, and whenever the phase changes: a focused text field swallows the
  // movement keys, which looked like "I randomly can't walk" after using the chat box.
  const send = () => { if (!text.trim()) return; rt.act({ k: 'chat', text }); setText(''); blurField(); };
  useEffect(() => { blurField(); }, [ph]);
  return (
    <div className={`pe flex min-h-0 flex-col ${className}`}>
      <div className="scroll-y min-h-0 flex-1 space-y-1.5 pr-1" data-testid="chat-log">
        {chat.map(m => { const r = roster[m.s]; const col = r ? COLORS[r.cos.color] : COLORS[0];
          return <div key={m.id} className={`flex items-start gap-2 ${m.ghost ? 'opacity-60' : ''}`}>{r && <img src={portrait(r.cos, 48)} className="h-7 w-7 shrink-0" />}<div className={`min-w-0 rounded-xl px-2.5 py-1.5 text-[13.5px] ${m.s === rt.slot ? 'bg-cyan/15' : 'bg-void/60'}`}><b className="mr-1.5 font-display text-[12px]" style={{ color: col.light }}>{r?.name || '?'}{m.ghost ? ' (ghost)' : ''}</b><span className="break-words text-ink/90">{m.text}</span></div></div>; })}
        <div ref={end} />
      </div>
      {canChat && !blocked ? <form className="mt-2 flex gap-2" onSubmit={e => { e.preventDefault(); send(); }}>
        <input data-testid="chat-input" className="field min-w-0 flex-1 py-2" maxLength={140} placeholder={me?.ghost && ph !== 'lobby' ? 'Ghost chat (only ghosts can read)…' : 'Type a message…'} value={text} onChange={e => { setText(e.target.value); sfx('type'); }} onKeyDown={e => e.stopPropagation()} />
        <Btn type="submit" variant="primary" size="sm">Send</Btn></form> : <div className="mt-2 text-center text-[12px] text-mist">Chat opens during meetings.</div>}
    </div>
  );
}
