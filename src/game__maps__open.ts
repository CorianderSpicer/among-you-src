// Two open-plan maps. Everything shipped before this was rooms joined by narrow corridors, which
// funnels play into chokepoints. These two are built the opposite way: large `outdoor` areas that
// butt straight up against each other (an outdoor room gets no doors, so neighbours merge into one
// continuous space) and wide connectors instead of 3-tile halls. Sightlines are long, approaches
// are many, and kills have to be timed rather than cornered.
import type { MapSpec } from './game__maps__builder';

// ── MAP 6 — STARLIGHT CARNIVAL ─────────────────────────────────────────────────────────────────
// A derelict pleasure pier still running on its own power: the rides turn, the lights blink, and
// nobody has worked here in years. One huge midway down the middle, attractions opening straight
// onto it, and a funhouse of mirrors where you genuinely cannot tell who is who.
export const CARNIVAL: MapSpec = {
  id: 'carnival', name: 'Starlight Carnival', sub: 'An abandoned pleasure pier that never powered down',
  theme: 'carnival', w: 104, h: 70, hallW: 7,
  rooms: [
    // The midway: three overlapping open slabs that read as one enormous promenade.
    { id: 'midway_w', name: 'West Midway', x: 6, y: 26, w: 26, h: 18, kind: 'midway', tasks: ['ring_toss', 'balloon_pop'], outdoor: true },
    { id: 'midway_c', name: 'Grand Midway', x: 32, y: 24, w: 30, h: 22, kind: 'midway', tasks: ['whack', 'wires'], outdoor: true, vent: [15, 11] },
    { id: 'midway_e', name: 'East Midway', x: 62, y: 26, w: 26, h: 18, kind: 'midway', tasks: ['duck_shoot', 'cotton_candy'], outdoor: true },
    // Attractions ring the midway. Open fronts (outdoor) except the enclosed ones.
    { id: 'carousel', name: 'Carousel', x: 10, y: 5, w: 20, h: 15, kind: 'carousel', tasks: ['reactor_align', 'power_route'], outdoor: true },
    { id: 'bigtop', name: 'Big Top', x: 38, y: 4, w: 22, h: 16, kind: 'bigtop', tasks: ['strength_test', 'memory', 'auth'], outdoor: true },
    { id: 'ferris', name: 'Ferris Wheel', x: 68, y: 5, w: 22, h: 15, kind: 'ferris', tasks: ['generator', 'circuit'], outdoor: true },
    { id: 'funhouse', name: 'Hall of Mirrors', x: 8, y: 50, w: 22, h: 15, kind: 'funhouse', tasks: ['file_sort', 'db_recover'], vent: [11, 7] },
    { id: 'arcade', name: 'Arcade', x: 36, y: 52, w: 24, h: 14, kind: 'arcade', tasks: ['frequency', 'download', 'upload'] },
    { id: 'prizes', name: 'Prize Booth', x: 66, y: 50, w: 22, h: 15, kind: 'prizes', tasks: ['cargo_sort', 'lock_combo'], vent: [11, 7] },
    { id: 'generators', name: 'Ride Power', x: 90, y: 28, w: 12, h: 16, kind: 'power', tasks: ['fuel_fill', 'fuel_burn', 'temperature'] },
  ],
  // Wide, short connectors — these are plazas between attractions, not corridors.
  halls: [
    [[20, 20], [20, 26]], [[49, 20], [49, 24]], [[79, 20], [79, 26]],
    [[19, 44], [19, 50]], [[48, 46], [48, 52]], [[77, 44], [77, 50]],
    [[30, 35], [32, 35]], [[62, 35], [62, 35]], [[88, 35], [90, 35]],
    [[30, 57], [36, 57]], [[60, 57], [66, 57]],
  ],
  vents: [['midway_c', 'funhouse', 'prizes']],
  emergency: 'midway_c', spawn: 'midway_c', admin: 'arcade', camsRoom: 'prizes', logs: 'funhouse',
  sabotages: ['power', 'comms', 'doors', 'reactor'],
  fix: { power: ['generators'], comms: ['ferris'], reactor: ['generators', 'carousel'] },
  events: ['flicker', 'gravity'],
  cams: [[20, 23, 'Carousel Gate'], [49, 22, 'Big Top'], [79, 23, 'Wheel Gate'], [48, 49, 'Arcade Row']],
  zones: [
    { kind: 'outdoor', x: 6, y: 24, w: 82, h: 22 },
    { kind: 'outdoor', x: 10, y: 4, w: 80, h: 17 },
  ],
  passages: [[12, 58, 76, 58]],   // the old service tunnel under the pier
};

