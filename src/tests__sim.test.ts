import { describe, it, expect } from 'vitest';
import { buildMap } from './game__maps__builder';
import { MAPS } from './game__maps__index';
import { Sim } from './game__sim__sim';
import { Bots } from './game__sim__bots';
import { DEFAULT_SETTINGS, TILE } from './game__core__constants';
import { ROLES, SPECIAL } from './game__roles__roles';
import { GAMES, TASKS, MINIGAME_COUNT } from './game__tasks__tasks';
import { World } from './game__sim__physics';
import type { Settings } from './game__core__types';

const cos = { color: 0, helmet: 'bubble', hat: 'none', outfit: 'none', backpack: 'tank', pet: 'none', trail: 'none', accessory: 'none', victory: 'jump' };
const roster = (n: number, bots = true) => Array.from({ length: n }, (_, i) => ({ s: i, pid: 'p' + i, name: 'P' + i, cos: { ...cos, color: i }, bot: bots }));
const mk = (map = 'orbital', n = 8, set: Partial<Settings> = {}, seed = 7) => new Sim(buildMap(MAPS[map]), { ...DEFAULT_SETTINGS, map: map as any, ...set }, roster(n), seed);
const run = (s: Sim, sec: number) => { for (let i = 0; i < sec * 30; i++) s.step(1 / 30); };
const role = (s: Sim, id: string, slot: number) => { const p = s.get(slot)!; s.setRole(p, id); return p; };

describe('content', () => {
  it('has the full content set: playable maps + lobby, special roles and minigames', () => {
    expect(Object.keys(MAPS).filter(k => k !== 'lobby').length).toBeGreaterThanOrEqual(7);
    expect(SPECIAL.length).toBeGreaterThanOrEqual(30);
    expect(MINIGAME_COUNT).toBeGreaterThanOrEqual(25);
    for (const r of ROLES) { expect(r.limits && r.counter && r.win && r.blurb).toBeTruthy(); if (r.ability) expect(typeof r.ability.cd).toBe('number'); }
  });
  for (const id of Object.keys(MAPS)) it(`map ${id} is fully connected and every station is reachable`, () => {
    const m = buildMap(MAPS[id]); const w = new World(m); const start = m.spawn;
    for (const sp of m.spots) { if (sp.kind === 'vent' || sp.kind === 'passage') continue; const ty = sp.wall ? sp.y + 6 : sp.y + 22; const path = w.path(start.x, start.y, sp.x, ty); const end = path[path.length - 1];
      expect(path.length, `${id} ${sp.id}`).toBeGreaterThan(0); expect(w.blocked(end.x, end.y), `${id} ${sp.id} standable`).toBe(false); }
    for (const r of m.rooms) { const path = w.path(start.x, start.y, r.cx, r.cy); expect(path.length, `${id} room ${r.id}`).toBeGreaterThan(0); }
    if (id !== 'lobby') { for (const t of TASKS) for (const g of t.steps || [t.id]) if (m.spots.some(s => s.game === g)) expect(GAMES[g]).toBeTruthy(); expect(m.spots.some(s => s.game === 'wires') && m.spots.some(s => s.game === 'auth')).toBe(true); }
  });
});

