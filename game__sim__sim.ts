// AMONG YOU — authoritative game simulation (runs on the host only). Clients send movement + action requests;
// the host validates every elimination, vote, task, sabotage and ability, and sends each player a filtered view.
import { TILE, BASE_SPEED, USE_RANGE, REPORT_RANGE, COLORS } from './game__core__constants';
import type { Anim, Body, ChatMsg, Cosmetics, Faction, Phase, PlayerPublic, SabotageId, Settings, TaskAssign } from './game__core__types';
import { MapData, roomOf, roomName, Spot } from './game__maps__builder';
import { World } from './game__sim__physics';
import { ROLE, ROLES, CHAOS_GOALS } from './game__roles__roles';
import { TASKS } from './game__tasks__tasks';
import type { Ev, MeetingState, MeetingView, PrivateView, RosterEntry, SabState, Trace, View } from './game__sim__types';

export const CRITICAL: Partial<Record<SabotageId, number>> = { reactor: 45, oxygen: 45, lifesupport: 50, pressure: 45 };
export const SAB_GAME: Record<SabotageId, string> = { reactor: 'handscan', oxygen: 'keypad', comms: 'frequency', security: 'reboot', doors: '', gravity: 'magnet', lifesupport: 'temperature', power: 'switches', flood: 'valve', pressure: 'pressure' };
export const SAB_NAME: Record<SabotageId, string> = { reactor: 'Reactor Meltdown', oxygen: 'Oxygen Failure', comms: 'Comms Disruption', security: 'Security Blackout', doors: 'Door Lockdown', gravity: 'Gravity Malfunction', lifesupport: 'Life-Support Failure', power: 'Power Outage', flood: 'Flooding', pressure: 'Pressure Failure' };
export const EVENT_NAME: Record<string, string> = { gravity: 'Gravity fluctuation', reactor_pulse: 'Reactor instability', blizzard: 'Blizzard', freeze: 'Flash freeze', leak: 'Water leak', sandstorm: 'Sandstorm', flicker: 'Unstable power', defense: 'Automated defense active' };

export interface P {
  s: number; pid: string; name: string; cos: Cosmetics; bot: boolean; conn: boolean; x: number; y: number; f: 1 | -1; a: Anim; moving: boolean; lastPosT: number; room: string;
  alive: boolean; ghost: boolean; extracted: boolean; role: string; faction: Faction; tasks: TaskAssign[]; fake: boolean;
  kcd: number; acd: number; uses: number | null; active: number; target: number; jam: number; slow: number; shiftAs: number; shiftUntil: number; inv: number; vest: number; guardBy: number; guardUntil: number; shieldBy: number;
  vent: string | null; ventT: number; downedUntil: number; meetingsLeft: number; battery: number; onCams: boolean; onAdmin: boolean; taskOpen: Record<string, number>; holding: string | null;
  bounty: number | null; bountyRerolled: boolean; goal: string; goalTarget: number; relics: number; extractT: number; personalWin: boolean; actedThisRound: boolean; framed: number; frameUntil: number; lastChat: number; lastSeq: number; access: boolean;
  stats: { tasks: number; kills: number; investigations: number; votesRecv: number; meetings: number; abilities: number; correctVotes: number; fixes: number; deathT: number };
}
const rnd = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const tone = (c: number) => { const n = COLORS[c].name; return ['Crimson', 'Tangerine', 'Sunflower', 'Coral', 'Rose', 'Gold', 'Mocha'].includes(n) ? 'warm' : ['Snow', 'Slate', 'Onyx'].includes(n) ? 'neutral' : 'cool'; };

export class Sim {
  phase: Phase = 'intro'; t = 0; w: World; players: P[] = []; bodies: Body[] = []; bodyId = 1; traceId = 1; traces: Trace[] = []; sab: SabState | null = null; sabCd = 10; doorLock: Record<string, number> = {}; doorCd: Record<string, number> = {};
  ev: { id: string; until: number } | null = null; nextEvent = 60; meeting: MeetingState | null = null; ejection: { s: number | null; text: string; sub: string; until: number } | null = null; winner: any = null; roundStart = 0; meetingsHeld = 0;
  logs: { t: number; room: string; c: number; s: number }[] = []; sys: { t: number; sys: string; s: number; room: string; fake?: boolean }[] = []; chat: ChatMsg[] = []; chatId = 1; leaks: { id: number; x: number; y: number }[] = []; leakId = 1;
  rand: () => number; onDeath?: (v: P, k: P | null) => void; out: { to: number | 'all' | 'ghosts' | 'inf'; ev: Ev }[] = []; frames: number[][] = []; events: any[] = []; lastFrame = -1; introEnd = 0; relicSpots: { id: number; x: number; y: number; taken: boolean }[] = []; beacon: { x: number; y: number } | null = null;
  constructor(public m: MapData, public set: Settings, roster: RosterEntry[], seed = Date.now() & 0xffff, lobby = false) {
    this.w = new World(m); this.rand = rnd(seed);
    this.players = roster.map(r => this.newPlayer(r));
    if (lobby) { this.phase = 'lobby'; return; }
    this.assignRoles(); this.assignTasks(); this.spawnRing(); this.introEnd = 5.5; this.roundStart = this.introEnd;
    this.players.forEach(p => { p.kcd = Math.max(10, set.killCooldown * 0.5); p.acd = 8; });
    this.nextEvent = this.introEnd + 50 + this.rand() * 40; this.sabCd = this.introEnd + 15;
  }
  newPlayer(r: RosterEntry): P {
    return { s: r.s, pid: r.pid, name: r.name, cos: r.cos, bot: r.bot, conn: true, x: this.m.spawn.x, y: this.m.spawn.y, f: 1, a: 'idle', moving: false, lastPosT: 0, room: '', alive: true, ghost: false, extracted: false, role: 'crewmate', faction: 'crew', tasks: [], fake: false,
      kcd: 0, acd: 0, uses: null, active: 0, target: -1, jam: 0, slow: 0, shiftAs: -1, shiftUntil: 0, inv: 0, vest: 0, guardBy: -1, guardUntil: 0, shieldBy: -1, vent: null, ventT: 0, downedUntil: 0, meetingsLeft: this.set.meetings, battery: 12, onCams: false, onAdmin: false, taskOpen: {}, holding: null,
      bounty: null, bountyRerolled: false, goal: '', goalTarget: -1, relics: 0, extractT: 0, personalWin: false, actedThisRound: false, framed: -1, frameUntil: 0, lastChat: 0, lastSeq: -1, access: false,
      stats: { tasks: 0, kills: 0, investigations: 0, votesRecv: 0, meetings: 0, abilities: 0, correctVotes: 0, fixes: 0, deathT: -1 } };
  }
  get(s: number) { return this.players.find(p => p.s === s); }
  emit(to: number | 'all' | 'ghosts' | 'inf', ev: Ev) { this.out.push({ to, ev }); }
  toast(s: number, text: string, kind = 'info') { this.emit(s, { e: 'toast', text, kind }); }
  log(e: any) { this.events.push({ t: +this.t.toFixed(1), ...e }); }
  cd(base: number) { return base * this.set.abilityCooldownMul; }
  dur(base: number) { return base * this.set.abilityDurationMul; }