// ── MAP 7 — VERDANT DRIFT ──────────────────────────────────────────────────────────────────────
// An agricultural dome gone feral. Almost no interior walls at all: meadows, orchards and a pond
// run into one another, and the only real cover is the crops themselves. The most open map here.
export const VERDANT: MapSpec = {
  id: 'verdant', name: 'Verdant Drift', sub: 'A farming dome left to grow wild',
  theme: 'verdant', w: 98, h: 68, hallW: 8,
  rooms: [
    { id: 'meadow_n', name: 'North Meadow', x: 8, y: 6, w: 34, h: 20, kind: 'meadow', tasks: ['pollinate', 'irrigate'], outdoor: true },
    { id: 'orchard', name: 'Orchard', x: 48, y: 6, w: 34, h: 20, kind: 'orchard', tasks: ['sample', 'chem_mix'], outdoor: true, vent: [17, 10] },
    { id: 'pond', name: 'Reservoir', x: 10, y: 30, w: 28, h: 20, kind: 'pond', tasks: ['pressure', 'valve'], outdoor: true },
    { id: 'commons', name: 'The Commons', x: 40, y: 28, w: 26, h: 22, kind: 'commons', tasks: ['wires', 'auth', 'navigation'], outdoor: true, vent: [13, 11] },
    { id: 'terraces', name: 'Terraces', x: 68, y: 30, w: 24, h: 20, kind: 'meadow', tasks: ['irrigate', 'magnet'], outdoor: true },
    { id: 'greenhouse', name: 'Greenhouse', x: 14, y: 54, w: 24, h: 12, kind: 'greenhouse', tasks: ['pollinate', 'temperature', 'oxygen_calib'] },
    { id: 'silo', name: 'Seed Silo', x: 44, y: 54, w: 18, h: 12, kind: 'silo', tasks: ['cargo_sort', 'file_sort'], vent: [9, 6] },
    { id: 'pumphouse', name: 'Pump House', x: 68, y: 54, w: 22, h: 12, kind: 'pump', tasks: ['generator', 'power_route', 'circuit'] },
  ],
  halls: [
    [[42, 16], [48, 16]], [[25, 26], [25, 30]], [[54, 26], [54, 28]], [[70, 26], [70, 30]],
    [[38, 40], [40, 40]], [[66, 40], [68, 40]],
    [[26, 50], [26, 54]], [[53, 50], [53, 54]], [[79, 50], [79, 54]],
  ],
  vents: [['orchard', 'commons', 'silo']],
  emergency: 'commons', spawn: 'commons', admin: 'greenhouse', camsRoom: 'silo', logs: 'pumphouse',
  sabotages: ['oxygen', 'power', 'comms', 'doors'],
  fix: { oxygen: ['greenhouse', 'pumphouse'], power: ['pumphouse'], comms: ['commons'] },
  events: ['flicker', 'leak'],
  cams: [[25, 28, 'North Path'], [54, 27, 'Orchard Gate'], [53, 52, 'Silo Path'], [79, 52, 'Pump Path']],
  zones: [
    { kind: 'outdoor', x: 8, y: 6, w: 84, h: 44 },
    { kind: 'water', x: 14, y: 34, w: 20, h: 12 },
  ],
  passages: [[16, 60, 86, 60]],
};
