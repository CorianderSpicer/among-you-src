// AMONG YOU design system: buttons, panels, toggles, sliders, segmented controls, tooltips, modals, toasts.
import React, { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sfx } from './game__audio__audio';
import { useApp } from './store__app';

type Variant = 'primary' | 'ghost' | 'danger' | 'amber' | 'violet';
const V: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-[#4ff7e7] to-[#19b3a8] text-[#04131a] border-[#9ffcf3]/60 shadow-[0_6px_22px_rgba(63,240,224,.35)]',
  ghost: 'bg-gradient-to-b from-[#22305c]/90 to-[#141d3c]/90 text-ink border-[#5b72b8]/40',
  danger: 'bg-gradient-to-b from-[#ff6d86] to-[#d42a4a] text-white border-[#ffb0be]/50 shadow-[0_6px_22px_rgba(255,77,109,.35)]',
  amber: 'bg-gradient-to-b from-[#ffc970] to-[#e8921f] text-[#2a1600] border-[#ffe1a8]/60 shadow-[0_6px_22px_rgba(255,181,71,.3)]',
  violet: 'bg-gradient-to-b from-[#b993ff] to-[#7a4ae0] text-white border-[#dcc8ff]/50 shadow-[0_6px_22px_rgba(167,123,255,.35)]',
};
/** True only for real mouse pointers. Touch screens emulate :hover and keep it stuck after a tap,
 *  which used to grow a tapped button and shove its neighbours' hit-boxes around. */
export const FINE_POINTER = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Props that activate a control on *press* rather than on click.
 *
 *  Browsers only synthesise `click` for the primary pointer, so while one finger is already down —
 *  holding the joystick, say — a second finger tapping a button produces pointer events but never a
 *  click. Any in-game control wired to `onClick` is therefore dead the entire time you are moving.
 *  Pressing on pointerdown fixes that and also feels sharper. The `onClick` fallback only runs for
 *  keyboard activation (Enter/Space report `detail === 0`), so nothing ever fires twice. */
export const press = (fn: () => void) => ({
  onPointerDown: (e: React.PointerEvent) => { if (e.pointerType === 'mouse' && e.button !== 0) return; e.preventDefault(); fn(); },
  onClick: (e: React.MouseEvent) => { if (e.detail === 0) fn(); },
});

export function Btn({ children, onClick, variant = 'ghost', className = '', disabled, size = 'md', title, sound = 'click', type = 'button', testid }: { children: ReactNode; onClick?: () => void; variant?: Variant; className?: string; disabled?: boolean; size?: 'sm' | 'md' | 'lg'; title?: string; sound?: string; type?: 'button' | 'submit'; testid?: string }) {
  const sz = size === 'lg' ? 'px-7 py-4 text-lg' : size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-5 py-2.5 text-[15px]';
  const [press, setPress] = useState(false);
  // The <button> itself never scales or shifts. Scaling the button moved its hit-box out from
  // under the finger mid-tap, so the pointerup landed outside it and the click was swallowed —
  // which felt like "sometimes it ignores me, sometimes I have to hold it". The squish now lives
  // on an inner span, so the thing you are aiming at holds perfectly still.
  return (
    <button type={type} data-testid={testid} title={title} disabled={disabled}
      onMouseEnter={FINE_POINTER ? () => !disabled && sfx('hover') : undefined}
      onPointerDown={() => !disabled && setPress(true)}
      onPointerUp={() => setPress(false)} onPointerCancel={() => setPress(false)} onPointerLeave={() => setPress(false)}
      onClick={() => { if (disabled) return; sfx(sound); onClick?.(); }}
      className={`pe relative overflow-hidden rounded-xl border font-display font-semibold tracking-wide uppercase select-none transition-[filter,box-shadow] duration-100 ${sz} ${V[variant]} ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'} ${press ? 'brightness-125' : FINE_POINTER ? 'hover:brightness-110' : ''} ${className}`}>
      {!disabled && <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/25 blur-md opacity-0 group-hover:opacity-100" style={{ animation: 'sweep 2.6s ease-in-out infinite' }} />}
      <motion.span aria-hidden={false} className="pointer-events-none relative z-10 flex items-center justify-center gap-2"
        animate={{ scale: press ? 0.95 : 1 }} transition={{ type: 'spring', stiffness: 600, damping: 30 }}>{children}</motion.span>
    </button>
  );
}

export function Panel({ children, className = '', title, right, brackets = true }: { children: ReactNode; className?: string; title?: ReactNode; right?: ReactNode; brackets?: boolean }) {
  return (
    <div className={`glass ${brackets ? 'brackets' : ''} pe p-5 ${className}`}>
      {title && <div className="mb-3 flex items-center justify-between gap-3"><div className="label">{title}</div>{right}</div>}
      {children}
    </div>
  );
}

export function Toggle({ value, onChange, label, hint }: { value: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: string }) {
  return (
    <label className="pe flex cursor-pointer items-center justify-between gap-4 py-1.5" title={hint} onClick={() => { sfx('toggle'); onChange(!value); }}>
      <span className="text-[14px] text-ink/90">{label}</span>
      <span className={`relative h-6 w-11 rounded-full border transition-colors ${value ? 'border-cyan/70 bg-cyan/30' : 'border-edge bg-void/70'}`}>
        <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 30 }} className={`absolute top-[3px] h-4 w-4 rounded-full ${value ? 'left-[22px] bg-cyan shadow-[0_0_10px_#3ff0e0]' : 'left-[3px] bg-mist'}`} />
      </span>
    </label>
  );
}

