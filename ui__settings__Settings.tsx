import React, { useEffect, useState } from 'react';
import { useApp, Prefs } from './store__app';
import { Panel, ScreenHeader, Seg, Slider, Toggle, Btn } from './ui__common__kit';
import { setQuality } from './game__phaser';
import { sfx } from './game__audio__audio';
import { fullscreenSupported, isFullscreen, onFullscreenChange, setFullscreen } from './game__viewport';

const KEY_LABELS: [keyof Prefs['keys'], string][] = [['up', 'Move up'], ['down', 'Move down'], ['left', 'Move left'], ['right', 'Move right'], ['use', 'Use / interact'], ['kill', 'Eliminate'], ['report', 'Report body'], ['ability', 'Role ability'], ['vent', 'Vent'], ['sabotage', 'Sabotage map'], ['map', 'Map']];
const pretty = (code: string) => code.replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', '↑').replace('Space', 'Space');

export function SettingsBody() {
  const { prefs, setPrefs } = useApp(); const [bind, setBind] = useState<keyof Prefs['keys'] | null>(null);
  const [fs, setFs] = useState(isFullscreen());
  useEffect(() => onFullscreenChange(() => setFs(isFullscreen())), []);
  useEffect(() => { if (!bind) return; const h = (e: KeyboardEvent) => { e.preventDefault(); if (e.code !== 'Escape') { setPrefs({ keys: { ...prefs.keys, [bind]: e.code } }); sfx('toggle'); } setBind(null); }; addEventListener('keydown', h, { once: true }); return () => removeEventListener('keydown', h); }, [bind]);
  const pct = (v: number) => Math.round(v * 100) + '%';
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Panel title="Graphics">
        <Seg label="Quality" value={prefs.quality} onChange={q => { setPrefs({ quality: q }); setQuality(q); }} options={[{ v: 'low', l: 'Low' }, { v: 'medium', l: 'Medium' }, { v: 'high', l: 'High' }]} />
        <Toggle label="Particles & weather" value={prefs.particles} onChange={v => setPrefs({ particles: v })} />
        <Toggle label="Screen shake" value={prefs.shake} onChange={v => setPrefs({ shake: v })} />
        {fullscreenSupported() && <Toggle label="Fullscreen" value={fs} onChange={v => { setFullscreen(v); sfx('toggle'); }} hint="Hides the browser bars. F11 works too on desktop." />}
      </Panel>
      <Panel title="Sound & Music">
        <Slider label="Master" value={prefs.master} min={0} max={1} step={0.05} fmt={pct} onChange={v => setPrefs({ master: v })} />
        <Slider label="Effects" value={prefs.sfx} min={0} max={1} step={0.05} fmt={pct} onChange={v => setPrefs({ sfx: v })} />
        <Slider label="Music" value={prefs.music} min={0} max={1} step={0.05} fmt={pct} onChange={v => setPrefs({ music: v })} />
        <Slider label="Ambience" value={prefs.amb} min={0} max={1} step={0.05} fmt={pct} onChange={v => setPrefs({ amb: v })} />
        <Slider label="Interface" value={prefs.ui} min={0} max={1} step={0.05} fmt={pct} onChange={v => setPrefs({ ui: v })} />
      </Panel>
      <Panel title="Camera & Interface">
        <Slider label="Default zoom" value={prefs.zoom} min={0.7} max={1.5} step={0.05} fmt={v => v.toFixed(2) + '×'} onChange={v => setPrefs({ zoom: v })} />
        <Slider label="Camera smoothing" value={prefs.camSmooth} min={0.04} max={0.4} step={0.02} fmt={v => v < 0.1 ? 'Soft' : v < 0.25 ? 'Medium' : 'Snappy'} onChange={v => setPrefs({ camSmooth: v })} />
        <Slider label="Interface scale" value={prefs.uiScale} min={0.8} max={1.3} step={0.05} fmt={v => Math.round(v * 100) + '%'} onChange={v => setPrefs({ uiScale: v })} />
      </Panel>
      <Panel title="Accessibility">
        <Toggle label="Show color names on players" value={prefs.colorNames} onChange={v => setPrefs({ colorNames: v })} hint="Adds the suit color under each name tag (color-blind friendly)" />
        <Toggle label="High-contrast panels" value={prefs.highContrast} onChange={v => setPrefs({ highContrast: v })} />
        <Toggle label="Reduced motion" value={prefs.reducedMotion} onChange={v => setPrefs({ reducedMotion: v })} />
      </Panel>
      <Panel title="Controls" className="md:col-span-2 xl:col-span-2">
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {KEY_LABELS.map(([k, l]) => (
            <div key={k} className="flex items-center justify-between py-1"><span className="text-[14px] text-ink/90">{l}</span>
              <button onClick={() => { sfx('click'); setBind(k); }} className={`pe min-w-[72px] rounded-lg border px-3 py-1 font-display text-[13px] ${bind === k ? 'border-amber bg-amber/20 text-amber anim-blink' : 'border-edge bg-void/60 text-cyan hover:border-cyan/60'}`}>{bind === k ? 'press…' : pretty(prefs.keys[k])}</button></div>
          ))}
        </div>
        <div className="mt-2 text-[12.5px] text-mist">Arrow keys always move too. Mouse: click objects to use them · wheel / pinch to zoom · Gamepad: left stick move, A use, X ability, B report, Y kill. Touch: on-screen joystick and buttons appear automatically.</div>
      </Panel>
      <Panel title="Network">
        <div className="mb-1 text-[13px] text-mist">Signalling server for room codes (blank = PeerJS public cloud). Format <code className="text-cyan">host:port/path</code>.</div>
        <input className="field mb-2 w-full" placeholder="0.peerjs.com" value={prefs.signal} onChange={e => setPrefs({ signal: e.target.value.trim() })} />
        <div className="mb-1 text-[13px] text-mist">Optional TURN relay (for strict networks): <code className="text-cyan">turn:host:port|user|pass</code></div>
        <input className="field w-full" placeholder="turn:relay.example.com:3478|user|secret" value={prefs.turn} onChange={e => setPrefs({ turn: e.target.value.trim() })} />
      </Panel>
    </div>
  );
}
export function SettingsScreen() {
  const go = useApp(s => s.go), prev = useApp(s => s.prev);
  return <div className="pe absolute inset-0 scroll-y px-[max(16px,4vw)] py-6"><ScreenHeader title="Settings" sub="Saved automatically on this device" onBack={() => go(prev === 'lobby' ? 'lobby' : 'menu')} /><SettingsBody /><div className="h-8" /></div>;
}
