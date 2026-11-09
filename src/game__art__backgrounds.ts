// "Outside" textures for each theme: what you see through windows and in the void between rooms.
import { starfield, nebula, planet, rnd } from './game__art__space';
const cv = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export function bgTexture(kind: string): HTMLCanvasElement {
  const S = 1024; const c = cv(S, S), x = c.getContext('2d')!; const R = rnd(kind.length * 77);
  if (kind === 'space' || kind === 'lounge' || kind === 'warp') {
    const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, kind === 'warp' ? '#0a0610' : '#060a1c'); g.addColorStop(1, kind === 'warp' ? '#160810' : '#0d0a26'); x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.drawImage(nebula(S, S, 5, kind === 'warp' ? ['#ff4d6d', '#ff8a2a', '#5a2a8a'] : ['#3ff0e0', '#a77bff', '#3c5cf0']), 0, 0); x.drawImage(starfield(S, S, 420, 11, 1.8), 0, 0);
    if (kind === 'warp') { x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 120; i++) { const px = R() * S, py = R() * S, l = 30 + R() * 140; const gg = x.createLinearGradient(px, 0, px + l, 0); gg.addColorStop(0, 'rgba(255,220,220,0)'); gg.addColorStop(1, `rgba(255,${180 + R() * 70},${180 + R() * 70},${0.3 + R() * 0.5})`); x.fillStyle = gg; x.fillRect(px, py, l, 1.2); } }
  } else if (kind === 'ocean') {
    const g = x.createLinearGradient(0, 0, 0, S); g.addColorStop(0, '#04202c'); g.addColorStop(1, '#021018'); x.fillStyle = g; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(150,255,230,${0.05 + R() * 0.2})`; x.beginPath(); x.arc(R() * S, R() * S, 0.6 + R() * 1.6, 0, 6.28); x.fill(); }
    for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(20,70,80,${0.3 + R() * 0.3})`; x.beginPath(); x.ellipse(R() * S, R() * S, 30 + R() * 90, 10 + R() * 30, R() * 3, 0, 6.28); x.fill(); }
    for (let i = 0; i < 30; i++) { const px = R() * S, py = R() * S; x.strokeStyle = `rgba(80,${150 + R() * 100},140,0.35)`; x.lineWidth = 3; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 10, py - 30, px - 6, py - 60 - R() * 40); x.stroke(); }
  } else if (kind === 'ice') {
    const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#16233a'); g.addColorStop(1, '#0c1626'); x.fillStyle = g; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(${120 + R() * 60},${170 + R() * 60},255,${0.06 + R() * 0.12})`; x.beginPath(); const px = R() * S, py = R() * S; x.moveTo(px, py); for (let k = 0; k < 6; k++) x.lineTo(px + (R() - 0.5) * 120, py + (R() - 0.5) * 120); x.closePath(); x.fill(); }
    x.strokeStyle = 'rgba(180,230,255,0.25)'; x.lineWidth = 1.5; for (let i = 0; i < 50; i++) { x.beginPath(); let px = R() * S, py = R() * S; x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (R() - 0.5) * 70; py += (R() - 0.5) * 70; x.lineTo(px, py); } x.stroke(); }
    for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(255,255,255,${0.2 + R() * 0.6})`; x.fillRect(R() * S, R() * S, 1.5, 1.5); }
  } else if (kind === 'desert') {
    x.fillStyle = '#c8955e'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 70; i++) { const px = R() * S, py = R() * S; const gg = x.createRadialGradient(px, py, 2, px, py, 60 + R() * 100); gg.addColorStop(0, R() > 0.5 ? 'rgba(235,190,130,0.5)' : 'rgba(160,100,60,0.35)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gg; x.fillRect(px - 160, py - 160, 320, 320); }
    x.strokeStyle = 'rgba(140,90,50,0.35)'; x.lineWidth = 2; for (let i = 0; i < 90; i++) { const px = R() * S, py = R() * S; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 30, py - 8, px + 60 + R() * 40, py); x.stroke(); }
    for (let i = 0; i < 70; i++) { const px = R() * S, py = R() * S, r = 4 + R() * 12; x.fillStyle = '#8a6a4a'; x.beginPath(); x.ellipse(px, py, r, r * 0.7, 0, 0, 6.28); x.fill(); x.fillStyle = '#a8845e'; x.beginPath(); x.ellipse(px - r * 0.2, py - r * 0.25, r * 0.6, r * 0.35, 0, 0, 6.28); x.fill(); }
    for (let i = 0; i < 25; i++) { const px = R() * S, py = R() * S; x.fillStyle = ['#a77bff', '#5fd08a', '#ff8fd0'][i % 3]; for (let k = 0; k < 5; k++) { x.beginPath(); x.ellipse(px + Math.cos(k) * 6, py + Math.sin(k) * 4, 4, 9, k, 0, 6.28); x.fill(); } }
  }
  return c;
}
export function bgPlanet(kind: string) {
  if (kind === 'space') return planet(700, { base: '#5b4fd1', dark: '#1a1250', light: '#c5b8ff', atmo: '#8f7bff', ring: '#d9c8ff', bands: true, seed: 4 });
  if (kind === 'lounge') return planet(520, { base: '#e8945a', dark: '#5a2410', light: '#ffd9b0', atmo: '#ffb070', bands: true, seed: 8 });
  if (kind === 'warp') return planet(380, { base: '#c0304a', dark: '#3a0810', light: '#ff9aa8', atmo: '#ff4d6d', craters: true, seed: 3 });
  return null;
}
