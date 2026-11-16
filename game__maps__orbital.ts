import type { MapSpec } from './game__maps__builder';
// MAP 1 — ORBITAL NEXUS: research station orbiting a violet gas giant.
// Rebuilt as an open station. The old layout was ten smallish boxes joined by 3-tile corridors,
// which played as a maze of chokepoints. Now: a large open concourse running right through the
// middle, rooms grown and pushed up against it with wide mouths, and a ring route so almost
// everywhere can be reached two or three ways. Same rooms, same tasks, same vents — more space.
export const ORBITAL: MapSpec = {
  id: 'orbital', name: 'Orbital Nexus', sub: 'Research station in high orbit', theme: 'orbital', w: 104, h: 70, hallW: 7,
  rooms: [
    { id: 'engine', name: 'Engine Room', x: 4, y: 5, w: 20, h: 16, kind: 'engine', tasks: ['fuel_burn', 'generator', 'magnet'], window: true },
    { id: 'reactor', name: 'Reactor Core', x: 28, y: 4, w: 20, h: 17, kind: 'reactor', tasks: ['reactor_align', 'power_route'] },
    { id: 'lab', name: 'Laboratory', x: 58, y: 4, w: 20, h: 16, kind: 'lab', tasks: ['chem_mix', 'sample', 'circuit'], window: true },
    { id: 'comms', name: 'Communications', x: 82, y: 5, w: 17, h: 15, kind: 'comms', tasks: ['frequency', 'antenna', 'download'], window: true },
    { id: 'cargo', name: 'Cargo Storage', x: 4, y: 28, w: 20, h: 18, kind: 'cargo', tasks: ['cargo_sort', 'fuel_fill', 'lock_combo'] },
    // The concourse: one big open hall the whole station reads from. Marked outdoor so it has no
    // doors of its own and simply runs into the walkways at either end.
    { id: 'concourse', name: 'Central Concourse', x: 29, y: 27, w: 28, h: 19, kind: 'midway', tasks: ['wires', 'download'], outdoor: true },
    { id: 'cafeteria', name: 'Cafeteria', x: 59, y: 26, w: 22, h: 20, kind: 'cafeteria', tasks: ['wires', 'file_sort', 'download'], window: true, vent: [18, 16] },
    { id: 'bridge', name: 'Command Bridge', x: 84, y: 28, w: 16, h: 18, kind: 'bridge', tasks: ['navigation', 'upload', 'auth'], window: true },
    { id: 'medbay', name: 'Medical Bay', x: 5, y: 52, w: 19, h: 14, kind: 'medbay', tasks: ['memory', 'signal_trace'] },
    { id: 'security', name: 'Security Center', x: 29, y: 52, w: 18, h: 14, kind: 'security', tasks: ['auth', 'door_calib', 'db_recover'] },
    { id: 'garden', name: 'Oxygen Garden', x: 52, y: 51, w: 22, h: 16, kind: 'garden', tasks: ['oxygen_calib', 'temperature', 'wires'], window: true },
    { id: 'obs', name: 'Observation Deck', x: 79, y: 52, w: 21, h: 15, kind: 'lounge', tasks: ['navigation', 'frequency'], window: true, outdoor: true },
  ],
  // Several ways to everywhere: a north run, the concourse through the middle, a south run, and
  // links down both flanks, so no single doorway owns a whole wing.
  halls: [
    [[24, 12], [28, 12]], [[48, 12], [58, 12]], [[78, 12], [82, 12]],              // north row
    [[14, 21], [14, 28]], [[38, 21], [38, 27]], [[68, 20], [68, 26]], [[90, 20], [90, 28]], // north → middle
    [[24, 36], [29, 36]], [[57, 36], [59, 36]], [[81, 36], [84, 36]],              // middle row
    [[14, 46], [14, 52]], [[38, 46], [38, 52]], [[62, 46], [62, 51]], [[90, 46], [90, 52]], // middle → south
    [[24, 59], [29, 59]], [[47, 59], [52, 59]], [[74, 59], [79, 59]],              // south row
    [[43, 21], [43, 27]], [[70, 46], [70, 51]],                                     // extra cross links
  ],
  vents: [['engine', 'reactor'], ['medbay', 'security', 'cargo'], ['bridge', 'comms', 'garden'], ['lab', 'cafeteria'], ['obs', 'garden']],
  emergency: 'cafeteria', spawn: 'cafeteria', admin: 'bridge', camsRoom: 'security', logs: 'security',
  sabotages: ['reactor', 'oxygen', 'comms', 'security', 'doors', 'gravity', 'power'],
  fix: { reactor: ['reactor', 'reactor'], oxygen: ['garden', 'bridge'], comms: ['comms'], power: ['engine'], security: ['security'], gravity: ['engine', 'lab'] },
  events: ['gravity', 'reactor_pulse'],
  cams: [[26, 36, 'West Walkway'], [82, 36, 'East Walkway'], [43, 24, 'North Spine'], [46, 59, 'South Spine']],
};

export const LOBBY: MapSpec = {
  id: 'lobby', name: 'Departure Lounge', sub: 'Waiting for launch', theme: 'lobby', w: 32, h: 22,
  rooms: [{ id: 'lounge', name: 'Departure Lounge', x: 3, y: 4, w: 26, h: 14, kind: 'lounge', window: true }],
  halls: [], vents: [], emergency: 'lounge', spawn: 'lounge', admin: 'lounge', camsRoom: 'lounge', logs: 'lounge', sabotages: [], fix: {}, events: [], cams: [],
};
