import React, { useEffect, useRef, useState } from 'react';
import { input } from './game__input';
import { useGame } from './store__game';

/** On-screen joystick for touch devices (appears on first touch or on coarse pointers).
 *
 *  Two rules make this survive real multi-touch play:
 *
 *  1. It owns exactly one pointerId and ignores every other. A second finger landing anywhere —
 *     KILL, REPORT, USE, an ability — is simply not ours, so it reaches that button untouched.
 *     Releasing that finger never clears our stick, and releasing our stick never cancels theirs.
 *  2. The knob is moved by writing a transform straight to the DOM node, never through React
 *     state. A pointermove arrives up to 120×/second on an iPad; re-rendering a React subtree at
 *     that rate competes with the game loop for the main thread and is what made the controls feel
 *     laggy and unresponsive — the input was arriving, the page was just too busy to act on it.
 */
export function TouchControls() {
  const [on, setOn] = useState(() => matchMedia('(pointer: coarse)').matches);
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const id = useRef<number | null>(null);
  const ph = useGame(s => s.view?.ph);

  useEffect(() => { const t = () => setOn(true); addEventListener('touchstart', t, { once: true }); return () => removeEventListener('touchstart', t); }, []);
  useEffect(() => { input.touch = on; }, [on]);

  const visible = on && (ph === 'play' || ph === 'lobby' || ph === 'intro');

  // The stick must be released whenever this control goes away — and it goes away far more often
  // than it unmounts. A meeting, an ejection or the end screen simply renders null here: the pad
  // leaves the DOM with a thumb still on it, so no pointerup can ever be delivered to it and the
  // last tx/ty stayed latched. That is the "joystick stuck after a meeting" bug — you came back
  // from the vote already walking, with nothing touching the screen.
  useEffect(() => {
    if (visible) return;
    id.current = null; input.tx = 0; input.ty = 0;
  }, [visible]);
  // Belt and braces for a real unmount (leaving the match entirely).
  useEffect(() => () => { id.current = null; input.tx = 0; input.ty = 0; }, []);

  if (!visible) return null;
  const R = 56;

  const paint = (dx: number, dy: number) => { const k = knob.current; if (k) k.style.transform = `translate3d(${dx}px, ${dy}px, 0)`; };

  const move = (e: React.PointerEvent) => {
    if (id.current !== e.pointerId) return;          // not our finger — leave it alone
    const r = base.current!.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    paint(dx, dy);
    input.tx = dx / R; input.ty = dy / R;
  };
  const end = (e?: React.PointerEvent) => {
    if (e && id.current !== e.pointerId) return;     // a different finger lifting is none of our business
    id.current = null; paint(0, 0); input.tx = 0; input.ty = 0;
  };

  return (
    <div ref={base} className="pe absolute bottom-6 left-6 grid h-36 w-36 touch-none place-items-center rounded-full border-2 border-white/15 bg-white/5 backdrop-blur-sm" style={{ marginLeft: 'env(safe-area-inset-left)', marginBottom: 'env(safe-area-inset-bottom)' }} data-testid="joystick"
      onPointerDown={e => {
        if (id.current !== null) return;             // already steering with another finger
        id.current = e.pointerId;
        // Capture so the stick keeps tracking even if the finger slides off the pad. Capture is
        // per-pointer, so it never swallows anybody else's touches.
        try { base.current?.setPointerCapture(e.pointerId); } catch { }
        move(e);
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      // A capture lost to the browser (gesture, app switch) must release the stick too, or the
      // player keeps walking into a wall with no finger down.
      onLostPointerCapture={end}>
      <div ref={knob} className="h-16 w-16 rounded-full border-2 border-cyan/70 bg-cyan/25 shadow-glow will-change-transform" />
    </div>
  );
}
