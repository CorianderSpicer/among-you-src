import type { MapSpec } from './game__maps__builder';

// MAP 2 — FROSTFALL RESEARCH: a facility under an icy alien world. Blizzards, slippery ice tunnels, cold snow fields, heating failure.
export const FROSTFALL: MapSpec = {
  // Opened up: a wide snow field across the north you can cross anywhere, the ice tunnels widened
  // into a long open gallery, and a second route down each flank so the lower level is never a
  // single stairwell. Walkways are 7 tiles — wide enough for two to pass without a standoff.
  id: 'frostfall', name: 'Frostfall Research', sub: 'Under the ice of a frozen moon', theme: 'frostfall', w: 102, h: 72, hallW: 7,
  rooms: [
    { id: 'entrance', name: 'Snow Entrance', x: 4, y: 4, w: 26, h: 17, kind: 'entrance', tasks: ['fuel_fill', 'antenna'], outdoor: true },
    { id: 'tunnels', name: 'Ice Tunnels', x: 32, y: 4, w: 36, h: 16, kind: 'tunnel', tasks: ['magnet', 'signal_trace'], vent: [18, 8], outdoor: true },
    { id: 'dome', name: 'Observation Dome', x: 72, y: 4, w: 25, h: 18, kind: 'dome', tasks: ['navigation', 'frequency', 'download'], window: true },
    { id: 'research', name: 'Research Center', x: 4, y: 29, w: 22, h: 16, kind: 'research', tasks: ['chem_mix', 'circuit', 'upload'] },
    { id: 'cryo', name: 'Cryogenic Lab', x: 31, y: 28, w: 26, h: 18, kind: 'cryo', tasks: ['wires', 'temperature', 'sample'], window: true },
    { id: 'thermal', name: 'Thermal Chamber', x: 62, y: 29, w: 20, h: 16, kind: 'thermal', tasks: ['pressure', 'reactor_align', 'auth'] },
    { id: 'galley', name: 'Mess Hall', x: 86, y: 29, w: 13, h: 16, kind: 'cafeteria', tasks: ['file_sort', 'download'] },
    { id: 'generator', name: 'Underground Generator', x: 6, y: 53, w: 22, h: 16, kind: 'generator', tasks: ['fuel_burn', 'generator', 'power_route'] },
    { id: 'specimen', name: 'Specimen Storage', x: 36, y: 53, w: 24, h: 16, kind: 'specimen', tasks: ['cargo_sort', 'db_recover', 'lock_combo', 'memory'] },
    { id: 'drill', name: 'Drill Head', x: 66, y: 53, w: 24, h: 16, kind: 'mining', tasks: ['magnet', 'pressure'], outdoor: true },
  ],
  halls: [[[30, 12], [32, 12]], [[68, 12], [72, 12]],
    [[15, 21], [15, 29]], [[44, 20], [44, 28]], [[72, 22], [72, 29]], [[92, 22], [92, 29]],
    [[26, 37], [31, 37]], [[57, 37], [62, 37]], [[82, 37], [86, 37]],
    [[16, 45], [16, 53]], [[44, 46], [44, 53]], [[72, 45], [72, 53]], [[92, 45], [92, 60], [90, 60]],
    [[28, 61], [36, 61]], [[60, 61], [66, 61]]],
  vents: [['entrance', 'research'], ['tunnels', 'dome', 'cryo'], ['thermal', 'specimen', 'generator'], ['drill', 'galley']],
  emergency: 'cryo', spawn: 'cryo', admin: 'research', camsRoom: 'research', logs: 'cryo',
  sabotages: ['lifesupport', 'comms', 'power', 'doors'], fix: { lifesupport: ['thermal', 'generator'], comms: ['dome'], power: ['generator'] },
  events: ['blizzard', 'freeze'], cams: [[31, 12, 'Tunnel Mouth'], [44, 24, 'Central Shaft'], [16, 49, 'Lower Stairs'], [63, 61, 'Drill Road']],
  zones: [{ kind: 'ice', x: 32, y: 4, w: 36, h: 16 }, { kind: 'cold', x: 4, y: 4, w: 26, h: 17 }, { kind: 'ice', x: 66, y: 53, w: 24, h: 16 }],
};

