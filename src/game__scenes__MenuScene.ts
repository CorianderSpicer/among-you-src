// Animated title backdrop: parallax stars, nebula, ringed planet, a flyby starship, drifting zero-g Glims, shooting stars.
import Phaser from 'phaser';
import { starfield, nebula, planet, ship, softDot } from './game__art__space';
import { canvasTex, DPR } from './game__phaser';
import { Glim } from './game__scenes__Glim';
import { HATS, OUTFITS, BACKPACKS, HELMETS, PETS } from './game__art__cosmetics';

export class MenuScene extends Phaser.Scene {
  layers: Phaser.GameObjects.TileSprite[] = []; glims: { g: Glim; vx: number; vy: number; rot: number; vr: number }[] = []; planetImg!: Phaser.GameObjects.Image; ringT = 0; shipImg!: Phaser.GameObjects.Image; bg!: Phaser.GameObjects.Image; neb!: Phaser.GameObjects.Image; neb2!: Phaser.GameObjects.Image;
  W = 0; H = 0; dust!: Phaser.GameObjects.Particles.ParticleEmitter; side = 0.62;
  constructor() { super('menu'); }
  create() {
    const bgc = document.createElement('canvas'); bgc.width = 4; bgc.height = 512; const x = bgc.getContext('2d')!; const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#070b1c'); g.addColorStop(0.6, '#0b1230'); g.addColorStop(1, '#151033'); x.fillStyle = g; x.fillRect(0, 0, 4, 512);
    canvasTex(this, 'm:bg', bgc); canvasTex(this, 'm:neb', nebula(1024, 768, 3, ['#3ff0e0', '#a77bff', '#ff4d6d', '#3c5cf0'])); canvasTex(this, 'm:neb2', nebula(1024, 768, 9, ['#ff8a2a', '#d453e0', '#3c5cf0']));
    [[1, 340, 1.1], [2, 160, 1.6], [3, 60, 2.4]].forEach(([s, n, r]) => canvasTex(this, 'm:stars' + s, starfield(1024, 1024, n as number, s as number * 17, r as number)));
    canvasTex(this, 'm:planet', planet(520, { base: '#5b4fd1', dark: '#1a1250', light: '#c5b8ff', atmo: '#8f7bff', ring: '#d9c8ff', bands: true, seed: 4 }));
    canvasTex(this, 'm:moon', planet(110, { base: '#9aa6ba', dark: '#38445b', light: '#eef3ff', atmo: '#cfe3ff', craters: true, seed: 2 }));
    canvasTex(this, 'm:ship', ship(900, 180)); canvasTex(this, 'm:dot', softDot(32));
    this.bg = this.add.image(0, 0, 'm:bg').setOrigin(0);
    this.neb = this.add.image(0, 0, 'm:neb').setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9);
    this.neb2 = this.add.image(0, 0, 'm:neb2').setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
    for (let i = 1; i <= 3; i++) this.layers.push(this.add.tileSprite(0, 0, 10, 10, 'm:stars' + i).setOrigin(0));
    this.planetImg = this.add.image(0, 0, 'm:planet');
    const moon = this.add.image(0, 0, 'm:moon').setName('moon');
    this.shipImg = this.add.image(-1000, 0, 'm:ship').setScale(0.5).setAlpha(0.95);
    this.dust = this.add.particles(0, 0, 'm:dot', { x: { min: 0, max: 2000 }, y: { min: 0, max: 1200 }, lifespan: 9000, speedX: { min: -8, max: -22 }, speedY: { min: -4, max: 4 }, scale: { min: 0.05, max: 0.22 }, alpha: { start: 0, end: 0, ease: (t: number) => Math.sin(t * Math.PI) }, quantity: 1, frequency: 160, blendMode: 'ADD', tint: [0x9ff6ee, 0xcdb0ff, 0xffffff] });
    (this.dust as any).alpha = undefined;
    const r = (a: any[]) => a[Math.floor(Math.random() * a.length)].id;
    for (let i = 0; i < 7; i++) { const g = new Glim(this, { color: (i * 5 + 2) % 18, hat: r(HATS), outfit: r(OUTFITS), backpack: r(BACKPACKS), helmet: r(HELMETS), pet: 'none', trail: 'none', accessory: 'none', victory: 'jump' }, ''); g.tag.setVisible(false);
      this.glims.push({ g, vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 10, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 }); }
    this.layout(); this.scale.on('resize', () => this.layout());
    this.glims.forEach((o, i) => { o.g.setPos(this.W * (this.side + 0.04 + Math.random() * (0.92 - this.side)), this.H * (0.12 + Math.random() * 0.78)); o.g.c.setScale(1.0 + (i % 3) * 0.45); });
    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.shootingStar() });
    this.flyby(); this.time.addEvent({ delay: 26000, loop: true, callback: () => this.flyby() });
    (moon as any).orbit = 0;
  }
  layout() {
    this.W = innerWidth; this.H = innerHeight; const cam = this.cameras.main; cam.setZoom(DPR); cam.centerOn(this.W / 2, this.H / 2);
    this.side = this.W < 760 ? 0.0 : 0.5;
    this.bg.setDisplaySize(this.W, this.H); this.neb.setPosition(this.W * 0.7, this.H * 0.45).setDisplaySize(this.W * 1.3, this.H * 1.3); this.neb2.setPosition(this.W * 0.2, this.H * 0.7).setDisplaySize(this.W, this.H);
    this.layers.forEach(l => l.setSize(this.W, this.H));
    const ps = Math.min(this.W, this.H) / 800; this.planetImg.setPosition(this.W * (this.W < 760 ? 0.8 : 0.82), this.H * 0.8).setScale(ps * 0.95);
  }
  shootingStar() {
    if (Math.random() < 0.35) return; const sx = this.W * (0.3 + Math.random() * 0.7), sy = this.H * Math.random() * 0.4; const line = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const len = 120 + Math.random() * 120; let t = 0; const ev = this.time.addEvent({ delay: 16, repeat: 45, callback: () => { t += 1 / 45; line.clear(); const hx = sx - t * 420, hy = sy + t * 210; line.lineStyle(2, 0xffffff, 1 - t); line.lineBetween(hx, hy, hx + len * (1 - t * 0.5), hy - len * 0.5 * (1 - t * 0.5)); if (t >= 1) { line.destroy(); ev.remove(); } } });
  }
  flyby() { const y = this.H * (0.12 + Math.random() * 0.2); this.shipImg.setPosition(this.W + 500, y).setScale(0.32 + Math.random() * 0.2).setFlipX(false); this.tweens.add({ targets: this.shipImg, x: -500, duration: 22000, ease: 'Linear' }); }
  update(time: number, delta: number) {
    if (this.scene.isActive('world')) { this.scene.stop(); return; }
    const dt = delta / 1000; this.layers.forEach((l, i) => { l.tilePositionX += (i + 1) * 4 * dt; l.tilePositionY += (i + 1) * 0.6 * dt; });
    this.ringT += dt; this.planetImg.y = this.H * 0.8 + Math.sin(this.ringT * 0.3) * 6; this.planetImg.rotation = Math.sin(this.ringT * 0.08) * 0.03;
    const moon = this.children.getByName('moon') as Phaser.GameObjects.Image; const a = this.ringT * 0.12; moon.setPosition(this.planetImg.x + Math.cos(a) * this.planetImg.displayWidth * 0.55, this.planetImg.y + Math.sin(a) * this.planetImg.displayHeight * 0.22).setDepth(Math.sin(a) > 0 ? 2 : -1).setScale(Math.min(this.W, this.H) / 900);
    this.planetImg.setDepth(0);
    this.neb.rotation += dt * 0.004; this.neb2.rotation -= dt * 0.003;
    for (const o of this.glims) { const g = o.g; g.x += o.vx * dt; g.y += o.vy * dt; o.rot += o.vr * dt; g.c.setRotation(Math.sin(o.rot) * 0.6); g.c.setPosition(g.x, g.y);
      const minX = this.W * this.side; if (g.x < minX + 30 || g.x > this.W - 30) o.vx *= -1; if (g.y < 60 || g.y > this.H - 30) o.vy *= -1; g.update(time, dt); g.c.setDepth(5); }
  }
}
