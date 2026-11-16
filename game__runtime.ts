// Runtime: owns the current session. Host/local: runs the authoritative Sim + bots on a worker-driven 30 Hz clock and
// serves filtered views. Guest: predicts its own movement, interpolates others 100 ms behind, sends inputs/actions.
import { Net, newCode, CODE_RE } from './multiplayer__net';
import { Sim } from './game__sim__sim';
import { Bots } from './game__sim__bots';
import { World } from './game__sim__physics';
import { stepMove, MoveState } from './game__sim__move';
import { buildMap, MapData } from './game__maps__builder';
import { MAPS } from './game__maps__index';
import { PROTO, VERSION, TICK, MAX_PLAYERS, MIN_PLAYERS, TILE, COLORS } from './game__core__constants';
import type { Anim, Cosmetics, MapId, PlayerPublic, Settings } from './game__core__types';
import type { Ev, View, RosterEntry } from './game__sim__types';
import { useApp } from './store__app';
import { useGame, RosterInfo } from './store__game';
import { showWorld, showMenuBackdrop } from './game__bridge';
import { audio, sfx } from './game__audio__audio';
import { ROLE } from './game__roles__roles';
import { SAB_NAME, EVENT_NAME } from './game__sim__sim';
import { roomName } from './game__maps__builder';

const PID = (() => { try { let p = localStorage.getItem('ay.pid'); if (!p) { p = 'p' + Math.random().toString(36).slice(2, 10); localStorage.setItem('ay.pid', p); } return p; } catch { return 'p' + Math.random().toString(36).slice(2, 10); } })();
const BOT_NAMES = ['Vega', 'Pixel', 'Juno', 'Comet', 'Bolt', 'Luma', 'Kepler', 'Mochi', 'Zephyr', 'Echo', 'Quark', 'Astra', 'Orion', 'Nimbus', 'Rocket', 'Sprocket'];
const mapCache = new Map<string, MapData>();
export const getMap = (id: MapId) => { let m = mapCache.get(id); if (!m) { m = buildMap(MAPS[id]); mapCache.set(id, m); } return m; };