  // ───────────────────────── setup ─────────────────────────
  assignRoles() {
    const ps = this.players.slice(); const R = this.rand; for (let i = ps.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ps[i], ps[j]] = [ps[j], ps[i]]; }
    const nInf = Math.max(1, Math.min(this.set.infiltrators, Math.floor((ps.length - 1) / 2)));
    const pick = (pool: typeof ROLES) => { const tot = pool.reduce((a, r) => a + (this.set.roleChance[r.id] ?? r.chance), 0); if (tot <= 0) return null; let x = R() * tot; for (const r of pool) { x -= this.set.roleChance[r.id] ?? r.chance; if (x <= 0) return r; } return pool[pool.length - 1]; };
    const infPool = ROLES.filter(r => r.faction === 'infiltrator' && r.id !== 'infiltrator'); const crewPool = ROLES.filter(r => r.faction === 'crew' && r.id !== 'crewmate' && (!r.requires || this.set.rescue)); const neuPool = ROLES.filter(r => r.faction === 'neutral');
    const used = new Set<string>(); let i = 0;
    for (; i < nInf; i++) { const avail = infPool.filter(r => !used.has(r.id)); let r = R() < 0.65 ? pick(avail) : null; if (r) used.add(r.id); this.setRole(ps[i], r ? r.id : 'infiltrator'); }
    const nNeu = Math.min(this.set.neutrals, Math.max(0, ps.length - nInf - 3));
    for (let k = 0; k < nNeu && i < ps.length; k++) { const r = pick(neuPool.filter(r => !used.has(r.id))); if (!r) break; if (R() * 100 > (this.set.roleChance[r.id] ?? r.chance) + 30) continue; used.add(r.id); this.setRole(ps[i++], r.id); }
    let special = this.set.specialCrew;
    for (; i < ps.length; i++) { let r = special > 0 ? pick(crewPool.filter(r => !used.has(r.id))) : null; if (r && R() * 100 < (this.set.roleChance[r.id] ?? r.chance) + 25) { used.add(r.id); special--; this.setRole(ps[i], r.id); } else this.setRole(ps[i], 'crewmate'); }
    // per-role extras
    for (const p of this.players) {
      if (p.role === 'bounty') this.newBounty(p);
      if (p.role === 'chaos') { const g = CHAOS_GOALS[Math.floor(R() * CHAOS_GOALS.length)]; p.goal = g.id; if (g.id === 'eject') { const c = this.players.filter(o => o.s !== p.s); p.goalTarget = c[Math.floor(R() * c.length)].s; } }
      if (p.role === 'relic') this.spawnRelics();
    }
    const team = this.players.filter(p => p.faction === 'infiltrator').map(p => p.s);
    for (const p of this.players) this.emit(p.s, { e: 'role', role: p.role, faction: p.faction, team: p.faction === 'infiltrator' ? team : [], bounty: p.bounty, goal: p.goal ? CHAOS_GOALS.find(g => g.id === p.goal)!.text.replace('{target}', this.get(p.goalTarget)?.name || '') : '' });
    this.log({ k: 'roles', roles: this.players.map(p => [p.s, p.role]) });
  }
  setRole(p: P, id: string) { const r = ROLE[id]; p.role = id; p.faction = r.faction; p.uses = r.ability?.uses ?? null; p.fake = r.faction !== 'crew'; }
  newBounty(p: P) { const c = this.players.filter(o => o.s !== p.s && o.alive && !o.extracted); p.bounty = c.length ? c[Math.floor(this.rand() * c.length)].s : null; }
  spawnRelics() { if (this.relicSpots.length) return; const rooms = this.m.rooms.slice().sort(() => this.rand() - 0.5); this.relicSpots = rooms.slice(0, 6).map((r, i) => { const pt = this.freePoint(r); return { id: i, ...pt, taken: false }; });
    const far = rooms[rooms.length - 1]; this.beacon = this.freePoint(far); }
  freePoint(r: { x: number; y: number; w: number; h: number }) { for (let k = 0; k < 60; k++) { const x = r.x + TILE * 1.5 + this.rand() * (r.w - TILE * 3), y = r.y + TILE * 1.5 + this.rand() * (r.h - TILE * 3); if (!this.w.blocked(x, y, 14)) return { x, y }; } return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
  assignTasks() {
    const games = new Map<string, Spot[]>(); this.m.spots.filter(s => s.kind === 'task').forEach(s => { (games.get(s.game!) || games.set(s.game!, []).get(s.game!)!).push(s); });
    const avail = TASKS.filter(t => (t.steps || [t.id]).every(g => games.has(g)));
    const pickSpot = (g: string) => { const l = games.get(g)!; return l[Math.floor(this.rand() * l.length)].id; };
    const mk = (t: typeof TASKS[number]): TaskAssign => { const steps = (t.steps || [t.id]).map(pickSpot); return { id: t.id, spot: steps[0], steps, step: 0, done: false }; };
    const commons = avail.filter(t => t.kind === 'common').sort(() => this.rand() - 0.5).slice(0, this.set.commonTasks).map(mk);
    for (const p of this.players) { const R = (k: string, n: number) => avail.filter(t => t.kind === k).sort(() => this.rand() - 0.5).slice(0, n).map(mk);
      p.tasks = [...commons.map(c => ({ ...c, steps: c.steps.slice() })), ...R('long', this.set.longTasks), ...R('short', this.set.shortTasks)]; }
  }
  spawnRing() { const e = this.m.byId['emergency']; const alive = this.players; alive.forEach((p, i) => { const a = (i / alive.length) * Math.PI * 2; let x = e.x + Math.cos(a) * TILE * 3.2, y = e.y + Math.sin(a) * TILE * 2.4 + 10; if (this.w.blocked(x, y)) { x = e.x; y = e.y + TILE * 2.2; } p.x = x; p.y = y; p.f = Math.cos(a) > 0 ? -1 : 1; this.emit(p.s, { e: 'snap', x, y }); }); }

  // ───────────────────────── derived ─────────────────────────
  taskProgress() { let tot = 0, done = 0; for (const p of this.players) if (p.faction === 'crew' && !p.fake) for (const t of p.tasks) { tot += t.steps.length; done += t.done ? t.steps.length : t.step; } return tot ? done / tot : 0; }
  visionR(p: P) {
    if (p.ghost) return 99999; let r = (p.faction === 'infiltrator' ? this.set.infVision : this.set.crewVision) * TILE;
    const crewish = p.faction !== 'infiltrator';
    if (crewish && (this.sab?.id === 'power' || this.sab?.extra === 'power')) r *= 0.32;
    if (this.ev && this.t < this.ev.until) { if ((this.ev.id === 'blizzard' || this.ev.id === 'sandstorm') && this.inZone(p, 'outdoor')) r *= 0.5; else if (this.ev.id === 'blizzard' || this.ev.id === 'sandstorm') r *= 0.8; if (this.ev.id === 'flicker' && crewish) r *= 0.55; }
    if (crewish && this.traces.some(tr => tr.k === 'dark' && Math.hypot(tr.x - p.x, tr.y - p.y) < (tr.r || 0))) r *= 0.28;
    if (p.role === 'scout' && p.active > this.t) r *= 2;
    return r;
  }
  inZone(p: { x: number; y: number }, kind: string) { const tx = p.x / TILE, ty = p.y / TILE; if (kind === 'outdoor' && this.m.roomById[roomOf(this.m, p.x, p.y)]?.spec.outdoor) return true; return this.m.zones.some(z => z.kind === kind && tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h); }
  canSee(v: P, o: P | { x: number; y: number; s?: number }) {
    if (v.ghost) return true; const R = this.visionR(v); const d = Math.hypot(o.x - v.x, o.y - v.y); if (d > R + 20) return false;
    if (v.role === 'scout' && v.active > this.t) return true; return this.w.los(v.x, v.y - 14, o.x, o.y - 14);
  }
  doorsClosed(): string[] { const out: string[] = []; for (const d of this.m.doors) if ((this.doorLock[d.room] || 0) > this.t) out.push(d.id); return out; }
  appearance(p: P) { return p.shiftUntil > this.t && p.shiftAs >= 0 ? this.get(p.shiftAs)!.s : p.s; }
  commsDown() { return this.sab?.id === 'comms' || this.sab?.extra === 'comms'; }
  camsDown() { return this.commsDown() || this.sab?.id === 'security'; }

  // ───────────────────────── input ─────────────────────────
  handlePos(s: number, x: number, y: number, f: 1 | -1, a: Anim, moving: boolean) {
    const p = this.get(s); if (!p || this.phase === 'meeting' || this.phase === 'ejection' || this.phase === 'ended' || (this.phase === 'intro' && this.t < this.introEnd)) return;
    if (p.vent || p.downedUntil > this.t || p.extractT > 0 && false) return;
    const dt = Math.min(0.5, Math.max(0.03, this.t - p.lastPosT)); const max = BASE_SPEED * this.set.speed * 1.35 * 1.6 * dt + 28; const d = Math.hypot(x - p.x, y - p.y);
    const ghost = p.ghost; const bypass = p.role === 'specialist' && p.active > this.t;
    const lock = !ghost && !bypass && !p.access && this.m.restricted.length && this.phase !== 'lobby'; if (lock) this.w.setDoors([...this.doorsClosed(), ...this.m.restricted]);
    const clear = ghost || this.w.pathClear(p.x, p.y, x, y, bypass); if (lock) this.w.setDoors(this.doorsClosed());
    if (!Number.isFinite(x) || !Number.isFinite(y) || (!ghost && (d > max || !clear))) { this.emit(s, { e: 'snap', x: p.x, y: p.y }); p.lastPosT = this.t; return; }
    p.x = x; p.y = y; p.f = f; p.a = a; p.moving = moving; p.lastPosT = this.t;
  }
  handleAct(s: number, a: any) {
    const p = this.get(s); if (!p) return; if (typeof a.seq === 'number') { if (a.seq <= p.lastSeq) return; p.lastSeq = a.seq; }
    const k = a.k as string;
    try {
      if (k === 'chat') return this.onChat(p, String(a.text || ''));
      if (k === 'vote') return this.onVote(p, a.target);
      if (k === 'guess') return this.onGuess(p, a.target, a.role);
      if (k === 'session') return this.onSession(p, a.target);
      if (this.phase !== 'play') return;
      switch (k) {
        case 'kill': return this.onKill(p, a.target);
        case 'report': return this.onReport(p, a.body);
        case 'emergency': return this.onEmergency(p);
        case 'task_open': return this.onTaskOpen(p, a.spot);
        case 'task_done': return this.onTaskDone(p, a.spot);
        case 'vent': return this.onVent(p, a.spot, a.to);
        case 'sab': return this.onSabotage(p, a.id, a.room);
        case 'fix': return this.onFix(p, a.spot);
        case 'hold': return this.onHold(p, a.spot, !!a.on);
        case 'ability': return this.onAbility(p, a);
        case 'cams': p.onCams = !!a.on && this.nearSpot(p, 'cams', true) || (!!a.on && p.role === 'security' && p.battery > 0.5 && p.jam <= this.t); if (p.onCams) this.sysUse(p, 'cams'); return;
        case 'admin': p.onAdmin = !!a.on && this.nearSpot(p, 'admin', true); if (p.onAdmin) this.sysUse(p, 'admin'); return;
        case 'logs': if (this.nearSpot(p, 'logs', true) && !this.commsDown()) { this.emit(p.s, { e: 'logs', entries: this.logView(p) }); this.sysUse(p, 'logs'); } return;
        case 'passage': return this.onPassage(p, a.spot);
        case 'leak': return this.onLeak(p, a.id);
        case 'keycard': if (this.nearSpot(p, 'keycard', true) && !p.access) { p.access = true; this.sysUse(p, 'keycard'); this.toast(p.s, 'Keycard issued — restricted rooms unlocked for you.', 'ok'); } return;
        case 'extract': return;
      }
    } catch (err) { console.warn('bad action', a, err); }
  }
  nearSpot(p: P, id: string, mustAlive = false) { const sp = this.m.byId[id]; if (!sp) return false; if (mustAlive && !p.alive) return false; return Math.hypot(sp.x - p.x, sp.y - p.y) <= USE_RANGE + 26; }
  sysUse(p: P, sys: string) { this.sys.push({ t: this.t, sys, s: p.s, room: roomOf(this.m, p.x, p.y) }); if (this.sys.length > 400) this.sys.splice(0, 100); }

  // ── chat ──
  onChat(p: P, text: string) {
    text = text.replace(/\s+/g, ' ').trim().slice(0, 140); if (!text || this.t - p.lastChat < 0.6) return; p.lastChat = this.t;
    const inMeeting = this.phase === 'meeting' || this.phase === 'lobby' || this.phase === 'ended'; if (!inMeeting && !p.ghost) return;
    const msg: ChatMsg = { id: this.chatId++, s: p.s, text, ghost: p.ghost && this.phase !== 'lobby' && this.phase !== 'ended', t: this.t }; this.chat.push(msg); if (this.chat.length > 200) this.chat.shift();
    if (msg.ghost) this.emit('ghosts', { e: 'chat', msg }); else this.emit('all', { e: 'chat', msg });
  }
  // ── kill ──
  onKill(p: P, ts: number) {
    const v = this.get(ts); const r = ROLE[p.role]; if (!v || !p.alive || p.ghost || p.vent || !r.kills || p.kcd > this.t || !v.alive || v.s === p.s || v.vent) return;
    if (p.role === 'phantom' && p.active > this.t) return this.toast(p.s, 'You cannot eliminate while faded.', 'warn');
    if (p.faction === 'infiltrator' && v.faction === 'infiltrator') return;
    if (p.role === 'bounty' && v.s !== p.bounty) return this.toast(p.s, 'You can only eliminate your contract.', 'warn');
    if (p.role === 'bounty' && p.personalWin) return;
    const d = Math.hypot(v.x - p.x, v.y - p.y); if (d > this.set.killRange * TILE + 26 || !this.w.los(p.x, p.y - 10, v.x, v.y - 10)) return;
    p.kcd = this.t + (p.role === 'bounty' ? this.cd(30) : this.set.killCooldown);
    // protections
    if (v.vest > this.t) { this.toast(p.s, 'Your target was protected by a vest!', 'warn'); this.emit(v.s, { e: 'blocked', by: 'vest' }); this.fx(v, 'block'); return; }
    if (v.guardBy >= 0 && v.guardUntil > this.t) { const g = this.get(v.guardBy)!; if (g.alive) { v.guardUntil = 0; g.acd = this.t + this.cd(60); g.slow = this.t + 4; this.toast(g.s, `You blocked an attack on ${v.name}!`, 'ok'); this.toast(p.s, 'A bodyguard blocked your attack.', 'warn'); this.fx(v, 'block'); this.log({ k: 'block', by: g.s, v: v.s }); return; } }
    if (v.shieldBy >= 0) { const md = this.get(v.shieldBy); v.shieldBy = -1; this.toast(p.s, 'Your target was shielded.', 'warn'); if (md) this.toast(md.s, `Your shield on ${v.name} absorbed an attack!`, 'ok'); this.emit(v.s, { e: 'blocked', by: 'shield' }); this.fx(v, 'block'); p.kcd = this.t + 10; return; }
    this.kill(v, p);
  }
  kill(v: P, k: P | null, cause: 'kill' | 'guess' | 'vote' = 'kill') {
    const shown = k ? this.appearance(k) : -1;
    if (cause === 'kill' && k) { k.x = v.x; k.y = v.y; this.emit(k.s, { e: 'snap', x: v.x, y: v.y }); k.stats.kills++; k.actedThisRound = true; }
    if (cause === 'kill' && this.set.rescue) { v.downedUntil = this.t + 12; this.bodies.push({ id: this.bodyId++, s: v.s, x: v.x, y: v.y, t: this.t, room: roomOf(this.m, v.x, v.y), downed: true, until: this.t + 12 }); (this as any)['killer' + v.s] = { k: k!.s, shown, room: '' }; this.emit(v.s, { e: 'downed', by: shown }); this.fx(v, 'kill'); this.log({ k: 'down', v: v.s, by: k?.s }); return; }
    this.die(v, k, shown, cause);
  }
  die(v: P, k: P | null, shown: number, cause: string) {
    v.alive = false; v.ghost = true; v.vent = null; v.onCams = false; v.onAdmin = false; v.stats.deathT = this.t; v.downedUntil = 0; v.shieldBy = -1;
    if (cause === 'kill' || cause === 'down') { const b = this.bodies.find(b => b.s === v.s); if (b) { b.downed = false; b.until = undefined; b.t = this.t; } else this.bodies.push({ id: this.bodyId++, s: v.s, x: v.x, y: v.y, t: this.t, room: roomOf(this.m, v.x, v.y) }); if (k || !(this as any)['killer' + v.s]) (this as any)['killer' + v.s] = { k: k?.s ?? -1, shown, at: this.t }; if (cause === 'kill') this.fx(v, 'kill'); this.onDeath?.(v, k); }
    if (cause === 'kill') this.emit(v.s, { e: 'killed', by: shown });
    if (cause === 'guess') this.emit('all', { e: 'guess_death', s: v.s });
    this.log({ k: cause === 'vote' ? 'eject' : 'death', v: v.s, by: k?.s ?? null, cause });
    // bounty contracts
    for (const b of this.players) if (b.role === 'bounty' && b.bounty === v.s && !b.personalWin) { if (k && k.s === b.s) { b.personalWin = true; this.toast(b.s, 'Contract complete! You have won — now survive as you like.', 'ok'); this.emit(b.s, { e: 'personal_win' }); } else if (!b.bountyRerolled && b.alive) { b.bountyRerolled = true; this.newBounty(b); this.emit(b.s, { e: 'bounty', target: b.bounty }); this.toast(b.s, `Your target died. New contract: ${this.get(b.bounty!)?.name}.`, 'warn'); } }
    if (v.role === 'medic') this.players.forEach(o => { if (o.shieldBy === v.s) o.shieldBy = -1; });
    this.checkWin();
  }
  fx(at: { x: number; y: number }, k: string) { for (const o of this.players) if (o.ghost || this.canSee(o, at)) this.emit(o.s, { e: 'fx', k, x: at.x, y: at.y }); }
  // ── reports & meetings ──
  onReport(p: P, bodyId: number) {
    const b = this.bodies.find(b => b.id === bodyId); if (!b || !p.alive || p.vent || (p.role === 'phantom' && p.active > this.t)) return;
    if (Math.hypot(b.x - p.x, b.y - p.y) > REPORT_RANGE + 20 || (!this.w.los(p.x, p.y - 14, b.x, b.y - 14) && !this.w.los(p.x, p.y - 4, b.x, b.y - 4))) return;
    if (b.downed) { const v = this.get(b.s)!; this.die(v, null, -1, 'down'); if (this.phase !== 'play') return; }
    this.startMeeting(p, 'report', b.s);
  }
  onEmergency(p: P) {
    if (!p.alive || p.meetingsLeft <= 0 || !this.nearSpot(p, 'emergency', true)) return;
    if (this.t - this.roundStart < this.set.emergencyCooldown) return this.toast(p.s, `Emergency button is cooling down (${Math.ceil(this.set.emergencyCooldown - (this.t - this.roundStart))} s).`, 'warn');
    if (this.sab && this.sab.critical) return this.toast(p.s, 'You cannot call a meeting during a critical sabotage!', 'error');
    p.meetingsLeft--; this.startMeeting(p, 'emergency', null);
  }
  startMeeting(caller: P, kind: 'report' | 'emergency', body: number | null) {
    this.phase = 'meeting'; caller.stats.meetings++; if (caller.role === 'chaos') (caller as any).calls = ((caller as any).calls || 0) + 1;
    // downed players who were not stabilised bleed out
    for (const b of this.bodies) if (b.downed) this.die(this.get(b.s)!, null, -1, 'down');
    if (this.phase !== 'meeting') return;
    this.sab = null; this.doorLock = {}; this.players.forEach(p => { p.vent = null; p.onCams = false; p.onAdmin = false; p.holding = null; p.taskOpen = {}; p.shiftUntil = 0; p.active = Math.min(p.active, this.t); p.extractT = 0; });
    const t0 = this.t + 3.2; this.meeting = { caller: caller.s, body, kind, t0, discussEnd: t0 + this.set.discussion, voteEnd: t0 + this.set.discussion + this.set.voting, votes: {} };
    this.emit('all', { e: 'meeting', caller: caller.s, body, kind });
    this.log({ k: 'meeting', caller: caller.s, body, kind });
    // psychologist / assassin per-meeting resets
    this.players.forEach(p => { if (ROLE[p.role].ability?.perRound) p.uses = ROLE[p.role].ability!.uses ?? null; (p as any).guessedThisMeeting = false; });
  }
  onVote(p: P, target: number | 'skip') {
    const mt = this.meeting; if (this.phase !== 'meeting' || !mt || !p.alive || this.t < mt.discussEnd || mt.votes[p.s] !== undefined || mt.endAt) return;
    if (target !== 'skip') { const t = this.get(target); if (!t || !t.alive) return; }
    mt.votes[p.s] = target; this.emit('all', { e: 'voted', s: p.s });
    if (this.players.filter(x => x.alive).every(x => mt.votes[x.s] !== undefined)) mt.voteEnd = Math.min(mt.voteEnd, this.t + 1.2);
  }
  onSession(p: P, ts: number) {
    if (this.phase !== 'meeting' || p.role !== 'psychologist' || !p.alive || (p.uses ?? 0) <= 0 || p.jam > this.t) return; const t = this.get(ts); if (!t || !t.alive || t.s === p.s) return;
    p.uses = (p.uses ?? 1) - 1; p.stats.investigations++; let tense = (t.faction === 'infiltrator' || t.role === 'bounty') && t.actedThisRound; if (this.rand() < 0.25) tense = !tense;
    this.emit(p.s, { e: 'result', kind: 'session', text: `${t.name} seems ${tense ? 'TENSE — something weighs on them.' : 'calm.'}`, tense });
  }
  onGuess(p: P, ts: number, role: string) {
    if (this.phase !== 'meeting' || p.role !== 'assassin' || !p.alive || (p.uses ?? 0) <= 0 || (p as any).guessedThisMeeting || p.jam > this.t) return; const t = this.get(ts); if (!t || !t.alive || t.s === p.s || role === 'crewmate' || !ROLE[role]) return;
    p.uses = (p.uses ?? 1) - 1; (p as any).guessedThisMeeting = true; p.actedThisRound = true;
    const victim = t.role === role ? t : p; this.emit('all', { e: 'toast', text: `${victim.name} was eliminated during the meeting.`, kind: 'error' }); this.die(victim, victim === t ? p : null, -1, 'guess'); if (victim === t) p.stats.kills++;
  }
  endMeeting() {
    const mt = this.meeting!; const tally: Record<string, number> = {}; const votes: [number, number | 'skip'][] = [];
    for (const p of this.players.filter(x => x.alive)) { const v = mt.votes[p.s]; if (v === undefined) continue; votes.push([p.s, v]); tally[String(v)] = (tally[String(v)] || 0) + 1; if (v !== 'skip') { const t = this.get(v)!; t.stats.votesRecv++; if (t.faction === 'infiltrator') p.stats.correctVotes++; } }
    let best: string | null = null, bestN = 0, tie = false; for (const [k, n] of Object.entries(tally)) { if (n > bestN) { best = k; bestN = n; tie = false; } else if (n === bestN) tie = true; }
    const ejected = !tie && best && best !== 'skip' ? +best : null;
    mt.result = { votes, ejected, tie }; mt.endAt = this.t + 5; this.emit('all', { e: 'vote_result', result: this.set.anonymousVotes ? { ...mt.result, votes: votes.map(([_, v]) => [-1, v]) } : mt.result });
  }
  startEjection() {
    const res = this.meeting!.result!; const e = res.ejected !== null ? this.get(res.ejected)! : null; let text = 'No one was ejected.', sub = res.tie ? 'Tied vote.' : 'Skipped.';
    if (e) { text = `${e.name} was ejected.`; const r = ROLE[e.role]; sub = !this.set.confirmEjects || this.set.roleReveal === 'none' ? '' : this.set.roleReveal === 'faction' ? `${e.name} was ${e.faction === 'crew' ? 'not an Infiltrator' : e.faction === 'infiltrator' ? 'an Infiltrator' : 'a Neutral'}.` : `${e.name} was the ${r.name}.`;
      const leftInf = this.players.filter(p => p.alive && p.faction === 'infiltrator' && p.s !== e.s).length; if (this.set.confirmEjects) sub += `  ${leftInf} infiltrator${leftInf === 1 ? '' : 's'} remain${leftInf === 1 ? 's' : ''}.`; }
    this.phase = 'ejection'; this.ejection = { s: e ? e.s : null, text, sub, until: this.t + 6.5 }; this.emit('all', { e: 'ejection', s: e?.s ?? null, text, sub, cos: e ? e.cos : null });
    if (e) { this.die(e, null, -1, 'vote'); if (e.role === 'jester' && !this.winner) { this.finish('jester', `${e.name} the Jester fooled everyone!`, [e.s]); return; }
      for (const c of this.players) if (c.role === 'chaos' && c.goal === 'eject' && c.goalTarget === e.s && !c.personalWin) { c.personalWin = true; this.emit(c.s, { e: 'personal_win' }); this.toast(c.s, 'Chaos objective complete!', 'ok'); } }
    this.meetingsHeld++;
    for (const c of this.players) if (c.role === 'chaos' && c.goal === 'meetings' && c.alive && this.meetingsHeld >= 3 && !c.personalWin) { c.personalWin = true; this.emit(c.s, { e: 'personal_win' }); this.toast(c.s, 'Chaos objective complete!', 'ok'); }
  }
  resumePlay() {
    this.phase = 'play'; this.meeting = null; this.ejection = null; this.bodies = []; this.roundStart = this.t; this.sabCd = Math.max(this.sabCd, this.t + 12);
    this.traces = this.traces.filter(t => t.k === 'marker' || t.k === 'sensor' || t.k === 'relic' || t.k === 'beacon');
    this.players.forEach(p => { p.kcd = this.t + this.set.killCooldown; p.acd = Math.max(p.acd, this.t + 8); p.active = 0; p.shieldBy = -1; p.guardUntil = 0; p.actedThisRound = false; p.slow = 0; p.jam = 0; p.vest = 0; p.inv = 0; if (ROLE[p.role].ability?.perRound) p.uses = ROLE[p.role].ability!.uses ?? null; });
    this.spawnRing(); this.checkWin();
  }
  // ── tasks ──
  onTaskOpen(p: P, spot: string) { const sp = this.m.byId[spot]; if (!sp || Math.hypot(sp.x - p.x, sp.y - p.y) > USE_RANGE + 30) return; p.taskOpen[spot] = this.t; }
  onTaskDone(p: P, spot: string) {
    const sp = this.m.byId[spot]; if (!sp || p.vent) return; if (p.ghost && !this.set.ghostTasks) return; if (!p.alive && !p.ghost) return;
    if (Math.hypot(sp.x - p.x, sp.y - p.y) > USE_RANGE + 40) return; const opened = p.taskOpen[spot]; if (opened === undefined || this.t - opened < 0.8) return; delete p.taskOpen[spot];
    const t = p.tasks.find(t => !t.done && t.steps[t.step] === spot); if (!t) return;
    if (p.fake) return; // infiltrators / neutrals can only pretend
    t.step++; if (t.step >= t.steps.length) { t.done = true; p.stats.tasks++; } else t.spot = t.steps[t.step];
    if (p.role === 'security') p.battery = Math.min(12, p.battery + 4);
    this.emit(p.s, { e: 'task_ok', id: t.id, done: t.done }); this.checkWin();
  }
  // ── vents & passages ──
  canVent(p: P) { const r = ROLE[p.role]; return p.alive && !p.ghost && (!!r.vents) && p.downedUntil <= this.t; }
  onVent(p: P, spot: string, to?: string) {
    if (!this.canVent(p)) return; const sp = this.m.byId[spot]; if (!sp || sp.kind !== 'vent') return;
    if (p.role === 'engineer' && !p.vent && (p.acd > this.t || p.jam > this.t)) return this.toast(p.s, 'Vent access is cooling down.', 'warn');
    if (!p.vent) { if (Math.hypot(sp.x - p.x, sp.y - p.y) > USE_RANGE + 20) return; p.vent = spot; p.ventT = this.t; p.x = sp.x; p.y = sp.y; this.emit(p.s, { e: 'snap', x: sp.x, y: sp.y }); this.fx(sp, 'vent'); this.ventTrace(p, sp); this.sysUse(p, 'vents'); if (p.faction === 'infiltrator') p.actedThisRound = true; return; }
    if (to && p.vent === spot) { const dst = this.m.byId[to]; if (!dst || !sp.links?.includes(to)) return; p.vent = to; p.x = dst.x; p.y = dst.y; this.emit(p.s, { e: 'snap', x: dst.x, y: dst.y }); return; }
    if (p.vent === spot) { p.vent = null; this.fx(sp, 'vent'); this.ventTrace(p, sp); if (p.role === 'engineer') p.acd = this.t + this.cd(15); }
  }
  ventTrace(p: P, sp: Spot) { if (p.role === 'engineer') this.traces.push({ id: this.traceId++, k: 'vent', x: sp.x, y: sp.y, until: this.t + 20 }); }
  onPassage(p: P, spot: string) { const sp = this.m.byId[spot]; if (!sp || sp.kind !== 'passage' || !p.alive || p.vent || Math.hypot(sp.x - p.x, sp.y - p.y) > USE_RANGE + 20) return; const dst = this.m.byId[sp.links![0]]; p.x = dst.x; p.y = dst.y + 6; this.emit(p.s, { e: 'snap', x: p.x, y: p.y }); this.emit(p.s, { e: 'fx', k: 'passage', x: dst.x, y: dst.y }); this.sysUse(p, 'passage'); }
  onLeak(p: P, id: number) { const l = this.leaks.findIndex(l => l.id === id); if (l < 0 || !p.alive) return; if (Math.hypot(this.leaks[l].x - p.x, this.leaks[l].y - p.y) > USE_RANGE + 20) return; this.leaks.splice(l, 1); this.toast(p.s, 'Leak sealed.', 'ok'); }
  // ── sabotage ──
  canSabotage(p: P) { return p.faction === 'infiltrator' && (p.alive || p.ghost) && this.m.spec.sabotages.length > 0; }
  onSabotage(p: P, id: SabotageId, room?: string, opts: { timer?: number; extra?: SabotageId; force?: boolean } = {}) {
    if (!this.canSabotage(p) || !this.m.spec.sabotages.includes(id)) return;
    if (id === 'doors') { if (!room || !this.m.roomById[room] || (this.doorCd[room] || 0) > this.t || !this.m.doors.some(d => d.room === room)) return; this.doorLock[room] = this.t + 10; this.doorCd[room] = this.t + 30; this.emit('all', { e: 'doors', room }); this.sysUse(p, 'sabotage'); this.sys[this.sys.length - 1].room = room; p.actedThisRound = true; return; }
    if (!opts.force && (this.sab || this.sabCd > this.t)) return;
    const spots = this.m.spots.filter(s => s.kind === 'fix' && s.sab === id).map(s => s.id); if (!spots.length) return;
    const crit = CRITICAL[id]; this.sab = { id, t0: this.t, until: crit ? this.t + (opts.timer ?? crit) : undefined, spots, done: [], holds: {}, critical: !!crit, extra: opts.extra };
    if (opts.extra) { const ex = this.m.spots.filter(s => s.kind === 'fix' && s.sab === opts.extra).map(s => s.id); this.sab.spots.push(...ex); }
    this.sabCd = this.t + 30 * (p.role === 'saboteur' ? 0.5 : 1) + (crit ? 15 : 0);
    this.emit('all', { e: 'sab', id, extra: opts.extra || null }); this.sysUse(p, 'sabotage'); p.actedThisRound = true; this.log({ k: 'sab', id, by: p.s });
  }
  onFix(p: P, spot: string) {
    const sb = this.sab; if (!sb || !sb.spots.includes(spot) || sb.done.includes(spot) || (!p.alive)) return; const sp = this.m.byId[spot]; if (!sp || Math.hypot(sp.x - p.x, sp.y - p.y) > USE_RANGE + 40) return;
    if (sp.sab === 'reactor') return; // reactor uses holds
    sb.done.push(spot); p.stats.fixes++; this.checkFixed();
  }
  onHold(p: P, spot: string, on: boolean) {
    const sb = this.sab; if (!sb || sb.id !== 'reactor' || !sb.spots.includes(spot) || !p.alive) return; const sp = this.m.byId[spot]; if (!sp || Math.hypot(sp.x - p.x, sp.y - p.y) > USE_RANGE + 40) return;
    for (const k of Object.keys(sb.holds)) sb.holds[k] = sb.holds[k].filter(x => x !== p.s); if (on) (sb.holds[spot] = sb.holds[spot] || []).push(p.s);
    const holders = sb.spots.filter(s => this.m.byId[s].sab === 'reactor').map(s => sb.holds[s] || []);
    if (holders.length >= 2 && holders.every(h => h.length) && new Set(holders.flat()).size >= 2) { sb.done.push(...sb.spots.filter(s => this.m.byId[s].sab === 'reactor')); holders.flat().forEach(s => this.get(s)!.stats.fixes++); this.checkFixed(); }
  }
  checkFixed() { const sb = this.sab!; const need = (id: SabotageId) => sb.spots.filter(s => this.m.byId[s].sab === id); const ok = (id: SabotageId) => need(id).every(s => sb.done.includes(s));
    const mainOk = ok(sb.id); const extraOk = !sb.extra || ok(sb.extra);
    if (mainOk && extraOk) { this.emit('all', { e: 'fixed', id: sb.id }); this.log({ k: 'fixed', id: sb.id }); this.sab = null; }
    else if (mainOk && sb.extra) { this.emit('all', { e: 'fixed', id: sb.id }); this.sab = { ...sb, id: sb.extra, extra: undefined, critical: false, until: undefined }; }
    else if (extraOk && sb.extra) { this.emit('all', { e: 'fixed', id: sb.extra }); sb.extra = undefined; } }

  // ───────────────────────── abilities ─────────────────────────
  onAbility(p: P, a: any) {
    const R = ROLE[p.role]; const ab = R.ability; if (!ab || ab.meeting) return; if (!p.alive && p.role !== 'cartographer') return; if (!p.alive) return;
    if (p.jam > this.t) return this.toast(p.s, 'Your ability is jammed!', 'error'); if (p.acd > this.t) return; if (p.uses !== null && p.uses <= 0) return; if (p.vent) return;
    const near = (o: { x: number; y: number }, range = ab.range || 2) => Math.hypot(o.x - p.x, o.y - p.y) <= range * TILE + 20;
    const tgt = typeof a.target === 'number' ? this.get(a.target) : undefined; const body = typeof a.body === 'number' ? this.bodies.find(b => b.id === a.body) : undefined;
    const ok = (cd = ab.cd, active = 0) => { p.acd = this.t + this.cd(cd); if (active) p.active = this.t + this.dur(active); if (p.uses !== null) p.uses--; p.stats.abilities++; if (p.faction !== 'crew') { p.actedThisRound = true; this.sys.push({ t: this.t, sys: 'ability', s: p.s, room: roomOf(this.m, p.x, p.y) }); } this.emit(p.s, { e: 'ability_ok', role: p.role }); };
    const inv = () => { p.stats.investigations++; };
    switch (p.role) {
      case 'forensic': { if (!body || !near(body) || (body as any).autopsied) return; (body as any).autopsied = true; const info = (this as any)['killer' + body.s]; let col = info?.shown ?? -1; const kk = info ? this.get(info.k) : null;
        if (kk && kk.frameUntil > this.t && kk.framed >= 0) col = kk.framed; const where = kk ? this.roomAfter(kk.s, body.t) : '?'; const secs = Math.round(this.t - body.t);
        ok(); inv(); return this.emit(p.s, { e: 'result', kind: 'autopsy', text: col < 0 ? 'Inconclusive — the body was too damaged.' : `Died ${secs} s ago. The killer’s suit was a ${tone(col)} tone. They headed to ${where}.` }); }
      case 'medic': { if (!tgt || !tgt.alive || tgt.s === p.s || !near(tgt)) return; this.players.forEach(o => { if (o.shieldBy === p.s) o.shieldBy = -1; }); tgt.shieldBy = p.s; ok(); this.emit(p.s, { e: 'fx', k: 'shield', x: tgt.x, y: tgt.y }); return this.toast(p.s, `${tgt.name} is shielded until the next meeting.`, 'ok'); }
      case 'security': { if (this.camsDown()) return this.toast(p.s, 'Cameras are offline.', 'warn'); p.onCams = true; return; }
      case 'tracker': { if (!tgt || !tgt.alive || tgt.s === p.s || !near(tgt)) return; p.target = tgt.s; ok(ab.cd, ab.dur); inv(); return this.toast(p.s, `Tracking ${tgt.name}.`, 'ok'); }
      case 'archivist': { if (this.commsDown()) return this.toast(p.s, 'Archive offline — comms are down.', 'warn'); ok(); inv(); return this.emit(p.s, { e: 'logs', entries: this.logView(p) }); }
      case 'technician': { if (!this.sab || this.sab.critical) return this.toast(p.s, 'Remote Patch only fixes non-critical sabotage.', 'warn'); ok(); this.sab.done = this.sab.spots.slice(); p.stats.fixes++; return this.checkFixed(); }
      case 'scout': { ok(ab.cd, ab.dur); return this.fx(p, 'pulse'); }
      // ── roles built for the open maps ──
      case 'ringmaster': {
        ok(); inv();
        const where = this.players.filter(o => o.alive && !o.ghost && o.s !== p.s)
          .map(o => roomName(this.m, roomOf(this.m, o.x, o.y))).filter(Boolean);
        const counts: Record<string, number> = {}; for (const r of where) counts[r] = (counts[r] || 0) + 1;
        const text = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([r, n]) => `${r} (${n})`).join(', ');
        this.fx(p, 'pulse');
        // Everyone hears the bell — that is the cost of using it.
        this.emit('all', { e: 'toast', text: 'A carnival bell rings somewhere.', kind: 'info' });
        return this.emit(p.s, { e: 'result', kind: 'ringmaster', text: text ? `Right now: ${text}.` : 'Nobody else is moving.' });
      }
      case 'beekeeper': {
        ok(); inv();
        const R8 = TILE * 8;
        const close = this.players.filter(o => o.alive && !o.ghost && o.s !== p.s && Math.hypot(o.x - p.x, o.y - p.y) <= R8);
        const tones = close.map(o => tone(o.frameUntil > this.t && o.framed >= 0 ? o.framed : this.appearance(o)));
        this.fx(p, 'pulse');
        return this.emit(p.s, { e: 'result', kind: 'swarm', text: close.length ? `${close.length} nearby — tones: ${tones.join(', ')}.` : 'The swarm is calm. Nobody is close.' });
      }
      case 'acrobat': {
        const dist = TILE * 3, nx = p.x + p.f * dist, ny = p.y;
        if (!this.w.pathClear(p.x, p.y, nx, ny) || this.w.blocked(nx, ny, 14)) return this.toast(p.s, 'No clear run — something is in the way.', 'warn');
        p.x = nx; p.y = ny; ok();
        this.emit(p.s, { e: 'snap', x: nx, y: ny });
        this.fx(p, 'vent');   // a visible puff where they land
        return;
      }
      case 'bodyguard': { if (!tgt || !tgt.alive || tgt.s === p.s || !near(tgt)) return; tgt.guardBy = p.s; tgt.guardUntil = this.t + this.dur(15); ok(ab.cd, ab.dur); return this.toast(p.s, `Guarding ${tgt.name}.`, 'ok'); }
      case 'signal': { ok(); inv(); const recent = this.sys.filter(x => this.t - x.t < 25 && (x.sys === 'ability' || x.sys === 'sabotage' || (x.sys === 'vents' && this.get(x.s)?.faction !== 'crew') || x.sys === 'decoy')).pop();
        return this.emit(p.s, { e: 'result', kind: 'signal', text: recent ? `Abnormal signal detected near ${roomName(this.m, recent.room)} (${Math.round(this.t - recent.t)} s ago).` : 'No abnormal signals in the last 25 s.', room: recent?.room }); }
      case 'paramedic': { if (!body || !body.downed || !near(body)) return; const v = this.get(body.s)!; v.downedUntil = 0; this.bodies = this.bodies.filter(b => b !== body); ok(); this.emit(v.s, { e: 'revived' }); this.toast(p.s, `${v.name} stabilised!`, 'ok'); return this.log({ k: 'revive', v: v.s, by: p.s }); }
      case 'cartographer': { const mine = this.traces.filter(t => t.k === 'marker' && t.by === p.s); if (mine.length >= 3) this.traces = this.traces.filter(t => t !== mine[0]); this.traces.push({ id: this.traceId++, k: 'marker', x: p.x, y: p.y, until: this.t + this.dur(40), by: p.s, room: roomOf(this.m, p.x, p.y) }); return ok(); }
      case 'auditor': { const sys = ['vents', 'sabotage', 'cams', 'admin'].includes(a.sys) ? a.sys : 'vents'; const users = [...new Set(this.sys.filter(x => this.t - x.t < 45 && x.sys === sys).map(x => x.s))];
        const tones = users.map(s => { const u = this.get(s)!; return tone(u.frameUntil > this.t && u.framed >= 0 ? u.framed : this.appearance(u)); }); ok(); inv();
        return this.emit(p.s, { e: 'result', kind: 'audit', text: users.length ? `${users.length} user${users.length > 1 ? 's' : ''} of ${sys} in the last 45 s — tones: ${tones.join(', ')}.` : `Nobody used ${sys} in the last 45 s.` }); }
      case 'sentinel': { const room = roomOf(this.m, p.x, p.y); if (room === 'hall') return this.toast(p.s, 'Sensors must be placed inside a room.', 'warn'); const mine = this.traces.filter(t => t.k === 'sensor' && t.by === p.s); if (mine.length >= 2) this.traces = this.traces.filter(t => t !== mine[0]);
        this.traces.push({ id: this.traceId++, k: 'sensor', x: p.x, y: p.y, until: this.t + this.dur(90), by: p.s, room, data: { inside: this.players.filter(o => o.alive && roomOf(this.m, o.x, o.y) === room).map(o => o.s) } }); ok(); return this.toast(p.s, `Sensor armed in ${roomName(this.m, room)}.`, 'ok'); }
      // ── infiltrators ──
      case 'shapeshifter': { if (!tgt || tgt.s === p.s || !tgt.alive || !near(tgt)) return; p.shiftAs = tgt.s; p.shiftUntil = this.t + this.dur(15); ok(ab.cd); this.fx(p, 'puff'); return; }
      case 'phantom': { ok(ab.cd, ab.dur); p.inv = p.active; return this.fx(p, 'puff'); }
      case 'saboteur': { if (this.sab) return this.toast(p.s, 'Another sabotage is already active.', 'warn'); if (!this.m.spec.sabotages.includes('power') || !this.m.spec.sabotages.includes('comms')) return; ok(); return this.onSabotage(p, 'power', undefined, { extra: 'comms', force: true }); }
      case 'trapper': { const mine = this.traces.filter(t => t.k === 'trap' && t.by === p.s); if (mine.length >= 2) this.traces = this.traces.filter(t => t !== mine[0]); this.traces.push({ id: this.traceId++, k: 'trap', x: p.x, y: p.y, until: this.t + this.dur(60), by: p.s }); return ok(); }
      case 'cleaner': { if (!body || !near(body) || p.kcd > this.t || body.downed) return; this.bodies = this.bodies.filter(b => b !== body); this.traces.push({ id: this.traceId++, k: 'stain', x: body.x, y: body.y, until: this.t + 45 }); p.kcd = this.t + this.set.killCooldown; ok(); return this.log({ k: 'clean', v: body.s, by: p.s }); }
      case 'mimic': { const pool = this.players.filter(o => o.alive && o.s !== p.s); const as = pool.length ? pool[Math.floor(this.rand() * pool.length)].s : p.s; this.traces.push({ id: this.traceId++, k: 'decoy', x: p.x + 30, y: p.y, until: this.t + this.dur(12), by: p.s, data: { as, ox: p.x + 30, oy: p.y, ph: this.rand() * 6 } });
        this.sys.push({ t: this.t, sys: 'decoy', s: as, room: roomOf(this.m, p.x, p.y), fake: true }); return ok(); }
      case 'disruptor': { if (!tgt || tgt.s === p.s || !tgt.alive || !near(tgt)) return; tgt.jam = this.t + this.dur(20); tgt.onCams = false; ok(); return this.toast(tgt.s, 'Your ability has been jammed by someone nearby!', 'error'); }
      case 'specialist': { ok(ab.cd, ab.dur); return; }
      case 'blackout': { this.traces.push({ id: this.traceId++, k: 'dark', x: p.x, y: p.y, r: 6 * TILE, until: this.t + this.dur(10), by: p.s }); this.players.forEach(o => { if (o.role === 'scout') o.active = 0; }); return ok(ab.cd, ab.dur); }
      case 'falsewitness': { if (!tgt || tgt.s === p.s || !tgt.alive || !near(tgt)) return; p.framed = tgt.s; p.frameUntil = this.t + this.dur(60); this.logs.push({ t: this.t, room: roomOf(this.m, p.x, p.y), c: tgt.cos.color, s: tgt.s }); ok(); return this.toast(p.s, `Evidence now points at ${tgt.name}.`, 'ok'); }
      case 'commander': { if (this.sab) return this.toast(p.s, 'Another sabotage is already active.', 'warn'); const crit = this.m.spec.sabotages.filter(s => CRITICAL[s]); if (!crit.length) return; const id = crit[Math.floor(this.rand() * crit.length)]; ok(); this.onSabotage(p, id, undefined, { timer: 30, force: true });
        const rooms = new Set(this.m.spots.filter(s => s.sab === id).map(s => s.room)); rooms.forEach(r => this.doorLock[r] = this.t + 6); return; }
      // ── neutral ──
      case 'jester': { const v = this.m.spots.filter(s => s.kind === 'vent').find(s => near(s, 1.5)); if (!v) return this.toast(p.s, 'Stand on a vent to prank.', 'warn'); ok(); return this.fx(v, 'vent'); }
      case 'survivor': { p.vest = this.t + this.dur(8); ok(ab.cd, ab.dur); return this.fx(p, 'shield'); }
      case 'relic': { const left = this.relicSpots.filter(r => !r.taken); if (!left.length) return; ok(ab.cd, ab.dur); return; }
      case 'chaos': { if (!tgt || tgt.s === p.s || !tgt.alive || !near(tgt) || tgt.vent) return; const [x, y] = [p.x, p.y]; p.x = tgt.x; p.y = tgt.y; tgt.x = x; tgt.y = y; this.emit(p.s, { e: 'snap', x: p.x, y: p.y }); this.emit(tgt.s, { e: 'snap', x: tgt.x, y: tgt.y }); this.fx(p, 'swap'); this.fx(tgt, 'swap'); return ok(); }
      case 'bounty': return;
    }
  }
  roomAfter(s: number, t0: number) { const l = this.logs.filter(x => x.s === s && x.t >= t0).slice(0, 2); return l.length ? roomName(this.m, l[l.length - 1].room) : roomName(this.m, roomOf(this.m, this.get(s)!.x, this.get(s)!.y)); }
  logView(p: P) { return this.logs.filter(l => this.t - l.t < 60).map(l => ({ t: Math.round(this.t - l.t), room: roomName(this.m, l.room), c: l.c })).reverse().slice(0, 40); }

  // ───────────────────────── tick ─────────────────────────
  step(dt: number) {
    this.t += dt; const t = this.t;
    if (this.phase === 'lobby' || this.phase === 'ended') return;
    if (this.phase === 'intro') { if (t >= this.introEnd) { this.phase = 'play'; this.emit('all', { e: 'play' }); } return; }
    if (this.phase === 'meeting') { const mt = this.meeting!; if (!mt.result && t >= mt.voteEnd) this.endMeeting(); else if (mt.result && mt.endAt && t >= mt.endAt) this.startEjection(); return; }
    if (this.phase === 'ejection') { if (t >= this.ejection!.until && !this.winner) this.resumePlay(); return; }
    // play
    const closed = this.doorsClosed(); this.w.setDoors(closed);
    if (this.sab?.until && t >= this.sab.until) { const id = this.sab.id; this.sab = null; this.finish('infiltrator', `${SAB_NAME[id]} — the station could not be saved.`); return; }
    for (const p of this.players) {
      // room tracking → access logs + sensors
      const room = p.alive && !p.vent ? roomOf(this.m, p.x, p.y) : p.room;
      if (room !== p.room) { const hidden = p.role === 'specialist' && p.active > t; if (p.alive && !hidden && room !== 'hall') { const col = p.frameUntil > t && p.framed >= 0 ? this.get(p.framed)!.cos.color : this.get(this.appearance(p))!.cos.color; this.logs.push({ t, room, c: col, s: p.s }); if (this.logs.length > 600) this.logs.splice(0, 200); }
        if (p.alive && !hidden && !(p.role === 'phantom' && p.active > t) && room !== 'hall') for (const sn of this.traces) if (sn.k === 'sensor' && sn.room === room && sn.by !== p.s && !(sn.data.inside as number[]).includes(p.s)) { this.emit(sn.by!, { e: 'alert', text: `Sensor: someone entered ${roomName(this.m, room)}.`, x: sn.x, y: sn.y }); sn.data.inside.push(p.s); }
        for (const sn of this.traces) if (sn.k === 'sensor' && sn.room === p.room) sn.data.inside = (sn.data.inside as number[]).filter(x => x !== p.s);
        p.room = room; }
      if (!p.alive) continue;
      if (p.downedUntil && t >= p.downedUntil) { p.downedUntil = 0; this.die(p, null, -1, 'down'); if (this.phase !== 'play') return; continue; }
      if (p.vent && p.role === 'engineer' && t - p.ventT > this.dur(6)) { const sp = this.m.byId[p.vent]; p.vent = null; this.fx(sp, 'vent'); this.ventTrace(p, sp); p.acd = t + this.cd(15); this.toast(p.s, 'Vent time is up.', 'warn'); }
      if (p.onCams && p.role === 'security' && !this.nearSpot(p, 'cams')) { p.battery -= dt; if (p.battery <= 0 || p.jam > t) { p.battery = Math.max(0, p.battery); p.onCams = false; this.emit(p.s, { e: 'cams_off' }); } }
      else if (p.role === 'security') p.battery = Math.min(12, p.battery + dt / 5);
      if (p.onCams && this.camsDown()) { p.onCams = false; this.emit(p.s, { e: 'cams_off' }); }
      // traps
      for (const tr of this.traces) if (tr.k === 'trap' && tr.by !== p.s && p.faction !== 'infiltrator' && Math.hypot(tr.x - p.x, tr.y - p.y) < 22) { tr.until = 0; p.slow = t + 4; this.emit(p.s, { e: 'trapped' }); this.emit(tr.by!, { e: 'alert', text: `${this.get(this.appearance(p))!.name} sprang your trap in ${roomName(this.m, roomOf(this.m, p.x, p.y))}!`, x: p.x, y: p.y }); this.emit(p.s, { e: 'fx', k: 'trap', x: p.x, y: p.y }); }
      // relics
      if (p.role === 'relic' && !p.personalWin) { for (const r of this.relicSpots) if (!r.taken && Math.hypot(r.x - p.x, r.y - p.y) < 34) { r.taken = true; p.relics++; this.toast(p.s, `Relic recovered (${p.relics}/4).`, 'ok'); this.emit(p.s, { e: 'fx', k: 'relic', x: r.x, y: r.y }); }
        if (p.relics >= 4 && this.beacon && Math.hypot(this.beacon.x - p.x, this.beacon.y - p.y) < 44) { p.extractT += dt; if (p.extractT >= 4) { p.personalWin = true; p.extracted = true; p.alive = false; p.ghost = true; this.emit(p.s, { e: 'personal_win', text: 'You escaped with the relics!' }); this.emit('all', { e: 'toast', text: 'A shuttle beacon fired somewhere on the station…', kind: 'warn' }); this.log({ k: 'extract', s: p.s }); this.checkWin(); if (this.phase !== 'play') return; } } else p.extractT = 0; }
    }
    this.traces = this.traces.filter(tr => tr.until > t || tr.k === 'relic' || tr.k === 'beacon');
    for (const tr of this.traces) if (tr.k === 'decoy') { const d = tr.data; d.ph += dt * 0.9; tr.x = d.ox + Math.cos(d.ph) * 40; tr.y = d.oy + Math.sin(d.ph * 2) * 18; if (this.players.some(p => p.alive && p.s !== tr.by && Math.hypot(p.x - tr.x, p.y - tr.y) < 20)) tr.until = 0; }
    // map events
    if (this.set.mapEvents && this.m.spec.events.length && t >= this.nextEvent && !this.ev) { const id = this.m.spec.events[Math.floor(this.rand() * this.m.spec.events.length)]; const len = id === 'flicker' || id === 'reactor_pulse' ? 4 : id === 'leak' ? 1 : 14;
      this.ev = { id, until: t + len }; this.nextEvent = t + 70 + this.rand() * 50; this.emit('all', { e: 'event', id, until: this.ev.until }); if (id === 'leak') this.spawnLeak(); if (id === 'defense') this.emit('all', { e: 'toast', text: 'Automated defense grid online — turret corridors are watched.', kind: 'warn' }); }
    if (this.ev && t >= this.ev.until) this.ev = null;
    if (this.ev?.id === 'defense') for (const p of this.players) if (p.alive && this.inZone(p, 'turret')) p.slow = Math.max(p.slow, t + 0.5);
    // replay frame every 0.25 s
    const fi = Math.floor(t * 4); if (fi !== this.lastFrame) { this.lastFrame = fi; this.frames.push([+t.toFixed(2), ...this.players.flatMap(p => [Math.round(p.x), Math.round(p.y), (p.alive ? 1 : 0) | (p.ghost ? 2 : 0) | (p.vent ? 4 : 0) | (p.f < 0 ? 8 : 0) | (p.moving ? 16 : 0) | (p.extracted ? 32 : 0)])]); }
  }
  spawnLeak() { const halls: { x: number; y: number }[] = []; for (let i = 0; i < 40; i++) { const r = this.m.rooms[Math.floor(this.rand() * this.m.rooms.length)]; const pt = this.freePoint(r); halls.push(pt); } const pt = halls[0]; this.leaks.push({ id: this.leakId++, ...pt }); if (this.leaks.length > 4) this.leaks.shift(); }
  checkWin() {
    if (this.winner || this.phase === 'lobby') return;
    const alive = this.players.filter(p => p.alive && !p.extracted); const inf = alive.filter(p => p.faction === 'infiltrator').length; const others = alive.length - inf;
    if (inf === 0) return this.finish('crew', 'All infiltrators were found.');
    if (inf >= others) return this.finish('infiltrator', 'The infiltrators took over the station.');
    if (this.taskProgress() >= 1) return this.finish('crew', 'The crew completed every task.');
  }
  finish(winner: 'crew' | 'infiltrator' | 'jester', reason: string, jesters: number[] = []) {
    if (this.winner) return; const side: number[] = [];
    for (const p of this.players) { if (p.role === 'survivor' && p.alive && winner !== 'jester') side.push(p.s); if ((p.role === 'bounty' || p.role === 'relic') && p.personalWin) side.push(p.s); if (p.role === 'chaos' && (p.personalWin || (p.goal === 'calls' && p.alive && ((p as any).calls || 0) >= 2))) side.push(p.s); }
    const winners = winner === 'jester' ? jesters : this.players.filter(p => p.faction === winner).map(p => p.s);
    const dur = this.t - this.introEnd;
    const stats = this.players.map(p => ({ s: p.s, name: p.name, cos: p.cos, role: p.role, faction: p.faction, alive: p.alive && !p.extracted, ...p.stats, tasksTotal: p.fake ? 0 : p.tasks.length, won: winners.includes(p.s) || side.includes(p.s) }));
    const mvp = this.awards(stats);
    this.winner = { winner, reason, winners, side, stats, mvp, duration: dur, map: this.m.id };
    this.phase = 'ended'; this.log({ k: 'end', winner, reason }); this.emit('all', { e: 'end', ...this.winner });
  }
  awards(st: any[]) { const best = (f: (s: any) => number, min = 1) => { const s = st.slice().sort((a, b) => f(b) - f(a))[0]; return s && f(s) >= min ? s.s : null; };
    return [{ id: 'tasks', name: 'Taskmaster', s: best(s => s.faction === 'crew' ? s.tasks : -1) }, { id: 'kills', name: 'Deadliest', s: best(s => s.kills) }, { id: 'detective', name: 'Detective', s: best(s => s.investigations + s.correctVotes * 2) },
      { id: 'fixer', name: 'Mr. Fix-It', s: best(s => s.fixes) }, { id: 'sus', name: 'Most Suspected', s: best(s => s.votesRecv) }, { id: 'caller', name: 'Alarm Bell', s: best(s => s.meetings) }].filter(a => a.s !== null); }

  // ───────────────────────── views ─────────────────────────
  pub(p: P, v: P): PlayerPublic { const app = this.appearance(p); const o: PlayerPublic = { s: p.s, x: Math.round(p.x), y: Math.round(p.y), f: p.f, a: p.a, al: p.alive }; if (p.ghost) o.gh = true; if (app !== p.s && !v.ghost) o.cos = app;
    if (p.role === 'phantom' && p.active > this.t && !v.ghost && v.s !== p.s && v.faction !== 'infiltrator') o.inv = 0.12; if (p.slow > this.t) o.slow = true; if (p.downedUntil > this.t) o.dn = true; return o; }
  viewFor(s: number): View {
    const v = this.get(s)!; const t = this.t; const pl: PlayerPublic[] = [];
    const inGame = this.phase === 'play' || this.phase === 'intro';
    for (const p of this.players) { if (p.s === s) continue; if (this.phase === 'lobby') { pl.push(this.pub(p, v)); continue; } if (p.extracted) continue;
      if (p.ghost && !v.ghost) continue; if (inGame && p.vent && !v.ghost) continue;
      if (inGame && !this.canSee(v, p)) continue;
      if (inGame && p.role === 'phantom' && p.active > t && !v.ghost && v.faction !== 'infiltrator' && Math.hypot(p.x - v.x, p.y - v.y) > 2.5 * TILE) continue;
      pl.push(this.pub(p, v)); }
    // decoys appear as players for everyone who can see them
    if (inGame) for (const tr of this.traces) if (tr.k === 'decoy' && (v.ghost || this.canSee(v, tr))) pl.push({ s: 1000 + tr.id, x: Math.round(tr.x), y: Math.round(tr.y), f: Math.cos(tr.data.ph) > 0 ? -1 : 1, a: 'walk', al: true, cos: tr.data.as });
    const bodies = this.bodies.filter(b => v.ghost || this.canSee(v, b) || !inGame);
    const traces = this.traces.filter(tr => { if (tr.k === 'decoy') return false; if (tr.k === 'marker') return v.faction === 'crew' || v.ghost; if (tr.k === 'sensor') return tr.by === s; if (tr.k === 'trap') return tr.by === s || v.faction === 'infiltrator' || v.ghost || Math.hypot(tr.x - v.x, tr.y - v.y) < TILE * 1.3; if (tr.k === 'dark') return true; return v.ghost || this.canSee(v, tr); }).map(tr => ({ id: tr.id, k: tr.k, x: Math.round(tr.x), y: Math.round(tr.y), until: tr.until, r: tr.r, by: tr.k === 'marker' ? tr.by : undefined } as Trace));
    if (v.role === 'relic') { this.relicSpots.filter(r => !r.taken).forEach(r => traces.push({ id: -1 - r.id, k: 'relic', x: r.x, y: r.y, until: 1e9 })); if (this.beacon && v.relics >= 4) traces.push({ id: -99, k: 'beacon', x: this.beacon.x, y: this.beacon.y, until: 1e9 }); }
    const sab = this.sab ? { id: this.sab.id, until: this.sab.until, done: this.sab.done, holds: Object.fromEntries(Object.entries(this.sab.holds).map(([k, a]) => [k, a.length])), spots: this.sab.spots, extra: this.sab.extra } : null;
    const bar = this.set.taskBar === 'never' || (this.set.taskBar === 'meetings' && this.phase === 'play') || this.commsDown() ? -1 : this.taskProgress();
    const me: PrivateView = { s, role: v.role, faction: v.faction, alive: v.alive, ghost: v.ghost, x: Math.round(v.x), y: Math.round(v.y), vent: v.vent, downed: v.downedUntil > t,
      kcd: Math.max(0, v.kcd - t), acd: Math.max(0, v.acd - t), scd: v.faction === 'infiltrator' ? Math.max(0, this.sabCd - t) : 0, uses: v.uses, active: Math.max(0, v.active - t), jam: Math.max(0, v.jam - t), slow: Math.max(0, v.slow - t), shift: v.shiftUntil > t ? v.shiftAs : -1, inv: v.role === 'phantom' && v.active > t ? 1 : 0, vest: Math.max(0, v.vest - t),
      access: v.access || !this.m.restricted.length, meetingsLeft: v.meetingsLeft, emCd: Math.max(0, this.set.emergencyCooldown - (t - this.roundStart)), tasks: this.commsDown() && v.alive ? [] : v.tasks, fake: v.fake, team: v.faction === 'infiltrator' ? this.players.filter(o => o.faction === 'infiltrator').map(o => o.s) : [],
      battery: v.role === 'security' ? v.battery : undefined, bounty: v.bounty, relics: v.role === 'relic' ? v.relics : undefined, extracting: v.extractT || undefined, done: v.personalWin || undefined };
    if (v.role === 'tracker' && v.target >= 0 && v.active > t) { const tg = this.get(v.target)!; me.track = { s: tg.s, x: Math.round(tg.x), y: Math.round(tg.y), until: v.active }; }
    if (v.role === 'relic' && v.active > t) { const near = this.relicSpots.filter(r => !r.taken).sort((a, b) => Math.hypot(a.x - v.x, a.y - v.y) - Math.hypot(b.x - v.x, b.y - v.y))[0]; if (near) me.track = { s: -1, x: near.x, y: near.y, until: v.active }; }
    const view: View = { t, ph: this.phase, pl, me, bodies, sab, doors: this.doorsClosed(), ev: this.ev, bar, traces, dark: 0, camsOn: this.players.some(p => p.onCams && p.alive), leak: this.leaks.length ? this.leaks : undefined };
    if (v.onCams && !this.camsDown()) view.cams = this.camFeed(v);
    if (v.onAdmin && !this.commsDown()) view.admin = this.adminFeed();
    if (this.meeting && (this.phase === 'meeting')) view.meeting = this.meetingView(v);
    if (this.phase === 'intro') view.phaseEnd = this.introEnd; if (this.phase === 'ejection') view.phaseEnd = this.ejection!.until;
    return view;
  }
  camFeed(v: P): PlayerPublic[] { const out: PlayerPublic[] = []; for (const p of this.players) { if (!p.alive || p.vent || p.s === v.s || (p.role === 'specialist' && p.active > this.t)) continue; if (p.role === 'phantom' && p.active > this.t) continue;
      if (this.m.cams.some(c => Math.hypot(c.x - p.x, c.y - p.y) < 7 * TILE && this.w.los(c.x, c.y, p.x, p.y - 10))) out.push(this.pub(p, v)); }
    for (const tr of this.traces) if (tr.k === 'decoy' && this.m.cams.some(c => Math.hypot(c.x - tr.x, c.y - tr.y) < 7 * TILE)) out.push({ s: 1000 + tr.id, x: Math.round(tr.x), y: Math.round(tr.y), f: 1, a: 'walk', al: true, cos: tr.data.as });
    for (const b of this.bodies) if (this.m.cams.some(c => Math.hypot(c.x - b.x, c.y - b.y) < 7 * TILE)) out.push({ s: b.s, x: b.x, y: b.y, f: 1, a: 'idle', al: false });
    return out; }
  adminFeed() { const c: Record<string, number> = {}; for (const p of this.players) { if (!p.alive || p.vent || (p.role === 'specialist' && p.active > this.t)) continue; const r = roomOf(this.m, p.x, p.y); if (r !== 'hall') c[r] = (c[r] || 0) + 1; }
    for (const b of this.bodies) { const r = roomOf(this.m, b.x, b.y); if (r !== 'hall') c[r] = (c[r] || 0) + 1; } for (const tr of this.traces) if (tr.k === 'decoy') { const r = roomOf(this.m, tr.x, tr.y); if (r !== 'hall') c[r] = (c[r] || 0) + 1; } return c; }
  meetingView(v: P): MeetingView { const mt = this.meeting!; return { caller: mt.caller, body: mt.body, kind: mt.kind, discussEnd: mt.discussEnd, voteEnd: mt.voteEnd, voted: Object.keys(mt.votes).map(Number), myVote: mt.votes[v.s] ?? null, alive: this.players.filter(p => p.alive && !p.extracted).map(p => p.s), dead: this.players.filter(p => !p.alive || p.extracted).map(p => p.s), result: mt.result && (this.set.anonymousVotes ? { ...mt.result, votes: mt.result.votes.map(([_, x]) => [-1, x] as [number, number | 'skip']) } : mt.result), endAt: mt.endAt }; }
  replay() { return { v: 1, map: this.m.id, roster: this.players.map(p => ({ s: p.s, name: p.name, cos: p.cos, role: p.role, faction: p.faction })), frames: this.frames, events: this.events, winner: this.winner }; }
  // lobby helpers
  addPlayer(r: RosterEntry) { const p = this.newPlayer(r); this.players.push(p); return p; }
  removePlayer(s: number) { this.players = this.players.filter(p => p.s !== s); }
}
