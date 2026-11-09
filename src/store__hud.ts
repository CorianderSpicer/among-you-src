import { create } from 'zustand';
export interface Interact { use: { kind: string; id: string; label: string; game?: string } | null; report: number | null; kill: number | null; vent: string | null; abilityTarget: number | null; abilityBody: number | null; room: string; nearCams: boolean }
export const useHud = create<Interact & { set: (p: Partial<Interact>) => void }>((set) => ({ use: null, report: null, kill: null, vent: null, abilityTarget: null, abilityBody: null, room: '', nearCams: false, set: (p) => set(p) }));
