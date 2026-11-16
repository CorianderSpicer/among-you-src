import type { Settings } from './game__core__types';
export const VERSION = '1.0.0';
export const PROTO = 'amongyou-1';
export const TILE = 32;
export const TICK = 1 / 30;          // host simulation step
export const SNAP_EVERY = 2;         // host sends a view every 2 ticks (15 Hz)
export const PLAYER_R = 11;          // collision radius at the feet
export const BASE_SPEED = 150;       // px / s
export const USE_RANGE = 58;         // px — tasks, buttons, consoles
export const REPORT_RANGE = 90;
export const MAX_PLAYERS = 15;
export const MIN_PLAYERS = 4;

export const DEFAULT_SETTINGS: Settings = {
  map: 'orbital', infiltrators: 2, neutrals: 1, specialCrew: 4, roleChance: {},
  killCooldown: 25, killRange: 1.6, speed: 1, crewVision: 7.5, infVision: 10, abilityCooldownMul: 1, abilityDurationMul: 1,
  commonTasks: 1, shortTasks: 3, longTasks: 1, meetings: 1, emergencyCooldown: 15, discussion: 20, voting: 60,
  anonymousVotes: false, confirmEjects: true, roleReveal: 'role', taskBar: 'always', rescue: false, mapEvents: true, ghostTasks: true,
  bots: 0, botSkill: 'normal', publicRoom: false,
};

export const COLORS: { name: string; base: string; dark: string; light: string }[] = [
  { name: 'Crimson', base: '#e8394d', dark: '#8f1a2e', light: '#ff8b95' },
  { name: 'Tangerine', base: '#ff8a2a', dark: '#a8480c', light: '#ffc07f' },
  { name: 'Sunflower', base: '#ffd23f', dark: '#a7820f', light: '#fff0a3' },
  { name: 'Lime', base: '#9be14a', dark: '#4f8a1a', light: '#d4ff97' },
  { name: 'Emerald', base: '#24b86a', dark: '#0f6637', light: '#7ff0ad' },
  { name: 'Teal', base: '#1fc8c0', dark: '#0b6f6b', light: '#8ff6ef' },
  { name: 'Sky', base: '#55b6ff', dark: '#1d5f9e', light: '#b5e0ff' },
  { name: 'Cobalt', base: '#3c5cf0', dark: '#1b2a8f', light: '#9fb0ff' },
  { name: 'Violet', base: '#8f55f0', dark: '#4a2196', light: '#cdb0ff' },
  { name: 'Orchid', base: '#d453e0', dark: '#7d1f89', light: '#f4a8fb' },
  { name: 'Rose', base: '#ff6fae', dark: '#a52a65', light: '#ffc0dc' },
  { name: 'Coral', base: '#ff7a68', dark: '#a53a2c', light: '#ffc0b5' },
  { name: 'Mocha', base: '#9a6a4a', dark: '#553420', light: '#d6aa89' },
  { name: 'Slate', base: '#6f7f99', dark: '#38445b', light: '#b8c4d9' },
  { name: 'Snow', base: '#e9eef7', dark: '#9aa6ba', light: '#ffffff' },
  { name: 'Onyx', base: '#3a3f4c', dark: '#16181f', light: '#7a8396' },
  { name: 'Mint', base: '#7ff2c4', dark: '#2b9a72', light: '#cbffe9' },
  { name: 'Gold', base: '#d9a930', dark: '#7d5b10', light: '#ffe08a' },
];

export const PROTO_ERRORS: Record<string, string> = {
  full: 'That room is full.', version: 'Your game version does not match the host.', started: 'The match has already started — wait for the next round.',
  kicked: 'The host removed you from the room.', banned: 'You cannot rejoin this room.', name: 'Pick a different name — that one is taken.',
};
