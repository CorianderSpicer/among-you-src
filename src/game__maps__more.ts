import type { MapSpec } from './game__maps__builder';

// MAP 2 — FROSTFALL RESEARCH: a facility under an icy alien world. Blizzards, slippery ice tunnels, cold snow fields, heating failure.
export const FROSTFALL: MapSpec = {
  id: 'frostfall', name: 'Frostfall Research', sub: 'Under the ice of a frozen moon', theme: 'frostfall', w: 92, h: 64,
  rooms: [
    { id: 'entrance', name: 'Snow Entrance', x: 4, y: 4, w: 18, h: 12, kind: 'entrance', tasks: ['fuel_fill', 'antenna'], outdoor: true },
    { id: 'tunnels', name: 'Ice Tunnels', x: 30, y: 6, w: 30, h: 8, kind: 'tunnel', tasks: ['magnet', 'signal_trace'], vent: [15, 5] },
    { id: 'dome', name: 'Observation Dome', x: 68, y: 4, w: 18, h: 14, kind: 'dome', tasks: ['navigation', 'frequency', 'download'], window: true },
    { id: 'research', name: 'Research Center', x: 4, y: 26, w: 16, h: 13, kind: 'research', tasks: ['chem_mix', 'circuit', 'upload'] },
    { id: 'cryo', name: 'Cryogenic Lab', x: 30, y: 24, w: 18, h: 14, kind: 'cryo', tasks: ['wires', 'temperature', 'sample'], window: true },
    { id: 'thermal', name: 'Thermal Chamber', x: 58, y: 26, w: 14, h: 12, kind: 'thermal', tasks: ['pressure', 'reactor_align', 'auth'] },
    { id: 'generator', name: 'Underground Generator', x: 8, y: 48, w: 16, h: 12, kind: 'generator', tasks: ['fuel_burn', 'generator', 'power_route'] },
    { id: 'specimen', name: 'Specimen Storage', x: 40, y: 48, w: 16, h: 12, kind: 'specimen', tasks: ['cargo_sort', 'db_recover', 'lock_combo', 'memory'] },
  ],
  halls: [[[21, 10], [30, 10]], [[59, 10], [68, 10]], [[12, 15], [12, 26]], [[44, 13], [44, 24]], [[76, 17], [76, 22], [66, 22], [66, 26]], [[19, 32], [30, 32]], [[47, 31], [58, 31]],
    [[14, 38], [14, 48]], [[42, 37], [42, 43], [48, 43], [48, 48]], [[23, 54], [40, 54]], [[64, 37], [64, 53], [55, 53]]],
  vents: [['entrance', 'research'], ['tunnels', 'dome', 'cryo'], ['thermal', 'specimen', 'generator']],
  emergency: 'cryo', spawn: 'cryo', admin: 'research', camsRoom: 'research', logs: 'cryo',
  sabotages: ['lifesupport', 'comms', 'power', 'doors'], fix: { lifesupport: ['thermal', 'generator'], comms: ['dome'], power: ['generator'] },
  events: ['blizzard', 'freeze'], cams: [[25, 10, 'Tunnel Mouth'], [44, 19, 'Central Shaft'], [14, 43, 'Lower Stairs'], [60, 45, 'East Passage']],
  zones: [{ kind: 'ice', x: 30, y: 6, w: 30, h: 8 }, { kind: 'cold', x: 4, y: 4, w: 18, h: 12 }, { kind: 'ice', x: 63, y: 37, w: 3, h: 17 }],
};

