// Host-side AI crew ("bots") so a room can be filled and solo practice works. Bots use the same movement model,
// send the same validated actions as human players, remember what they saw, and argue/vote in meetings.
import { TILE, USE_RANGE, REPORT_RANGE } from './game__core__constants';
import { Sim, P, CRITICAL } from './game__sim__sim';
import { stepMove } from './game__sim__move';
import { roomOf, roomName } from './game__maps__builder';
import { ROLE } from './game__roles__roles';

interface Brain { s: number; path: { x: number; y: number }[]; goal: string; gx: number; gy: number; wait: number; spot?: string; vx: number; vy: number; sus: Record<number, number>; seen: { s: number; room: string; t: number }[]; saw: string[]; nextSab: number; said: boolean; voteAt: number; think: number; ventPlan?: { spot: string; to?: string; t: number }; reportDelay: number; flee: number }
const LINES = {
  where: ['Where was the body?', 'Who found it?', 'Where?', 'ok who was near there'], self: ['I was in {room} doing tasks.', 'I was in {room}.', 'I was just finishing tasks in {room}.', '{room}, doing my thing.'],
  accuse: ['{name} was near the body.', 'I saw {name} close to {room}.', '{name} is acting sus.', 'I think it’s {name}.'], witness: ['I SAW {name} DO IT!', '{name} killed right in front of me!', 'It was {name}, 100%.'],
  skip: ['No info, I’m skipping.', 'Skip this one?', 'Not enough evidence.', 'I have nothing, skip.'], vent: ['{name} came out of a vent!'], defend: ['It wasn’t me!', 'I was doing tasks, I swear.', 'Why me??'],
};
const pick = <T,>(a: T[], r: () => number) => a[Math.floor(r() * a.length)];

