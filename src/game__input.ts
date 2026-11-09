// Unified input: keyboard, gamepad and on-screen touch controls write into one state object.
import { useApp } from './store__app';
export const input = { x: 0, y: 0, run: false, tx: 0, ty: 0, touch: false, pressed: new Set<string>() };
type Handler = (action: string) => void;
let handler: Handler = () => {};
export function onAction(h: Handler) { handler = h; }
export function fire(a: string) { handler(a); }
const held = new Set<string>();
const typing = () => { const el = document.activeElement as HTMLElement | null; return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable); };
addEventListener('keydown', e => {
  if (typing()) return; const k = useApp.getState().prefs.keys; held.add(e.code);
  if (e.code === 'Tab') e.preventDefault();
  if (e.repeat) return;
  const map: Record<string, string> = { [k.use]: 'use', Space: 'use', [k.kill]: 'kill', [k.report]: 'report', [k.ability]: 'ability', [k.vent]: 'vent', [k.sabotage]: 'sabotage', [k.map]: 'map', Escape: 'escape', Enter: 'chat', KeyT: 'chat', KeyC: 'cams' };
  const a = map[e.code]; if (a) handler(a);
});
addEventListener('keyup', e => held.delete(e.code));
addEventListener('blur', () => held.clear());
export function pollInput() {
  const k = useApp.getState().prefs.keys; let x = 0, y = 0;
  if (held.has(k.left) || held.has('ArrowLeft')) x -= 1; if (held.has(k.right) || held.has('ArrowRight')) x += 1; if (held.has(k.up) || held.has('ArrowUp')) y -= 1; if (held.has(k.down) || held.has('ArrowDown')) y += 1;
  let run = held.has('ShiftLeft') || held.has('ShiftRight');
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of pads) { if (!p) continue; const ax = p.axes[0] || 0, ay = p.axes[1] || 0; if (Math.hypot(ax, ay) > 0.2) { x += ax; y += ay; }
    const btn = (i: number) => p.buttons[i]?.pressed; const edge = (i: number, a: string) => { const id = p.index + ':' + i; if (btn(i)) { if (!input.pressed.has(id)) { input.pressed.add(id); handler(a); } } else input.pressed.delete(id); };
    edge(0, 'use'); edge(1, 'report'); edge(2, 'ability'); edge(3, 'kill'); edge(4, 'vent'); edge(5, 'sabotage'); edge(8, 'map'); edge(9, 'escape'); if (btn(6) || btn(7)) run = true; }
  if (input.touch && Math.hypot(input.tx, input.ty) > 0.1) { x = input.tx; y = input.ty; run = run || Math.hypot(input.tx, input.ty) > 0.95; }
  input.x = x; input.y = y; input.run = run; return input;
}
