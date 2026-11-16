// All sound is synthesised at runtime with WebAudio (no third-party audio assets).
type Bus = 'sfx' | 'music' | 'amb' | 'ui';
class AudioEngine {
  ctx: AudioContext | null = null; master!: GainNode; bus = {} as Record<Bus, GainNode>; noiseBuf!: AudioBuffer;
  vol = { master: 0.8, sfx: 0.9, music: 0.55, amb: 0.6, ui: 0.7 };
  private ambNodes: AudioNode[] = []; private musicTimer: any = null; private alarmTimer: any = null; private lastStep = 0; private musicMode = '';
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; }
    try { this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
    const c = this.ctx; this.master = c.createGain(); this.master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(this.master);
    for (const b of ['sfx', 'music', 'amb', 'ui'] as Bus[]) { const g = c.createGain(); g.connect(comp); this.bus[b] = g; }
    const len = c.sampleRate * 2; this.noiseBuf = c.createBuffer(1, len, c.sampleRate); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.apply(); return c;
  }
  setVol(v: Partial<typeof this.vol>) { Object.assign(this.vol, v); this.apply(); }
  apply() { if (!this.ctx) return; this.master.gain.value = this.vol.master; (Object.keys(this.bus) as Bus[]).forEach(b => this.bus[b].gain.value = (this.vol as any)[b]); }
  private osc(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, bus: Bus = 'sfx', delay = 0, attack = 0.005) {
    const c = this.ensure(); if (!c) return; const t = c.currentTime + delay; const o = c.createOscillator(), g = c.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.bus[bus]); o.start(t); o.stop(t + dur + 0.05);
  }
  private noise(dur: number, vol: number, f: number, q = 1, type: BiquadFilterType = 'bandpass', bus: Bus = 'sfx', delay = 0, f1?: number) {
    const c = this.ensure(); if (!c) return; const t = c.currentTime + delay; const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur); fl.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.bus[bus]); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  play(name: string) {
    switch (name) {
      case 'hover': this.osc('sine', 1400, 1700, 0.05, 0.05, 'ui'); break;
      case 'click': this.osc('triangle', 600, 900, 0.07, 0.12, 'ui'); this.osc('sine', 1800, 1800, 0.04, 0.04, 'ui', 0.02); break;
      case 'back': this.osc('triangle', 700, 420, 0.09, 0.1, 'ui'); break;
      case 'open': this.osc('sine', 300, 900, 0.18, 0.09, 'ui'); this.noise(0.15, 0.03, 2000, 2, 'highpass', 'ui'); break;
      case 'close': this.osc('sine', 800, 280, 0.16, 0.08, 'ui'); break;
      case 'toggle': this.osc('square', 900, 900, 0.03, 0.04, 'ui'); break;
      case 'type': this.osc('square', 1500 + Math.random() * 400, 1500, 0.02, 0.025, 'ui'); break;
      case 'step': this.noise(0.05, 0.05, 900 + Math.random() * 300, 3); this.osc('sine', 120, 80, 0.05, 0.05); break;
      case 'step_snow': this.noise(0.09, 0.07, 3000, 0.8, 'highpass'); break;
      case 'step_water': this.noise(0.12, 0.06, 700, 2, 'bandpass', 'sfx', 0, 1600); break;
      case 'step_sand': this.noise(0.08, 0.05, 2400, 1); break;
      case 'task_step': this.osc('sine', 880, 1320, 0.12, 0.12); break;
      case 'task_done': [523, 659, 784, 1047].forEach((f, i) => this.osc('triangle', f, f, 0.22, 0.12, 'sfx', i * 0.07)); break;
      case 'task_fail': this.osc('sawtooth', 220, 140, 0.25, 0.08); break;
      case 'kill': this.noise(0.35, 0.3, 4000, 0.7, 'highpass'); this.osc('square', 300, 60, 0.35, 0.18); for (let i = 0; i < 6; i++) this.osc('sine', 2500 + Math.random() * 2500, 1800, 0.12, 0.05, 'sfx', 0.05 + i * 0.03); break;
      case 'death': this.osc('sine', 660, 110, 1.1, 0.2); this.osc('triangle', 990, 165, 1.1, 0.08, 'sfx', 0.05); break;
      case 'report': this.osc('square', 880, 880, 0.12, 0.12); this.osc('square', 660, 660, 0.12, 0.12, 'sfx', 0.14); this.osc('square', 880, 880, 0.3, 0.12, 'sfx', 0.28); break;
      case 'emergency': for (let i = 0; i < 3; i++) { this.osc('sawtooth', 500, 900, 0.25, 0.12, 'sfx', i * 0.3); } break;
      case 'meeting': this.osc('sine', 110, 110, 1.6, 0.25); this.osc('sine', 220, 220, 1.4, 0.12, 'sfx', 0.02); this.osc('triangle', 330, 330, 1.2, 0.06, 'sfx', 0.04); break;
      case 'vote': this.osc('triangle', 660, 990, 0.12, 0.14); break;
      case 'reveal': this.osc('sine', 300, 300, 0.4, 0.12); this.noise(0.4, 0.05, 600, 1, 'lowpass'); break;
      case 'eject': this.noise(1.4, 0.18, 400, 0.6, 'lowpass', 'sfx', 0, 3000); this.osc('sine', 200, 50, 1.4, 0.12); break;
      case 'door': this.noise(0.35, 0.12, 1200, 1, 'bandpass', 'sfx', 0, 300); this.osc('square', 90, 60, 0.12, 0.1, 'sfx', 0.3); break;
      case 'vent': this.osc('square', 140, 70, 0.15, 0.12); this.noise(0.2, 0.1, 500, 2); this.osc('square', 180, 90, 0.12, 0.08, 'sfx', 0.12); break;
      case 'ability': [700, 1050, 1400].forEach((f, i) => this.osc('sine', f, f * 1.5, 0.3, 0.07, 'sfx', i * 0.05)); this.noise(0.3, 0.03, 6000, 1, 'highpass'); break;
      case 'shield': this.osc('sine', 400, 1200, 0.5, 0.12); this.osc('sine', 600, 1800, 0.5, 0.06, 'sfx', 0.05); break;
      case 'block': this.osc('square', 1200, 300, 0.2, 0.12); this.noise(0.15, 0.1, 3000, 2); break;
      case 'sabotage': this.osc('sawtooth', 300, 120, 0.5, 0.12); this.osc('sawtooth', 310, 125, 0.5, 0.08); break;
      case 'fixed': [784, 988, 1175].forEach((f, i) => this.osc('sine', f, f, 0.25, 0.1, 'sfx', i * 0.06)); break;
      case 'alert': this.osc('square', 1000, 1000, 0.08, 0.08); this.osc('square', 1300, 1300, 0.08, 0.08, 'sfx', 0.1); break;
      case 'role': this.osc('sine', 220, 220, 2.2, 0.2); this.osc('sine', 330, 330, 2, 0.1, 'sfx', 0.3); this.osc('sine', 440, 440, 1.8, 0.06, 'sfx', 0.6); this.noise(2, 0.05, 300, 1, 'lowpass'); break;
      case 'chat': this.osc('sine', 1200, 1500, 0.06, 0.06, 'ui'); break;
      case 'join': this.osc('triangle', 500, 750, 0.12, 0.1, 'ui'); this.osc('triangle', 750, 1000, 0.12, 0.08, 'ui', 0.1); break;
      case 'leave': this.osc('triangle', 750, 500, 0.12, 0.1, 'ui'); this.osc('triangle', 500, 350, 0.12, 0.08, 'ui', 0.1); break;
      case 'countdown': this.osc('sine', 880, 880, 0.08, 0.1, 'ui'); break;
      case 'trap': this.osc('square', 200, 100, 0.2, 0.12); this.noise(0.2, 0.1, 800, 3); break;
      case 'win': this.stinger(true); break;
      case 'lose': this.stinger(false); break;
    }
  }
  stinger(win: boolean) { const n = win ? [523, 659, 784, 1047, 1319] : [440, 392, 349, 294, 220]; n.forEach((f, i) => { this.osc('triangle', f, f, 0.6, 0.12, 'music', i * 0.16); this.osc('sine', f / 2, f / 2, 0.8, 0.08, 'music', i * 0.16); }); }
  stepSurface = 'metal';
  footstep() { const now = performance.now(); if (now - this.lastStep < 260) return; this.lastStep = now; this.play(this.stepSurface === 'metal' ? 'step' : 'step_' + this.stepSurface); }
  /** Looping ambience bed for a map theme. */
  ambience(theme: string | null) {
    this.ambNodes.forEach(n => { try { (n as any).stop?.(); n.disconnect(); } catch { } }); this.ambNodes = []; if (!theme) return;
    const c = this.ensure(); if (!c) return;
    const P: Record<string, [number, number, number]> = { orbital: [55, 400, 0.05], frostfall: [48, 2500, 0.06], abyssal: [41, 250, 0.07], colony: [62, 1800, 0.05], helios: [50, 600, 0.06], lobby: [65, 500, 0.035], menu: [52, 300, 0.03] };
    const [hum, nf, nv] = P[theme] || P.orbital;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = hum; const og = c.createGain(); og.gain.value = 0.05; o.connect(og); og.connect(this.bus.amb); o.start();
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = hum * 1.502; const og2 = c.createGain(); og2.gain.value = 0.018; o2.connect(og2); og2.connect(this.bus.amb); o2.start();
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 0.02; lfo.connect(lg); lg.connect(og.gain); lfo.start();
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = c.createBiquadFilter(); f.type = theme === 'frostfall' || theme === 'colony' ? 'bandpass' : 'lowpass'; f.frequency.value = nf; f.Q.value = 0.5;
    const ng = c.createGain(); ng.gain.value = nv; s.connect(f); f.connect(ng); ng.connect(this.bus.amb); s.start();
    const lfo2 = c.createOscillator(); lfo2.frequency.value = theme === 'frostfall' || theme === 'colony' ? 0.15 : 0.05; const lg2 = c.createGain(); lg2.gain.value = nv * 0.6; lfo2.connect(lg2); lg2.connect(ng.gain); lfo2.start();
    this.ambNodes = [o, o2, lfo, s, lfo2, og, og2, ng, f, lg, lg2];
  }
  /** Generative ambient music: slow pad chords (menu / lobby / tense). */
  music(mode: 'menu' | 'lobby' | 'tense' | 'meeting' | null) {
    if (mode === this.musicMode) return; this.musicMode = mode || ''; clearInterval(this.musicTimer); if (!mode) return;
    const prog: Record<string, number[][]> = { menu: [[220, 277, 330, 415], [196, 247, 294, 370], [174, 220, 262, 330], [196, 247, 294, 349]], lobby: [[262, 330, 392, 494], [220, 277, 330, 415], [247, 311, 370, 466], [196, 247, 294, 370]],
      tense: [[110, 131, 165], [104, 131, 156], [110, 131, 165], [98, 123, 147]], meeting: [[147, 175, 220], [139, 165, 208], [131, 156, 196], [139, 175, 208]] };
    let i = 0; const bar = mode === 'tense' ? 4.5 : 3.6;
    const tick = () => { const ch = prog[mode][i++ % 4]; ch.forEach((f, k) => this.osc(k === 0 ? 'triangle' : 'sine', f, f, bar * 1.1, mode === 'tense' ? 0.035 : 0.03, 'music', k * 0.04, 0.8));
      if (mode !== 'tense') { const arp = ch[(i * 3) % ch.length] * 2; for (let j = 0; j < 4; j++) this.osc('sine', arp * (j % 2 ? 1.5 : 1), arp, 0.4, 0.012, 'music', j * bar / 4); }
      else this.osc('sine', ch[0] / 2, ch[0] / 2, 0.3, 0.06, 'music', 0, 0.01); };
    tick(); this.musicTimer = setInterval(tick, bar * 1000);
  }
  alarm(on: boolean) { clearInterval(this.alarmTimer); this.alarmTimer = null; if (on) { const f = () => { this.osc('sawtooth', 520, 820, 0.45, 0.06); this.osc('sawtooth', 820, 520, 0.45, 0.06, 'sfx', 0.5); }; f(); this.alarmTimer = setInterval(f, 1000); } }
}
export const audio = new AudioEngine();
export const sfx = (n: string) => audio.play(n);
