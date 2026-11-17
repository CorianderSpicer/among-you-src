// The registry, the task list and the component map are three separate places and nothing but a
// test keeps them level — Abyssal and Verdant both placed a 'valve' task that had no entry in any
// of the three, so the panel opened an empty minigame and the suite stayed green.
//
// The component maps are read from source rather than imported: importing them drags in Phaser,
// which wants a real canvas at module load. Only the keys matter here, and the keys are literals.
import { describe, it, expect } from 'vitest';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- node builtins; this test runs in vitest's node environment
import { readFileSync, readdirSync } from 'node:fs';
// @ts-ignore
import { join } from 'node:path';
import { GAMES, TASKS } from './game__tasks__tasks';
import { SAB_GAME } from './game__sim__sim';

const dir = new URL('.', import.meta.url).pathname;
const componentKeys = () => {
  const keys = new Set<string>();
  for (const f of readdirSync(dir).filter(f => /^ui__tasks__Minigames\d*\.tsx$/.test(f))) {
    const src = readFileSync(join(dir, f), 'utf8');
    for (const m of src.matchAll(/export const ALL\d*: Record<string, React\.FC<GP>> = \{([\s\S]*?)\};/g))
      for (const k of m[1].matchAll(/(?:^|[{,\s])([a-z_][a-z0-9_]*)\s*:/g)) keys.add(k[1]);
  }
  return keys;
};

describe('minigame registry', () => {
  const ALL = componentKeys();
  it('reads the component maps', () => expect(ALL.size).toBeGreaterThan(20));
  it('every GAMES entry has a component', () => {
    const missing = [...Object.keys(GAMES)].filter(g => !ALL.has(g));
    expect(missing, `no component for: ${missing.join(', ')}`).toEqual([]);
  });
  it('every TASKS step resolves to a GAMES entry and a component', () => {
    for (const t of TASKS) for (const g of t.steps || [t.id]) {
      expect(GAMES[g], `${t.id}: step '${g}' is not in GAMES`).toBeTruthy();
      expect(ALL.has(g), `${t.id}: step '${g}' has no component`).toBe(true);
    }
  });
  it('every component is reachable, as a task or as a sabotage repair', () => {
    const reachable = new Set([...TASKS.flatMap(t => t.steps || [t.id]), ...Object.values(SAB_GAME)]);
    const orphans = [...ALL].filter(g => !reachable.has(g));
    expect(orphans, `components nothing can open: ${orphans.join(', ')}`).toEqual([]);
  });
});
