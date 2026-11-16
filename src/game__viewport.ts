// Viewport guards + fullscreen.
// Mobile browsers (iOS Safari above all) zoom the page on a double-tap, a pinch, or when a text
// field smaller than 16px gets focus. Any of those shifts the visual viewport, which makes button
// hit-boxes land in the wrong place and leaves keyboard focus parked in a text field — and while a
// field holds focus, the movement keys are treated as typing and the player cannot walk.
// `user-scalable=no` has been ignored by iOS since iOS 10, so the guards have to be real listeners.

/** Blur a focused text field so the movement keys work again. */
export function blurField() {
  const el = document.activeElement as HTMLElement | null;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) el.blur();
}

const isField = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && !!el.closest && !!el.closest('input, textarea, [contenteditable=""], [contenteditable="true"]');
};

export function installViewportGuards() {
  // Pinch-zoom (iOS fires these non-standard gesture events).
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
    addEventListener(ev, e => e.preventDefault(), { passive: false });
  }
  // NOTE: deliberately no blanket preventDefault on multi-touch `touchmove`. Doing that breaks
  // two-thumb play — holding the joystick with one thumb and tapping an action button with the
  // other raises a 2-touch move, and cancelling it makes iOS drop the second touch's tap entirely.
  // Pinch-zoom is already handled by `touch-action: none` plus the gesture events above.

  // Double-tap zoom, but only a genuine one: the two taps must be in nearly the same spot AND not
  // on a control. Two quick taps on different buttons are normal play and must go through.
  let lastTap = 0, lastX = 0, lastY = 0;
  const interactive = (t: EventTarget | null) => {
    const el = t as HTMLElement | null;
    return !!el?.closest?.('button, a, input, textarea, select, label, [role="button"], [data-testid=joystick]');
  };
  addEventListener('touchend', e => {
    const t = (e as TouchEvent).changedTouches[0]; if (!t) return;
    const now = Date.now(), near = Math.hypot(t.clientX - lastX, t.clientY - lastY) < 40;
    if (now - lastTap < 320 && near && !isField(e.target) && !interactive(e.target)) e.preventDefault();
    lastTap = now; lastX = t.clientX; lastY = t.clientY;
  }, { passive: false });
  // Desktop: ctrl+wheel and ctrl+plus/minus/zero zoom.
  addEventListener('wheel', e => { if ((e as WheelEvent).ctrlKey) e.preventDefault(); }, { passive: false });
  addEventListener('keydown', e => {
    const k = e as KeyboardEvent;
    if ((k.ctrlKey || k.metaKey) && ['Equal', 'Minus', 'Digit0', 'NumpadAdd', 'NumpadSubtract', 'Numpad0'].includes(k.code)) k.preventDefault();
    // Escape always hands focus back to the game so movement keys keep working.
    if (k.code === 'Escape') blurField();
  }, { passive: false });
  // If the page ends up panned or zoomed anyway, snap it back when the gesture finishes.
  const vv = (window as any).visualViewport as VisualViewport | undefined;
  if (vv) {
    const settle = () => { if (vv.scale > 1.01 || vv.offsetTop > 1 || vv.offsetLeft > 1) { blurField(); scrollTo(0, 0); } };
    vv.addEventListener('resize', settle); vv.addEventListener('scroll', settle);
  }
  // A backgrounded tab can swallow the keyup, leaving a key stuck down.
  addEventListener('visibilitychange', () => { if (document.hidden) blurField(); });
}

// ────────────── fullscreen ──────────────
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> };

export const fullscreenSupported = () => {
  const el = document.documentElement as FsEl;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
};
export const isFullscreen = () => {
  const d = document as FsDoc;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
};
export async function setFullscreen(on: boolean) {
  const el = document.documentElement as FsEl, d = document as FsDoc;
  try {
    if (on && !isFullscreen()) await (el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen?.());
    else if (!on && isFullscreen()) await (d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.());
  } catch { /* the browser refused (iPhone Safari has no element fullscreen) — nothing to do */ }
}
export const toggleFullscreen = () => setFullscreen(!isFullscreen());
/** Subscribe to fullscreen changes; returns an unsubscribe function. */
export function onFullscreenChange(fn: () => void) {
  addEventListener('fullscreenchange', fn); addEventListener('webkitfullscreenchange', fn);
  return () => { removeEventListener('fullscreenchange', fn); removeEventListener('webkitfullscreenchange', fn); };
}
