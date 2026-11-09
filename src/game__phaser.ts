import Phaser from 'phaser';
import { MenuScene } from './game__scenes__MenuScene';
import { WorldScene } from './game__scenes__WorldScene';
import { buildSheet, FW, FH, FRAMES, COLS } from './game__art__chars';
import type { Cosmetics } from './game__core__types';

export let game: Phaser.Game | null = null;
export let DPR = 1;
export function computeDpr(q: string) { return q === 'low' ? 1 : Math.min(q === 'medium' ? 1.5 : 2, window.devicePixelRatio || 1); }

export function initPhaser(parent: HTMLElement, quality: string) {
  DPR = computeDpr(quality);
  game = new Phaser.Game({
    type: Phaser.AUTO, parent, backgroundColor: '#060914', banner: false,
    scale: { mode: Phaser.Scale.NONE, width: Math.round(innerWidth * DPR), height: Math.round(innerHeight * DPR), zoom: 1 / DPR },
    render: { antialias: true, powerPreference: 'high-performance', roundPixels: false },
    input: { keyboard: true, gamepad: true, activePointers: 3 }, fps: { target: 60, smoothStep: true, limit: +(new URLSearchParams(location.search).get('fps') || 0) || (quality === 'low' ? 30 : 0) },
    scene: [MenuScene, WorldScene],
  });
  const fit = () => { if (!game) return; game.scale.resize(Math.round(innerWidth * DPR), Math.round(innerHeight * DPR)); game.scale.setZoom(1 / DPR); };
  addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 200));
  (window as any).__game = game;
  return game;
}
export function setQuality(q: string) { DPR = computeDpr(q); if (game) { game.scale.resize(Math.round(innerWidth * DPR), Math.round(innerHeight * DPR)); game.scale.setZoom(1 / DPR); } }

/** Put a canvas into the texture manager (replacing an existing key). */
export function canvasTex(scene: Phaser.Scene, key: string, c: HTMLCanvasElement) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  return scene.textures.addCanvas(key, c)!;
}
/** Sprite sheet for a cosmetics set, cached by its JSON key. Frames are named 0..FRAMES-1. */
export const SHEET_SCALE = 1.5;
export function glimSheet(scene: Phaser.Scene, cos: Cosmetics): string {
  const key = 'glim:' + [cos.color, cos.helmet, cos.hat, cos.outfit, cos.backpack, cos.accessory, cos.victory].join('|');
  if (scene.textures.exists(key)) return key;
  const cv = buildSheet(cos, SHEET_SCALE); const tex = scene.textures.addCanvas(key, cv)!;
  const fw = Math.ceil(FW * SHEET_SCALE), fh = Math.ceil(FH * SHEET_SCALE);
  for (let f = 0; f < FRAMES; f++) tex.add(String(f), 0, (f % COLS) * fw, Math.floor(f / COLS) * fh, fw, fh);
  return key;
}
