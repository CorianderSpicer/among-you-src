import { create } from 'zustand';
import type { ChatMsg, Cosmetics, Settings } from './game__core__types';
import type { View } from './game__sim__types';

export interface RosterInfo { s: number; name: string; cos: Cosmetics; bot: boolean; host: boolean; conn: boolean; ready: boolean; pid?: string }
export interface RoleInfo { role: string; faction: 'crew' | 'infiltrator' | 'neutral'; team: number[]; bounty?: number | null; goal?: string }
export type Panel = null | 'map' | 'sabotage' | 'cams' | 'admin' | 'logs' | 'tasks' | 'audit' | 'chat';
export interface Result { id: number; kind: string; text: string; t: number }
interface GameState {
  mode: 'none' | 'local' | 'host' | 'guest'; code: string; slot: number; roster: Record<number, RosterInfo>; settings: Settings | null; mapId: string;
  view: View | null; role: RoleInfo | null; chat: ChatMsg[]; unread: number; panel: Panel; minigame: { spot: string; game: string; kind: 'task' | 'fix' | 'sab'; sab?: string } | null;
  killed: { by: number } | null; meetingIntro: { caller: number; body: number | null; kind: string } | null; voteResult: any; ejection: { s: number | null; text: string; sub: string; cos: Cosmetics | null } | null; end: any | null;
  results: Result[]; logs: { t: number; room: string; c: number }[] | null; status: { text: string; kind: 'ok' | 'warn' | 'error' | 'info' } | null; rtt: number; reconnecting: boolean; intro: boolean; replay: any | null; personalWin: string | null; spectate: number | null;
  set: (p: Partial<GameState>) => void; reset: () => void;
}
const blank = { mode: 'none' as const, code: '', slot: 0, roster: {}, settings: null, mapId: 'lobby', view: null, role: null, chat: [], unread: 0, panel: null, minigame: null, killed: null, meetingIntro: null, voteResult: null, ejection: null, end: null, results: [], logs: null, status: null, rtt: 0, reconnecting: false, intro: false, replay: null, personalWin: null, spectate: null };
export const useGame = create<GameState>((set) => ({ ...blank, set: (p) => set(p), reset: () => set({ ...blank }) }));