export class Bots {
  brains = new Map<number, Brain>(); accused: Record<number, number> = {}; prevVent = new Map<number, string | null>();
  constructor(public sim: Sim) {
    for (const p of sim.players) if (p.bot) this.brains.set(p.s, { s: p.s, path: [], goal: 'idle', gx: p.x, gy: p.y, wait: 1 + this.sim.rand() * 2, vx: 0, vy: 0, sus: {}, seen: [], saw: [], nextSab: 40 + this.sim.rand() * 40, said: false, voteAt: 0, think: 0, reportDelay: 0, flee: 0 });
    sim.onDeath = (v, k) => { if (!k) return; for (const [s, b] of this.brains) { const me = sim.get(s)!; if (!me.alive || s === k.s || s === v.s) continue; if (sim.canSee(me, v)) { const shown = sim.appearance(k); b.sus[shown] = (b.sus[shown] || 0) + 120; b.saw.push(`kill:${shown}`); } } };
  }
  get skill() { return this.sim.set.botSkill; }
  step(dt: number) {
    const sim = this.sim; const vents = new Map(sim.players.map(o => [o.s, o.vent] as [number, string | null]));
    for (const [s, b] of this.brains) { const p = sim.get(s); if (!p) continue; b.think -= dt;
      if (sim.phase === 'meeting') { this.meeting(p, b); continue; } b.said = false; b.voteAt = 0;
      if (sim.phase !== 'play' && sim.phase !== 'lobby') { b.path = []; continue; }
      if (sim.phase === 'lobby') { this.wander(p, b, dt, true); continue; }
      if (p.extracted || (!p.alive && !p.ghost)) continue;
      if (p.vent) { this.ventLogic(p, b); continue; }
      this.observe(p, b);
      if (b.think <= 0) { b.think = 0.25; this.decide(p, b); }
      this.walk(p, b, dt);
    }
    this.prevVent = vents; if (sim.phase !== 'meeting') this.accused = {};
  }
  observe(p: P, b: Brain) { const sim = this.sim; if (!p.alive) return; const room = roomOf(sim.m, p.x, p.y);
    for (const o of sim.players) { if (o.s === p.s || !o.alive) continue; const was = this.prevVent.get(o.s) ?? null; if (was !== o.vent && o.role !== 'engineer') { const sp = sim.m.byId[(o.vent || was)!]; if (sp && sim.canSee(p, sp)) { const app = sim.appearance(o); b.sus[app] = (b.sus[app] || 0) + 90; b.saw.push('vent:' + app); } } }
    for (const o of sim.players) { if (o.s === p.s || !o.alive || o.vent) continue; if (!sim.canSee(p, o)) continue; const app = sim.appearance(o); b.seen.push({ s: app, room: roomOf(sim.m, o.x, o.y), t: sim.t }); }
    if (b.seen.length > 200) b.seen.splice(0, 100); }
  decide(p: P, b: Brain) {
    const sim = this.sim; const role = ROLE[p.role];
    if (b.goal === 'doing' || b.goal === 'holding') { if (b.goal === 'holding' && !p.alive) b.goal = 'idle'; else return; }
    if (!p.alive) { // ghosts finish tasks
      const t = p.tasks.find(t => !t.done); if (t && !p.fake && sim.set.ghostTasks) return this.goSpot(p, b, t.steps[t.step], 'task'); return this.wanderGoal(p, b); }
    // bodies
    if (b.goal !== 'report') for (const body of sim.bodies) if (!(b as any).ignore?.has(body.id) && sim.canSee(p, body)) { if (p.faction === 'infiltrator' && this.sim.rand() < 0.6 && b.flee > sim.t - 8) continue; b.goal = 'report'; b.gx = body.x; b.gy = body.y; b.path = sim.w.path(p.x, p.y, body.x, body.y); b.reportDelay = sim.t + (this.skill === 'hard' ? 0.3 : 0.9) + this.sim.rand(); (b as any).body = body.id; break; }
    if (b.goal === 'report') { const body = sim.bodies.find(x => x.id === (b as any).body); if (!body) { b.goal = 'idle'; return; } if (Math.hypot(body.x - p.x, body.y - p.y) < REPORT_RANGE - 10 && sim.t > b.reportDelay) { sim.handleAct(p.s, { k: 'report', body: body.id }); if (sim.phase === 'play') { const bb = b as any; bb.rep = (bb.rep || 0) + 1; if (bb.rep > 4) { (bb.ignore = bb.ignore || new Set()).add(body.id); b.goal = 'idle'; bb.rep = 0; } else { b.path = sim.w.path(p.x, p.y, body.x, body.y + 4); b.reportDelay = sim.t + 0.4; } } else b.goal = 'idle'; } return; }
    if (b.goal === 'doing' || b.goal === 'holding') return;
    // critical sabotage → go fix
    if (sim.sab && (p.faction !== 'infiltrator')) { const need = sim.sab.spots.filter(x => !sim.sab!.done.includes(x)); if (need.length) { let target = need.map(id => sim.m.byId[id]).sort((a, c) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(c.x - p.x, c.y - p.y))[0]; if (sim.sab.id === 'reactor' && need.length > 1) { const load = (id: string) => (sim.sab!.holds[id]?.length || 0) * 10 + [...this.brains.values()].filter(o => o.spot === id && o.s !== p.s).length; const sorted = need.slice().sort((a, c) => load(a) - load(c)); target = sim.m.byId[load(sorted[0]) === load(sorted[1]) ? need[p.s % need.length] : sorted[0]]; }
      if (sim.sab.critical || this.sim.rand() < 0.5 || b.goal === 'fix') { if (b.spot !== target.id || b.goal !== 'fix') this.goSpot(p, b, target.id, 'fix'); return; } } }
    // infiltrator: kill / sabotage
    if (p.faction === 'infiltrator' || (p.role === 'bounty' && !p.personalWin)) { if (this.hunt(p, b)) return; }
    if (p.faction === 'infiltrator' && sim.t > b.nextSab && sim.sabCd <= sim.t && !sim.sab) { b.nextSab = sim.t + 25 + this.sim.rand() * 35; const opts = sim.m.spec.sabotages.filter(x => x !== 'doors'); if (opts.length) { const id = this.sim.rand() < 0.3 ? 'doors' : pick(opts, this.sim.rand); if (id === 'doors') { const rs = sim.m.rooms.filter(r => sim.m.doors.some(d => d.room === r.id)); if (rs.length) sim.handleAct(p.s, { k: 'sab', id, room: pick(rs, this.sim.rand).id }); } else sim.handleAct(p.s, { k: 'sab', id }); } }
    // relic seeker
    if (p.role === 'relic' && !p.personalWin) { const r = sim.relicSpots.filter(r => !r.taken).sort((a, c) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(c.x - p.x, c.y - p.y))[0]; if (p.relics >= 4 && sim.beacon) return this.goPoint(p, b, sim.beacon.x, sim.beacon.y, 'beacon'); if (r && this.sim.rand() < 0.8) return this.goPoint(p, b, r.x, r.y, 'relic'); }
    // medic shields someone nearby once
    if (p.role === 'medic' && (p.uses ?? 0) > 0 && p.acd <= sim.t) { const o = sim.players.find(o => o.s !== p.s && o.alive && Math.hypot(o.x - p.x, o.y - p.y) < 1.8 * TILE); if (o) sim.handleAct(p.s, { k: 'ability', target: o.s }); }
    if (p.role === 'survivor' && p.acd <= sim.t && (p.uses ?? 0) > 0 && sim.players.some(o => o.alive && o.faction === 'infiltrator' && o.s !== p.s && Math.hypot(o.x - p.x, o.y - p.y) < 2.5 * TILE)) sim.handleAct(p.s, { k: 'ability' });
    // tasks
    if (b.goal === 'task' || b.goal === 'fix' || b.goal === 'relic' || b.goal === 'beacon' || b.goal === 'keycard') return;
    if (b.goal === 'doing' || b.goal === 'holding') return;
    const t = p.tasks.find(t => !t.done && !(t as any).botFaked); if (t && this.sim.rand() < 0.9) return this.goSpot(p, b, t.steps[t.step], 'task');
    if (b.goal === 'idle' || b.path.length === 0) { if (sim.m.byId['emergency'] && this.sim.rand() < 0.002 && p.meetingsLeft > 0) return this.goSpot(p, b, 'emergency', 'button'); this.wanderGoal(p, b); }
  }
  hunt(p: P, b: Brain): boolean {
    const sim = this.sim; if (p.kcd > sim.t) { if (b.flee > sim.t) return true; return false; } const pace = this.skill === 'hard' ? 20 : this.skill === 'easy' ? 50 : 27; if (sim.t - ((b as any).lastKill ?? -999) < pace) return false;
    const aggressive = this.skill === 'hard' ? 0.8 : this.skill === 'easy' ? 0.2 : 0.5; if (sim.t - sim.roundStart < 8) return false;
    const victims = sim.players.filter(o => o.alive && o.s !== p.s && !o.vent && (p.role === 'bounty' ? o.s === p.bounty : o.faction !== 'infiltrator') && sim.canSee(p, o) && Math.hypot(o.x - p.x, o.y - p.y) < 6 * TILE);
    for (const v of victims) { const witnesses = sim.players.filter(o => o.alive && o.s !== p.s && o.s !== v.s && (o.faction !== 'infiltrator' || p.role === 'bounty') && (sim.canSee(o, v) || sim.canSee(o, p)));
      if (witnesses.length > 0 || this.sim.rand() > aggressive) continue;
      const d = Math.hypot(v.x - p.x, v.y - p.y); if (d <= sim.set.killRange * TILE) { sim.handleAct(p.s, { k: 'kill', target: v.s }); if (!v.alive || v.downedUntil > sim.t) { (b as any).lastKill = sim.t; b.flee = sim.t + 6; this.escape(p, b); } return true; }
      b.goal = 'chase'; b.path = [{ x: v.x, y: v.y }]; return true; }
    return false;
  }
  escape(p: P, b: Brain) { const sim = this.sim; const vent = sim.m.spots.find(s => s.kind === 'vent' && Math.hypot(s.x - p.x, s.y - p.y) < 3 * TILE); if (vent && ROLE[p.role].vents && this.sim.rand() < 0.6) { this.goSpot(p, b, vent.id, 'vent'); return; } this.wanderGoal(p, b, true); }
  ventLogic(p: P, b: Brain) { const sim = this.sim; const sp = sim.m.byId[p.vent!]; if (!b.ventPlan) b.ventPlan = { spot: p.vent!, to: sp.links?.length ? pick(sp.links, this.sim.rand) : undefined, t: sim.t + 0.8 + this.sim.rand() };
    if (sim.t < b.ventPlan.t) return; if (b.ventPlan.to && p.vent !== b.ventPlan.to) { sim.handleAct(p.s, { k: 'vent', spot: p.vent, to: b.ventPlan.to }); b.ventPlan.t = sim.t + 0.6; return; }
    const someone = sim.players.some(o => o.alive && o.s !== p.s && o.faction !== 'infiltrator' && sim.canSee(o, p)); if (someone && sim.t - p.ventT < 5) { b.ventPlan.t = sim.t + 0.5; return; }
    sim.handleAct(p.s, { k: 'vent', spot: p.vent }); b.ventPlan = undefined; this.wanderGoal(p, b); }
  goSpot(p: P, b: Brain, id: string, goal: string) { const sp = this.sim.m.byId[id]; if (!sp) return; if (!p.access && !p.ghost && this.sim.m.roomById[sp.room]?.spec.restricted && this.sim.m.byId['keycard'] && id !== 'keycard') { id = 'keycard'; goal = 'keycard'; return this.goSpot(p, b, 'keycard', 'keycard'); } const ty = sp.wall ? sp.y + 6 : sp.y + 22; this.goPoint(p, b, sp.x, ty, goal); b.spot = id; }
  goPoint(p: P, b: Brain, x: number, y: number, goal: string) { if (b.goal === goal && Math.hypot(b.gx - x, b.gy - y) < 4 && b.path.length) return; b.goal = goal; b.gx = x; b.gy = y; const sim = this.sim; const lock = !p.access && sim.m.restricted.length; if (lock) sim.w.setDoors([...sim.doorsClosed(), ...sim.m.restricted]); b.path = sim.w.path(p.x, p.y, x, y); if (lock) sim.w.setDoors(sim.doorsClosed()); b.spot = undefined; }
  wanderGoal(p: P, b: Brain, far = false) { const sim = this.sim; const rooms = sim.m.rooms.filter(r => !far || Math.hypot(r.cx - p.x, r.cy - p.y) > 12 * TILE); const r = pick(rooms.length ? rooms : sim.m.rooms, this.sim.rand); const pt = sim.freePoint(r); this.goPoint(p, b, pt.x, pt.y, 'wander'); }
  wander(p: P, b: Brain, dt: number, lobby = false) { b.wait -= dt; if (b.path.length === 0 && b.wait <= 0) { this.wanderGoal(p, b); b.wait = 2 + this.sim.rand() * 4; } this.walk(p, b, dt); }
  walk(p: P, b: Brain, dt: number) {
    const sim = this.sim;
    if (b.goal === 'doing') { b.wait -= dt; if (b.wait <= 0) { const sp = b.spot!; if (sim.sab && sim.sab.spots.includes(sp) && b.goal === 'doing' && (b as any).fixing) sim.handleAct(p.s, { k: 'fix', spot: sp }); else { sim.handleAct(p.s, { k: 'task_done', spot: sp }); if (p.fake) { const t = p.tasks.find(t => !t.done && t.steps[t.step] === sp); if (t) (t as any).botFaked = true; } } b.goal = 'idle'; (b as any).fixing = false; } this.idle(p); return; }
    if (b.goal === 'holding') { if (!sim.sab || sim.sab.id !== 'reactor') { b.goal = 'idle'; return; } this.idle(p); return; }
    if (!b.path.length) { this.arrive(p, b); this.idle(p); return; }
    const wp = b.path[0]; const dx = wp.x - p.x, dy = wp.y - p.y, d = Math.hypot(dx, dy);
    if (d < 8) { b.path.shift(); if (!b.path.length) this.arrive(p, b); return; }
    const st = { x: p.x, y: p.y, vx: b.vx, vy: b.vy }; const sp = stepMove(sim.w, st, dx / d, dy / d, dt, { speed: sim.set.speed * (this.skill === 'easy' ? 0.85 : 0.95), slow: p.slow > sim.t, slippery: sim.ev?.id === 'gravity' || sim.ev?.id === 'freeze' || sim.sab?.id === 'gravity', ghost: p.ghost, bypass: false, flood: sim.sab?.id === 'flood' });
    if (Math.hypot(st.x - p.x, st.y - p.y) < 0.2 && d > 10) { const bb = b as any; bb.stuck = (bb.stuck || 0) + dt; if (bb.stuck > 0.8) { bb.stuck = 0; bb.tries = (bb.tries || 0) + 1;
        if (bb.tries > 2) { // wiggle free, then give up on this goal
          const a = sim.rand() * Math.PI * 2; const [nx, ny] = sim.w.move(st.x, st.y, Math.cos(a) * 14, Math.sin(a) * 14); st.x = nx; st.y = ny; if (bb.tries > 5) { bb.tries = 0; b.path = []; b.goal = 'idle'; } }
        else b.path = sim.w.path(p.x, p.y, b.gx, b.gy); } } else (b as any).tries = 0, (b as any).stuck = 0;
    b.vx = st.vx; b.vy = st.vy; p.x = st.x; p.y = st.y; p.f = st.vx < -1 ? -1 : st.vx > 1 ? 1 : p.f; p.moving = sp > 10; p.a = sp > 10 ? 'walk' : 'idle'; p.lastPosT = sim.t;
  }
  idle(p: P) { p.moving = false; p.a = 'idle'; }
  arrive(p: P, b: Brain) { const sim = this.sim; if (b.goal === 'report') return;
    if (b.goal === 'task' && b.spot) { sim.handleAct(p.s, { k: 'task_open', spot: b.spot }); b.goal = 'doing'; b.wait = 2.6 + this.sim.rand() * 3.8; return; }
    if (b.goal === 'fix' && b.spot) { const sp = sim.m.byId[b.spot]; if (sp.sab === 'reactor') { sim.handleAct(p.s, { k: 'hold', spot: b.spot, on: true }); b.goal = 'holding'; return; } b.goal = 'doing'; (b as any).fixing = true; b.wait = 2.5 + this.sim.rand() * 2; return; }
    if (b.goal === 'vent' && b.spot) { sim.handleAct(p.s, { k: 'vent', spot: b.spot }); b.goal = 'idle'; return; }
    if (b.goal === 'button') { sim.handleAct(p.s, { k: 'emergency' }); b.goal = 'idle'; return; }
    if (b.goal === 'keycard') { sim.handleAct(p.s, { k: 'keycard' }); b.goal = 'idle'; return; }
    b.goal = 'idle'; }
  // ── meetings ──
  meeting(p: P, b: Brain) {
    const sim = this.sim; const mt = sim.meeting!; if (!p.alive) return;
    if (!b.said && sim.t > mt.t0 + 1.5 + (p.s % 5) * 1.3) { b.said = true; this.talk(p, b); }
    if (sim.t >= mt.discussEnd && mt.votes[p.s] === undefined && !mt.result) { if (!b.voteAt) b.voteAt = mt.discussEnd + 2 + this.sim.rand() * Math.min(20, sim.set.voting * 0.5); if (sim.t >= b.voteAt) sim.handleAct(p.s, { k: 'vote', target: this.choose(p, b) }); }
  }
  suspicion(p: P, b: Brain) {
    const sim = this.sim; const mt = sim.meeting!; const sus: Record<number, number> = { ...b.sus };
    if (mt.body !== null) { const body = sim.players.find(x => x.s === mt.body); const deathT = body?.stats.deathT ?? sim.t; const deathRoom = body ? roomOf(sim.m, body.x, body.y) : '';
      const near = new Set<number>(); for (const sn of b.seen) if (Math.abs(sn.t - deathT) < 10 && sn.room === deathRoom && sn.s !== p.s && sn.s !== mt.body) near.add(sn.s); for (const x of near) sus[x] = (sus[x] || 0) + (near.size === 1 ? 45 : 24 / near.size + 8); }
    // random-ish noise & self-exclusion
    for (const o of sim.players) if (o.alive && o.s !== p.s) sus[o.s] = (sus[o.s] || 0) + this.sim.rand() * (this.skill === 'easy' ? 26 : this.skill === 'hard' ? 4 : 9);
    for (const [k, w] of Object.entries(this.accused)) if (+k !== p.s) sus[+k] = (sus[+k] || 0) + w * (p.faction === 'crew' ? 0.6 : 0.3);
    delete sus[p.s]; if (p.faction === 'infiltrator') for (const o of sim.players) if (o.faction === 'infiltrator') delete sus[o.s];
    return sus; }
  choose(p: P, b: Brain): number | 'skip' {
    const sim = this.sim; const sus = this.suspicion(p, b); const alive = sim.players.filter(o => o.alive && o.s !== p.s && sus[o.s] !== undefined); if (!alive.length) return 'skip';
    alive.sort((a, c) => (sus[c.s] || 0) - (sus[a.s] || 0)); const top = alive[0]; const thr = this.skill === 'hard' ? 24 : this.skill === 'easy' ? 36 : 28;
    if (p.role === 'jester') return 'skip';
    if ((sus[top.s] || 0) > thr) return top.s;
    // bandwagon
    const counts: Record<string, number> = {}; for (const v of Object.values(sim.meeting!.votes)) counts[String(v)] = (counts[String(v)] || 0) + 1; const lead = Object.entries(counts).sort((a, c) => c[1] - a[1])[0];
    if (lead && lead[0] !== 'skip' && lead[1] >= 3 && this.sim.rand() < 0.35 && +lead[0] !== p.s && !(p.faction === 'infiltrator' && sim.get(+lead[0])?.faction === 'infiltrator')) return +lead[0];
    if (p.faction === 'infiltrator' && this.sim.rand() < 0.3) return pick(alive.filter(o => o.faction !== 'infiltrator'), this.sim.rand)?.s ?? 'skip';
    return 'skip'; }
  talk(p: P, b: Brain) {
    const sim = this.sim; const say = (t: string) => sim.onChat(p, t); const room = roomName(sim.m, p.room || roomOf(sim.m, p.x, p.y)); const r = this.sim.rand;
    const kills = b.saw.filter(x => x.startsWith('kill:')).map(x => +x.slice(5)); const lastKill = kills[kills.length - 1];
    if (lastKill !== undefined && sim.get(lastKill)?.alive) { say(pick(LINES.witness, r).replace('{name}', sim.get(lastKill)!.name)); this.accused[lastKill] = (this.accused[lastKill] || 0) + 70; return; }
    const vents = b.saw.filter(x => x.startsWith('vent:')).map(x => +x.slice(5)); const lv = vents[vents.length - 1]; if (lv !== undefined && sim.get(lv)?.alive && p.faction !== 'infiltrator') { say(pick(LINES.vent, r).replace('{name}', sim.get(lv)!.name)); this.accused[lv] = (this.accused[lv] || 0) + 55; return; }
    const sus = this.suspicion(p, b); const top = Object.entries(sus).sort((a, c) => c[1] - a[1])[0];
    if (top && top[1] > 30 && sim.get(+top[0])?.alive) { say(pick(LINES.accuse, r).replace('{name}', sim.get(+top[0])!.name).replace('{room}', room)); this.accused[+top[0]] = (this.accused[+top[0]] || 0) + Math.min(30, top[1] * 0.4); return; }
    if (r() < 0.5) say(pick(LINES.self, r).replace('{room}', room)); else say(pick(LINES.skip, r)); }
}
