import React from 'react';
import { motion } from 'framer-motion';
import { useApp } from './store__app';
import { sfx, audio } from './game__audio__audio';
import { VERSION } from './game__core__constants';
import { fullscreenSupported, toggleFullscreen } from './game__viewport';
import { FINE_POINTER } from './ui__common__kit';

export function Logo({ size = 1 }: { size?: number }) {
  return (
    <div className="select-none" style={{ transform: `scale(${size})`, transformOrigin: 'left center' }}>
      <motion.div initial={{ opacity: 0, letterSpacing: '0.9em' }} animate={{ opacity: 1, letterSpacing: '0.5em' }} transition={{ duration: 1.1, ease: 'easeOut' }} className="h-display pl-1 text-[22px] text-cyan glow-text">AMONG</motion.div>
      <div className="relative -mt-2 flex items-end">
        <motion.span initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 160 }} className="h-display text-[104px] leading-none text-ink" style={{ textShadow: '0 0 30px rgba(63,240,224,.35), 0 6px 0 #1b2a5e, 0 10px 30px rgba(0,0,0,.5)' }}>Y</motion.span>
        <motion.svg initial={{ y: 30, opacity: 0, rotate: -20 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 0.25, type: 'spring', stiffness: 140 }} width="96" height="104" viewBox="0 0 96 104" className="mx-0.5 mb-1 anim-floaty">
          <defs>
            <radialGradient id="lg-glass" cx="35%" cy="30%" r="75%"><stop offset="0" stopColor="#ffffff" stopOpacity=".55" /><stop offset=".55" stopColor="#9fe8ff" stopOpacity=".18" /><stop offset="1" stopColor="#3ff0e0" stopOpacity=".45" /></radialGradient>
            <radialGradient id="lg-face" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#fff6ea" /><stop offset="1" stopColor="#f1d5c0" /></radialGradient>
          </defs>
          <path d="M28 12 Q22 2 26 -2" stroke="#9aa4ba" strokeWidth="3" fill="none" transform="translate(0 8)" />
          <circle cx="27" cy="7" r="5" fill="#ff4d6d" /><circle cx="27" cy="7" r="9" fill="#ff4d6d" opacity=".25" />
          <circle cx="48" cy="56" r="42" fill="#101a32" />
          <ellipse cx="54" cy="58" rx="27" ry="25" fill="url(#lg-face)" />
          <ellipse cx="45" cy="54" rx="4.5" ry="6.5" fill="#1b2033" /><ellipse cx="63" cy="54" rx="4.5" ry="6.5" fill="#1b2033" />
          <circle cx="46.5" cy="51.5" r="1.8" fill="#fff" /><circle cx="64.5" cy="51.5" r="1.8" fill="#fff" />
          <path d="M50 66 Q54 70 58 66" stroke="#1b2033" strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="37" cy="64" rx="5" ry="3" fill="#ff7890" opacity=".45" /><ellipse cx="71" cy="64" rx="5" ry="3" fill="#ff7890" opacity=".45" />
          <circle cx="48" cy="56" r="42" fill="url(#lg-glass)" />
          <ellipse cx="30" cy="36" rx="13" ry="6" fill="#fff" opacity=".8" transform="rotate(-38 30 36)" />
          <circle cx="48" cy="56" r="42" fill="none" stroke="#e8eeff" strokeWidth="6" /><circle cx="48" cy="56" r="45.5" fill="none" stroke="#3ff0e0" strokeWidth="1.5" opacity=".7" />
        </motion.svg>
        <motion.span initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35, type: 'spring', stiffness: 160 }} className="h-display text-[104px] leading-none text-ink" style={{ textShadow: '0 0 30px rgba(63,240,224,.35), 0 6px 0 #1b2a5e, 0 10px 30px rgba(0,0,0,.5)' }}>U</motion.span>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-2 pl-1 font-body text-[15px] tracking-wide text-mist">Trust no helmet. Read every face.</motion.div>
    </div>
  );
}

