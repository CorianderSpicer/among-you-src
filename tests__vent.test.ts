import { describe, it, expect } from 'vitest';
import { MAPS } from './game__maps__index';
import { buildMap } from './game__maps__builder';
import { Sim } from './game__sim__sim';
import { DEFAULT_SETTINGS } from './game__core__constants';
const cos: any = { color: 0, helmet: 'none', hat: 'none', outfit: 'none', backpack: 'none', pet: 'none', trail: 'none', accessory: 'none', victory: 'none' };
const roster = (n: number) => Array.from({ length: n }, (_, i) => ({ s: i, pid: 'p' + i, name: 'P' + i, cos: { ...cos, color: i }, bot: true }));

describe('vents', () => {
  it('an infiltrator can enter a vent and travel to a linked vent', () => {
    const m = buildMap(MAPS.orbital as any);
    const sim: any = new Sim(m, { ...DEFAULT_SETTINGS, map: 'orbital' } as any, roster(8) as any, 7);
    const inf = sim.players.find((p: any) => p.faction === 'infiltrator')!;
    expect(inf, 'needs an infiltrator').toBeTruthy();
    const vents = m.spots.filter((s: any) => s.kind === 'vent' && s.links?.length);
    expect(vents.length, 'map must have linked vents').toBeGreaterThan(0);
    const v = vents[0], dest = v.links![0];
    inf.x = v.x; inf.y = v.y;
    sim.onVent(inf, v.id);                    // enter
    expect(inf.vent, 'should be inside the vent').toBe(v.id);
    sim.onVent(inf, v.id, dest);              // travel
    expect(inf.vent, 'should have moved to the linked vent').toBe(dest);
    expect(Math.round(inf.x), 'position should snap to destination').toBe(Math.round(m.byId[dest].x));
    sim.onVent(inf, dest);                    // exit
    expect(inf.vent).toBe(null);
  });
  it('every vent on every map links somewhere', () => {
    for (const [id, spec] of Object.entries(MAPS as any)) {
      if (id === 'lobby') continue;
      const m = buildMap(spec as any);
      const vents = m.spots.filter((s: any) => s.kind === 'vent');
      expect(vents.length, `${id} has vents`).toBeGreaterThan(0);
      for (const v of vents) {
        expect(v.links?.length, `${id}: vent ${v.id} has links`).toBeGreaterThan(0);
        for (const l of v.links!) expect(m.byId[l], `${id}: vent ${v.id} link ${l} exists`).toBeTruthy();
      }
    }
  });
});
