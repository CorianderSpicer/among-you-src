import { create } from 'zustand';
import type { Profile, Settings } from './game__core__types';
import { DEFAULT_SETTINGS } from './game__core__constants';
import { audio } from './game__audio__audio';

export type Screen = 'menu' | 'create' | 'find' | 'lobby' | 'game' | 'customize' | 'settings' | 'credits' | 'replay';
export interface Prefs {
  quality: 'low' | 'medium' | 'high'; particles: boolean; shake: boolean; reducedMotion: boolean; colorNames: boolean; highContrast: boolean;
  uiScale: number; zoom: number; camSmooth: number; master: number; sfx: number; music: number; amb: number; ui: number;
  keys: { up: string; down: string; left: string; right: string; use: string; kill: string; report: string; ability: string; map: string; sabotage: string; vent: string };
  signal: string; turn: string; lastCode: string; recent: string[];
}
const DEFAULT_PREFS: Prefs = {
  quality: 'high', particles: true, shake: true, reducedMotion: false, colorNames: false, highContrast: false, uiScale: 1, zoom: 1, camSmooth: 0.12,
  master: 0.8, sfx: 0.9, music: 0.5, amb: 0.6, ui: 0.7,
  keys: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', use: 'KeyE', kill: 'KeyQ', report: 'KeyR', ability: 'KeyF', map: 'Tab', sabotage: 'KeyG', vent: 'KeyV' },
  signal: '', turn: '', lastCode: '', recent: [],
};
const NAMES = ['Nova', 'Orbit', 'Pixel', 'Comet', 'Juno', 'Echo', 'Bolt', 'Luma', 'Zephyr', 'Kepler', 'Mochi', 'Rocket', 'Vega', 'Astra', 'Quark'];
const DEFAULT_PROFILE = (): Profile => ({ name: NAMES[Math.floor(Math.random() * NAMES.length)], cos: { color: Math.floor(Math.random() * 18), helmet: 'bubble', hat: 'none', outfit: 'none', backpack: 'tank', pet: 'none', trail: 'none', accessory: 'none', victory: 'jump' } });

const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? { ...d, ...JSON.parse(v) } : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };

export interface Toast { id: number; text: string; kind: 'info' | 'ok' | 'warn' | 'error' }
interface AppState {
  screen: Screen; prev: Screen; profile: Profile; prefs: Prefs; settings: Settings; toasts: Toast[]; loading: string | null;
  go: (s: Screen) => void; setProfile: (p: Partial<Profile>) => void; setPrefs: (p: Partial<Prefs>) => void; setSettings: (s: Partial<Settings>) => void;
  toast: (text: string, kind?: Toast['kind']) => void; setLoading: (l: string | null) => void;
}
let tid = 1;
export const useApp = create<AppState>((set, get) => ({
  screen: 'menu', prev: 'menu', profile: load('ay.profile', DEFAULT_PROFILE()), prefs: load('ay.prefs', DEFAULT_PREFS), settings: load('ay.settings', DEFAULT_SETTINGS), toasts: [], loading: null,
  go: (s) => set({ prev: get().screen, screen: s }),
  setProfile: (p) => { const profile = { ...get().profile, ...p, cos: { ...get().profile.cos, ...(p.cos || {}) } }; save('ay.profile', profile); set({ profile }); },
  setPrefs: (p) => { const prefs = { ...get().prefs, ...p }; save('ay.prefs', prefs); audio.setVol({ master: prefs.master, sfx: prefs.sfx, music: prefs.music, amb: prefs.amb, ui: prefs.ui }); set({ prefs }); },
  setSettings: (s) => { const settings = { ...get().settings, ...s }; save('ay.settings', settings); set({ settings }); },
  toast: (text, kind = 'info') => { const id = tid++; set({ toasts: [...get().toasts.slice(-4), { id, text, kind }] }); setTimeout(() => set({ toasts: get().toasts.filter(t => t.id !== id) }), 4200); },
  setLoading: (loading) => set({ loading }),
}));
{ const p = useApp.getState().prefs; audio.setVol({ master: p.master, sfx: p.sfx, music: p.music, amb: p.amb, ui: p.ui }); }