const I = (d: string) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const ICONS: Record<string, JSX.Element> = {
  play: <svg viewBox="0 0 24 24" width="20" height="20"><path d="M7 4.5l12.5 7.5L7 19.5z" fill="currentColor" /></svg>,
  create: I('M12 5v14M5 12h14M4 4h4M16 4h4M4 20h4M16 20h4'), find: I('M10.5 4a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM15.5 15.5L20 20'),
  customize: I('M12 3a7 7 0 017 7v1H5v-1a7 7 0 017-7zM7 11v6a2 2 0 002 2h6a2 2 0 002-2v-6M10 8h.01M14 8h.01'),
  settings: I('M12 9a3 3 0 110 6 3 3 0 010-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1'),
  credits: I('M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'),
};
const ITEMS: { id: string; label: string; sub: string; icon: string; variant?: 'primary' }[] = [
  { id: 'play', label: 'Play', sub: 'Practice match with AI crew', icon: '▶', variant: 'primary' },
  { id: 'create', label: 'Create Room', sub: 'Host online · get a room code', icon: '✦' },
  { id: 'find', label: 'Find Game', sub: 'Join with a code', icon: '⌕' },
  { id: 'customize', label: 'Customize', sub: 'Suit, helmet, hats, pets', icon: '◐' },
  { id: 'settings', label: 'Settings', sub: 'Graphics · audio · controls', icon: '⚙' },
  { id: 'credits', label: 'Credits', sub: '', icon: '★' },
];

export function MainMenu({ onPlay }: { onPlay: () => void }) {
  const go = useApp(s => s.go); const name = useApp(s => s.profile.name);
  const act = (id: string) => { audio.ensure(); audio.music('menu'); if (id === 'play') onPlay(); else go(id as any); };
  return (
    <div className="pe absolute inset-0 flex flex-col justify-center px-[max(24px,6vw)] py-8" onPointerDown={() => { audio.ensure(); audio.music('menu'); }}>
      <Logo size={typeof window !== 'undefined' && innerWidth < 520 ? 0.72 : 1} />
      <div className="mt-9 flex w-[min(380px,100%)] flex-col gap-2.5">
        {ITEMS.map((it, i) => (
          // No geometry animation on the button itself: sliding or scaling it moved the hit-box
          // out from under the finger (touch screens also keep :hover stuck after a tap), so taps
          // landed on nothing or on the neighbouring item. Hover flourishes are desktop-only now.
          <motion.button key={it.id} data-testid={'menu-' + it.id} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + i * 0.07, type: 'spring', stiffness: 260, damping: 24 }}
            onMouseEnter={FINE_POINTER ? () => sfx('hover') : undefined} onClick={() => { sfx('click'); act(it.id); }}
            className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border px-5 text-left transition-[filter,border-color] duration-100 active:brightness-125 ${FINE_POINTER ? 'hover:brightness-110' : ''} ${it.variant ? 'border-cyan/70 bg-gradient-to-r from-cyan/30 via-cyan/10 to-transparent py-4 shadow-glow' : 'border-edge/70 bg-gradient-to-r from-hull/90 to-hull/30 py-3 hover:border-cyan/50'}`}>
            <span className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 group-hover:opacity-100" style={{ animation: 'sweep 1.6s ease-in-out infinite' }} />
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-lg ${it.variant ? 'bg-cyan text-[#04131a] shadow-[0_0_18px_#3ff0e0]' : 'bg-panel text-cyan group-hover:bg-cyan/20'}`}>{ICONS[it.id]}</span>
            <span className="flex flex-col"><span className={`h-display uppercase tracking-[0.12em] ${it.variant ? 'text-[22px] text-ink' : 'text-[17px] text-ink/95'}`}>{it.label}</span>{it.sub && <span className="text-[12.5px] text-mist">{it.sub}</span>}</span>
            <span className="ml-auto font-display text-xl text-cyan/0 transition-colors group-hover:text-cyan">›</span>
          </motion.button>
        ))}
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="mt-7 flex items-center gap-3 text-[13px] text-mist">
        <span className="chip"><span className="h-2 w-2 rounded-full bg-lime shadow-[0_0_8px_#8dff7a]" />Signed in as <b className="text-ink">{name}</b></span><span className="opacity-60">v{VERSION}</span>
        {fullscreenSupported() && <button className="pe chip transition-colors hover:text-ink" onClick={() => toggleFullscreen()} data-testid="menu-fullscreen">⛶ Fullscreen</button>}
      </motion.div>
    </div>
  );
}
