import React, { useEffect, useRef } from 'react';
import { drawGlim, poseFor, ANIMS, drawPet } from './game__art__chars';
import type { Cosmetics } from './game__core__types';

const TRAIL_COL: Record<string, string[]> = { sparkle: ['#fff3a0', '#ffffff', '#9ff6ee'], bubbles: ['#9fe8ff', '#d6f6ff'], neon: ['#3ff0e0', '#a77bff'], flame: ['#ffb547', '#ff4d6d', '#ffe08a'], snow: ['#ffffff', '#dff3ff'], hearts: ['#ff6fae', '#ff8b95'], notes: ['#a77bff', '#55b6ff', '#ffd23f'] };

/** Live animated character preview (no Phaser needed). anim cycles through the given list. */
export function GlimCanvas({ cos, size = 260, anims = ['idle'], cycle = 0, walkInPlace, className = '', showPet = true, eye }: { cos: Cosmetics; size?: number; anims?: string[]; cycle?: number; walkInPlace?: boolean; className?: string; showPet?: boolean; eye?: any }) {
  const ref = useRef<HTMLCanvasElement>(null); const cosRef = useRef(cos); cosRef.current = cos;
  useEffect(() => {
    const cv = ref.current!; const dpr = Math.min(2, devicePixelRatio || 1); cv.width = size * dpr; cv.height = size * dpr; const c = cv.getContext('2d')!; let raf = 0; const t0 = performance.now();
    const parts: { x: number; y: number; vx: number; vy: number; life: number; col: string }[] = [];
    const loop = (now: number) => {
      const t = (now - t0) / 1000; const cs = cosRef.current; const ai = cycle ? Math.floor(t / cycle) % anims.length : 0; const an = anims[ai]; const A = ANIMS[an] || ANIMS.idle;
      const local = cycle ? t % cycle : t; let f = Math.floor(local * A.fps); f = A.loop ? f % A.n : Math.min(A.n - 1, f);
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      const s = (size / 110) * dpr; c.setTransform(s, 0, 0, s, cv.width / 2, cv.height * 0.84);
      // floor glow
      const g = c.createRadialGradient(0, 2, 2, 0, 2, 46); g.addColorStop(0, 'rgba(63,240,224,0.35)'); g.addColorStop(1, 'rgba(63,240,224,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(0, 2, 46, 11, 0, 0, 6.3); c.fill();
      // trail particles
      const T = TRAIL_COL[cs.trail]; if (T && (an === 'walk' || an === 'run' || walkInPlace)) { if (Math.random() < 0.5) parts.push({ x: -10 + Math.random() * 6, y: -6 - Math.random() * 6, vx: -20 - Math.random() * 20, vy: (cs.trail === 'snow' ? 10 : -15) - Math.random() * 10, life: 1, col: T[Math.floor(Math.random() * T.length)] }); }
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx / 60; p.y += p.vy / 60; p.life -= 1 / 50; if (p.life <= 0) { parts.splice(i, 1); continue; } c.globalAlpha = p.life; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, 2.2 * p.life + 0.6, 0, 6.3); c.fill(); }
      c.globalAlpha = 1;
      if (showPet && cs.pet !== 'none') { c.save(); c.translate(-38, 4); drawPet(c, cs.pet, (t * 1.2) % 1); c.restore(); }
      const p = poseFor(A.start + f, cs.victory); if (eye) p.eye = eye; drawGlim(c, cs, p);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [size, anims.join(), cycle, walkInPlace, showPet, eye]);
  return <canvas ref={ref} className={className} style={{ width: size, height: size }} />;
}

const thumbCache = new Map<string, string>();
/** Static thumbnail of a cosmetic item on a character (or a pet / trail icon). */
export function thumb(cos: Cosmetics, slot: string, size = 84): string {
  const key = slot + JSON.stringify(cos) + size; const hit = thumbCache.get(key); if (hit) return hit;
  const cv = document.createElement('canvas'); cv.width = cv.height = size * 2; const c = cv.getContext('2d')!;
  if (slot === 'pet') { c.setTransform(4.4, 0, 0, 4.4, size, size * 1.7); if (cos.pet === 'none') { c.strokeStyle = '#4a5a8a'; c.lineWidth = 2; c.beginPath(); c.arc(0, -10, 9, 0, 6.3); c.moveTo(-6, -4); c.lineTo(6, -16); c.stroke(); } else drawPet(c, cos.pet, 0.25); }
  else if (slot === 'trail') { const T = TRAIL_COL[cos.trail]; c.setTransform(1, 0, 0, 1, 0, 0); if (!T) { c.strokeStyle = '#4a5a8a'; c.lineWidth = 4; c.beginPath(); c.arc(size, size, 30, 0, 6.3); c.moveTo(size - 20, size + 20); c.lineTo(size + 20, size - 20); c.stroke(); } else for (let i = 0; i < 22; i++) { const k = i / 22; c.globalAlpha = 0.25 + k * 0.75; c.fillStyle = T[i % T.length]; c.beginPath(); c.arc(size * 0.3 + k * size * 1.3, size + Math.sin(k * 9) * 22, 3 + k * 9, 0, 6.3); c.fill(); } }
  else { const zoomHead = ['hat', 'helmet', 'accessory'].includes(slot); const s = zoomHead ? 3.6 : 2.15; c.setTransform(s, 0, 0, s, size, zoomHead ? size * 2.5 : size * 1.82); const p = poseFor(slot === 'victory' ? 35 : 0, cos.victory); drawGlim(c, cos, p); }
  const url = cv.toDataURL(); thumbCache.set(key, url); return url;
}
