// The 25 interactive minigames and how they combine into crew tasks.
export interface GameDef { id: string; name: string; kind: 'common' | 'short' | 'long'; hint: string; steps?: string[] }
export const GAMES: Record<string, { name: string; hint: string }> = {
  wires: { name: 'Wire Connection', hint: 'Drag each wire to the matching colored socket.' },
  reactor_align: { name: 'Reactor Alignment', hint: 'Rotate the three rings until the slots line up.' },
  memory: { name: 'Memory Sequence', hint: 'Repeat the flashing sequence.' },
  download: { name: 'Data Transfer · Download', hint: 'Download the data packet.' },
  upload: { name: 'Data Transfer · Upload', hint: 'Upload the packet you downloaded.' },
  power_route: { name: 'Power Routing', hint: 'Rotate tiles to route power from source to sink.' },
  frequency: { name: 'Frequency Matching', hint: 'Match the waveform with the two dials.' },
  oxygen_calib: { name: 'Oxygen Calibration', hint: 'Hold each gauge in the green band.' },
  circuit: { name: 'Circuit Repair', hint: 'Replace every burnt component.' },
  chem_mix: { name: 'Chemical Mixing', hint: 'Pour the compounds in the order shown.' },
  auth: { name: 'Security Authentication', hint: 'Type the access code shown on your badge.' },
  navigation: { name: 'Navigation Course', hint: 'Plot a course through every waypoint.' },
  signal_trace: { name: 'Signal Tracing', hint: 'Trace the signal path without lifting.' },
  file_sort: { name: 'File Sorting', hint: 'Drag each file into its category.' },
  pressure: { name: 'Pressure Balancing', hint: 'Balance both chambers at the target.' },
  temperature: { name: 'Temperature Control', hint: 'Set the thermostat to the target reading.' },
  magnet: { name: 'Magnetic Alignment', hint: 'Align the magnets with the field lines.' },
  fuel_fill: { name: 'Fuel Distribution · Fill', hint: 'Hold to fill the canister.' },
  fuel_burn: { name: 'Fuel Distribution · Engine', hint: 'Hold to pour fuel into the engine.' },
  db_recover: { name: 'Database Recovery', hint: 'Find and restore the corrupted records.' },
  antenna: { name: 'Antenna Adjustment', hint: 'Steer the antenna to the strongest signal.' },
  door_calib: { name: 'Door Calibration', hint: 'Stop each bolt in the open zone.' },
  cargo_sort: { name: 'Cargo Sorting', hint: 'Send each crate down the right chute.' },
  sample: { name: 'Sample Analysis', hint: 'Spin the centrifuge, then pick the anomaly.' },
  lock_combo: { name: 'Lock Combination', hint: 'Crack the 3-digit combination using the clues.' },
  generator: { name: 'Generator Startup', hint: 'Prime, crank and stabilise the generator.' },
  comm_repair: { name: 'Communication Repair', hint: 'Re-seat the modules in the relay.' },
  // Starlight Carnival
  ring_toss: { name: 'Ring Toss', hint: 'Time the swing and land three rings on the peg.' },
  balloon_pop: { name: 'Balloon Pop', hint: 'Pop only the colour the barker calls.' },
  strength_test: { name: 'Test of Strength', hint: 'Hold to wind up, release in the green to ring the bell.' },
  whack: { name: 'Whack-a-Gremlin', hint: 'Bop the gremlins and spare the kittens.' },
  cotton_candy: { name: 'Candy Spinner', hint: 'Hold the spin in the green band until the cone is full.' },
  duck_shoot: { name: 'Duck Shoot', hint: 'Tag the ducks as they glide past.' },
  // Verdant Drift
  pollinate: { name: 'Pollination', hint: 'Match each bloom with its pair.' },
  irrigate: { name: 'Irrigation', hint: 'Open a valve under every dry bed, close the rest.' },
};
export const MINIGAME_COUNT = new Set(Object.keys(GAMES).map(g => g.replace(/_(fill|burn)$/, '').replace(/^(download|upload)$/, 'transfer'))).size;

/** Task archetypes: a task is one game, or a chain of steps (long task). */
export const TASKS: GameDef[] = [
  { id: 'ring_toss', name: 'Win a Ringer', kind: 'short', hint: GAMES.ring_toss.hint },
  { id: 'balloon_pop', name: 'Clear the Balloons', kind: 'short', hint: GAMES.balloon_pop.hint },
  { id: 'strength_test', name: 'Ring the Bell', kind: 'short', hint: GAMES.strength_test.hint },
  { id: 'whack', name: 'Clear the Gremlins', kind: 'short', hint: GAMES.whack.hint },
  { id: 'cotton_candy', name: 'Spin Candy Floss', kind: 'long', hint: GAMES.cotton_candy.hint },
  { id: 'duck_shoot', name: 'Win the Duck Shoot', kind: 'short', hint: GAMES.duck_shoot.hint },
  { id: 'pollinate', name: 'Pollinate the Blooms', kind: 'short', hint: GAMES.pollinate.hint },
  { id: 'irrigate', name: 'Irrigate the Beds', kind: 'short', hint: GAMES.irrigate.hint },
  { id: 'wires', name: 'Fix Wiring', kind: 'common', hint: GAMES.wires.hint },
  { id: 'auth', name: 'Authenticate ID', kind: 'common', hint: GAMES.auth.hint },
  { id: 'transfer', name: 'Transfer Data', kind: 'long', hint: 'Download, then upload at the Command station.', steps: ['download', 'upload'] },
  { id: 'fuel', name: 'Refuel Engines', kind: 'long', hint: 'Fill a canister, then fuel the engine.', steps: ['fuel_fill', 'fuel_burn'] },
  { id: 'sample', name: 'Analyse Sample', kind: 'long', hint: GAMES.sample.hint },
  { id: 'generator', name: 'Start Generator', kind: 'long', hint: GAMES.generator.hint },
  ...['reactor_align', 'memory', 'power_route', 'frequency', 'oxygen_calib', 'circuit', 'chem_mix', 'navigation', 'signal_trace', 'file_sort', 'pressure', 'temperature', 'magnet', 'db_recover', 'antenna', 'door_calib', 'cargo_sort', 'lock_combo', 'comm_repair']
    .map(g => ({ id: g, name: GAMES[g].name, kind: 'short' as const, hint: GAMES[g].hint })),
];
