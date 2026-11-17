// ─────────────────────────────────────────────────────────────────────────────────────────────
// MINIGAME BENCH — mounts one task at a time so the automated suite can try to finish it
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// Dev-only. It is not reachable from the game UI; the suite loads it directly. Having the real
// components mounted by the real registry is the point — a bench with its own copies would only
// prove the copies work.

import React, { useState } from 'react';
import { ALL } from './ui__tasks__Minigames';

export function TaskBench() {
  const [kind, setKind] = useState<string>(Object.keys(ALL)[0]);
  const [doneAt, setDoneAt] = useState<number | null>(null);
  const [failAt, setFailAt] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);

  const G = ALL[kind];

  // The suite drives everything through these.
  (window as any).__bench = {
    list: () => Object.keys(ALL),
    load: (k: string) => { setKind(k); setDoneAt(null); setFailAt(null); setNonce(n => n + 1); },
    state: () => ({ kind, done: doneAt, fail: failAt }),
  };

  return (
    <div style={{ padding: 12 }}>
      <div data-testid="bench-kind" style={{ font: '12px monospace', color: '#9fb0d0', marginBottom: 8 }}>{kind}</div>
      <div data-testid="bench-done" style={{ display: 'none' }}>{doneAt === null ? '' : String(doneAt)}</div>
      {/* The game puts its UI layers behind `pointer-events: none` and re-enables input with the
          `.pe` class. Without it the bench renders every task perfectly and no input reaches any
          of them — which read as "all forty tasks are broken" the first time this ran. */}
      <div data-testid="bench-host" className="pe" style={{ pointerEvents: 'auto' }}>
        {G ? <G key={kind + ':' + nonce} kind={kind} spot="bench" done={() => setDoneAt(Date.now())} fail={() => setFailAt(Date.now())} /> : <div>no such task</div>}
      </div>
    </div>
  );
}
