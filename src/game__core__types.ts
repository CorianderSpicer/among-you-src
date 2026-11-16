// Shared data model for AMONG YOU. Everything the host simulates and sends over the wire is defined here.
export type Faction = 'crew' | 'infiltrator' | 'neutral';
export interface Vec { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export interface Cosmetics {
  color: number;      // index into COLORS
  helmet: string;     // helmet glass / shape style
  hat: string;
  outfit: string;
  backpack: string;
  pet: string;
  trail: string;
  accessory: string;
  victory: string;
}
export interface Profile { name: string; cos: Cosmetics }

export type SabotageId = 'reactor' | 'oxygen' | 'comms' | 'security' | 'doors' | 'gravity' | 'lifesupport' | 'power' | 'flood' | 'pressure';
export type MapId = 'lobby' | 'orbital' | 'frostfall' | 'abyssal' | 'colony' | 'helios' | 'carnival' | 'verdant';
export type Phase = 'lobby' | 'intro' | 'play' | 'meeting' | 'ejection' | 'ended';
export type Anim = 'idle' | 'walk' | 'run';

export interface Settings {
  map: MapId;
  infiltrators: number;
  neutrals: number;           // max neutral roles
  specialCrew: number;        // max special crew roles (0..)
  roleChance: Record<string, number>; // 0..100 per role id
  killCooldown: number;
  killRange: number;          // tiles
  speed: number;              // multiplier
  crewVision: number;         // tiles
  infVision: number;          // tiles
  abilityCooldownMul: number;
  abilityDurationMul: number;
  commonTasks: number; shortTasks: number; longTasks: number;
  meetings: number;           // emergency meetings per player
  emergencyCooldown: number;
  discussion: number; voting: number;
  anonymousVotes: boolean;
  confirmEjects: boolean;     // reveal role on eject
  roleReveal: 'role' | 'faction' | 'none'; // what is revealed on death screens/eject
  taskBar: 'always' | 'meetings' | 'never';
  rescue: boolean;            // downed state (Paramedic)
  mapEvents: boolean;
  ghostTasks: boolean;
  bots: number;               // host-side AI players to fill the room
  botSkill: 'easy' | 'normal' | 'hard';
  publicRoom: boolean;
}

export interface TaskAssign { id: string; spot: string; steps: string[]; step: number; done: boolean }

export interface PlayerPublic { // what others may see (only when in vision)
  s: number; x: number; y: number; f: 1 | -1; a: Anim; al: boolean; gh?: boolean; cos?: number; inv?: number; vent?: boolean; dn?: boolean; slow?: boolean;
}

export interface Body { id: number; s: number; x: number; y: number; t: number; room: string; downed?: boolean; until?: number; cleaned?: boolean }

export interface ChatMsg { id: number; s: number; text: string; ghost?: boolean; sys?: boolean; t: number }
