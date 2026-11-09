import type { MapSpec } from './game__maps__builder';
// MAP 1 — ORBITAL NEXUS: research station orbiting a violet gas giant.
export const ORBITAL: MapSpec = {
  id: 'orbital', name: 'Orbital Nexus', sub: 'Research station in high orbit', theme: 'orbital', w: 96, h: 62,
  rooms: [
    { id: 'engine', name: 'Engine Room', x: 4, y: 4, w: 14, h: 11, kind: 'engine', tasks: ['fuel_burn', 'generator', 'magnet'], window: true },
    { id: 'reactor', name: 'Reactor Core', x: 24, y: 4, w: 14, h: 12, kind: 'reactor', tasks: ['reactor_align', 'power_route'] },
    { id: 'lab', name: 'Laboratory', x: 58, y: 4, w: 14, h: 11, kind: 'lab', tasks: ['chem_mix', 'sample', 'circuit'], window: true },
    { id: 'comms', name: 'Communications', x: 78, y: 5, w: 12, h: 10, kind: 'comms', tasks: ['frequency', 'antenna', 'download'], window: true },
    { id: 'cargo', name: 'Cargo Storage', x: 4, y: 24, w: 15, h: 13, kind: 'cargo', tasks: ['cargo_sort', 'fuel_fill', 'lock_combo'] },
    { id: 'cafeteria', name: 'Cafeteria', x: 36, y: 23, w: 20, h: 15, kind: 'cafeteria', tasks: ['wires', 'file_sort', 'download'], window: true, vent: [16, 12] },
    { id: 'bridge', name: 'Command Bridge', x: 76, y: 24, w: 15, h: 13, kind: 'bridge', tasks: ['navigation', 'upload', 'auth'], window: true },
    { id: 'medbay', name: 'Medical Bay', x: 6, y: 46, w: 14, h: 11, kind: 'medbay', tasks: ['memory', 'signal_trace'] },
    { id: 'security', name: 'Security Center', x: 28, y: 47, w: 12, h: 10, kind: 'security', tasks: ['auth', 'door_calib', 'db_recover'] },
    { id: 'garden', name: 'Oxygen Garden', x: 52, y: 45, w: 16, h: 12, kind: 'garden', tasks: ['oxygen_calib', 'temperature', 'wires'], window: true },
  ],
  halls: [
    [[17, 10], [24, 10]], [[31, 15], [31, 19], [45, 19], [45, 23]], [[11, 14], [11, 24]], [[18, 30], [36, 30]], [[51, 23], [51, 19], [64, 19], [64, 14]],
    [[71, 9], [78, 9]], [[84, 14], [84, 24]], [[55, 30], [76, 30]], [[12, 36], [12, 46]], [[19, 51], [28, 51]], [[34, 47], [34, 42], [42, 42], [42, 37]],
    [[39, 52], [52, 52]], [[63, 45], [63, 41], [83, 41], [83, 36]],
  ],
  vents: [['engine', 'reactor'], ['medbay', 'security', 'cargo'], ['bridge', 'comms', 'garden'], ['lab', 'cafeteria']],
  emergency: 'cafeteria', spawn: 'cafeteria', admin: 'bridge', camsRoom: 'security', logs: 'security',
  sabotages: ['reactor', 'oxygen', 'comms', 'security', 'doors', 'gravity', 'power'],
  fix: { reactor: ['reactor', 'reactor'], oxygen: ['garden', 'bridge'], comms: ['comms'], power: ['engine'], security: ['security'], gravity: ['engine', 'lab'] },
  events: ['gravity', 'reactor_pulse'],
  cams: [[26, 30, 'West Concourse'], [66, 30, 'East Concourse'], [38, 19, 'North Spine'], [46, 52, 'South Spine']],
};

export const LOBBY: MapSpec = {
  id: 'lobby', name: 'Departure Lounge', sub: 'Waiting for launch', theme: 'lobby', w: 32, h: 22,
  rooms: [{ id: 'lounge', name: 'Departure Lounge', x: 3, y: 4, w: 26, h: 14, kind: 'lounge', window: true }],
  halls: [], vents: [], emergency: 'lounge', spawn: 'lounge', admin: 'lounge', camsRoom: 'lounge', logs: 'lounge', sabotages: [], fix: {}, events: [], cams: [],
};
