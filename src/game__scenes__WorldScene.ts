// The playable 2D top-down world: baked map, animated props, doors, characters, bodies, vision/darkness, weather & FX.
import Phaser from 'phaser';
import type { Runtime } from './game__runtime';
import { bakeMap, AnimDesc } from './game__art__mapart';
import { bgTexture, bgPlanet } from './game__art__backgrounds';
import { canvasTex, DPR, glimSheet, SHEET_SCALE } from './game__phaser';
import { softDot } from './game__art__space';
import { Glim } from './game__scenes__Glim';
import { THEMES } from './game__art__themes';
import { TILE, COLORS } from './game__core__constants';
import { FW, FH, FOOT_X, FOOT_Y, ANIMS } from './game__art__chars';
import { pollInput, onAction } from './game__input';
import { computeInteract, doAction, LOBBY_POINTS } from './game__actions';
import { useHud } from './store__hud';
import { useGame } from './store__game';
import { useApp } from './store__app';
import { audio, sfx } from './game__audio__audio';
import { ROLE } from './game__roles__roles';
import type { PlayerPublic } from './game__core__types';
import type { Ev, View } from './game__sim__types';

const bakeCache = new Map<string, { keys: { k: string; x: number; y: number; w: number; h: number }[]; anims: AnimDesc[]; lights: any[]; scale: number }>();
export function bakedFor(mapId: string) { for (const [k, v] of bakeCache) if (k.startsWith(mapId + ':')) return v; return null; }
const hex = (c: string) => parseInt(c.replace('#', ''), 16);