// MAP 3 — ABYSSAL STATION: underwater research base. Leaks, a flooded corridor, flooding & pressure sabotage, bulkhead doors.
export const ABYSSAL: MapSpec = {
  // Opened up: the flooded corridor is now a broad flooded hall you cross in the open, with a dry
  // gallery beside it, and the dock has grown into a real bay. Every wing has two ways in.
  id: 'abyssal', name: 'Abyssal Station', sub: 'Four kilometres below the surface', theme: 'abyssal', w: 104, h: 70, hallW: 7,
  rooms: [
    { id: 'aquarium', name: 'Aquarium', x: 4, y: 5, w: 24, h: 17, kind: 'aquarium', tasks: ['sample', 'temperature'], window: true },
    { id: 'command', name: 'Command Room', x: 33, y: 4, w: 26, h: 18, kind: 'command', tasks: ['navigation', 'auth', 'upload'], window: true },
    { id: 'oxy', name: 'Oxygen Storage', x: 64, y: 5, w: 20, h: 17, kind: 'oxystore', tasks: ['oxygen_calib', 'fuel_fill', 'wires'] },
    { id: 'moonpool', name: 'Moon Pool', x: 88, y: 5, w: 12, h: 17, kind: 'dock', tasks: ['pressure', 'valve'], window: true },
    { id: 'pressure', name: 'Pressure Control', x: 4, y: 30, w: 21, h: 16, kind: 'pressure', tasks: ['pressure', 'reactor_align', 'magnet'] },
    { id: 'flooded', name: 'Flooded Gallery', x: 29, y: 29, w: 38, h: 18, kind: 'flooded', tasks: ['circuit', 'signal_trace'], vent: [19, 9], outdoor: true },
    { id: 'power', name: 'Power Station', x: 71, y: 30, w: 20, h: 16, kind: 'power', tasks: ['power_route', 'generator', 'fuel_burn'] },
    { id: 'dock', name: 'Submarine Dock', x: 6, y: 53, w: 28, h: 15, kind: 'dock', tasks: ['cargo_sort', 'antenna', 'lock_combo'], window: true },
    { id: 'deeplab', name: 'Deep Research Lab', x: 40, y: 53, w: 26, h: 15, kind: 'deeplab', tasks: ['chem_mix', 'db_recover', 'download', 'memory'], window: true },
    { id: 'hatchery', name: 'Hatchery', x: 72, y: 53, w: 24, h: 15, kind: 'aquarium', tasks: ['sample', 'oxygen_calib'], window: true },
  ],
  halls: [[[28, 13], [33, 13]], [[59, 13], [64, 13]], [[84, 13], [88, 13]],
    [[15, 22], [15, 30]], [[45, 22], [45, 29]], [[74, 22], [74, 30]], [[94, 22], [94, 30], [91, 30]],
    [[25, 38], [29, 38]], [[67, 38], [71, 38]],
    [[15, 46], [15, 53]], [[45, 47], [45, 53]], [[80, 46], [80, 53]],
    [[34, 60], [40, 60]], [[66, 60], [72, 60]]],
  vents: [['aquarium', 'pressure', 'dock'], ['command', 'flooded', 'deeplab'], ['oxy', 'power'], ['moonpool', 'hatchery']],
  emergency: 'command', spawn: 'command', admin: 'command', camsRoom: 'pressure', logs: 'deeplab',
  sabotages: ['pressure', 'flood', 'oxygen', 'comms', 'power', 'doors'], fix: { pressure: ['pressure', 'dock'], flood: ['flooded', 'power'], oxygen: ['oxy', 'command'], comms: ['command'], power: ['power'] },
  events: ['leak', 'flicker'], cams: [[30, 13, 'Aquarium Hall'], [61, 13, 'North Ring'], [45, 38, 'Flood Line'], [37, 60, 'Dock Tunnel']],
  zones: [{ kind: 'water', x: 29, y: 33, w: 38, h: 11 }],
};

