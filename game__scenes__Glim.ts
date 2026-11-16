// A character in the Phaser world: sprite-sheet body + pet + trail + name tag, animated by state.
import Phaser from 'phaser';
import { ANIMS, FW, FH, FOOT_X, FOOT_Y, drawPet } from './game__art__chars';
import { glimSheet, SHEET_SCALE } from './game__phaser';
import { COLORS } from './game__core__constants';
import type { Cosmetics } from './game__core__types';

const petTex = (scene: Phaser.Scene, id: string, color: string) => {
  const key = 'pet:' + id; if (scene.textures.exists(key)) return key;
  const S = 2, fw = 32 * S, fh = 40 * S, n = 8; const cv = document.createElement('canvas'); cv.width = fw * n; cv.height = fh; const c = cv.getContext('2d')!;
  for (let i = 0; i < n; i++) { c.save(); c.translate(i * fw + fw / 2, fh - 4 * S); c.scale(S, S); drawPet(c, id, i / n, color); c.restore(); }
  const tex = scene.textures.addCanvas(key, cv)!; for (let i = 0; i < n; i++) tex.add(String(i), 0, i * fw, 0, fw, fh); return key;
};
let dotKey = '';
const dot = (scene: Phaser.Scene) => { if (dotKey && scene.textures.exists(dotKey)) return dotKey; dotKey = 'fx:dot'; if (!scene.textures.exists(dotKey)) { const g = scene.make.graphics({}, false); g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 8); g.generateTexture(dotKey, 16, 16); g.destroy(); } return dotKey; };
const TRAIL: Record<string, { tint: number[]; scale: [number, number]; life: number; speed: number; grav: number; shape?: string }> = {
  sparkle: { tint: [0xfff3a0, 0xffffff, 0x9ff6ee], scale: [0.35, 0], life: 700, speed: 20, grav: -10 }, bubbles: { tint: [0x9fe8ff, 0xd6f6ff], scale: [0.3, 0.55], life: 900, speed: 12, grav: -40 },
  neon: { tint: [0x3ff0e0, 0xa77bff], scale: [0.45, 0.1], life: 1100, speed: 2, grav: 0 }, flame: { tint: [0xffb547, 0xff4d6d, 0xffe08a], scale: [0.45, 0], life: 550, speed: 25, grav: -60 },
  snow: { tint: [0xffffff, 0xdff3ff], scale: [0.3, 0.15], life: 1000, speed: 18, grav: 25 }, hearts: { tint: [0xff6fae, 0xff8b95], scale: [0.4, 0.1], life: 900, speed: 10, grav: -35 }, notes: { tint: [0xa77bff, 0x55b6ff, 0xffd23f], scale: [0.4, 0.15], life: 900, speed: 14, grav: -30 },
};

export class Glim {
  c: Phaser.GameObjects.Container; body: Phaser.GameObjects.Sprite; tag: Phaser.GameObjects.Text; pet?: Phaser.GameObjects.Sprite; trail?: Phaser.GameObjects.Particles.ParticleEmitter;
  cos!: Cosmetics; anim = 'idle'; t0 = 0; facing = 1; x = 0; y = 0; petX = 0; petY = 0; dead = false; ghost = false; moving = false; ring?: Phaser.GameObjects.Graphics;
  constructor(public scene: Phaser.Scene, cos: Cosmetics, public name: string, opts: { tagColor?: string } = {}) {
    this.c = scene.add.container(0, 0);
    this.body = scene.add.sprite(0, 0, glimSheet(scene, cos), '0').setOrigin(FOOT_X / FW, FOOT_Y / FH).setScale(1 / SHEET_SCALE);
    this.tag = scene.add.text(0, -84, name, { fontFamily: '"Exo 2", "Segoe UI", sans-serif', fontSize: '26px', fontStyle: '700', color: opts.tagColor || '#ffffff', stroke: '#060914', strokeThickness: 7 }).setOrigin(0.5, 1).setScale(0.48);
    this.c.add([this.body, this.tag]); this.setCos(cos);
  }
  setCos(cos: Cosmetics) {
    const prev = this.cos; this.cos = { ...cos }; this.body.setTexture(glimSheet(this.scene, cos), this.body.frame?.name || '0');
    if (!prev || prev.pet !== cos.pet) { this.pet?.destroy(); this.pet = undefined; if (cos.pet !== 'none') { this.pet = this.scene.add.sprite(this.x - 30, this.y, petTex(this.scene, cos.pet, COLORS[cos.color].light), '0').setOrigin(0.5, (40 * 2 - 8) / 80).setScale(0.5); this.petX = this.x - 30; this.petY = this.y; } }
    if (!prev || prev.trail !== cos.trail) { this.trail?.destroy(); this.trail = undefined; const T = TRAIL[cos.trail]; if (T) { this.trail = this.scene.add.particles(0, 0, dot(this.scene), { lifespan: T.life, speed: { min: T.speed * 0.3, max: T.speed }, gravityY: T.grav, scale: { start: T.scale[0], end: T.scale[1] }, alpha: { start: 0.9, end: 0 }, tint: T.tint, frequency: 70, quantity: 1, blendMode: 'ADD', emitting: false }); } }
  }
  setName(n: string, color?: string) { this.name = n; this.tag.setText(n); if (color) this.tag.setColor(color); }
  play(a: string, now: number) { if (a !== this.anim) { this.anim = a; this.t0 = now; } }
  setPos(x: number, y: number) { this.x = x; this.y = y; this.c.setPosition(x, y); }
  update(now: number, dt: number) {
    const A = ANIMS[this.anim] || ANIMS.idle; let i = Math.floor(((now - this.t0) / 1000) * A.fps); i = A.loop ? i % A.n : Math.min(A.n - 1, i);
    this.body.setFrame(String(A.start + i)); this.body.setFlipX(this.facing < 0);
    this.c.setDepth(this.y + (this.ghost ? 10000 : 0));
    if (this.pet) { const tx = this.x - this.facing * 34, ty = this.y + 4; const k = 1 - Math.exp(-dt * 4); this.petX += (tx - this.petX) * k; this.petY += (ty - this.petY) * k; this.pet.setPosition(this.petX, this.petY).setDepth(this.petY).setFlipX(this.facing < 0).setFrame(String(Math.floor(now / 110) % 8)); this.pet.setVisible(this.c.visible && !this.dead); this.pet.setAlpha(this.c.alpha); }
    if (this.trail) { this.trail.setPosition(this.x, this.y - 4); this.trail.setDepth(this.y - 1); const on = this.moving && this.c.visible && !this.dead && this.c.alpha > 0.5; if (on && !this.trail.emitting) this.trail.start(); else if (!on && this.trail.emitting) this.trail.stop(); }
  }
  setVisible(v: boolean) { this.c.setVisible(v); if (this.pet) this.pet.setVisible(v && !this.dead); }
  destroy() { this.c.destroy(); this.pet?.destroy(); this.trail?.destroy(); this.ring?.destroy(); }
}
