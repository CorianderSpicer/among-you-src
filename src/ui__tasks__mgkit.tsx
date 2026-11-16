import React from 'react';
import { motion } from 'framer-motion';
import { sfx } from './game__audio__audio';

/** One animation loop driven by rAF instead of a short setInterval. Intervals keep firing while the
 *  tab is hidden and fight the compositor; rAF is frame-aligned, pauses when hidden, and costs far
 *  less. `fn` gets seconds elapsed since the last frame. */
export function useRaf(fn: (dt: number) => void, on = true) {
  const ref = React.useRef(fn); ref.current = fn;
  React.useEffect(() => {
    if (!on) return;
    let id = 0, last = performance.now();
    const step = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; ref.current(dt); id = requestAnimationFrame(step); };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [on]);
}

/** Wraps a completion callback so it can only ever fire once, even if several effects race it. */
export function useOnce(done: () => void) {
  const fired = React.useRef(false);
  return React.useCallback(() => { if (fired.current) return; fired.current = true; done(); }, [done]);
}

/** Press-and-hold state that cannot get stuck. The press ends on release anywhere on the window,
 *  on a cancelled gesture, on tab switch, or on losing focus — not just on pointerup over the
 *  element, which is what left buttons jammed on iPad when a finger drifted off mid-hold. */
export function useHold(onRelease?: () => void) {
  const [held, setHeld] = React.useState(false);
  const rel = React.useRef(onRelease); rel.current = onRelease;
  const heldRef = React.useRef(false); heldRef.current = held;
  React.useEffect(() => {
    const up = () => { if (!heldRef.current) return; heldRef.current = false; setHeld(false); rel.current?.(); };
    addEventListener('pointerup', up); addEventListener('pointercancel', up); addEventListener('blur', up);
    document.addEventListener('visibilitychange', up);
    return () => { removeEventListener('pointerup', up); removeEventListener('pointercancel', up); removeEventListener('blur', up); document.removeEventListener('visibilitychange', up); };
  }, []);
  const start = React.useCallback((e?: React.PointerEvent) => { e?.preventDefault(); heldRef.current = true; setHeld(true); }, []);
  return [held, start] as const;
}

/** A pad you can hold down to repeat. The release is handled on the window, not the element, so a
 *  finger that slides off the button (or a gesture the browser cancels) can never leave it stuck
 *  firing — which is exactly what went wrong on iPad. */
export const HoldPad = ({ children, onPress, className = '', disabled, repeatMs = 90 }: any) => {
  const timer = React.useRef<any>(null);
  const press = React.useRef(onPress); press.current = onPress;
  const stop = React.useCallback(() => { if (timer.current) { clearInterval(timer.current); timer.current = null; } }, []);
  React.useEffect(() => {
    // Any pointer release anywhere, losing the tab, or losing focus all end the repeat.
    addEventListener('pointerup', stop); addEventListener('pointercancel', stop); addEventListener('blur', stop);
    document.addEventListener('visibilitychange', stop);
    return () => { stop(); removeEventListener('pointerup', stop); removeEventListener('pointercancel', stop); removeEventListener('blur', stop); document.removeEventListener('visibilitychange', stop); };
  }, [stop]);
  return <button disabled={disabled} className={`select-none rounded-xl border-2 font-display text-xl font-bold transition-[filter] duration-75 active:brightness-150 border-[#3a4a80] bg-[#16204a] text-ink ${disabled ? 'opacity-40' : ''} ${className}`}
    onPointerDown={e => { if (disabled) return; e.preventDefault(); (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); sfx('toggle'); press.current(); stop(); timer.current = setInterval(() => press.current(), repeatMs); }}
    onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}>{children}</button>;
};
export type GP = { done: () => void; fail?: () => void; assist?: boolean; spot: string; kind: string };
export const R = (n: number) => Math.floor(Math.random() * n);
export const shuffle = <T,>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = R(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const Screen = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`relative overflow-hidden rounded-xl border border-[#2a3a6e] bg-[radial-gradient(circle_at_50%_30%,#122046,#070b18)] ${className}`} style={{ boxShadow: 'inset 0 0 30px rgba(0,0,0,.6)' }}>{children}<div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(140,255,220,.08) 0 1px, transparent 1px 3px)' }} /></div>;
// Minigame pads fire on pointerdown with a fixed hit-box: a scaling button dropped taps near its
// edges, which in a timed minigame read as the game ignoring you.
export const Pad = ({ children, onClick, active, className = '', disabled }: any) => <button disabled={disabled} onPointerDown={e => { if (disabled) return; e.preventDefault(); sfx('toggle'); onClick?.(); }} className={`rounded-xl border-2 font-display font-bold transition-[filter] duration-75 active:brightness-150 ${active ? 'border-cyan bg-cyan/30 text-cyan shadow-glow' : 'border-[#3a4a80] bg-[#16204a] text-ink hover:border-cyan/50'} ${disabled ? 'opacity-40' : ''} ${className}`}>{children}</button>;

