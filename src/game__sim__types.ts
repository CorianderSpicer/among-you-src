import type { Anim, Body, ChatMsg, Cosmetics, Faction, Phase, PlayerPublic, SabotageId, TaskAssign } from './game__core__types';

export interface RosterEntry { s: number; pid: string; name: string; cos: Cosmetics; bot: boolean; host?: boolean }
export interface Trace { id: number; k: 'vent' | 'stain' | 'trap' | 'marker' | 'sensor' | 'relic' | 'beacon' | 'dark' | 'puddle' | 'flash' | 'decoy'; x: number; y: number; until: number; by?: number; r?: number; room?: string; data?: any }
export interface SabState { id: SabotageId; t0: number; until?: number; spots: string[]; done: string[]; holds: Record<string, number[]>; critical: boolean; extra?: SabotageId }
export interface MeetingState { caller: number; body: number | null; kind: 'report' | 'emergency'; t0: number; discussEnd: number; voteEnd: number; votes: Record<number, number | 'skip'>; endAt?: number; result?: { votes: [number, number | 'skip'][]; ejected: number | null; tie: boolean } }
export interface PrivateView {
  s: number; role: string; faction: Faction; alive: boolean; ghost: boolean; x: number; y: number; vent: string | null; downed: boolean;
  kcd: number; acd: number; scd: number; uses: number | null; active: number; jam: number; slow: number; shift: number; inv: number; vest: number; access: boolean; meetingsLeft: number; emCd: number;
  tasks: TaskAssign[]; fake: boolean; battery?: number; track?: { s: number; x: number; y: number; until: number } | null; team: number[]; bounty?: number | null; goal?: string; relics?: number; extracting?: number; done?: boolean;
}
export interface View {
  t: number; ph: Phase; pl: PlayerPublic[]; me: PrivateView; bodies: Body[]; sab: { id: SabotageId; until?: number; done: string[]; holds: Record<string, number>; spots: string[]; extra?: SabotageId } | null; doors: string[];
  ev: { id: string; until: number } | null; bar: number; traces: Trace[]; meeting?: MeetingView; dark: number; cams?: PlayerPublic[]; admin?: Record<string, number>; camsOn: boolean; phaseEnd?: number; leak?: { id: number; x: number; y: number }[];
}
export interface MeetingView { caller: number; body: number | null; kind: 'report' | 'emergency'; discussEnd: number; voteEnd: number; voted: number[]; myVote: number | 'skip' | null; alive: number[]; dead: number[]; result?: MeetingState['result']; endAt?: number }
export type Ev = { e: string; [k: string]: any };
export interface PlayerFrame { s: number; x: number; y: number; f: 1 | -1; a: Anim }
export type { ChatMsg };