type Mode = 'local' | 'host' | 'guest';
export class Runtime {
  mode: Mode | null = null; net: Net | null = null; sim: Sim | null = null; bots: Bots | null = null; map!: MapData; world!: World; slot = 0;
  me: MoveState & { f: 1 | -1; a: Anim; moving: boolean } = { x: 0, y: 0, vx: 0, vy: 0, f: 1, a: 'idle', moving: false };
  buf: { at: number; v: View }[] = []; view: View | null = null; seq = 1; lastSend = 0; peers = new Map<string, number>(); hostPeer = ''; timer: any = null; worker: Worker | null = null; tickN = 0;
  lastStepAt = 0; lastBroadcastAt = 0; lastPingAt = 0;
  roster: Record<number, RosterInfo> = {}; settings!: Settings; leaving = false; rejoinTimer: any = null; pingT = 0; lastRx = 0; uiT = 0; fxQueue: Ev[] = []; listeners = new Set<(e: Ev) => void>(); lastPongAt = 0; disconnectedAt: Record<number, number> = {};
  on(fn: (e: Ev) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  get isHost() { return this.mode === 'host' || this.mode === 'local'; }
  get G() { return useGame.getState(); }
  profile() { const p = useApp.getState().profile; return { name: (p.name || 'Crewmate').slice(0, 12), cos: p.cos }; }

  // ────────────── session start ──────────────
  async startLocal(settings?: Partial<Settings>) { this.reset(); this.mode = 'local'; this.settings = { ...useApp.getState().settings, ...settings };
    if (this.settings.bots < 3) this.settings.bots = 7; this.slot = 0; this.addRoster(0, PID, this.profile(), false, true); this.fillBots(); this.setGame({ mode: 'local', code: '', slot: 0 }); this.enterLobby(); }
  async startHost() { this.reset(); this.mode = 'host'; this.settings = { ...useApp.getState().settings }; this.net = new Net(); this.slot = 0; this.addRoster(0, PID, this.profile(), false, true);
    let code = ''; for (let i = 0; i < 4; i++) { try { code = await this.net.host(newCode()); break; } catch (e: any) { if (e.type !== 'unavailable-id' || i === 3) throw e; } }
    this.net.onOpen = id => { /* wait for hello */ }; this.net.onMsg = (id, m) => this.hostMsg(id, m); this.net.onClose = id => this.peerGone(id); this.net.onPeerError = msg => this.status(msg, 'warn');
    this.fillBots(); this.setGame({ mode: 'host', code, slot: 0 }); this.enterLobby(); return code; }
  async join(code: string) {
    code = code.trim().toUpperCase(); if (!CODE_RE.test(code)) throw new Error('Room codes are 5 characters (letters and numbers).'); this.reset(); this.mode = 'guest'; this.net = new Net();
    this.net.onMsg = (_id, m) => this.guestMsg(m); this.net.onClose = () => this.hostGone(); this.setGame({ mode: 'guest', code });
    this.hostPeer = await this.net.join(code); this.helloTimer(); this.net.send(this.hostPeer, { t: 'hello', proto: PROTO, version: VERSION, pid: PID, ...this.profile(), seq: this.seq });
    return new Promise<void>((res, rej) => { const off = this.on(e => { if (e.e === '_welcome') { off(); res(); } if (e.e === '_reject') { off(); rej(new Error(e.text)); } }); setTimeout(() => { off(); rej(new Error('The host did not respond — is this an AMONG YOU room?')); }, 9000); });
  }
  helloTimer() { this.lastRx = performance.now(); }
  reset() { this.leaving = false; this.stopClock(); this.net?.destroy(); this.net = null; this.sim = null; this.bots = null; this.buf = []; this.view = null; this.peers.clear(); this.roster = {}; this.seq = 1; clearTimeout(this.rejoinTimer); audio.alarm(false); useGame.getState().reset(); }
  setGame(p: any) { useGame.getState().set(p); }
  status(text: string, kind: 'ok' | 'warn' | 'error' | 'info' = 'info') { this.setGame({ status: { text, kind } }); }
  addRoster(s: number, pid: string, prof: { name: string; cos: Cosmetics }, bot: boolean, host = false) { this.roster[s] = { s, pid, name: this.uniqueName(prof.name, s), cos: { ...prof.cos }, bot, host, conn: true, ready: bot || host }; this.pushRoster(); }
  uniqueName(n: string, s: number) { let name = n.trim().slice(0, 12) || 'Crewmate'; const taken = (x: string) => Object.values(this.roster).some(r => r.s !== s && r.name.toLowerCase() === x.toLowerCase()); let i = 2; const base = name; while (taken(name)) name = (base.slice(0, 10) + ' ' + i++); return name; }
  freeColor(want: number, s: number) { const used = new Set(Object.values(this.roster).filter(r => r.s !== s).map(r => r.cos.color)); if (!used.has(want)) return want; for (let i = 0; i < COLORS.length; i++) { const c = (want + i) % COLORS.length; if (!used.has(c)) return c; } return want; }
  fillBots() { const want = this.settings.bots; let bots = Object.values(this.roster).filter(r => r.bot); const humans = Object.values(this.roster).filter(r => !r.bot).length;
    while (bots.length > want || (bots.length && humans + bots.length > MAX_PLAYERS)) { const b = bots.pop()!; delete this.roster[b.s]; this.sim?.removePlayer(b.s); }
    while (bots.length < want && humans + bots.length < MAX_PLAYERS) { const s = this.freeSlot(); const name = BOT_NAMES.find(n => !Object.values(this.roster).some(r => r.name === n + ' [AI]' || r.name.toLowerCase() === n.toLowerCase())) || 'Bot'; const pool = ['none', 'beanie', 'cap', 'headphones', 'flower', 'party', 'cowboy', 'ears', 'sprout', 'chef'];
      this.addRoster(s, 'bot' + s, { name: name + ' [AI]', cos: { color: this.freeColor(Math.floor(Math.random() * 18), s), helmet: ['bubble', 'gold', 'retro', 'neon'][s % 4], hat: pool[(s * 3) % pool.length], outfit: ['none', 'labcoat', 'vest', 'hoodie', 'scarf'][s % 5], backpack: 'tank', pet: 'none', trail: 'none', accessory: 'none', victory: 'jump' } }, true);
      bots = Object.values(this.roster).filter(r => r.bot); if (this.sim?.phase === 'lobby') { this.sim.addPlayer(this.entry(this.roster[s])); this.bots = new Bots(this.sim); } }
    this.pushRoster(); }
  freeSlot() { for (let i = 0; i < 32; i++) if (!this.roster[i]) return i; return 99; }
  entry(r: RosterInfo): RosterEntry { return { s: r.s, pid: r.pid || '', name: r.name, cos: r.cos, bot: r.bot, host: r.host }; }
  pushRoster() { this.setGame({ roster: { ...this.roster }, settings: { ...this.settings } }); if (this.mode === 'host') this.broadcast({ t: 'lobby', roster: this.roster, settings: this.settings, phase: this.sim?.phase || 'lobby' }); }

  // ────────────── lobby & match lifecycle (host) ──────────────
  enterLobby() {
    this.map = getMap('lobby'); this.world = new World(this.map); this.sim = new Sim(this.map, this.settings, Object.values(this.roster).map(r => this.entry(r)), 1, true);
    this.sim.players.forEach((p, i) => { p.x = this.map.spawn.x + (i % 5 - 2) * 46; p.y = this.map.spawn.y + Math.floor(i / 5) * 40 - 30; });
    this.bots = new Bots(this.sim); const me = this.sim.get(this.slot)!; Object.assign(this.me, { x: me.x, y: me.y, vx: 0, vy: 0 });
    this.setGame({ mapId: 'lobby', end: null, ejection: null, killed: null, role: null, minigame: null, panel: null, chat: this.G.chat.slice(-30), replay: null, personalWin: null }); useApp.getState().go('lobby');
    this.broadcast({ t: 'lobby_enter' }); for (const [pid, s] of this.peers) { const p = this.sim.get(s); if (p) this.net!.send(pid, { t: 'snap', x: p.x, y: p.y, map: 'lobby' }); }
    this.startClock(); showWorld({ rt: this }); audio.music('lobby'); audio.ambience('lobby');
  }
  canStart() { const n = Object.values(this.roster).filter(r => r.conn).length; const ready = Object.values(this.roster).every(r => r.ready || !r.conn); return { ok: n >= MIN_PLAYERS && ready, n, ready }; }
  startMatch() {
    if (!this.isHost) return; const c = this.canStart(); if (!c.ok) return; const seed = (Math.random() * 1e9) | 0; const mapId = this.settings.map;
    this.map = getMap(mapId); this.world = new World(this.map); const roster = Object.values(this.roster).filter(r => r.conn).map(r => this.entry(r));
    this.sim = new Sim(this.map, this.settings, roster, seed); this.bots = new Bots(this.sim);
    for (const [pid] of this.peers) this.net!.send(pid, { t: 'start', map: mapId, settings: this.settings, roster: this.roster });
    this.beginMatchLocal(mapId); this.flush();
  }
  beginMatchLocal(mapId: MapId) {
    this.map = getMap(mapId); this.world = new World(this.map); this.buf = []; this.view = null;
    this.setGame({ mapId, end: null, ejection: null, killed: null, meetingIntro: null, voteResult: null, minigame: null, panel: null, results: [], chat: [], intro: true, replay: null, personalWin: null });
    useApp.getState().go('game'); showWorld({ rt: this }); audio.music(null); audio.ambience(this.map.theme); sfx('role');
  }
  backToLobby() { if (!this.isHost) return; this.sim = null; this.enterLobby(); }

  // ────────────── clock ──────────────
  startClock() { this.stopClock(); if (!this.isHost) return;
    this.lastStepAt = performance.now(); this.lastBroadcastAt = 0; this.lastPingAt = 0; this.tickBusy = false;
    try { const src = `let i=null;onmessage=e=>{clearInterval(i);if(e.data>0)i=setInterval(()=>postMessage(0),e.data)}`; this.worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))); this.worker.onmessage = () => this.hostTick(); this.worker.postMessage(Math.round(TICK * 1000)); }
    catch { this.timer = setInterval(() => this.hostTick(), TICK * 1000); } }
  stopClock() { clearInterval(this.timer); this.timer = null; if (this.worker) { this.worker.postMessage(0); this.worker.terminate(); this.worker = null; } }
  tickBusy = false;
  hostTick() {
    const sim = this.sim; if (!sim) return;
    // Guards against a slow host (or a tab that was briefly backgrounded) piling up queued
    // ticks that then all fire back-to-back: that burst used to look like a freeze followed by
    // a rubber-band jump for every connected player. Instead we step by real elapsed time
    // (clamped) and never let a second tick start work while one is still catching up.
    if (this.tickBusy) return;
    this.tickBusy = true;
    try {
      const now = performance.now();
      const dt = Math.min(Math.max((now - (this.lastStepAt || now)) / 1000, TICK * 0.25), TICK * 4);
      this.lastStepAt = now; this.tickN++;
      sim.step(dt); this.bots?.step(dt); this.flush();
      // disconnected humans: removed after 60 s
      for (const [s, at] of Object.entries(this.disconnectedAt)) if (now - at > 60000) { delete this.disconnectedAt[+s]; const p = sim.get(+s); if (p && p.alive && sim.phase !== 'lobby' && sim.phase !== 'ended') { p.alive = false; p.ghost = true; sim.emit('all', { e: 'toast', text: `${p.name} left the match.`, kind: 'warn' }); sim.checkWin(); } }
      const mine = sim.viewFor(this.slot); this.receiveView(mine, now);
      // Throttled by wall-clock time, not tick count: a burst of catch-up ticks after a stall
      // won't re-send a view to every peer once per queued tick — at most once per interval.
      if (this.tickN % 2 === 0 && now - this.lastBroadcastAt >= TICK * 1000) { this.lastBroadcastAt = now; for (const [pid, s] of this.peers) { const p = sim.get(s); if (p) this.net!.send(pid, { t: 'v', v: sim.viewFor(s) }); } }
      if (this.tickN % 30 === 0 && now - this.lastPingAt >= TICK * 15 * 1000) { this.lastPingAt = now; for (const [pid, s] of this.peers) { this.net!.send(pid, { t: 'ping', c: now }); const seen = this.lastSeen.get(pid) ?? now; const r = this.roster[s];
        if (r && r.conn && now - seen > 7000) { if (sim.phase === 'lobby') this.dropPeer(pid, false); else { r.conn = false; const sp = sim.get(s); if (sp) sp.conn = false; this.disconnectedAt[s] = now; sim.emit('all', { e: 'toast', text: `${r.name} lost connection — waiting 60 s for them.`, kind: 'warn' }); this.pushRoster(); } } } }
    } finally { this.tickBusy = false; }
  }
  flush() { const sim = this.sim; if (!sim) return; const out = sim.out; sim.out = [];
    for (const { to, ev } of out) { const targets: number[] = to === 'all' ? sim.players.map(p => p.s) : to === 'ghosts' ? sim.players.filter(p => p.ghost).map(p => p.s) : to === 'inf' ? sim.players.filter(p => p.faction === 'infiltrator').map(p => p.s) : [to];
      for (const s of targets) { if (s === this.slot) this.handleEv(ev); else { const pid = this.pidOf(s); if (pid) this.net?.send(pid, { t: 'ev', ev }); } } } }
  pidOf(s: number) { for (const [pid, x] of this.peers) if (x === s) return pid; return null; }
  broadcast(m: any) { if (this.mode !== 'host' || !this.net) return; for (const [pid] of this.peers) this.net.send(pid, m); }

  // ────────────── host: network ──────────────
  lastSeen = new Map<string, number>();
  hostMsg(pid: string, m: any) {
    if (!m || typeof m !== 'object') return; const s = this.peers.get(pid); this.lastSeen.set(pid, performance.now());
    if (s !== undefined && this.roster[s] && !this.roster[s].conn) { this.roster[s].conn = true; delete this.disconnectedAt[s]; const sp = this.sim?.get(s); if (sp) sp.conn = true; this.sim?.emit('all', { e: 'toast', text: `${this.roster[s].name} is back.`, kind: 'ok' }); this.pushRoster(); }
    if (m.t === 'hello') return this.onHello(pid, m);
    if (s === undefined || !this.sim) return; const r = this.roster[s];
    switch (m.t) {
      case 'pos': if (Number.isFinite(m.x) && Number.isFinite(m.y)) this.sim.handlePos(s, m.x, m.y, m.f === -1 ? -1 : 1, (['idle', 'walk', 'run'].includes(m.a) ? m.a : 'idle'), !!m.m); break;
      case 'act': if (m.a && typeof m.a.k === 'string') this.sim.handleAct(s, m.a); this.flush(); break;
      case 'profile': if (this.sim.phase === 'lobby' && r) { r.name = this.uniqueName(String(m.name || ''), s); r.cos = { ...m.cos, color: this.freeColor(m.cos?.color ?? 0, s) }; const p = this.sim.get(s); if (p) { p.name = r.name; p.cos = r.cos; } this.pushRoster(); } break;
      case 'ready': if (r) { r.ready = !!m.v; this.pushRoster(); } break;
      case 'ping': this.net!.send(pid, { t: 'pong', c: m.c }); break;
      case 'pong': this.roster[s] && (this.lastPongAt = performance.now()); break;
      case 'replay_req': if (this.sim.phase === 'ended') this.sendReplay(pid); break;
      case 'leave': this.dropPeer(pid, true); break;
    }
  }
  onHello(pid: string, m: any) {
    const send = (x: any) => this.net!.send(pid, x);
    if (m.proto !== PROTO || String(m.version).split('.')[0] !== VERSION.split('.')[0]) { send({ t: 'reject', reason: 'version', text: `Version mismatch: host runs ${VERSION}, you run ${m.version}.` }); return setTimeout(() => this.net?.close(pid), 400); }
    const existing = Object.values(this.roster).find(r => r.pid === m.pid && !r.bot);
    const sim = this.sim!; const inGame = sim.phase !== 'lobby';
    if (existing) { // reconnect / duplicate tab
      for (const [p2, s2] of this.peers) if (s2 === existing.s && p2 !== pid) { this.peers.delete(p2); this.net!.close(p2); }
      this.peers.set(pid, existing.s); existing.conn = true; delete this.disconnectedAt[existing.s]; const sp = sim.get(existing.s); if (sp) sp.conn = true;
      send({ t: 'welcome', slot: existing.s, code: this.net!.code, roster: this.roster, settings: this.settings, rejoin: true });
      if (inGame) { send({ t: 'start', map: this.settings.map, settings: this.settings, roster: this.roster, rejoin: true }); const p = sim.get(existing.s)!; send({ t: 'ev', ev: { e: 'role', role: p.role, faction: p.faction, team: p.faction === 'infiltrator' ? sim.players.filter(o => o.faction === 'infiltrator').map(o => o.s) : [], bounty: p.bounty, goal: '' } }); send({ t: 'ev', ev: { e: 'snap', x: p.x, y: p.y } }); if (sim.phase !== 'play') send({ t: 'ev', ev: { e: 'phase_sync', ph: sim.phase } }); }
      else send({ t: 'snap', x: sim.get(existing.s)?.x, y: sim.get(existing.s)?.y, map: 'lobby' });
      sim.emit('all', { e: 'toast', text: `${existing.name} reconnected.`, kind: 'ok' }); this.pushRoster(); return; }
    if (inGame) { send({ t: 'reject', reason: 'started', text: 'That match has already started — wait for the next round.' }); return setTimeout(() => this.net?.close(pid), 400); }
    const humans = Object.values(this.roster).filter(r => !r.bot).length; if (humans >= MAX_PLAYERS) { send({ t: 'reject', reason: 'full', text: 'That room is full (15 players).' }); return setTimeout(() => this.net?.close(pid), 400); }
    const s = this.freeSlot(); this.peers.set(pid, s);
    this.addRoster(s, m.pid, { name: String(m.name || 'Crewmate'), cos: { ...m.cos, color: this.freeColor(m.cos?.color ?? 0, s) } }, false); this.roster[s].ready = false;
    if (Object.values(this.roster).length > MAX_PLAYERS) { const b = Object.values(this.roster).filter(r => r.bot).pop(); if (b) { delete this.roster[b.s]; sim.removePlayer(b.s); this.settings.bots = Math.max(0, this.settings.bots - 1); } }
    const p = sim.addPlayer(this.entry(this.roster[s])); p.x = this.map.spawn.x + (Math.random() - 0.5) * 120; p.y = this.map.spawn.y;
    this.bots = new Bots(sim);
    send({ t: 'welcome', slot: s, code: this.net!.code, roster: this.roster, settings: this.settings }); send({ t: 'snap', x: p.x, y: p.y, map: 'lobby' });
    this.pushRoster(); sfx('join'); sim.emit('all', { e: 'toast', text: `${this.roster[s].name} joined.`, kind: 'ok' }); this.flush();
  }
  peerGone(pid: string) { this.dropPeer(pid, false); }
  dropPeer(pid: string, left: boolean) { const s = this.peers.get(pid); if (s === undefined) return; this.peers.delete(pid); this.net?.close(pid); const r = this.roster[s]; if (!r) return; const sim = this.sim!;
    if (sim.phase === 'lobby') { delete this.roster[s]; sim.removePlayer(s); this.bots = new Bots(sim); sim.emit('all', { e: 'toast', text: `${r.name} left.`, kind: 'warn' }); sfx('leave'); }
    else { r.conn = false; const p = sim.get(s); if (p) p.conn = false; if (left) this.disconnectedAt[s] = performance.now() - 59000; else this.disconnectedAt[s] = performance.now(); sim.emit('all', { e: 'toast', text: left ? `${r.name} left the match.` : `${r.name} disconnected — they have 60 s to reconnect.`, kind: 'warn' }); }
    this.pushRoster(); this.flush(); }
  sendReplay(pid: string) { const json = JSON.stringify(this.sim!.replay()); const N = 60000; const n = Math.ceil(json.length / N); for (let i = 0; i < n; i++) this.net!.send(pid, { t: 'replay', i, n, d: json.slice(i * N, (i + 1) * N) }); }

  // ────────────── guest: network ──────────────
  replayParts: string[] = [];
  guestMsg(m: any) {
    this.lastRx = performance.now();
    switch (m.t) {
      case 'welcome': this.slot = m.slot; this.roster = m.roster; this.settings = m.settings; this.setGame({ slot: m.slot, roster: m.roster, settings: m.settings, code: m.code, reconnecting: false, status: { text: m.rejoin ? 'Reconnected!' : 'Connected to host.', kind: 'ok' } });
        if (!m.rejoin) { this.enterGuestLobby(); } this.emitLocal({ e: '_welcome' }); break;
      case 'reject': this.leaving = true; this.emitLocal({ e: '_reject', text: m.text || 'The host refused the connection.' }); useApp.getState().toast(m.text || 'Rejected', 'error'); break;
      case 'lobby': this.roster = m.roster; this.settings = m.settings; this.setGame({ roster: m.roster, settings: m.settings }); break;
      case 'lobby_enter': this.enterGuestLobby(); break;
      case 'snap': if (m.map === 'lobby' && this.G.mapId !== 'lobby') this.enterGuestLobby(); Object.assign(this.me, { x: m.x, y: m.y, vx: 0, vy: 0 }); break;
      case 'start': this.settings = m.settings; this.roster = m.roster; this.setGame({ settings: m.settings, roster: m.roster }); this.beginMatchLocal(m.map); break;
      case 'v': this.receiveView(m.v, performance.now()); break;
      case 'ev': this.handleEv(m.ev); break;
      case 'ping': this.net!.send(this.hostPeer, { t: 'pong', c: m.c }); this.net!.send(this.hostPeer, { t: 'ping', c: performance.now() }); break;
      case 'pong': this.setGame({ rtt: Math.round(performance.now() - m.c) }); break;
      case 'replay': this.replayParts[m.i] = m.d; if (this.replayParts.filter(Boolean).length === m.n) { try { this.setGame({ replay: JSON.parse(this.replayParts.join('')) }); } catch { } this.replayParts = []; } break;
      case 'closed': this.leaving = true; useApp.getState().toast('The host closed the room.', 'error'); this.leave(); break;
      case 'kicked': this.leaving = true; useApp.getState().toast('You were removed from the room.', 'error'); this.leave(); break;
    }
  }
  enterGuestLobby() { this.map = getMap('lobby'); this.world = new World(this.map); this.buf = []; this.view = null; this.setGame({ mapId: 'lobby', end: null, ejection: null, killed: null, role: null, minigame: null, panel: null, replay: null, personalWin: null }); useApp.getState().go('lobby'); showWorld({ rt: this }); audio.music('lobby'); audio.ambience('lobby'); }
  hostGone() { if (this.leaving || this.mode !== 'guest') return; this.setGame({ reconnecting: true, status: { text: 'Connection to host lost — reconnecting…', kind: 'warn' } }); this.tryRejoin(Date.now()); }
  async tryRejoin(t0: number) {
    if (this.leaving) return; if (Date.now() - t0 > 60000) { useApp.getState().toast('Could not reconnect — the host may have left.', 'error'); this.leave(); return; }
    try { this.net?.destroy(); this.net = new Net(); this.net.onMsg = (_id, m) => this.guestMsg(m); this.net.onClose = () => this.hostGone(); this.hostPeer = await this.net.join(this.G.code); this.net.send(this.hostPeer, { t: 'hello', proto: PROTO, version: VERSION, pid: PID, ...this.profile() }); }
    catch { this.rejoinTimer = setTimeout(() => this.tryRejoin(t0), 3000); }
  }

  // ────────────── views & events (both sides) ──────────────
  receiveView(v: View, at: number) {
    this.buf.push({ at, v }); while (this.buf.length > 2 && at - this.buf[1].at > 400) this.buf.shift(); if (this.buf.length > 40) this.buf.shift();
    const prev = this.view; this.view = v;
    if (prev?.ph !== v.ph) this.onPhase(v.ph, prev?.ph);
    if (at - this.uiT > 110 || prev?.ph !== v.ph) { this.uiT = at; this.setGame({ view: v }); }
    if (this.mode === 'guest' && performance.now() - this.lastRx > 6000 && !this.G.reconnecting) this.hostGone();
  }
  onPhase(ph: string, prev?: string) {
    if (ph === 'play' && prev === 'intro') { this.setGame({ intro: false }); }
    if (ph === 'play' && (prev === 'ejection' || prev === 'meeting')) { this.setGame({ ejection: null, meetingIntro: null, voteResult: null }); audio.music(null); }
    if (ph === 'meeting') { this.setGame({ minigame: null, panel: null }); audio.music('meeting'); audio.alarm(false); }
  }
  emitLocal(e: Ev) { this.listeners.forEach(l => l(e)); }
  handleEv(e: Ev) {
    const G = this.G; const app = useApp.getState(); const name = (s: number) => this.roster[s]?.name || '???';
    switch (e.e) {
      case 'role': this.setGame({ role: { role: e.role, faction: e.faction, team: e.team || [], bounty: e.bounty, goal: e.goal } }); break;
      case 'snap': Object.assign(this.me, { x: e.x, y: e.y, vx: 0, vy: 0 }); break;
      case 'toast': app.toast(e.text, e.kind); break;
      case 'chat': this.setGame({ chat: [...G.chat.slice(-150), e.msg], unread: G.panel === 'chat' || G.view?.ph === 'meeting' ? 0 : G.unread + 1 }); if (e.msg.s !== this.slot) sfx('chat'); break;
      case 'killed': this.setGame({ killed: { by: e.by }, minigame: null, panel: null }); sfx('kill'); setTimeout(() => sfx('death'), 500); break;
      case 'downed': app.toast('You are downed! A Paramedic may still save you…', 'error'); sfx('kill'); break;
      case 'revived': app.toast('You were stabilised! Back on your feet.', 'ok'); sfx('shield'); break;
      case 'blocked': app.toast(e.by === 'vest' ? 'Your vest saved you!' : 'Someone attacked you — but you were protected!', 'warn'); sfx('block'); break;
      case 'meeting': this.setGame({ meetingIntro: { caller: e.caller, body: e.body, kind: e.kind }, minigame: null, panel: null, voteResult: null }); sfx(e.kind === 'report' ? 'report' : 'emergency'); setTimeout(() => sfx('meeting'), 700); break;
      case 'voted': sfx('vote'); break;
      case 'vote_result': this.setGame({ voteResult: e.result }); sfx('reveal'); break;
      case 'ejection': this.setGame({ ejection: { s: e.s, text: e.text, sub: e.sub, cos: e.cos } }); sfx('eject'); break;
      case 'guess_death': app.toast(`${name(e.s)} was eliminated by a guess!`, 'error'); sfx('kill'); break;
      case 'sab': { const n = SAB_NAME[e.id as keyof typeof SAB_NAME]; app.toast(`⚠ ${n}${e.extra ? ' + ' + SAB_NAME[e.extra as keyof typeof SAB_NAME] : ''}!`, 'error'); sfx('sabotage'); if (['reactor', 'oxygen', 'lifesupport', 'pressure'].includes(e.id)) audio.alarm(true); break; }
      case 'fixed': app.toast(`${SAB_NAME[e.id as keyof typeof SAB_NAME]} repaired.`, 'ok'); sfx('fixed'); audio.alarm(false); if (G.minigame?.kind === 'fix') this.setGame({ minigame: null }); break;
      case 'doors': sfx('door'); break;
      case 'event': app.toast(EVENT_NAME[e.id] + '!', 'warn'); break;
      case 'task_ok': sfx(e.done ? 'task_done' : 'task_step'); break;
      case 'result': this.setGame({ results: [...G.results.slice(-5), { id: Date.now(), kind: e.kind, text: e.text, t: Date.now() }] }); sfx('alert'); break;
      case 'alert': app.toast(e.text, 'warn'); sfx('alert'); break;
      case 'logs': this.setGame({ logs: e.entries, panel: 'logs' }); break;
      case 'cams_off': if (G.panel === 'cams') this.setGame({ panel: null }); app.toast('Camera feed closed.', 'info'); break;
      case 'ability_ok': sfx('ability'); break;
      case 'trapped': app.toast('You stepped in a trap!', 'error'); sfx('trap'); break;
      case 'bounty': this.setGame({ role: { ...G.role!, bounty: e.target } }); break;
      case 'personal_win': this.setGame({ personalWin: e.text || 'Personal objective complete!' }); sfx('win'); break;
      case 'phase_sync': break;
      case 'end': this.setGame({ end: e, minigame: null, panel: null }); audio.alarm(false); setTimeout(() => sfx(e.winners.includes(this.slot) || e.side.includes(this.slot) ? 'win' : 'lose'), 900); if (this.isHost) this.setGame({ replay: this.sim!.replay() }); break;
    }
    this.emitLocal(e);
  }

  // ────────────── local player input ──────────────
  localMove(ix: number, iy: number, dt: number, run: boolean) {
    const v = this.view; if (!v) return; const me = v.me; const lobby = v.ph === 'lobby';
    const frozen = !lobby && (v.ph !== 'play' || me.vent || me.downed || this.G.minigame || (this.G.panel && this.G.panel !== 'map' && this.G.panel !== 'chat' && this.G.panel !== 'tasks'));
    if (frozen && !(v.ph === 'play' && me.ghost && !this.G.minigame)) { ix = 0; iy = 0; }
    if (v.ph === 'intro' || v.ph === 'meeting' || v.ph === 'ejection') { ix = 0; iy = 0; }
    const bypass = me.role === 'specialist' && me.active > 0; this.world.setDoors(!lobby && !me.access && !bypass && !me.ghost ? [...v.doors, ...this.map.restricted] : v.doors);
    const sp = stepMove(this.world, this.me, ix, iy, dt, { speed: (this.settings?.speed ?? 1) * (run && !lobby ? 1.3 : run ? 1.3 : 1), slow: me.slow > 0, slippery: v.ev?.id === 'gravity' || v.ev?.id === 'freeze' || v.sab?.id === 'gravity', ghost: me.ghost, bypass, flood: v.sab?.id === 'flood' || v.sab?.extra === 'flood', drift: v.sab?.id === 'gravity' ? { x: Math.sin(v.t * 0.7) * 40, y: Math.cos(v.t * 0.5) * 30 } : undefined });
    this.me.moving = sp > 12; this.me.a = sp > 12 ? (sp > 165 ? 'run' : 'walk') : 'idle'; if (Math.abs(this.me.vx) > 4) this.me.f = this.me.vx < 0 ? -1 : 1;
    const now = performance.now(); if (now - this.lastSend > (this.isHost ? 30 : 50)) { this.lastSend = now; this.sendPos(); }
    return sp;
  }
  sendPos() { const m = this.me; if (this.isHost) this.sim?.handlePos(this.slot, m.x, m.y, m.f, m.a, m.moving); else this.net?.send(this.hostPeer, { t: 'pos', x: Math.round(m.x * 10) / 10, y: Math.round(m.y * 10) / 10, f: m.f, a: m.a, m: m.moving }); }
  act(a: any) { a.seq = this.seq++; if (this.isHost) { this.sim?.handleAct(this.slot, a); this.flush(); } else this.net?.send(this.hostPeer, { t: 'act', a }); }

  /** Remote players interpolated ~100 ms behind (host: 50 ms). */
  sample(now: number): PlayerPublic[] {
    const delay = this.isHost ? 50 : 110; const rt = now - delay; const b = this.buf; if (!b.length) return [];
    let i = b.length - 1; while (i > 0 && b[i - 1].at > rt) i--; const a = b[Math.max(0, i - 1)], c = b[i]; if (!a || a === c || c.at <= a.at) return c.v.pl;
    const k = Math.max(0, Math.min(1, (rt - a.at) / (c.at - a.at))); const prev = new Map(a.v.pl.map(p => [p.s, p]));
    return c.v.pl.map(p => { const q = prev.get(p.s); if (!q || Math.hypot(q.x - p.x, q.y - p.y) > 160) return p; return { ...p, x: q.x + (p.x - q.x) * k, y: q.y + (p.y - q.y) * k }; });
  }
  // ────────────── host controls & session end ──────────────
  updateSettings(s: Partial<Settings>) { if (!this.isHost) return; this.settings = { ...this.settings, ...s }; useApp.getState().setSettings(s); if ('bots' in s) this.fillBots(); if (this.sim) this.sim.set = this.settings; this.pushRoster(); }
  updateProfile() { const pr = this.profile(); if (this.isHost) { const r = this.roster[this.slot]; if (!r || this.sim?.phase !== 'lobby') return; r.name = this.uniqueName(pr.name, this.slot); r.cos = { ...pr.cos, color: this.freeColor(pr.cos.color, this.slot) }; const p = this.sim.get(this.slot); if (p) { p.name = r.name; p.cos = r.cos; } this.pushRoster(); }
    else this.net?.send(this.hostPeer, { t: 'profile', ...pr }); }
  setReady(v: boolean) { if (this.isHost) return; this.net?.send(this.hostPeer, { t: 'ready', v }); }
  kick(s: number) { if (!this.isHost) return; const pid = this.pidOf(s); if (pid) { this.net!.send(pid, { t: 'kicked' }); setTimeout(() => this.dropPeer(pid, true), 200); } }
  requestReplay() { if (this.isHost) this.setGame({ replay: this.sim!.replay() }); else this.net?.send(this.hostPeer, { t: 'replay_req' }); }
  leave() { this.leaving = true; if (this.mode === 'guest') this.net?.send(this.hostPeer, { t: 'leave' }); if (this.mode === 'host') this.broadcast({ t: 'closed' });
    setTimeout(() => { this.reset(); this.mode = null; useApp.getState().go('menu'); showMenuBackdrop(); audio.ambience(null); audio.music('menu'); }, 120); }
}
export const rt = new Runtime();
(window as any).__rt = rt;
export function startPractice() { useApp.getState().setLoading('PREPARING STATION'); setTimeout(() => { rt.startLocal().finally(() => useApp.getState().setLoading(null)); }, 60); }
export const roomLabel = (m: MapData, id: string) => roomName(m, id);
export const roleName = (id: string) => ROLE[id]?.name || id;
export { PID, TILE };
