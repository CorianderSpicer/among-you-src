import type { MapSpec } from './game__maps__builder';
import type { MapId } from './game__core__types';
import { ORBITAL, LOBBY } from './game__maps__orbital';
import { FROSTFALL, ABYSSAL, COLONY, HELIOS } from './game__maps__more';
import { CARNIVAL, VERDANT } from './game__maps__open';
export const MAPS: Record<string, MapSpec> = { lobby: LOBBY, orbital: ORBITAL, frostfall: FROSTFALL, abyssal: ABYSSAL, colony: COLONY, helios: HELIOS, carnival: CARNIVAL, verdant: VERDANT };
export const MAP_LIST: { id: MapId; name: string; sub: string; tint: string }[] = [
  { id: 'orbital', name: 'Orbital Nexus', sub: 'Research station in orbit · gravity shifts, reactor pulses, door lockdowns', tint: '#8f7bff' },
  { id: 'frostfall', name: 'Frostfall Research', sub: 'Under the ice · blizzards, icy tunnels, heating failure', tint: '#9fe8ff' },
  { id: 'abyssal', name: 'Abyssal Station', sub: 'Deep sea · leaks, flooding, pressure failure, bulkheads', tint: '#5affd0' },
  { id: 'colony', name: 'The Lost Colony', sub: 'Desert ruins · sandstorms, hidden passages, unstable power', tint: '#ffb547' },
  { id: 'helios', name: 'Helios Dreadnought', sub: 'Warship · keycard rooms, turret defense, security lockdown', tint: '#ff4d6d' },
  { id: 'carnival', name: 'Starlight Carnival', sub: 'Open pier · wide midway, carnival games, hall of mirrors', tint: '#ff8bd0' },
  { id: 'verdant', name: 'Verdant Drift', sub: 'Open farm dome · meadows, tall crops to hide in, almost no walls', tint: '#8dff7a' },
];