// MAP 3 — ABYSSAL STATION: underwater research base. Leaks, a flooded corridor, flooding & pressure sabotage, bulkhead doors.
export const ABYSSAL: MapSpec = {
  id: 'abyssal', name: 'Abyssal Station', sub: 'Four kilometres below the surface', theme: 'abyssal', w: 94, h: 62,
  rooms: [
    { id: 'aquarium', name: 'Aquarium', x: 4, y: 6, w: 18, h: 13, kind: 'aquarium', tasks: ['sample', 'temperature'], window: true },
    { id: 'command', name: 'Command Room', x: 38, y: 4, w: 18, h: 12, kind: 'command', tasks: ['navigation', 'auth', 'upload'], window: true },
    { id: 'oxy', name: 'Oxygen Storage', x: 72, y: 6, w: 16, h: 12, kind: 'oxystore', tasks: ['oxygen_calib', 'fuel_fill', 'wires'] },
    { id: 'flooded', name: 'Flooded Corridor', x: 30, y: 26, w: 34, h: 8, kind: 'flooded', tasks: ['circuit', 'signal_trace'], vent: [17, 5] },
    { id: 'pressure', name: 'Pressure Control', x: 4, y: 28, w: 16, h: 12, kind: 'pressure', tasks: ['pressure', 'reactor_align', 'magnet'] },
    { id: 'power', name: 'Power Station', x: 74, y: 28, w: 16, h: 12, kind: 'power', tasks: ['power_route', 'generator', 'fuel_burn'] },
    { id: 'dock', name: 'Submarine Dock', x: 10, y: 48, w: 22, h: 12, kind: 'dock', tasks: ['cargo_sort', 'antenna', 'lock_combo'], window: true },
    { id: 'deeplab', name: 'Deep Research Lab', x: 56, y: 48, w: 18, h: 12, kind: 'deeplab', tasks: ['chem_mix', 'db_recover', 'download', 'memory'], window: true },
  ],
  halls: [[[21, 10], [38, 10]], [[55, 10], [72, 10]], [[12, 18], [12, 28]], [[46, 15], [46, 26]], [[80, 17], [80, 28]], [[19, 30], [30, 30]], [[63, 30], [74, 30]],
    [[14, 39], [14, 48]], [[36, 33], [36, 41], [24, 41], [24, 48]], [[58, 33], [58, 48]], [[31, 54], [56, 54]], [[82, 39], [82, 52], [73, 52]]],
  vents: [['aquarium', 'pressure', 'dock'], ['command', 'flooded', 'deeplab'], ['oxy', 'power']],
  emergency: 'command', spawn: 'command', admin: 'command', camsRoom: 'pressure', logs: 'deeplab',
  sabotages: ['pressure', 'flood', 'oxygen', 'comms', 'power', 'doors'], fix: { pressure: ['pressure', 'dock'], flood: ['flooded', 'power'], oxygen: ['oxy', 'command'], comms: ['command'], power: ['power'] },
  events: ['leak', 'flicker'], cams: [[28, 10, 'Aquarium Hall'], [64, 10, 'North Ring'], [47, 30, 'Flood Line'], [44, 54, 'Dock Tunnel']],
  zones: [{ kind: 'water', x: 30, y: 26, w: 34, h: 8 }],
};

// MAP 4 — THE LOST COLONY: an abandoned desert settlement. Sandstorms, hidden underground passages, unstable power.
export const COLONY: MapSpec = {
  id: 'colony', name: 'The Lost Colony', sub: 'An abandoned settlement on a desert world', theme: 'colony', w: 96, h: 66,
  rooms: [
    { id: 'residential', name: 'Residential Area', x: 4, y: 4, w: 20, h: 13, kind: 'residential', tasks: ['wires', 'file_sort', 'memory'] },
    { id: 'tower', name: 'Communications Tower', x: 40, y: 4, w: 14, h: 10, kind: 'tower', tasks: ['antenna', 'frequency', 'download'] },
    { id: 'hospital', name: 'Hospital', x: 70, y: 4, w: 18, h: 13, kind: 'hospital', tasks: ['sample', 'chem_mix', 'auth'] },
    { id: 'outpost', name: 'Research Outpost', x: 4, y: 26, w: 18, h: 12, kind: 'outpost', tasks: ['upload', 'circuit', 'navigation'] },
    { id: 'plaza', name: 'Central Plaza', x: 34, y: 22, w: 26, h: 20, kind: 'plaza', tasks: ['magnet', 'cargo_sort'], outdoor: true, vent: [20, 15] },
    { id: 'mining', name: 'Mining Facility', x: 4, y: 46, w: 22, h: 14, kind: 'mining', tasks: ['fuel_fill', 'lock_combo', 'db_recover'], outdoor: true },
    { id: 'bunker', name: 'Underground Bunker', x: 40, y: 52, w: 16, h: 10, kind: 'bunker', tasks: ['signal_trace', 'temperature', 'pressure'] },
    { id: 'powerplant', name: 'Power Plant', x: 72, y: 44, w: 18, h: 14, kind: 'powerplant', tasks: ['reactor_align', 'power_route', 'generator', 'fuel_burn'] },
  ],
  halls: [[[23, 9], [40, 9]], [[53, 9], [70, 9]], [[47, 13], [47, 22]], [[12, 16], [12, 26]], [[21, 31], [34, 31]], [[78, 16], [78, 30], [59, 30]], [[12, 37], [12, 46]],
    [[47, 41], [47, 52]], [[59, 38], [66, 38], [66, 50], [72, 50]], [[25, 56], [40, 56]], [[84, 16], [84, 44]]],
  vents: [['residential', 'outpost', 'mining'], ['tower', 'hospital'], ['bunker', 'powerplant', 'plaza']],
  emergency: 'plaza', spawn: 'plaza', admin: 'outpost', camsRoom: 'bunker', logs: 'hospital',
  sabotages: ['reactor', 'comms', 'power', 'doors'], fix: { reactor: ['powerplant', 'powerplant'], comms: ['tower'], power: ['powerplant'] },
  events: ['sandstorm', 'flicker'], cams: [[30, 31, 'West Gate'], [47, 17, 'North Road'], [66, 44, 'Plant Road'], [47, 47, 'Bunker Stairs']],
  zones: [{ kind: 'sand', x: 34, y: 22, w: 26, h: 20 }, { kind: 'sand', x: 4, y: 46, w: 22, h: 14 }],
  passages: [[6, 14, 53, 59], [86, 14, 6, 35]],
};