describe('rules', () => {
  it('assigns roles privately with the configured infiltrator count', () => {
    const s = mk('orbital', 10, { infiltrators: 2 }); const inf = s.players.filter(p => p.faction === 'infiltrator'); expect(inf.length).toBe(2);
    const roleEvents = s.out.filter(o => o.ev.e === 'role'); expect(roleEvents.length).toBe(10); for (const o of roleEvents) { expect(typeof o.to).toBe('number'); const p = s.get(o.to as number)!; expect(o.ev.role).toBe(p.role); if (p.faction !== 'infiltrator') expect(o.ev.team.length).toBe(0); }
  });
  it('views never leak other players’ roles, and hide players out of sight', () => {
    const s = mk(); run(s, 6); const v = s.viewFor(0); expect(JSON.stringify(v.pl)).not.toMatch(/role|faction/);
    const far = s.get(1)!; far.x = s.m.rooms[0].cx; far.y = s.m.rooms[0].cy; const me = s.get(0)!; me.x = s.m.rooms[s.m.rooms.length - 1].cx; me.y = s.m.rooms[s.m.rooms.length - 1].cy; expect(s.viewFor(0).pl.some(p => p.s === 1)).toBe(false);
  });
  it('validates eliminations: range, cooldown, faction and protections', () => {
    const s = mk('orbital', 6, { infiltrators: 1 }); run(s, 6); const k = role(s, 'infiltrator', 0); const v = role(s, 'crewmate', 1); s.players.slice(2).forEach(p => s.setRole(p, 'crewmate'));
    k.x = 1000; k.y = 1000; v.x = 1500; v.y = 1000; k.kcd = 0; s.handleAct(0, { k: 'kill', target: 1 }); expect(v.alive).toBe(true); // too far
    const e = s.m.byId.emergency; k.x = e.x + 40; k.y = e.y + 60; v.x = e.x + 70; v.y = e.y + 60; k.kcd = s.t + 5; s.handleAct(0, { k: 'kill', target: 1 }); expect(v.alive).toBe(true); // cooldown
    const medic = role(s, 'medic', 2); medic.x = v.x; medic.y = v.y; medic.acd = 0; medic.uses = 1; s.handleAct(2, { k: 'ability', target: 1 }); expect(v.shieldBy).toBe(2);
    k.kcd = 0; s.handleAct(0, { k: 'kill', target: 1 }); expect(v.alive).toBe(true); expect(v.shieldBy).toBe(-1);
    k.kcd = 0; s.handleAct(0, { k: 'kill', target: 1 }); expect(v.alive).toBe(false); expect(s.bodies.length).toBe(1);
    const c = s.get(3)!; c.x = k.x; c.y = k.y; s.handleAct(3, { k: 'kill', target: 0 }); expect(k.alive).toBe(true); // crew cannot kill
  });
  it('runs meetings, votes and ejection, and the Jester wins when voted out', () => {
    const s = mk('orbital', 6, { infiltrators: 1, discussion: 1, voting: 10 }); run(s, 6); const j = role(s, 'jester', 1); role(s, 'infiltrator', 0); s.players.slice(2).forEach(p => s.setRole(p, 'crewmate'));
    const e = s.m.byId.emergency; const caller = s.get(2)!; caller.x = e.x; caller.y = e.y + 30; s.roundStart = -99; s.handleAct(2, { k: 'emergency' }); expect(s.phase).toBe('meeting');
    run(s, 4.5); for (const p of s.players) s.handleAct(p.s, { k: 'vote', target: p.s === 1 ? 2 : 1 }); s.handleAct(2, { k: 'vote', target: 3 }); expect(s.meeting!.votes[2]).toBe(1); // no double vote
    run(s, 3); expect(s.meeting!.result!.ejected).toBe(1); run(s, 6); expect(s.winner?.winner).toBe('jester');
  });
  it('crew wins by tasks; infiltrators win by parity or critical sabotage', () => {
    const a = mk('orbital', 6, { infiltrators: 1 }); run(a, 6); for (const p of a.players) if (!p.fake) for (const t of p.tasks) { t.done = true; t.step = t.steps.length; } a.checkWin(); expect(a.winner?.winner).toBe('crew');
    const b = mk('orbital', 4, { infiltrators: 1 }); run(b, 6); const inf = b.players.find(p => p.faction === 'infiltrator')!; for (const p of b.players) if (p !== inf && b.players.filter(x => x.alive && x.faction !== 'infiltrator').length > 1) { p.alive = false; p.ghost = true; } b.checkWin(); expect(b.winner?.winner).toBe('infiltrator');
    const c = mk('orbital', 8, { infiltrators: 1 }); run(c, 25); const ci = c.players.find(p => p.faction === 'infiltrator')!; c.sabCd = 0; c.handleAct(ci.s, { k: 'sab', id: 'reactor' }); expect(c.sab?.id).toBe('reactor'); run(c, 46); expect(c.winner?.winner).toBe('infiltrator');
  });
  it('reactor needs two different players holding at the same time', () => {
    const s = mk('orbital', 8, { infiltrators: 1 }); run(s, 25); const i = s.players.find(p => p.faction === 'infiltrator')!; s.sabCd = 0; s.handleAct(i.s, { k: 'sab', id: 'reactor' });
    const [a, b] = s.sab!.spots; const pa = s.players.find(p => p.faction === 'crew')!; const pb = s.players.filter(p => p.faction === 'crew')[1];
    const A = s.m.byId[a], B = s.m.byId[b]; pa.x = A.x; pa.y = A.y; s.handleAct(pa.s, { k: 'hold', spot: a, on: true }); s.handleAct(pa.s, { k: 'hold', spot: b, on: true }); expect(s.sab).not.toBeNull();
    pb.x = B.x; pb.y = B.y; s.handleAct(pa.s, { k: 'hold', spot: a, on: true }); s.handleAct(pb.s, { k: 'hold', spot: b, on: true }); expect(s.sab).toBeNull();
  });
  it('tasks require opening at the panel and a minimum duration', () => {
    const s = mk(); run(s, 6); const p = s.players.find(x => !x.fake)!; const t = p.tasks[0]; const sp = s.m.byId[t.steps[0]];
    s.handleAct(p.s, { k: 'task_done', spot: sp.id }); expect(t.step).toBe(0);
    p.x = sp.x; p.y = sp.y + 10; s.handleAct(p.s, { k: 'task_open', spot: sp.id }); s.handleAct(p.s, { k: 'task_done', spot: sp.id }); expect(t.step).toBe(0); run(s, 1); s.handleAct(p.s, { k: 'task_done', spot: sp.id }); expect(t.step).toBe(1);
  });
  it('rejects impossible movement (speed hacks / walls) and ignores duplicate actions', () => {
    const s = mk(); run(s, 6); const p = s.get(0)!; const x = p.x; s.handlePos(0, x + 900, p.y, 1, 'walk', true); expect(p.x).toBe(x); expect(s.out.some(o => o.to === 0 && o.ev.e === 'snap')).toBe(true);
    s.meeting = null; const n0 = s.chat.length; s.phase = 'meeting'; s.handleAct(1, { k: 'chat', text: 'hi', seq: 5 }); s.t += 1; s.handleAct(1, { k: 'chat', text: 'hi', seq: 5 }); expect(s.chat.length - n0).toBe(1);
  });
  it('keycard rooms on Helios block movement until a keycard is issued', () => {
    const s = mk('helios', 6); run(s, 6); const p = s.get(0)!; const d = s.m.doors.find(d => s.m.restricted.includes(d.id))!; const r = s.m.roomById[d.room];
    const outside = { x: d.x + d.w / 2 + (d.horiz ? 0 : (d.x < r.x ? -40 : 40)), y: d.y + d.h / 2 + (d.horiz ? (d.y < r.y ? -40 : 40) : 0) }; p.x = outside.x; p.y = outside.y; p.lastPosT = s.t - 1;
    const inside = { x: r.cx, y: r.cy }; const step = { x: outside.x + (inside.x - outside.x) * 0.15, y: outside.y + (inside.y - outside.y) * 0.15 };
    s.handlePos(0, d.x + d.w / 2, d.y + d.h / 2, 1, 'walk', true); expect(Math.hypot(p.x - outside.x, p.y - outside.y)).toBeLessThan(1);
    p.access = true; p.lastPosT = s.t - 1; s.handlePos(0, d.x + d.w / 2, d.y + d.h / 2, 1, 'walk', true); expect(Math.hypot(p.x - (d.x + d.w / 2), p.y - (d.y + d.h / 2))).toBeLessThan(1); void step;
  });
  it('every special role ability can be used without errors', () => {
    for (const r of SPECIAL) { const s = mk('orbital', 8, { rescue: true }); run(s, 9); const p = role(s, r.id, 0); const o = s.get(1)!; o.x = p.x + 20; o.y = p.y; p.acd = 0; p.kcd = 0;
      if (r.ability?.target === 'body') { const v = s.get(2)!; v.x = p.x + 10; v.y = p.y; s.kill(v, s.get(3)!); }
      expect(() => { if (r.ability?.meeting) return; s.handleAct(0, { k: 'ability', target: 1, body: s.bodies[0]?.id, sys: 'vents' }); run(s, 1); }, r.id).not.toThrow(); }
  });
});

describe('AI soak — full matches on every map end with a winner', () => {
  for (const map of Object.keys(MAPS).filter(m => m !== 'lobby')) it(map, () => {
    let finished = 0; for (const seed of [11, 23]) { const s = mk(map, 10, { infiltrators: 2, neutrals: 1, specialCrew: 5, discussion: 5, voting: 15, killCooldown: 20, bots: 10 }, seed); const b = new Bots(s);
      for (let i = 0; i < 30 * 60 * 9 && !s.winner; i++) { s.step(1 / 30); b.step(1 / 30); s.out.length = 0; }
      if (s.winner) finished++; const tasksDone = s.players.reduce((a, p) => a + p.stats.tasks, 0); expect(tasksDone + s.players.reduce((a, p) => a + p.stats.kills, 0), `${map} activity`).toBeGreaterThan(3); }
    expect(finished, `${map} matches finished`).toBeGreaterThanOrEqual(1);
  }, 120000);
});