// MAP 4 — THE LOST COLONY: an abandoned desert settlement. Sandstorms, hidden underground passages, unstable power.
export const COLONY: MapSpec = {
  // A settlement, not a corridor system: the plaza is now a genuinely large open square with open
  // streets running off it in every direction, and the mining pit and market are open ground too.
  id: 'colony', name: 'The Lost Colony', sub: 'An abandoned settlement on a desert world', theme: 'colony', w: 106, h: 74, hallW: 8,
  rooms: [
    { id: 'residential', name: 'Residential Area', x: 4, y: 4, w: 26, h: 18, kind: 'residential', tasks: ['wires', 'file_sort', 'memory'] },
    { id: 'tower', name: 'Communications Tower', x: 36, y: 4, w: 22, h: 15, kind: 'tower', tasks: ['antenna', 'frequency', 'download'] },
    { id: 'hospital', name: 'Hospital', x: 64, y: 4, w: 24, h: 18, kind: 'hospital', tasks: ['sample', 'chem_mix', 'auth'] },
    { id: 'market', name: 'Market Row', x: 92, y: 4, w: 11, h: 18, kind: 'plaza', tasks: ['cargo_sort', 'file_sort'], outdoor: true },
    { id: 'outpost', name: 'Research Outpost', x: 4, y: 30, w: 22, h: 17, kind: 'outpost', tasks: ['upload', 'circuit', 'navigation'] },
    { id: 'plaza', name: 'Central Plaza', x: 30, y: 27, w: 36, h: 24, kind: 'plaza', tasks: ['magnet', 'cargo_sort'], outdoor: true, vent: [26, 19] },
    { id: 'powerplant', name: 'Power Plant', x: 72, y: 30, w: 26, h: 18, kind: 'powerplant', tasks: ['reactor_align', 'power_route', 'generator', 'fuel_burn'] },
    { id: 'mining', name: 'Mining Facility', x: 4, y: 55, w: 28, h: 16, kind: 'mining', tasks: ['fuel_fill', 'lock_combo', 'db_recover'], outdoor: true },
    { id: 'bunker', name: 'Underground Bunker', x: 38, y: 56, w: 24, h: 15, kind: 'bunker', tasks: ['signal_trace', 'temperature', 'pressure'] },
    { id: 'yard', name: 'Salvage Yard', x: 68, y: 55, w: 30, h: 16, kind: 'mining', tasks: ['magnet', 'cargo_sort'], outdoor: true },
  ],
  halls: [[[30, 12], [36, 12]], [[58, 12], [64, 12]], [[88, 12], [92, 12]],
    [[16, 22], [16, 30]], [[46, 19], [46, 27]], [[76, 22], [76, 30]], [[97, 22], [97, 30], [94, 30]],
    [[26, 38], [30, 38]], [[66, 38], [72, 38]],
    [[16, 47], [16, 55]], [[46, 51], [46, 56]], [[84, 48], [84, 55]],
    [[32, 62], [38, 62]], [[62, 62], [68, 62]]],
  vents: [['residential', 'outpost', 'mining'], ['tower', 'hospital'], ['bunker', 'powerplant', 'plaza'], ['yard', 'market']],
  emergency: 'plaza', spawn: 'plaza', admin: 'outpost', camsRoom: 'bunker', logs: 'hospital',
  sabotages: ['reactor', 'comms', 'power', 'doors'], fix: { reactor: ['powerplant', 'powerplant'], comms: ['tower'], power: ['powerplant'] },
  events: ['sandstorm', 'flicker'], cams: [[28, 38, 'West Gate'], [46, 22, 'North Road'], [69, 38, 'Plant Road'], [46, 53, 'Bunker Stairs']],
  zones: [{ kind: 'sand', x: 30, y: 27, w: 36, h: 24 }, { kind: 'sand', x: 4, y: 55, w: 28, h: 16 }, { kind: 'sand', x: 68, y: 55, w: 30, h: 16 }],
  passages: [[8, 16, 50, 63], [95, 16, 10, 40]],
};