// MAP 5 — HELIOS DREADNOUGHT: a military warship. Security lockdowns, automated turret defense, keycard-restricted rooms, heavy surveillance.
export const HELIOS: MapSpec = {
  id: 'helios', name: 'Helios Dreadnought', sub: 'Flagship of the outer fleet, at warp', theme: 'helios', w: 100, h: 66,
  rooms: [
    { id: 'quarters', name: 'Captain’s Quarters', x: 4, y: 4, w: 14, h: 11, kind: 'quarters', tasks: ['lock_combo', 'file_sort'], restricted: true, window: true },
    { id: 'tactical', name: 'Tactical Command', x: 26, y: 4, w: 18, h: 12, kind: 'tactical', tasks: ['navigation', 'auth', 'upload'], window: true },
    { id: 'weapons', name: 'Weapons Control', x: 52, y: 4, w: 16, h: 11, kind: 'weapons', tasks: ['circuit', 'antenna', 'magnet'], window: true },
    { id: 'hangar', name: 'Hangar', x: 76, y: 4, w: 20, h: 16, kind: 'hangar', tasks: ['fuel_fill', 'cargo_sort', 'download'], window: true },
    { id: 'armory', name: 'Armory', x: 4, y: 26, w: 14, h: 12, kind: 'armory', tasks: ['db_recover', 'door_calib'], restricted: true },
    { id: 'medstation', name: 'Medical Station', x: 26, y: 26, w: 16, h: 12, kind: 'medstation', tasks: ['sample', 'memory', 'chem_mix'] },
    { id: 'reactor', name: 'Reactor', x: 50, y: 26, w: 18, h: 14, kind: 'reactor', tasks: ['reactor_align', 'power_route', 'temperature'] },
    { id: 'engineering', name: 'Engineering', x: 76, y: 30, w: 20, h: 14, kind: 'engineering', tasks: ['fuel_burn', 'generator', 'pressure', 'wires'] },
    { id: 'prison', name: 'Prison Block', x: 28, y: 50, w: 22, h: 12, kind: 'prison', tasks: ['signal_trace', 'comm_repair', 'wires', 'frequency'] },
  ],
  halls: [[[17, 9], [26, 9]], [[43, 9], [52, 9]], [[67, 9], [76, 9]], [[10, 14], [10, 26]], [[34, 15], [34, 26]], [[60, 14], [60, 26]], [[86, 19], [86, 30]],
    [[17, 31], [26, 31]], [[41, 32], [50, 32]], [[67, 34], [76, 34]], [[34, 37], [34, 50]], [[56, 39], [56, 55], [49, 55]]],
  vents: [['quarters', 'armory', 'medstation'], ['weapons', 'hangar', 'engineering'], ['tactical', 'reactor', 'prison']],
  emergency: 'tactical', spawn: 'tactical', admin: 'tactical', camsRoom: 'prison', logs: 'weapons', keycard: 'tactical',
  sabotages: ['reactor', 'oxygen', 'comms', 'security', 'doors', 'power'], fix: { reactor: ['reactor', 'reactor'], oxygen: ['medstation', 'engineering'], comms: ['weapons'], security: ['prison'], power: ['engineering'] },
  events: ['defense', 'flicker'], cams: [[22, 9, 'Officer Deck'], [72, 9, 'Hangar Approach'], [46, 32, 'Med-Reactor Link'], [34, 44, 'Brig Corridor'], [86, 25, 'Engineering Lift']],
  zones: [{ kind: 'turret', x: 17, y: 8, w: 10, h: 3 }, { kind: 'turret', x: 67, y: 8, w: 10, h: 3 }, { kind: 'turret', x: 33, y: 38, w: 3, h: 12 }],
};
