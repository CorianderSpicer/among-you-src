import React, { useEffect, useRef, useState } from 'react';
import { input } from './game__input';
import { useGame } from './store__game';

/** On-screen joystick for touch devices (appears on first touch or on coarse pointers). */
export function TouchControls() {
  const [on, setOn] = useState(() => matchMedia('(pointer: coarse)').matches); const base = useRef<HTMLDivElement>(null); const [knob, setKnob] = useState({ x: 0, y: 0 }); const id = useRef<number | null>(null); const ph = useGame(s => s.view?.ph);
  useEffect(() => { const t = () => setOn(true); addEventListener('touchstart', t, { once: true }); return () => removeEventListener('touchstart', t); }, []);
  useEffect(() => { input.touch = on; }, [on]);
  if (!on || (ph !== 'play' && ph !== 'lobby' && ph !== 'intro')) return null;
  const R = 56;
  const move = (e: React.PointerEvent) => { if (id.current !== e.pointerId) return; const r = base.current!.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } setKnob({ x: dx, y: dy }); input.tx = dx / R; input.ty = dy / R; };
  const end = () => { id.current = null; setKnob({ x: 0, y: 0 }); input.tx = 0; input.ty = 0; };
  return (
    <div ref={base} className="pe absolute bottom-6 left-6 grid h-36 w-36 touch-none place-items-center rounded-full border-2 border-white/15 bg-white/5 backdrop-blur-sm" style={{ marginLeft: 'env(safe-area-inset-left)', marginBottom: 'env(safe-area-inset-bottom)' }} data-testid="joystick"
      onPointerDown={e => { id.current = e.pointerId; (e.target as Element).setPointerCapture(e.pointerId); move(e); }} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <div className="h-16 w-16 rounded-full border-2 border-cyan/70 bg-cyan/25 shadow-glow" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