// MAP 5 — HELIOS DREADNOUGHT: a military warship. Security lockdowns, automated turret defense, keycard-restricted rooms, heavy surveillance.
export const HELIOS: MapSpec = {
  // A warship with real decks: a long open spinal gantry down the middle, a cavernous hangar, and
  // a muster deck aft. The keycard rooms stay tight — that restriction is the point of them.
  id: 'helios', name: 'Helios Dreadnought', sub: 'Flagship of the outer fleet, at warp', theme: 'helios', w: 112, h: 74, hallW: 7,
  rooms: [
    { id: 'quarters', name: 'Captain’s Quarters', x: 4, y: 4, w: 18, h: 14, kind: 'quarters', tasks: ['lock_combo', 'file_sort'], restricted: true, window: true },
    { id: 'tactical', name: 'Tactical Command', x: 26, y: 4, w: 24, h: 17, kind: 'tactical', tasks: ['navigation', 'auth', 'upload'], window: true },
    { id: 'weapons', name: 'Weapons Control', x: 54, y: 4, w: 22, h: 16, kind: 'weapons', tasks: ['circuit', 'antenna', 'magnet'], window: true },
    { id: 'hangar', name: 'Hangar', x: 80, y: 4, w: 28, h: 22, kind: 'hangar', tasks: ['fuel_fill', 'cargo_sort', 'download'], window: true, outdoor: true },
    { id: 'armory', name: 'Armory', x: 4, y: 30, w: 18, h: 15, kind: 'armory', tasks: ['db_recover', 'door_calib'], restricted: true },
    { id: 'gantry', name: 'Spinal Gantry', x: 26, y: 29, w: 30, h: 18, kind: 'midway', tasks: ['wires', 'power_route'], outdoor: true },
    { id: 'reactor', name: 'Reactor', x: 60, y: 29, w: 24, h: 18, kind: 'reactor', tasks: ['reactor_align', 'power_route', 'temperature'] },
    { id: 'engineering', name: 'Engineering', x: 88, y: 32, w: 20, h: 16, kind: 'engineering', tasks: ['fuel_burn', 'generator', 'pressure', 'wires'] },
    { id: 'medstation', name: 'Medical Station', x: 4, y: 55, w: 22, h: 15, kind: 'medstation', tasks: ['sample', 'memory', 'chem_mix'] },
    { id: 'prison', name: 'Prison Block', x: 32, y: 55, w: 26, h: 15, kind: 'prison', tasks: ['signal_trace', 'comm_repair', 'wires', 'frequency'] },
    { id: 'muster', name: 'Muster Deck', x: 64, y: 55, w: 30, h: 15, kind: 'cafeteria', tasks: ['file_sort', 'auth'], outdoor: true },
  ],
  halls: [[[22, 11], [26, 11]], [[50, 11], [54, 11]], [[76, 12], [80, 12]],
    [[13, 18], [13, 30]], [[38, 21], [38, 29]], [[66, 20], [66, 29]], [[98, 26], [98, 32]],
    [[22, 38], [26, 38]], [[56, 38], [60, 38]], [[84, 40], [88, 40]],
    [[13, 45], [13, 55]], [[44, 47], [44, 55]], [[72, 47], [72, 55]], [[98, 48], [98, 62], [94, 62]],
    [[26, 62], [32, 62]], [[58, 62], [64, 62]]],
  vents: [['quarters', 'armory', 'medstation'], ['weapons', 'hangar', 'engineering'], ['tactical', 'reactor', 'prison'], ['muster', 'gantry']],
  emergency: 'tactical', spawn: 'tactical', admin: 'tactical', camsRoom: 'prison', logs: 'weapons', keycard: 'tactical',
  sabotages: ['reactor', 'oxygen', 'comms', 'security', 'doors', 'power'], fix: { reactor: ['reactor', 'reactor'], oxygen: ['medstation', 'engineering'], comms: ['weapons'], security: ['prison'], power: ['engineering'] },
  events: ['defense', 'flicker'], cams: [[24, 11, 'Officer Deck'], [78, 12, 'Hangar Approach'], [58, 38, 'Gantry–Reactor Link'], [44, 51, 'Brig Corridor'], [98, 29, 'Engineering Lift']],
  zones: [{ kind: 'turret', x: 22, y: 9, w: 4, h: 5 }, { kind: 'turret', x: 76, y: 10, w: 4, h: 5 }, { kind: 'turret', x: 42, y: 47, w: 4, h: 8 }],
};