export function Slider({ value, min, max, step = 1, onChange, label, fmt }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label: ReactNode; fmt?: (v: number) => string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="pe py-1.5">
      <div className="mb-1 flex justify-between text-[14px]"><span className="text-ink/90">{label}</span><span className="font-display text-cyan">{fmt ? fmt(value) : value}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} onPointerUp={() => sfx('toggle')}
        className="ay-range w-full" style={{ background: `linear-gradient(90deg,#3ff0e0 ${pct}%, rgba(110,140,220,.25) ${pct}%)` }} />
    </div>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; l: ReactNode }[]; onChange: (v: T) => void; label?: ReactNode }) {
  return (
    <div className="pe py-1.5">
      {label && <div className="mb-1.5 text-[14px] text-ink/90">{label}</div>}
      <div className="flex flex-wrap gap-1 rounded-xl border border-edge/70 bg-void/60 p-1">
        {options.map(o => (
          <button key={String(o.v)} onClick={() => { sfx('toggle'); onChange(o.v); }} onMouseEnter={() => sfx('hover')}
            className={`relative flex-1 rounded-lg px-2.5 py-1.5 font-display text-[13px] font-semibold uppercase tracking-wide transition-colors ${value === o.v ? 'text-[#04131a]' : 'text-mist hover:text-ink'}`}>
            {value === o.v && <motion.span layoutId={`seg-${String(label)}-${options.map(x => x.v).join()}`} className="absolute inset-0 rounded-lg bg-cyan shadow-[0_0_14px_rgba(63,240,224,.5)]" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
            <span className="relative">{o.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Stepper({ value, min, max, onChange, label, step = 1, fmt }: { value: number; min: number; max: number; onChange: (v: number) => void; label: ReactNode; step?: number; fmt?: (v: number) => string }) {
  const b = 'pe h-7 w-7 rounded-lg border border-edge bg-hull text-cyan font-display text-lg leading-none hover:border-cyan/60 disabled:opacity-30';
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[14px] text-ink/90">{label}</span>
      <div className="flex items-center gap-2">
        <button className={b} disabled={value <= min} onClick={() => { sfx('toggle'); onChange(Math.max(min, +(value - step).toFixed(2))); }}>−</button>
        <span className="w-12 text-center font-display text-ink">{fmt ? fmt(value) : value}</span>
        <button className={b} disabled={value >= max} onClick={() => { sfx('toggle'); onChange(Math.min(max, +(value + step).toFixed(2))); }}>+</button>
      </div>
    </div>
  );
}

export function Tip({ text, children }: { text: ReactNode; children: ReactNode }) {
  const [on, setOn] = useState(false);
  return (
    <span className="pe relative inline-flex" onMouseEnter={() => setOn(true)} onMouseLeave={() => setOn(false)}>
      {children}
      <AnimatePresence>{on && <motion.span initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.14 }}
        className="glass-dark absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[260px] -translate-x-1/2 px-3 py-2 text-[12.5px] leading-snug text-ink normal-case tracking-normal">{text}</motion.span>}</AnimatePresence>
    </span>
  );
}

export function Modal({ open, onClose, children, className = '', z = 50 }: { open: boolean; onClose?: () => void; children: ReactNode; className?: string; z?: number }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="pe fixed inset-0 flex items-center justify-center bg-[#02040c]/70 p-4 backdrop-blur-sm" style={{ zIndex: z }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} onMouseDown={e => { if (e.target === e.currentTarget && onClose) { sfx('close'); onClose(); } }}>
          <motion.div initial={{ scale: 0.92, y: 18, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 10, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }} className={className}>{children}</motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toasts() {
  const toasts = useApp(s => s.toasts);
  const C = { info: 'border-sky-400/40', ok: 'border-cyan/60', warn: 'border-amber/70', error: 'border-crimson/70' };
  const I = { info: 'ℹ', ok: '✓', warn: '!', error: '✕' };
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[90] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2">
      <AnimatePresence>{toasts.map(t => (
        <motion.div key={t.id} layout initial={{ opacity: 0, x: 40, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }} className={`glass-dark flex items-start gap-3 border-l-4 px-4 py-3 text-[14px] ${C[t.kind]}`}>
          <span className="font-display font-bold text-cyan">{I[t.kind]}</span><span>{t.text}</span>
        </motion.div>))}
      </AnimatePresence>
    </div>
  );
}

export function ScreenHeader({ title, sub, onBack }: { title: string; sub?: string; onBack?: () => void }) {
  return (
    <div className="mb-5 flex items-center gap-4">
      {onBack && <motion.button data-press onMouseEnter={() => sfx('hover')} onClick={() => { sfx('back'); onBack(); }} className="pe grid h-11 w-11 place-items-center rounded-xl border border-edge bg-hull/80 font-display text-xl text-cyan hover:border-cyan/60" aria-label="Back">‹</motion.button>}
      <div><h2 className="h-display text-3xl text-ink">{title}</h2>{sub && <div className="text-[14px] text-mist">{sub}</div>}</div>
    </div>
  );
}

export const screenAnim = { initial: { opacity: 0, y: 16, filter: 'blur(6px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, exit: { opacity: 0, y: -10, filter: 'blur(6px)' }, transition: { duration: 0.32, ease: [0.2, 0.8, 0.2, 1] } };