export class WorldScene extends Phaser.Scene {
  rt!: Runtime; glims = new Map<number, Glim>(); me!: Glim; bodies = new Map<number, Phaser.GameObjects.Sprite>(); doors: { id: string; g: Phaser.GameObjects.Graphics; d: any; open: number }[] = [];
  screensG!: Phaser.GameObjects.Graphics; blinkG!: Phaser.GameObjects.Graphics; fxG!: Phaser.GameObjects.Graphics; tracesG!: Phaser.GameObjects.Graphics; pa: AnimDesc[] = []; spin: { o: Phaser.GameObjects.Image; s: number }[] = []; pulses: { o: Phaser.GameObjects.Image; base: number; ph: number }[] = [];
  lamps: Phaser.GameObjects.Image[] = []; roomLights: Phaser.GameObjects.Image[] = []; bg?: Phaser.GameObjects.TileSprite; bgPlanet?: Phaser.GameObjects.Image; bgParallax = 0.25; weather?: Phaser.GameObjects.Particles.ParticleEmitter; fish: { o: Phaser.GameObjects.Image; a: AnimDesc; ph: number; sp: number }[] = [];
  dark!: { c: HTMLCanvasElement; x: CanvasRenderingContext2D; img: Phaser.GameObjects.Image; key: string }; redOverlay!: Phaser.GameObjects.Rectangle; theme = THEMES.orbital; camX = 0; camY = 0; zoomMul = 1; shakeT = 0; shakeA = 0;
  stepT = 0; lastView: View | null = null; seenBodies = new Set<number>(); hlG!: Phaser.GameObjects.Graphics; labels = new Map<number, string>(); off: (() => void)[] = []; dying = 0; waterTS: Phaser.GameObjects.TileSprite[] = []; meGhostShown = false; mapId = '';
  constructor() { super('world'); }
  init(data: any) { this.rt = data.rt; }
  create() {
    this.weather = undefined; this.bg = undefined; this.bgPlanet = undefined; this.dying = 0; this.zoomMul = 1; this.shakeT = 0; (this as any)._lt = undefined;
    const rt = this.rt; const m = rt.map; this.mapId = m.id; this.theme = THEMES[m.theme] || THEMES.orbital; this.glims.clear(); this.bodies.clear(); this.doors = []; this.spin = []; this.pulses = []; this.lamps = []; this.roomLights = []; this.fish = []; this.waterTS = []; this.seenBodies.clear(); this.labels.clear();
    const q = useApp.getState().prefs.quality;
    // background
    const bk = 'bg:' + this.theme.bg; if (!this.textures.exists(bk)) canvasTex(this, bk, bgTexture(this.theme.bg));
    this.bg = this.add.tileSprite(0, 0, 10, 10, bk).setOrigin(0).setDepth(-2000); this.bgParallax = this.theme.bg === 'desert' ? 1 : this.theme.bg === 'ocean' ? 0.6 : this.theme.bg === 'ice' ? 0.7 : 0.2;
    const pl = bgPlanet(this.theme.bg); if (pl) { const pk = 'bgp:' + this.theme.bg; if (!this.textures.exists(pk)) canvasTex(this, pk, pl); this.bgPlanet = this.add.image(0, 0, pk).setDepth(-1990).setAlpha(0.95); }
    // baked map → chunked textures
    const key = m.id + ':' + q; let baked = bakeCache.get(key);
    if (!baked || !baked.keys.every(k => this.textures.exists(k.k))) { const b = bakeMap(m, q); const CH = 2048; const keys: any[] = [];
      for (let y = 0; y < b.canvas.height; y += CH) for (let x = 0; x < b.canvas.width; x += CH) { const w = Math.min(CH, b.canvas.width - x), h = Math.min(CH, b.canvas.height - y); const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d')!.drawImage(b.canvas, x, y, w, h, 0, 0, w, h); const k = `map:${key}:${x}:${y}`; canvasTex(this, k, c); keys.push({ k, x: x / b.scale, y: y / b.scale, w, h }); }
      baked = { keys, anims: b.anims, lights: b.lights, scale: b.scale }; bakeCache.set(key, baked); }
    for (const k of baked.keys) this.add.image(k.x, k.y, k.k).setOrigin(0).setScale(1 / baked.scale).setDepth(-1000);
    if (!this.textures.exists('fx:soft')) canvasTex(this, 'fx:soft', softDot(128));
    if (!this.textures.exists('fx:dot')) { const g = this.make.graphics({}, false); g.fillStyle(0xffffff); g.fillCircle(8, 8, 8); g.generateTexture('fx:dot', 16, 16); g.destroy(); }
    this.makeTextures();
    // room lighting pools
    for (const L of baked.lights) { const img = this.add.image(L.x, L.y, 'fx:soft').setDisplaySize(L.r * 2.2, L.r * 1.7).setTint(hex(L.col)).setAlpha(0.13).setBlendMode(Phaser.BlendModes.ADD).setDepth(-900); this.roomLights.push(img); }
    this.pa = baked.anims; this.buildAnims();
    // doors
    for (const d of m.doors) { const g = this.add.graphics().setDepth(d.y + d.h - 2); this.doors.push({ id: d.id, g, d, open: 1 }); }
    this.screensG = this.add.graphics().setDepth(-800); this.blinkG = this.add.graphics().setDepth(-790).setBlendMode(Phaser.BlendModes.ADD); this.tracesG = this.add.graphics().setDepth(-700); this.hlG = this.add.graphics().setDepth(-600); this.fxG = this.add.graphics().setDepth(20000);
    // weather
    this.makeWeather(q);
    // darkness overlay
    const dc = document.createElement('canvas'); dc.width = 480; dc.height = 300; const dk = 'dark:' + Math.random(); canvasTex(this, dk, dc); this.dark = { c: dc, x: dc.getContext('2d')!, img: this.add.image(0, 0, dk).setOrigin(0).setDepth(30000), key: dk };
    this.redOverlay = this.add.rectangle(0, 0, 10, 10, 0xff1a3a, 0).setOrigin(0).setDepth(30010).setBlendMode(Phaser.BlendModes.ADD);
    // me
    const myCos = rt.roster[rt.slot]?.cos || useApp.getState().profile.cos; this.me = new Glim(this, myCos, rt.roster[rt.slot]?.name || 'You'); this.camX = rt.me.x; this.camY = rt.me.y;
    if (m.id === 'lobby') { const r = m.rooms[0]; LOBBY_POINTS.customize = { x: r.x + TILE * 3, y: r.y + TILE * 2.2 }; LOBBY_POINTS.settings = { x: r.x + r.w - TILE * 3, y: r.y + TILE * 2.2 }; this.lobbyStations(); }
    onAction(a => doAction(a));
    this.off.push(rt.on(e => this.onEv(e)));
    const onZoom = (e: any) => { this.zoomMul = Phaser.Math.Clamp(this.zoomMul * (e.detail > 0 ? 1.12 : 0.89), 0.6, 1.8); }; addEventListener('ay:zoom', onZoom); this.off.push(() => removeEventListener('ay:zoom', onZoom));
    this.input.on('wheel', (_p: any, _o: any, _dx: number, dy: number) => { this.zoomMul = Phaser.Math.Clamp(this.zoomMul * (dy > 0 ? 0.92 : 1.08), 0.6, 1.8); });
    this.events.once('shutdown', () => { this.off.forEach(f => f()); this.off = []; this.glims.forEach(g => g.destroy()); this.me?.destroy(); if (this.textures.exists(this.dark.key)) this.textures.remove(this.dark.key); });
    this.cameras.main.setBackgroundColor('#04060e'); this.cameras.main.roundPixels = false;
  }
  makeTextures() {
    const mk = (k: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => { if (this.textures.exists(k)) return; const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!); canvasTex(this, k, c); };
    const th = this.theme;
    mk('fx:fan', 64, 64, c => { c.translate(32, 32); for (let i = 0; i < 5; i++) { c.rotate(Math.PI * 2 / 5); c.fillStyle = 'rgba(200,215,240,0.85)'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(14, -6, 26, -2); c.quadraticCurveTo(16, 6, 0, 3); c.fill(); } c.fillStyle = '#2a3150'; c.beginPath(); c.arc(0, 0, 6, 0, 6.3); c.fill(); });
    mk('fx:dish', 96, 96, c => { c.translate(48, 48); c.fillStyle = '#d6dceb'; c.beginPath(); c.ellipse(0, 0, 40, 40, 0, 0, 6.3); c.fill(); c.strokeStyle = '#8e98b0'; c.lineWidth = 2; for (let r = 10; r < 40; r += 10) { c.beginPath(); c.arc(0, 0, r, 0, 6.3); c.stroke(); } c.fillStyle = '#8e98b0'; c.fillRect(-2, -38, 4, 38); c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(0, -40, 4, 0, 6.3); c.fill(); });
    mk('fx:turret', 48, 48, c => { c.translate(24, 24); c.fillStyle = '#5a5e70'; c.beginPath(); c.arc(0, 0, 13, 0, 6.3); c.fill(); c.fillStyle = '#2a2c35'; c.fillRect(0, -4, 22, 8); c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(0, 0, 4, 0, 6.3); c.fill(); });
    mk('fx:fish', 32, 16, c => { c.fillStyle = '#ffb547'; c.beginPath(); c.ellipse(14, 8, 10, 5, 0, 0, 6.3); c.fill(); c.beginPath(); c.moveTo(4, 8); c.lineTo(-2, 2); c.lineTo(-2, 14); c.fill(); c.fillStyle = '#1b2033'; c.beginPath(); c.arc(20, 7, 1.4, 0, 6.3); c.fill(); });
    mk('fx:sub', 96, 48, c => { c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(44, 26, 38, 15, 0, 0, 6.3); c.fill(); c.fillStyle = '#e0a020'; c.fillRect(36, 6, 18, 10); c.fillStyle = '#5affea'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(26 + i * 14, 26, 4.5, 0, 6.3); c.fill(); } c.fillStyle = '#a07010'; c.beginPath(); c.moveTo(82, 26); c.lineTo(94, 16); c.lineTo(94, 36); c.fill(); });
    mk('fx:wave', 128, 128, c => { c.fillStyle = 'rgba(20,110,150,0.0)'; c.fillRect(0, 0, 128, 128); c.strokeStyle = 'rgba(170,240,255,0.35)'; c.lineWidth = 2; for (let y = 8; y < 128; y += 22) { c.beginPath(); for (let x = 0; x <= 128; x += 4) c.lineTo(x, y + Math.sin(x / 128 * Math.PI * 4) * 4); c.stroke(); } });
    mk('fx:holo', 64, 64, c => { c.translate(32, 32); c.strokeStyle = th.accent; c.globalAlpha = 0.9; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 26, 0, 6.3); c.stroke(); for (let i = -2; i <= 2; i++) { c.beginPath(); c.ellipse(0, 0, 26, Math.abs(i) * 8 + 2, 0, 0, 6.3); c.globalAlpha = 0.5; c.stroke(); } c.beginPath(); c.ellipse(0, 0, 9, 26, 0, 0, 6.3); c.stroke(); });
    mk('fx:shard', 12, 12, c => { c.fillStyle = '#e8fbff'; c.beginPath(); c.moveTo(6, 0); c.lineTo(12, 7); c.lineTo(3, 12); c.closePath(); c.fill(); });
    mk('fx:ring', 128, 128, c => { c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.beginPath(); c.arc(64, 64, 58, 0, 6.3); c.stroke(); });
    mk('fx:arrow', 48, 48, c => { c.fillStyle = '#ffd23f'; c.strokeStyle = '#2a1600'; c.lineWidth = 3; c.beginPath(); c.moveTo(24, 46); c.lineTo(6, 22); c.lineTo(17, 22); c.lineTo(17, 2); c.lineTo(31, 2); c.lineTo(31, 22); c.lineTo(42, 22); c.closePath(); c.fill(); c.stroke(); });
    mk('fx:station', 64, 64, c => { const g = c.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, 'rgba(255,230,120,0.9)'); g.addColorStop(1, 'rgba(255,230,120,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  }
  buildAnims() {
    for (const a of this.pa) {
      if (a.k === 'lamp') { const o = this.add.image(a.x, a.y, 'fx:soft').setDisplaySize(70, 50).setTint(hex(a.col || '#ffffff')).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(-850); (o as any).v = a.v || 0; this.lamps.push(o); }
      if (a.k === 'fan') { const o = this.add.image(a.x, a.y, 'fx:fan').setDisplaySize((a.r || 20) * 2, (a.r || 20) * 2).setDepth(-850); this.spin.push({ o, s: 4 }); }
      if (a.k === 'dish') { const o = this.add.image(a.x, a.y, 'fx:dish').setDisplaySize((a.r || 30) * 2, (a.r || 30) * 2).setDepth(a.y + 10); this.spin.push({ o, s: 0.25 }); }
      if (a.k === 'turret') { const o = this.add.image(a.x, a.y, 'fx:turret').setDepth(a.y + 10); this.spin.push({ o, s: 0.6 }); }
      if (a.k === 'pulse' || a.k === 'emergency' || a.k === 'heat') { const o = this.add.image(a.x, a.y, 'fx:soft').setTint(hex(a.k === 'emergency' ? '#ff2e4d' : a.k === 'heat' ? '#ffb547' : a.col || '#3ff0e0')).setBlendMode(Phaser.BlendModes.ADD).setDepth(-840); const base = a.k === 'emergency' ? 50 : a.k === 'heat' ? 40 : (a.r || 30) * 3; o.setDisplaySize(base, base); this.pulses.push({ o, base, ph: Math.random() * 6 }); }
      if (a.k === 'holo') { const o = this.add.image(a.x, a.y - 22, 'fx:holo').setDisplaySize((a.r || 26) * 2, (a.r || 26) * 2).setAlpha(0.75).setBlendMode(Phaser.BlendModes.ADD).setDepth(a.y + 30); this.spin.push({ o, s: 0.6 }); (o as any).holo = true; }
      if (a.k === 'water') { const o = this.add.tileSprite(a.x, a.y, a.w!, a.h!, 'fx:wave').setOrigin(0).setDepth(-845).setAlpha(0.9); this.waterTS.push(o); }
      if (a.k === 'sub') { const o = this.add.image(a.x, a.y, 'fx:sub').setDepth(-840); this.pulses.push({ o, base: -1, ph: 0 }); }
      if (a.k === 'fish') for (let i = 0; i < 3; i++) { const o = this.add.image(a.x, a.y, 'fx:fish').setScale(0.6 + Math.random() * 0.4).setDepth(-830).setTint([0xffb547, 0xff6fae, 0x5affea][i]); this.fish.push({ o, a, ph: Math.random() * 6, sp: 0.3 + Math.random() * 0.4 }); }
      if (a.k === 'bubbles' && useApp.getState().prefs.particles) this.add.particles(0, 0, 'fx:dot', { x: { min: a.x, max: a.x + (a.w || 10) }, y: a.y + (a.h || 10), lifespan: 1600, speedY: { min: -18, max: -32 }, speedX: { min: -3, max: 3 }, scale: { start: 0.18, end: 0.05 }, alpha: { start: 0.6, end: 0 }, frequency: 500, tint: 0xd6f6ff }).setDepth(-820);
      if (a.k === 'steam' && useApp.getState().prefs.particles) this.add.particles(a.x, a.y, 'fx:soft', { lifespan: 1400, speedY: { min: -20, max: -40 }, speedX: { min: -10, max: 10 }, scale: { start: 0.08, end: 0.3 }, alpha: { start: 0.25, end: 0 }, frequency: 900 + (a.v || 0) % 700 }).setDepth(a.y + 40);
      if (a.k === 'glint') { const o = this.add.image(a.x, a.y, 'fx:soft').setDisplaySize(20, 20).setBlendMode(Phaser.BlendModes.ADD).setDepth(-830); this.pulses.push({ o, base: 18, ph: (a.v || 0) }); }
    }
  }
  lobbyStations() {
    const draw = (x: number, y: number, label: string, col: number) => { const g = this.add.graphics().setDepth(y + 20); g.fillStyle(0x000000, 0.3).fillEllipse(x, y + 18, 70, 16); g.fillStyle(0x3a3f60).fillRoundedRect(x - 30, y - 6, 60, 24, 6); g.fillStyle(0x23284a).fillRoundedRect(x - 30, y + 10, 60, 10, 4);
      g.fillStyle(0x0a1020).fillRoundedRect(x - 22, y - 30, 44, 28, 4); g.lineStyle(2, col).strokeRoundedRect(x - 22, y - 30, 44, 28, 4);
      const t = this.add.text(x, y - 46, label, { fontFamily: '"Chakra Petch", sans-serif', fontSize: '24px', fontStyle: '700', color: '#ffffff', stroke: '#060914', strokeThickness: 6 }).setOrigin(0.5).setScale(0.5).setDepth(y + 21);
      const glow = this.add.image(x, y - 16, 'fx:soft').setTint(col).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(90, 60).setDepth(y + 19); this.pulses.push({ o: glow, base: 80, ph: x }); };
    draw(LOBBY_POINTS.customize.x, LOBBY_POINTS.customize.y, 'CUSTOMIZE', 0x3ff0e0); draw(LOBBY_POINTS.settings.x, LOBBY_POINTS.settings.y, 'GAME SETTINGS', 0xa77bff);
  }
  makeWeather(q: string) { if (!useApp.getState().prefs.particles) return; const bg = this.theme.bg;
    if (bg === 'ice') this.weather = this.add.particles(0, 0, 'fx:dot', { x: { min: 0, max: 1 }, y: 0, lifespan: 6000, speedY: { min: 30, max: 70 }, speedX: { min: -30, max: 10 }, scale: { min: 0.08, max: 0.22 }, alpha: { min: 0.4, max: 0.9 }, frequency: q === 'low' ? 60 : 25, emitting: true }).setDepth(25000);
    if (bg === 'desert') this.weather = this.add.particles(0, 0, 'fx:dot', { x: 0, y: { min: 0, max: 1 }, lifespan: 4000, speedX: { min: 80, max: 160 }, speedY: { min: -10, max: 20 }, scale: { min: 0.05, max: 0.15 }, alpha: { min: 0.2, max: 0.6 }, tint: [0xe8c08a, 0xd9a060], frequency: q === 'low' ? 80 : 30 }).setDepth(25000);
    if (bg === 'ocean') this.weather = this.add.particles(0, 0, 'fx:dot', { x: { min: 0, max: 1 }, y: 0, lifespan: 5000, speedY: { min: -30, max: -60 }, speedX: { min: -6, max: 6 }, scale: { min: 0.06, max: 0.18 }, alpha: { start: 0.5, end: 0 }, tint: 0xbff9ff, frequency: q === 'low' ? 120 : 50 }).setDepth(25000);
  }

  // ───────────────────────────── per-frame ─────────────────────────────
  update(time: number, delta: number) {
    if (this.scene.isActive('menu')) this.scene.stop('menu');
    const pn = performance.now(); const dt = Math.min(0.1, Math.max(0.001, (pn - ((this as any)._lt || pn - 16)) / 1000)); (this as any)._lt = pn; const rt = this.rt; const v = rt.view; if (!rt.map || rt.map.id !== this.mapId) return;
    // input & local movement
    const inp = pollInput(); const busy = !!useGame.getState().minigame || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
    const sp = rt.localMove(busy ? 0 : inp.x, busy ? 0 : inp.y, dt, inp.run) || 0;
    if (sp > 20 && v && !v.me.ghost) { this.stepT -= dt; if (this.stepT <= 0) { this.stepT = sp > 165 ? 0.22 : 0.32; const z = this.surfaceAt(rt.me.x, rt.me.y); audio.stepSurface = z; audio.footstep(); } }
    const now = time; const others = rt.sample(performance.now());
    // camera
    const cam = this.cameras.main; const base = Math.max(0.55, Math.min(1.7, Math.min(innerHeight / (TILE * 14), innerWidth / (TILE * 20)))); const z = base * DPR * this.zoomMul * useApp.getState().prefs.zoom; cam.setZoom(z);
    const k = 1 - Math.pow(1 - useApp.getState().prefs.camSmooth * 1.6, dt * 60); const spec = useGame.getState().spectate; const sg = v?.me.ghost && spec !== null ? this.glims.get(spec) : undefined; const fx = sg && sg.c.visible ? sg.x : rt.me.x, fy = sg && sg.c.visible ? sg.y : rt.me.y; this.camX += (fx - this.camX) * k; this.camY += (fy - 20 - this.camY) * k;
    const vw = cam.width / z, vh = cam.height / z; let cx = this.camX, cy = this.camY; const m = rt.map;
    if (m.W > vw) cx = Phaser.Math.Clamp(cx, vw / 2 - TILE * 2, m.W - vw / 2 + TILE * 2); else cx = m.W / 2; if (m.H > vh) cy = Phaser.Math.Clamp(cy, vh / 2 - TILE * 2, m.H - vh / 2 + TILE * 2); else cy = m.H / 2;
    if (this.shakeT > 0 && useApp.getState().prefs.shake) { this.shakeT -= dt; cx += (Math.random() - 0.5) * this.shakeA; cy += (Math.random() - 0.5) * this.shakeA; }
    if (v?.sab?.id === 'gravity' || v?.ev?.id === 'gravity') cam.setRotation(Math.sin(time / 900) * 0.03); else cam.setRotation(0);
    cam.centerOn(cx, cy); const view = { x: cx - vw / 2, y: cy - vh / 2, w: vw, h: vh };
    // background parallax
    if (this.bg) { this.bg.setPosition(view.x, view.y).setSize(vw + 2, vh + 2); this.bg.tilePositionX = view.x * this.bgParallax + (this.theme.bg === 'warp' ? time * 0.25 : 0); this.bg.tilePositionY = view.y * this.bgParallax; }
    if (this.bgPlanet) { this.bgPlanet.setPosition(view.x + vw * 0.78 - view.x * 0.04, view.y + vh * 0.3 - view.y * 0.03).setScale(Math.max(0.5, vh / 1400)); }
    if (this.weather && (this.weather as any).ops?.x) { if (this.theme.bg === 'desert') { this.weather.setPosition(view.x - 40, view.y); (this.weather as any).ops.y.loadConfig({ y: { min: 0, max: vh } }); } else { this.weather.setPosition(view.x, view.y - 20); (this.weather as any).ops.x.loadConfig({ x: { min: 0, max: vw } }); }
      const storm = v?.ev && (v.ev.id === 'blizzard' || v.ev.id === 'sandstorm'); this.weather.frequency = storm ? 6 : (this.theme.bg === 'ocean' ? 50 : 28); }
    if (!v) { this.me.setPos(rt.me.x, rt.me.y); this.me.update(now, dt); return; }
    this.animateProps(time, dt, view, v);
    this.updateDoors(v, dt);
    this.updatePlayers(v, others, now, dt);
    this.updateBodies(v, now);
    this.drawTraces(v, time);
    this.drawHighlights(v, time);
    this.drawDarkness(v, view, time);
    // interaction (throttled to HUD)
    if (time - ((this as any)._it || 0) > 90) { (this as any)._it = time; const it = computeInteract(others); const H = useHud.getState(); if (JSON.stringify(it) !== JSON.stringify({ use: H.use, report: H.report, kill: H.kill, vent: H.vent, abilityTarget: H.abilityTarget, abilityBody: H.abilityBody, room: H.room, nearCams: H.nearCams })) H.set(it); }
    this.fxG.clear(); this.lastView = v;
  }
  surfaceAt(x: number, y: number) { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); const m = this.rt.map; const z = m.zones.find(z => tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h); if (z?.kind === 'water') return 'water'; if (z?.kind === 'cold' || z?.kind === 'ice') return 'snow'; const ri = m.roomAt[ty * m.w + tx]; const r = ri >= 0 ? m.rooms[ri] : null; if (r?.spec.outdoor || ['plaza', 'mining', 'outpost'].includes(r?.kind || '')) return 'sand'; if (['entrance', 'tunnel'].includes(r?.kind || '')) return 'snow'; return 'metal'; }
  animateProps(time: number, dt: number, view: any, v: View) {
    const t = time / 1000; const power = v.sab?.id === 'power' || v.sab?.extra === 'power'; const flicker = v.ev?.id === 'flicker' || v.ev?.id === 'reactor_pulse';
    for (const s of this.spin) { s.o.rotation += s.s * dt * ((s.o as any).holo ? 1 : 1) * (v.ev?.id === 'defense' && s.o.texture.key === 'fx:turret' ? 4 : 1); if ((s.o as any).holo) s.o.setScale(s.o.scaleX, s.o.scaleX * (0.9 + Math.sin(t * 2) * 0.05)); }
    for (const p of this.pulses) { if (p.base < 0) { p.o.y += Math.sin(t * 1.5 + p.ph) * 0.15; continue; } const k = 0.75 + Math.sin(t * 2.4 + p.ph) * 0.25; p.o.setDisplaySize(p.base * k, p.base * k).setAlpha(0.35 + 0.35 * k); }
    for (const l of this.lamps) { const fl = flicker ? (Math.sin(t * 40 + (l as any).v) > 0.2 ? 0.1 : 0.6) : 0.45 + Math.sin(t * 3 + (l as any).v) * 0.05; l.setAlpha(power ? 0.08 : fl); }
    for (const l of this.roomLights) l.setAlpha(power ? 0.02 : flicker ? 0.05 + Math.random() * 0.08 : 0.13);
    for (const w of this.waterTS) { w.tilePositionX = t * 12; w.tilePositionY = Math.sin(t * 0.7) * 6; }
    for (const f of this.fish) { f.ph += dt * f.sp; const a = f.a; const x = a.x + (a.w! / 2) + Math.sin(f.ph) * (a.w! / 2 - 10); const y = a.y + (a.h! / 2) + Math.sin(f.ph * 2.3) * (a.h! / 3); f.o.setFlipX(Math.cos(f.ph) < 0).setPosition(x, y); }
    // screens + blinks (single graphics each, culled)
    const g = this.screensG, b = this.blinkG; g.clear(); b.clear(); const inView = (x: number, y: number) => x > view.x - 60 && x < view.x + view.w + 60 && y > view.y - 60 && y < view.y + view.h + 60;
    for (const a of this.pa) { if (!inView(a.x, a.y)) continue;
      if (a.k === 'screen') { const col = hex(a.col || '#5affea'); const sab = v.sab && a.id && v.sab.spots.includes(a.id) && !v.sab.done.includes(a.id); const n = Math.max(2, Math.floor(a.h! / 4)); for (let i = 0; i < n; i++) { const w = a.w! * (0.3 + 0.6 * Math.abs(Math.sin(t * 1.3 + i * 1.7 + a.x * 0.1))); g.fillStyle(sab ? 0xff4d6d : col, power ? 0.25 : 0.55 + 0.25 * Math.sin(t * 5 + i)).fillRect(a.x + 1, a.y + 1 + i * (a.h! / n), w, Math.max(1, a.h! / n - 1.5)); }
        if (sab && Math.sin(t * 8) > 0) g.lineStyle(2, 0xff4d6d, 0.9).strokeRect(a.x - 3, a.y - 3, a.w! + 6, a.h! + 6); }
      if (a.k === 'blink') { const on = Math.sin(t * (2 + ((a.v || 0) % 5)) + (a.v || 0)) > 0.3; b.fillStyle(hex(a.col || '#8dff7a'), on ? 0.95 : 0.15).fillCircle(a.x, a.y, 1.8); if (on) b.fillStyle(hex(a.col || '#8dff7a'), 0.25).fillCircle(a.x, a.y, 5); }
      if (a.k === 'scan') { const r = (t * 0.8 % 1); b.lineStyle(2, hex(this.theme.accent), 0.7 * (1 - r)).strokeEllipse(a.x, a.y, a.r! * 2 * r, a.r! * 1.2 * r); }
      if (a.k === 'needle') { const ang = -2.2 + Math.sin(t * 1.3 + (a.v || 0)) * 0.6; g.lineStyle(1.5, 0x1b2033).lineBetween(a.x, a.y, a.x + Math.cos(ang) * 6, a.y + Math.sin(ang) * 6); }
      if (a.k === 'vent' && (a as any).pop > 0) { (a as any).pop -= dt; g.fillStyle(0x000000, 0.8).fillRoundedRect(a.x - 14, a.y - 9, 28, 18, 3); }
    }
  }
  updateDoors(v: View, dt: number) {
    const closed = new Set(v.doors); const th = this.theme; const restricted = new Set(this.rt.map.restricted); const locked = v.ph !== 'lobby' && !v.me.access && !v.me.ghost && !(v.me.role === 'specialist' && v.me.active > 0);
    for (const d of this.doors) { const isR = restricted.has(d.id) && locked; const want = closed.has(d.id) || isR ? 0 : 1; if (d.open !== want) { const prev = d.open; d.open = Phaser.Math.Clamp(d.open + (want ? 1 : -1) * dt * 4, 0, 1); if (prev === 1 && want === 0) { const dd = Math.hypot(d.d.x - this.rt.me.x, d.d.y - this.rt.me.y); if (dd < 400) sfx('door'); } }
      const g = d.g; g.clear(); if (d.open >= 0.999) continue; const D = d.d; const c = 1 - d.open; const mc = hex(th.metal), dk = hex(th.metalDark), red = 0xff4d6d;
      if (isR && !closed.has(d.id)) { g.fillStyle(0xffd23f, 0.85).fillRect(D.x, D.y + (D.horiz ? 10 : 0), D.horiz ? D.w : D.w, D.horiz ? D.h - 20 : D.h); g.fillStyle(0x1b1b22); const n = Math.ceil((D.horiz ? D.w : D.h) / 12); for (let i = 0; i < n; i++) D.horiz ? g.fillRect(D.x + i * 12, D.y + 10, 6, D.h - 20) : g.fillRect(D.x, D.y + i * 12, D.w, 6); g.fillStyle(0x1b1b22).fillRoundedRect(D.x + D.w / 2 - 8, D.y + D.h / 2 - 8, 16, 16, 3); g.fillStyle(0xff4d6d).fillCircle(D.x + D.w / 2, D.y + D.h / 2, 3.5); continue; }
      if (D.horiz) { const half = D.w / 2 * c; g.fillStyle(dk).fillRect(D.x, D.y + 6, half, D.h - 12).fillRect(D.x + D.w - half, D.y + 6, half, D.h - 12); g.fillStyle(mc).fillRect(D.x, D.y + 6, half, 6).fillRect(D.x + D.w - half, D.y + 6, half, 6); g.fillStyle(red, 0.9).fillRect(D.x + half - 4, D.y + 14, 3, D.h - 28).fillRect(D.x + D.w - half + 1, D.y + 14, 3, D.h - 28); }
      else { const half = D.h / 2 * c; g.fillStyle(dk).fillRect(D.x + 8, D.y, D.w - 16, half).fillRect(D.x + 8, D.y + D.h - half, D.w - 16, half); g.fillStyle(mc).fillRect(D.x + 8, D.y, 6, half).fillRect(D.x + 8, D.y + D.h - half, 6, half); g.fillStyle(red, 0.9).fillRect(D.x + 14, D.y + half - 4, D.w - 28, 3).fillRect(D.x + 14, D.y + D.h - half + 1, D.w - 28, 3); } }
  }
  glimFor(s: number, cosSlot: number) {
    const rt = this.rt; let g = this.glims.get(s); const cos = rt.roster[cosSlot]?.cos || rt.roster[s]?.cos || { color: 13, helmet: 'bubble', hat: 'none', outfit: 'none', backpack: 'tank', pet: 'none', trail: 'none', accessory: 'none', victory: 'jump' };
    const name = rt.roster[cosSlot]?.name || '???';
    if (!g) { g = new Glim(this, cos, name); this.glims.set(s, g); (g as any).cs = cosSlot; }
    if ((g as any).cs !== cosSlot || g.cos.color !== cos.color || g.cos.hat !== cos.hat || g.cos.helmet !== cos.helmet || g.cos.outfit !== cos.outfit || g.cos.pet !== cos.pet || g.cos.trail !== cos.trail || g.cos.backpack !== cos.backpack || g.cos.accessory !== cos.accessory) { g.setCos(cos); (g as any).cs = cosSlot; }
    return g;
  }
  tagFor(s: number, shownSlot: number) { const rt = this.rt; const pv = rt.view?.me; const role = useGame.getState().role; let col = '#ffffff'; const name = rt.roster[shownSlot]?.name || '???';
    if (pv && pv.faction === 'infiltrator' && role?.team.includes(shownSlot) && rt.view?.ph !== 'lobby') col = '#ff6d86'; if (pv?.role === 'bounty' && pv.bounty === s) col = '#ffd23f';
    const cn = useApp.getState().prefs.colorNames ? ` (${COLORS[rt.roster[shownSlot]?.cos.color ?? 0].name})` : ''; return { text: name + cn, col }; }
  updatePlayers(v: View, others: PlayerPublic[], now: number, dt: number) {
    const rt = this.rt; const seen = new Set<number>();
    for (const p of others) { const shown = p.cos ?? p.s; const g = this.glimFor(p.s, shown); seen.add(p.s); const was = g.x;
      g.facing = p.f; g.setPos(p.x, p.y); g.moving = p.a !== 'idle'; g.ghost = !!p.gh; g.dead = false;
      g.play(p.gh ? 'ghost' : p.dn ? 'body' : p.a, now); g.c.setAlpha(p.gh ? 0.5 : p.inv ?? 1); g.setVisible(true);
      const tg = this.tagFor(p.s, shown); if (this.labels.get(p.s) !== tg.text + tg.col) { this.labels.set(p.s, tg.text + tg.col); g.setName(tg.text, tg.col); } g.tag.setVisible(!(p.inv && p.inv < 0.5));
      if (p.slow) g.body.setTint(0xb0c8ff); else g.body.clearTint(); g.update(now, dt); }
    for (const [s, g] of this.glims) if (!seen.has(s)) { if (s >= 1000) { this.fxPuff(g.x, g.y - 20, 0xd453e0); g.destroy(); this.glims.delete(s); this.labels.delete(s); } else g.setVisible(false); }
    // me
    const me = this.me; const pv = v.me; const myCosSlot = pv.shift >= 0 ? pv.shift : rt.slot; const cos = rt.roster[myCosSlot]?.cos; if (cos && (me.cos.color !== cos.color || me.cos.hat !== cos.hat || me.cos.outfit !== cos.outfit || me.cos.helmet !== cos.helmet || me.cos.pet !== cos.pet || me.cos.trail !== cos.trail || me.cos.backpack !== cos.backpack || me.cos.accessory !== cos.accessory)) me.setCos(cos);
    const nm = rt.roster[myCosSlot]?.name || 'You'; const col = pv.faction === 'infiltrator' && v.ph !== 'lobby' ? '#ff6d86' : '#ffffff'; if (me.name !== nm || (me as any).col !== col) { me.setName(nm, col); (me as any).col = col; }
    me.setPos(rt.me.x, rt.me.y); me.facing = rt.me.f; me.moving = rt.me.moving && !pv.vent; me.ghost = pv.ghost;
    if (this.dying > 0) { this.dying -= dt; me.play('death', now - (2.2 - this.dying) * 0); }
    else if (pv.ghost) me.play('ghost', now); else if (pv.downed) me.play('body', now); else me.play(rt.me.a, now);
    me.c.setAlpha(pv.vent ? 0 : pv.ghost ? 0.55 : pv.inv ? 0.35 : 1); me.setVisible(!pv.vent || this.dying > 0);
    me.body.setTint(pv.vest > 0 ? 0xfff3a0 : pv.slow > 0 ? 0xb0c8ff : 0xffffff); if (pv.role === 'scout' && pv.active > 0) { this.fxG.lineStyle(3, 0x55b6ff, 0.6).strokeCircle(me.x, me.y - 24, 34 + Math.sin(now / 120) * 4); }
    me.update(now, dt);
    if (v.ph === 'end' as any) return;
  }
  updateBodies(v: View, now: number) {
    const ids = new Set(v.bodies.map(b => b.id));
    for (const b of v.bodies) { let s = this.bodies.get(b.id); const cos = this.rt.roster[b.s]?.cos; if (!cos) continue;
      if (!s) { s = this.add.sprite(b.x, b.y, glimSheet(this, cos), '42').setOrigin(FOOT_X / FW, FOOT_Y / FH).setScale(1 / SHEET_SCALE).setDepth(b.y - 5); this.bodies.set(b.id, s);
        const fresh = v.t - b.t < 1.6 && !this.seenBodies.has(b.id); if (fresh) { (s as any).dieAt = now; this.shake(4, 0.25); } this.seenBodies.add(b.id); }
      const d0 = (s as any).dieAt; if (d0 !== undefined) { const f = Math.floor((now - d0) / 1000 * ANIMS.death.fps); if (f < ANIMS.death.n) s.setFrame(String(ANIMS.death.start + f)); else { s.setFrame('42'); (s as any).dieAt = undefined; } }
      if (b.downed) { this.fxG.lineStyle(3, 0xff4d6d, 0.5 + Math.sin(now / 150) * 0.4).strokeCircle(b.x, b.y - 10, 26); }
      if ((this as any).reportPulse === b.id) {} }
    for (const [id, s] of this.bodies) if (!ids.has(id)) { s.destroy(); this.bodies.delete(id); }
  }
  drawTraces(v: View, time: number) {
    const g = this.tracesG; g.clear(); const t = time / 1000;
    for (const tr of v.traces) { switch (tr.k) {
      case 'vent': g.fillStyle(0x6a5a40, 0.6).fillEllipse(tr.x + 10, tr.y + 14, 26, 8).fillEllipse(tr.x - 8, tr.y + 16, 14, 5); break;
      case 'stain': g.fillStyle(0x7ff2c4, 0.35).fillEllipse(tr.x, tr.y, 46, 22); g.fillStyle(0xd6fff0, 0.3).fillEllipse(tr.x - 6, tr.y - 3, 18, 7); break;
      case 'trap': g.lineStyle(2, 0xffb547, 0.75).strokeCircle(tr.x, tr.y, 10); g.lineBetween(tr.x - 8, tr.y - 8, tr.x + 8, tr.y + 8).lineBetween(tr.x + 8, tr.y - 8, tr.x - 8, tr.y + 8); break;
      case 'marker': { const b = Math.sin(t * 3) * 3; g.fillStyle(0x8dff7a, 0.25).fillCircle(tr.x, tr.y, 22); g.fillStyle(0x8dff7a).fillTriangle(tr.x - 8, tr.y - 30 + b, tr.x + 8, tr.y - 30 + b, tr.x, tr.y - 16 + b); g.lineStyle(2, 0x8dff7a).lineBetween(tr.x, tr.y, tr.x, tr.y - 18 + b); break; }
      case 'sensor': g.lineStyle(2, 0x24b86a, 0.6 + Math.sin(t * 4) * 0.3).strokeCircle(tr.x, tr.y, 14); g.fillStyle(0x24b86a).fillCircle(tr.x, tr.y, 4); break;
      case 'relic': { const b = Math.sin(t * 2 + tr.id) * 4; g.fillStyle(0xffe08a, 0.3).fillCircle(tr.x, tr.y - 10 + b, 18); g.fillStyle(0xffe08a).fillTriangle(tr.x, tr.y - 24 + b, tr.x + 9, tr.y - 10 + b, tr.x - 9, tr.y - 10 + b).fillTriangle(tr.x, tr.y + 4 + b, tr.x + 9, tr.y - 10 + b, tr.x - 9, tr.y - 10 + b); break; }
      case 'beacon': g.lineStyle(3, 0xffe08a, 0.8).strokeCircle(tr.x, tr.y, 40 + Math.sin(t * 3) * 6); g.fillStyle(0xffe08a, 0.25).fillCircle(tr.x, tr.y, 40); break;
      case 'dark': g.lineStyle(2, 0x000000, 0.4).strokeCircle(tr.x, tr.y, tr.r || 100); break;
    } }
    for (const l of v.leak || []) { g.fillStyle(0x3aa8c8, 0.55).fillEllipse(l.x, l.y, 54, 24); g.lineStyle(1.5, 0xbff9ff, 0.6).strokeEllipse(l.x, l.y, 30 + Math.sin(t * 3) * 6, 12); }
  }
  drawHighlights(v: View, time: number) {
    const g = this.hlG; g.clear(); const t = time / 1000; const pv = v.me; const m = this.rt.map; if (v.ph !== 'play') return;
    const H = useHud.getState(); const glowSpot = (x: number, y: number, col: number, a = 0.8) => { g.lineStyle(3, col, a * (0.6 + 0.4 * Math.sin(t * 5))).strokeRoundedRect(x - 18, y - 16, 36, 30, 8); };
    // task spots
    for (const tk of pv.tasks) { if (tk.done) continue; const sp = m.byId[tk.steps[tk.step]]; if (!sp) continue; const y = sp.wall ? sp.y - TILE * 1.25 : sp.y - 20; glowSpot(sp.x, y, pv.fake ? 0x8fa3d6 : 0xffd23f, pv.fake ? 0.35 : 0.8); }
    if (v.sab) for (const id of v.sab.spots) { if (v.sab.done.includes(id)) continue; const sp = m.byId[id]; const y = sp.wall ? sp.y - TILE * 1.25 : sp.y - 20; glowSpot(sp.x, y, 0xff4d6d); }
    if (H.use) { const sp = m.byId[H.use.id]; if (sp) { const y = sp.wall ? sp.y - TILE * 1.25 : sp.y - (sp.kind === 'emergency' ? 6 : 20); g.lineStyle(4, 0xffffff, 0.9).strokeRoundedRect(sp.x - 22, y - 20, 44, 38, 10); } }
    if (H.vent) { const sp = m.byId[H.vent]; if (sp) g.lineStyle(3, 0xff4d6d, 0.8).strokeRoundedRect(sp.x - 20, sp.y - 14, 40, 28, 6); }
    if (H.kill !== null && pv.kcd <= 0) { const o = this.glims.get(H.kill); if (o) g.lineStyle(3, 0xff4d6d, 0.7 + Math.sin(t * 8) * 0.3).strokeEllipse(o.x, o.y, 44, 16); }
    // tracker arrow
    if (pv.track) { const dx = pv.track.x - this.rt.me.x, dy = pv.track.y - this.rt.me.y; const d = Math.hypot(dx, dy); if (d > 60) { const a = Math.atan2(dy, dx); const x = this.rt.me.x + Math.cos(a) * 60, y = this.rt.me.y - 20 + Math.sin(a) * 60; g.fillStyle(pv.role === 'relic' ? 0xffe08a : 0x9be14a).fillTriangle(x + Math.cos(a) * 14, y + Math.sin(a) * 14, x + Math.cos(a + 2.4) * 10, y + Math.sin(a + 2.4) * 10, x + Math.cos(a - 2.4) * 10, y + Math.sin(a - 2.4) * 10); } else g.lineStyle(2, 0x9be14a).strokeCircle(pv.track.x, pv.track.y - 20, 30); }
  }
  visionR(v: View) {
    const pv = v.me; if (pv.ghost || v.ph === 'lobby') return 1e5; const s = this.rt.settings; let r = (pv.faction === 'infiltrator' ? s.infVision : s.crewVision) * TILE; const crewish = pv.faction !== 'infiltrator';
    if (crewish && (v.sab?.id === 'power' || v.sab?.extra === 'power')) r *= 0.32;
    if (v.ev && (v.ev.id === 'blizzard' || v.ev.id === 'sandstorm')) { const rm = this.rt.map.roomById[useHud.getState().room]; r *= rm?.spec.outdoor ? 0.5 : 0.8; } if (v.ev?.id === 'flicker' && crewish) r *= 0.55;
    if (crewish && v.traces.some(tr => tr.k === 'dark' && Math.hypot(tr.x - this.rt.me.x, tr.y - this.rt.me.y) < (tr.r || 0))) r *= 0.28; if (pv.role === 'scout' && pv.active > 0) r *= 2; return r;
  }
  drawDarkness(v: View, view: { x: number; y: number; w: number; h: number }, time: number) {
    const D = this.dark; const c = D.x; const W = D.c.width, H = D.c.height; const sx = W / view.w, sy = H / view.h; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, W, H);
    const R = this.visionR(v); const critical = !!v.sab?.until;
    if (R < 1e4) { c.fillStyle = 'rgba(3,5,12,0.93)'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'destination-out';
      const scout = v.me.role === 'scout' && v.me.active > 0; this.rt.world.setDoors(v.doors); const poly = this.rt.world.visPoly(this.rt.me.x, this.rt.me.y - 14, R, 180, scout);
      const px = (this.rt.me.x - view.x) * sx, py = (this.rt.me.y - 14 - view.y) * sy; const gr = c.createRadialGradient(px, py, R * sx * 0.55, px, py, R * sx); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.beginPath(); for (let i = 0; i < poly.length; i += 2) { const x = (poly[i] - view.x) * sx, y = (poly[i + 1] - view.y) * sy; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); c.fillStyle = gr; c.fill();
      c.globalCompositeOperation = 'source-over'; }
    // blackout zones visible to everyone as a dim area
    for (const tr of v.traces) if (tr.k === 'dark') { const gx = (tr.x - view.x) * sx, gy = (tr.y - view.y) * sy; const g2 = c.createRadialGradient(gx, gy, 0, gx, gy, (tr.r || 100) * sx); g2.addColorStop(0, 'rgba(0,0,0,0.55)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g2; c.fillRect(0, 0, W, H); }
    (this.textures.get(D.key) as Phaser.Textures.CanvasTexture).refresh();
    D.img.setPosition(view.x, view.y).setDisplaySize(view.w, view.h);
    const red = critical ? 0.08 + 0.08 * Math.sin(time / 180) : (v.ev?.id === 'reactor_pulse' ? 0.04 + 0.04 * Math.sin(time / 90) : 0); this.redOverlay.setPosition(view.x, view.y).setSize(view.w, view.h).setFillStyle(0xff1a3a, Math.max(0, red));
  }
  // ───────────────────────────── events / fx ─────────────────────────────
  shake(a: number, t: number) { this.shakeA = a; this.shakeT = t; }
  fxPuff(x: number, y: number, tint = 0xffffff) { if (!useApp.getState().prefs.particles) return; const p = this.add.particles(x, y, 'fx:soft', { lifespan: 600, speed: { min: 20, max: 80 }, scale: { start: 0.25, end: 0.6 }, alpha: { start: 0.6, end: 0 }, tint, quantity: 14, emitting: false }).setDepth(y + 50); p.explode(14); this.time.delayedCall(800, () => p.destroy()); }
  fxRing(x: number, y: number, col: number, size = 120) { const r = this.add.image(x, y, 'fx:ring').setTint(col).setDisplaySize(10, 10).setDepth(y + 60).setBlendMode(Phaser.BlendModes.ADD); this.tweens.add({ targets: r, displayWidth: size, displayHeight: size * 0.7, alpha: 0, duration: 600, onComplete: () => r.destroy() }); }
  onEv(e: Ev) {
    if (e.e === 'fx') { const near = Math.hypot(e.x - this.rt.me.x, e.y - this.rt.me.y) < 700;
      if (e.k === 'kill') { if (near) { sfx('kill'); this.shake(8, 0.35); } if (useApp.getState().prefs.particles) { const p = this.add.particles(e.x, e.y - 40, 'fx:shard', { lifespan: 700, speed: { min: 60, max: 180 }, gravityY: 300, rotate: { min: 0, max: 360 }, scale: { start: 1, end: 0.4 }, alpha: { start: 1, end: 0 }, emitting: false }).setDepth(e.y + 60); p.explode(16); this.time.delayedCall(900, () => p.destroy()); } this.fxRing(e.x, e.y - 20, 0xff4d6d); }
      if (e.k === 'vent') { if (near) sfx('vent'); const a = this.pa.find(a => a.k === 'vent' && Math.hypot(a.x - e.x, a.y - e.y) < 4); if (a) (a as any).pop = 0.5; this.fxPuff(e.x, e.y, 0x8a8a8a); }
      if (e.k === 'puff') { this.fxPuff(e.x, e.y - 24, 0xd6c8ff); if (near) sfx('ability'); }
      if (e.k === 'shield' || e.k === 'block') { this.fxRing(e.x, e.y - 24, e.k === 'shield' ? 0x55b6ff : 0xffd23f, 90); if (near) sfx(e.k === 'shield' ? 'shield' : 'block'); }
      if (e.k === 'pulse') this.fxRing(e.x, e.y - 20, 0x55b6ff, 400);
      if (e.k === 'swap') { this.fxRing(e.x, e.y - 20, 0x8f55f0, 140); this.fxPuff(e.x, e.y - 20, 0x8f55f0); }
      if (e.k === 'trap') this.fxRing(e.x, e.y, 0xffb547, 80);
      if (e.k === 'relic') { this.fxRing(e.x, e.y - 10, 0xffe08a, 120); sfx('task_done'); }
      if (e.k === 'passage') this.fxPuff(e.x, e.y, 0xc8955e);
    }
    if (e.e === 'killed') { this.dying = 2.2; this.shake(12, 0.5); }
    if (e.e === 'meeting' || e.e === 'report') this.shake(6, 0.3);
    if (e.e === 'sab' && ['reactor', 'oxygen', 'lifesupport', 'pressure'].includes(e.id)) this.shake(5, 0.6);
    if (e.e === 'event' && (e.id === 'reactor_pulse' || e.id === 'gravity')) this.shake(4, 1.2);
  }
}
