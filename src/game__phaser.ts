import Phaser from 'phaser';
import { MenuScene } from './game__scenes__MenuScene';
import { WorldScene } from './game__scenes__WorldScene';
import { buildSheet, FW, FH, FRAMES, COLS } from './game__art__chars';
import type { Cosmetics } from './game__core__types';

export let game: Phaser.Game | null = null;
export let DPR = 1;

/** Extra resolution cut applied on top of the quality setting by the adaptive scaler below.
 *  1 = full, 0.6 = render 40% fewer pixels per axis. */
let adaptive = 1;
const MIN_ADAPTIVE = 0.55;

/** A tablet or phone renders the same scene with a fraction of a laptop's fill rate, so an iPad on
 *  "high" was being asked for ~4M pixels a frame (DPR 2 across a Retina screen) with a full-screen
 *  darkness layer over the top. Cap the ceiling on touch devices — they get sharpness from their
 *  small physical pixels anyway, which is exactly why the cost is invisible and the stutter is not. */
const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
export function computeDpr(q: string) {
  const ceiling = q === 'low' ? 1 : q === 'medium' ? 1.5 : (coarse ? 1.5 : 2);
  return Math.min(ceiling, window.devicePixelRatio || 1) * adaptive;
}

const px = () => ({ w: Math.max(320, Math.round(innerWidth * DPR)), h: Math.max(240, Math.round(innerHeight * DPR)) });
// `game.scale` does not exist until Phaser has booted, and is gone again after destroy — the
// adaptive loop below ticks regardless, so both ends have to be guarded.
function applyScale() { if (!game || !game.scale) return; const { w, h } = px(); game.scale.resize(w, h); game.scale.setZoom(1 / DPR); }

/** Watches real frame times and drops render resolution when the device cannot keep up (and eases
 *  back when it can). This is what keeps a mid-range iPad at a playable frame rate without the
 *  player having to find a settings menu — and without throwing away any gameplay. */
function startAdaptiveScaler(quality: () => string) {
  let last = performance.now(), acc = 0, n = 0, cooldown = 0;
  const tick = () => {
    const now = performance.now(), dt = now - last; last = now;
    requestAnimationFrame(tick);
    if (dt > 500) return;                       // tab was backgrounded; ignore the gap
    acc += dt; n++;
    if (n < 90) return;                          // judge on ~1.5s of frames, not one spike
    const avg = acc / n; acc = 0; n = 0;
    if (cooldown > 0) { cooldown--; return; }
    const before = adaptive;
    if (avg > 26 && adaptive > MIN_ADAPTIVE) adaptive = Math.max(MIN_ADAPTIVE, adaptive - 0.15);       // below ~38fps: shed pixels
    else if (avg < 15 && adaptive < 1) adaptive = Math.min(1, adaptive + 0.1);                          // comfortably above 60fps: take some back
    if (adaptive !== before) { DPR = computeDpr(quality()); applyScale(); cooldown = 2; }
  };
  requestAnimationFrame(tick);
}

export function initPhaser(parent: HTMLElement, quality: string) {
  DPR = computeDpr(quality);
  game = new Phaser.Game({
    type: Phaser.AUTO, parent, backgroundColor: '#060914', banner: false,
    scale: { mode: Phaser.Scale.NONE, width: Math.round(innerWidth * DPR), height: Math.round(innerHeight * DPR), zoom: 1 / DPR },
    // MSAA is a real per-pixel cost on mobile GPUs and buys little at the pixel densities a tablet
    // already has. Keep it for desktop, drop it where the fill rate is scarce.
    render: { antialias: !coarse, powerPreference: 'high-performance', roundPixels: false },
    // 5 pointers: a thumb on the stick plus several fingers on action buttons must all be live at
    // once. Phaser's default of 1 would make the canvas itself drop concurrent touches.
    input: { keyboard: true, gamepad: true, activePointers: 5 },
    fps: { target: 60, smoothStep: true, limit: +(new URLSearchParams(location.search).get('fps') || 0) || (quality === 'low' ? 30 : 0) },
    scene: [MenuScene, WorldScene],
  });
  const fit = () => applyScale();
  addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 200));
  (window as any).__game = game;
  startAdaptiveScaler(() => currentQuality);
  return game;
}
let currentQuality = 'high';
export function setQuality(q: string) { currentQuality = q; adaptive = 1; DPR = computeDpr(q); applyScale(); }
/** Current render scale, for diagnostics. */
export function renderScale() { return { dpr: +DPR.toFixed(2), adaptive: +adaptive.toFixed(2) }; }

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
