// Deterministic room decoration: each room kind has a template of props placed along walls / in the centre,
// never blocking doors, task panels or the central walking lanes.
import { TILE } from './game__core__constants';
import type { Rect } from './game__core__types';
import type { Room, Spot } from './game__maps__builder';

export interface PropSpec { t: string; x: number; y: number; w: number; h: number; solid?: Rect; v?: number; room?: string }
// `edges` is the one to reach for with small clutter. Scattering a fixture into open floor reads as
// litter dropped at random; the same fixture tucked into the perimeter band reads as a room someone
// maintains. Genuinely spread-out things — drifts, puddles, blown sand, ground cover — keep `scatter`.
type Place = { t: string; at: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'corners' | 'scatter' | 'grid' | 'edges'; n: number; w: number; h: number; solid?: boolean; pad?: number };

const T: Record<string, Place[]> = {
  bridge: [{ t: 'holotable', at: 'center', n: 1, w: 3, h: 2, solid: true }, { t: 'console', at: 'bottom', n: 3, w: 2, h: 1, solid: true }, { t: 'rug', at: 'center', n: 1, w: 7, h: 4 }, { t: 'console', at: 'right', n: 2, w: 1, h: 2, solid: true }, { t: 'chair', at: 'scatter', n: 3, w: 1, h: 1 }, { t: 'plant', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'runner', at: 'center', n: 1, w: 5, h: 2 }, { t: 'supplybox', at: 'corners', n: 1, w: 1, h: 1, solid: true }, { t: 'grate', at: 'edges', n: 2, w: 1, h: 1 }],
  reactor: [{ t: 'reactor', at: 'center', n: 1, w: 5, h: 4, solid: true }, { t: 'console', at: 'bottom', n: 2, w: 2, h: 1, solid: true }, { t: 'pipes_v', at: 'left', n: 2, w: 1, h: 3, solid: true }, { t: 'barrel', at: 'corners', n: 3, w: 1, h: 1, solid: true }, { t: 'hazard', at: 'edges', n: 1, w: 2, h: 1 }, { t: 'gaugepanel', at: 'top', n: 3, w: 1, h: 1 }, { t: 'grate', at: 'edges', n: 4, w: 1, h: 1 }, { t: 'floorvalve', at: 'edges', n: 2, w: 1, h: 1 }, { t: 'supplybox', at: 'edges', n: 2, w: 1, h: 1, solid: true }],
  medbay: [{ t: 'bed', at: 'left', n: 3, w: 2, h: 1, solid: true }, { t: 'tank', at: 'bottom', n: 2, w: 1, h: 1, solid: true }, { t: 'scanner', at: 'center', n: 1, w: 2, h: 2 }, { t: 'cabinet', at: 'right', n: 2, w: 1, h: 1, solid: true }, { t: 'plant', at: 'corners', n: 1, w: 1, h: 1, solid: true }, { t: 'runner', at: 'center', n: 1, w: 5, h: 3 }, { t: 'cabinet', at: 'top', n: 2, w: 1, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'bin', at: 'corners', n: 1, w: 1, h: 1, solid: true }, { t: 'panelpatch', at: 'edges', n: 2, w: 2, h: 2 }],
  security: [{ t: 'console', at: 'bottom', n: 3, w: 2, h: 1, solid: true }, { t: 'rug', at: 'center', n: 1, w: 5, h: 3 }, { t: 'rack', at: 'right', n: 2, w: 1, h: 2, solid: true }, { t: 'chair', at: 'scatter', n: 2, w: 1, h: 1 }, { t: 'locker', at: 'left', n: 2, w: 1, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'supplybox', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'panelpatch', at: 'edges', n: 2, w: 2, h: 2 }, { t: 'bin', at: 'corners', n: 1, w: 1, h: 1, solid: true }],
  cafeteria: [{ t: 'table_round', at: 'grid', n: 4, w: 3, h: 3, solid: true }, { t: 'vending', at: 'left', n: 2, w: 1, h: 1, solid: true }, { t: 'plant', at: 'corners', n: 3, w: 1, h: 1, solid: true }, { t: 'bin', at: 'right', n: 1, w: 1, h: 1, solid: true }, { t: 'bench_seat', at: 'scatter', n: 3, w: 3, h: 1, solid: true }, { t: 'bin', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'panelpatch', at: 'edges', n: 3, w: 2, h: 2 }, { t: 'shelf', at: 'top', n: 2, w: 1, h: 1, solid: true }],
  garden: [{ t: 'garden_bed', at: 'grid', n: 4, w: 3, h: 2, solid: true }, { t: 'tree', at: 'corners', n: 2, w: 2, h: 2, solid: true }, { t: 'oxytank', at: 'right', n: 2, w: 1, h: 1, solid: true }, { t: 'plant', at: 'scatter', n: 3, w: 1, h: 1, solid: true }, { t: 'grasstuft', at: 'scatter', n: 5, w: 2, h: 2 }, { t: 'labbench', at: 'bottom', n: 1, w: 3, h: 1, solid: true }, { t: 'floorvalve', at: 'edges', n: 2, w: 1, h: 1 }, { t: 'bin', at: 'corners', n: 1, w: 1, h: 1, solid: true }],
  engine: [{ t: 'engine', at: 'center', n: 1, w: 4, h: 4, solid: true }, { t: 'rack', at: 'left', n: 1, w: 1, h: 2, solid: true }, { t: 'barrel', at: 'edges', n: 2, w: 1, h: 1, solid: true }, { t: 'pipes_v', at: 'right', n: 2, w: 1, h: 3, solid: true }, { t: 'crate', at: 'corners', n: 3, w: 1, h: 1, solid: true }, { t: 'hazard', at: 'edges', n: 1, w: 2, h: 1 }, { t: 'gaugepanel', at: 'top', n: 3, w: 1, h: 1 }, { t: 'floorvalve', at: 'edges', n: 3, w: 1, h: 1 }, { t: 'grate', at: 'edges', n: 4, w: 1, h: 1 }, { t: 'supplybox', at: 'edges', n: 2, w: 1, h: 1, solid: true }],
  lab: [{ t: 'labbench', at: 'bottom', n: 2, w: 3, h: 1, solid: true }, { t: 'labbench', at: 'left', n: 1, w: 1, h: 3, solid: true }, { t: 'plant', at: 'corners', n: 1, w: 1, h: 1, solid: true }, { t: 'tank', at: 'right', n: 3, w: 1, h: 1, solid: true }, { t: 'holotable', at: 'center', n: 1, w: 3, h: 2, solid: true }, { t: 'cabinet', at: 'left', n: 1, w: 1, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'bin', at: 'corners', n: 1, w: 1, h: 1, solid: true }, { t: 'panelpatch', at: 'edges', n: 2, w: 2, h: 2 }, { t: 'shelf', at: 'top', n: 2, w: 1, h: 1, solid: true }, { t: 'chair', at: 'scatter', n: 2, w: 1, h: 1 }],
  comms: [{ t: 'dish', at: 'center', n: 1, w: 3, h: 3, solid: true }, { t: 'rack', at: 'right', n: 2, w: 1, h: 2, solid: true }, { t: 'crate', at: 'corners', n: 1, w: 1, h: 1, solid: true }, { t: 'rack', at: 'left', n: 2, w: 1, h: 2, solid: true }, { t: 'console', at: 'bottom', n: 1, w: 2, h: 1, solid: true }, { t: 'chair', at: 'scatter', n: 1, w: 1, h: 1 }, { t: 'gaugepanel', at: 'top', n: 3, w: 1, h: 1 }, { t: 'desk', at: 'bottom', n: 1, w: 3, h: 1, solid: true }, { t: 'chair', at: 'scatter', n: 2, w: 1, h: 1 }, { t: 'supplybox', at: 'edges', n: 2, w: 1, h: 1, solid: true }, { t: 'panelpatch', at: 'edges', n: 2, w: 2, h: 2 }],
  cargo: [{ t: 'crates', at: 'corners', n: 4, w: 2, h: 2, solid: true }, { t: 'crate', at: 'edges', n: 4, w: 1, h: 1, solid: true }, { t: 'barrel', at: 'left', n: 2, w: 1, h: 1, solid: true }, { t: 'hazard', at: 'edges', n: 1, w: 2, h: 1 }, { t: 'chute', at: 'corners', n: 1, w: 3, h: 3, solid: true }, { t: 'supplybox', at: 'edges', n: 4, w: 1, h: 1, solid: true }, { t: 'grate', at: 'edges', n: 3, w: 1, h: 1 }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }],
  lounge: [{ t: 'sofa', at: 'bottom', n: 2, w: 3, h: 1, solid: true }, { t: 'plant', at: 'corners', n: 4, w: 1, h: 1, solid: true }, { t: 'rug', at: 'center', n: 1, w: 6, h: 3 }, { t: 'vending', at: 'right', n: 1, w: 1, h: 1, solid: true }, { t: 'table_round', at: 'grid', n: 2, w: 3, h: 3, solid: true }, { t: 'bench_seat', at: 'scatter', n: 2, w: 3, h: 1, solid: true }, { t: 'lamp', at: 'top', n: 3, w: 1, h: 1 }, { t: 'bin', at: 'corners', n: 1, w: 1, h: 1, solid: true }, { t: 'panelpatch', at: 'edges', n: 2, w: 2, h: 2 }],
  // Frostfall
  cryo: [{ t: 'cryopod', at: 'left', n: 3, w: 1, h: 2, solid: true }, { t: 'cryopod', at: 'right', n: 2, w: 1, h: 2, solid: true }, { t: 'icecrystal', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'console', at: 'bottom', n: 1, w: 2, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 3, w: 1, h: 1 }, { t: 'icepatch', at: 'scatter', n: 4, w: 2, h: 2 }, { t: 'snowdrift', at: 'scatter', n: 3, w: 2, h: 1 }, { t: 'heater', at: 'corners', n: 1, w: 1, h: 1, solid: true }, { t: 'supplybox', at: 'corners', n: 2, w: 1, h: 1, solid: true }],
  tunnel: [{ t: 'icecrystal', at: 'edges', n: 6, w: 1, h: 1, solid: true }, { t: 'snowpile', at: 'scatter', n: 6, w: 2, h: 1 }, { t: 'lamp', at: 'top', n: 3, w: 1, h: 1 }, { t: 'icepatch', at: 'scatter', n: 5, w: 2, h: 2 }, { t: 'rock', at: 'scatter', n: 3, w: 1, h: 1, solid: true }, { t: 'supplybox', at: 'edges', n: 2, w: 1, h: 1, solid: true }, { t: 'pipes_v', at: 'corners', n: 2, w: 1, h: 3, solid: true }],
  generator: [{ t: 'generator', at: 'center', n: 1, w: 4, h: 3, solid: true }, { t: 'barrel', at: 'corners', n: 3, w: 1, h: 1, solid: true }, { t: 'pipes_v', at: 'left', n: 1, w: 1, h: 3, solid: true }, { t: 'hazard', at: 'edges', n: 1, w: 2, h: 1 }, { t: 'gaugepanel', at: 'top', n: 3, w: 1, h: 1 }, { t: 'floorvalve', at: 'edges', n: 2, w: 1, h: 1 }, { t: 'grate', at: 'edges', n: 3, w: 1, h: 1 }, { t: 'locker', at: 'corners', n: 1, w: 1, h: 1, solid: true }],
  research: [{ t: 'labbench', at: 'bottom', n: 2, w: 3, h: 1, solid: true }, { t: 'holotable', at: 'center', n: 1, w: 3, h: 2, solid: true }, { t: 'rack', at: 'right', n: 2, w: 1, h: 2, solid: true }, { t: 'heater', at: 'corners', n: 1, w: 1, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'tank', at: 'right', n: 2, w: 1, h: 1, solid: true }, { t: 'chair', at: 'scatter', n: 2, w: 1, h: 1 }, { t: 'cabinet', at: 'left', n: 2, w: 1, h: 1, solid: true }, { t: 'panelpatch', at: 'edges', n: 2, w: 2, h: 2 }],
  dome: [{ t: 'telescope', at: 'center', n: 1, w: 3, h: 3, solid: true }, { t: 'chair', at: 'scatter', n: 3, w: 1, h: 1 }, { t: 'plant', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'console', at: 'bottom', n: 2, w: 2, h: 1, solid: true }, { t: 'runner', at: 'center', n: 1, w: 6, h: 3 }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'rack', at: 'left', n: 1, w: 1, h: 2, solid: true }, { t: 'icecrystal', at: 'edges', n: 2, w: 1, h: 1, solid: true }],
  thermal: [{ t: 'heater', at: 'left', n: 2, w: 1, h: 1, solid: true }, { t: 'heater', at: 'right', n: 2, w: 1, h: 1, solid: true }, { t: 'pipes_v', at: 'corners', n: 2, w: 1, h: 3, solid: true }, { t: 'hazard', at: 'edges', n: 1, w: 2, h: 1 }, { t: 'gaugepanel', at: 'top', n: 3, w: 1, h: 1 }, { t: 'grate', at: 'edges', n: 4, w: 1, h: 1 }, { t: 'floorvalve', at: 'edges', n: 3, w: 1, h: 1 }, { t: 'barrel', at: 'edges', n: 2, w: 1, h: 1, solid: true }, { t: 'supplybox', at: 'corners', n: 2, w: 1, h: 1, solid: true }],
  specimen: [{ t: 'tank', at: 'left', n: 3, w: 1, h: 1, solid: true }, { t: 'tank', at: 'right', n: 3, w: 1, h: 1, solid: true }, { t: 'crate', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'labbench', at: 'bottom', n: 1, w: 3, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'aquarium', at: 'center', n: 1, w: 3, h: 2, solid: true }, { t: 'cabinet', at: 'top', n: 2, w: 1, h: 1, solid: true }, { t: 'icepatch', at: 'scatter', n: 3, w: 2, h: 2 }, { t: 'bin', at: 'corners', n: 1, w: 1, h: 1, solid: true }],
  entrance: [{ t: 'snowpile', at: 'scatter', n: 8, w: 2, h: 1 }, { t: 'sled', at: 'corners', n: 1, w: 3, h: 2, solid: true }, { t: 'crate', at: 'edges', n: 3, w: 1, h: 1, solid: true }, { t: 'icecrystal', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'sled', at: 'corners', n: 1, w: 3, h: 2, solid: true }, { t: 'locker', at: 'right', n: 2, w: 1, h: 1, solid: true }, { t: 'heater', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'snowdrift', at: 'scatter', n: 4, w: 2, h: 1 }, { t: 'flag', at: 'top', n: 2, w: 1, h: 1 }],
  // Abyssal
  aquarium: [{ t: 'aquarium', at: 'center', n: 1, w: 5, h: 2, solid: true }, { t: 'coral', at: 'corners', n: 3, w: 1, h: 1, solid: true }, { t: 'bench_seat', at: 'bottom', n: 2, w: 3, h: 1, solid: true }, { t: 'coral', at: 'scatter', n: 4, w: 1, h: 1, solid: true }, { t: 'puddle', at: 'scatter', n: 4, w: 2, h: 1 }, { t: 'lamp', at: 'top', n: 3, w: 1, h: 1 }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'plant', at: 'corners', n: 2, w: 1, h: 1, solid: true }],
  dock: [{ t: 'pool', at: 'center', n: 1, w: 6, h: 4, solid: true }, { t: 'crate', at: 'corners', n: 3, w: 1, h: 1, solid: true }, { t: 'barrel', at: 'edges', n: 2, w: 1, h: 1, solid: true }, { t: 'oxytank', at: 'right', n: 3, w: 1, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 3, w: 1, h: 1 }, { t: 'puddle', at: 'scatter', n: 4, w: 2, h: 1 }, { t: 'chute', at: 'corners', n: 1, w: 3, h: 3, solid: true }, { t: 'rack', at: 'left', n: 2, w: 1, h: 2, solid: true }],
  pressure: [{ t: 'gauges', at: 'left', n: 2, w: 1, h: 2, solid: true }, { t: 'pipes_v', at: 'right', n: 2, w: 1, h: 3, solid: true }, { t: 'console', at: 'bottom', n: 2, w: 2, h: 1, solid: true }, { t: 'floorvalve', at: 'edges', n: 3, w: 1, h: 1 }, { t: 'grate', at: 'edges', n: 4, w: 1, h: 1 }, { t: 'gaugepanel', at: 'top', n: 3, w: 1, h: 1 }, { t: 'barrel', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'supplybox', at: 'edges', n: 2, w: 1, h: 1, solid: true }],
  deeplab: [{ t: 'labbench', at: 'bottom', n: 2, w: 3, h: 1, solid: true }, { t: 'tank', at: 'left', n: 3, w: 1, h: 1, solid: true }, { t: 'aquarium', at: 'center', n: 1, w: 3, h: 2, solid: true }, { t: 'coral', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'cabinet', at: 'right', n: 2, w: 1, h: 1, solid: true }, { t: 'chair', at: 'scatter', n: 2, w: 1, h: 1 }, { t: 'puddle', at: 'scatter', n: 3, w: 2, h: 1 }],
  flooded: [{ t: 'puddle', at: 'scatter', n: 6, w: 2, h: 1 }, { t: 'pipes_v', at: 'corners', n: 2, w: 1, h: 3, solid: true }, { t: 'barrel', at: 'edges', n: 2, w: 1, h: 1, solid: true }, { t: 'coral', at: 'scatter', n: 4, w: 1, h: 1, solid: true }, { t: 'grate', at: 'edges', n: 3, w: 1, h: 1 }, { t: 'crate', at: 'edges', n: 2, w: 1, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }],
  power: [{ t: 'generator', at: 'center', n: 1, w: 4, h: 3, solid: true }, { t: 'rack', at: 'left', n: 2, w: 1, h: 2, solid: true }, { t: 'hazard', at: 'edges', n: 1, w: 2, h: 1 }, { t: 'gaugepanel', at: 'top', n: 3, w: 1, h: 1 }, { t: 'floorvalve', at: 'edges', n: 2, w: 1, h: 1 }, { t: 'grate', at: 'edges', n: 4, w: 1, h: 1 }, { t: 'barrel', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'supplybox', at: 'edges', n: 2, w: 1, h: 1, solid: true }],
  command: [{ t: 'holotable', at: 'center', n: 1, w: 3, h: 2, solid: true }, { t: 'console', at: 'bottom', n: 3, w: 2, h: 1, solid: true }, { t: 'coral', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'chair', at: 'scatter', n: 3, w: 1, h: 1 }, { t: 'runner', at: 'center', n: 1, w: 6, h: 3 }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'rack', at: 'left', n: 2, w: 1, h: 2, solid: true }, { t: 'lamp', at: 'top', n: 3, w: 1, h: 1 }],
  oxystore: [{ t: 'oxytank', at: 'left', n: 3, w: 1, h: 1, solid: true }, { t: 'oxytank', at: 'right', n: 3, w: 1, h: 1, solid: true }, { t: 'crates', at: 'corners', n: 2, w: 2, h: 2, solid: true }, { t: 'gaugepanel', at: 'top', n: 3, w: 1, h: 1 }, { t: 'floorvalve', at: 'edges', n: 2, w: 1, h: 1 }, { t: 'grate', at: 'edges', n: 3, w: 1, h: 1 }, { t: 'shelf', at: 'top', n: 3, w: 1, h: 1, solid: true }, { t: 'supplybox', at: 'edges', n: 2, w: 1, h: 1, solid: true }],
  // Lost Colony
  residential: [{ t: 'ruinbed', at: 'left', n: 2, w: 2, h: 1, solid: true }, { t: 'table_round', at: 'center', n: 1, w: 3, h: 3, solid: true }, { t: 'shelf', at: 'right', n: 2, w: 1, h: 1, solid: true }, { t: 'debris', at: 'scatter', n: 4, w: 1, h: 1 }, { t: 'cabinet', at: 'top', n: 2, w: 1, h: 1, solid: true }, { t: 'sandpatch', at: 'scatter', n: 4, w: 3, h: 2 }, { t: 'bin', at: 'corners', n: 1, w: 1, h: 1, solid: true }, { t: 'lamp', at: 'top', n: 2, w: 1, h: 1 }, { t: 'sofa', at: 'bottom', n: 1, w: 3, h: 1, solid: true }],
  hospital: [{ t: 'bed', at: 'left', n: 3, w: 2, h: 1, solid: true }, { t: 'cabinet', at: 'right', n: 2, w: 1, h: 1, solid: true }, { t: 'debris', at: 'scatter', n: 3, w: 1, h: 1 }, { t: 'scanner', at: 'center', n: 1, w: 2, h: 2 }, { t: 'labbench', at: 'bottom', n: 1, w: 3, h: 1, solid: true }, { t: 'sandpatch', at: 'scatter', n: 3, w: 3, h: 2 }, { t: 'tank', at: 'right', n: 2, w: 1, h: 1, solid: true }, { t: 'bin', at: 'corners', n: 1, w: 1, h: 1, solid: true }],
  plaza: [{ t: 'fountain', at: 'center', n: 1, w: 4, h: 4, solid: true }, { t: 'alienplant', at: 'corners', n: 4, w: 1, h: 1, solid: true }, { t: 'rock', at: 'scatter', n: 4, w: 1, h: 1, solid: true }, { t: 'dune', at: 'scatter', n: 4, w: 3, h: 1 }, { t: 'bench_seat', at: 'scatter', n: 4, w: 3, h: 1, solid: true }, { t: 'tent', at: 'corners', n: 2, w: 3, h: 2, solid: true }, { t: 'grasstuft', at: 'scatter', n: 4, w: 2, h: 2 }, { t: 'lamp', at: 'top', n: 3, w: 1, h: 1 }],
  mining: [{ t: 'drill', at: 'center', n: 1, w: 3, h: 3, solid: true }, { t: 'cart', at: 'left', n: 2, w: 2, h: 1, solid: true }, { t: 'rock', at: 'corners', n: 3, w: 1, h: 1, solid: true }, { t: 'crate', at: 'edges', n: 2, w: 1, h: 1, solid: true }, { t: 'supplybox', at: 'edges', n: 3, w: 1, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'barrel', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'sandpatch', at: 'scatter', n: 4, w: 3, h: 2 }, { t: 'pipes_v', at: 'left', n: 1, w: 1, h: 3, solid: true }],
  bunker: [{ t: 'bunk', at: 'left', n: 2, w: 2, h: 1, solid: true }, { t: 'crates', at: 'corners', n: 2, w: 2, h: 2, solid: true }, { t: 'locker', at: 'right', n: 2, w: 1, h: 1, solid: true }, { t: 'console', at: 'bottom', n: 2, w: 2, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'shelf', at: 'top', n: 3, w: 1, h: 1, solid: true }, { t: 'supplybox', at: 'edges', n: 3, w: 1, h: 1, solid: true }, { t: 'sandpatch', at: 'scatter', n: 2, w: 3, h: 2 }],
  tower: [{ t: 'dish', at: 'center', n: 1, w: 3, h: 3, solid: true }, { t: 'rack', at: 'left', n: 2, w: 1, h: 2, solid: true }, { t: 'debris', at: 'scatter', n: 3, w: 1, h: 1 }, { t: 'console', at: 'bottom', n: 2, w: 2, h: 1, solid: true }, { t: 'solar', at: 'corners', n: 2, w: 2, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'sandpatch', at: 'scatter', n: 3, w: 3, h: 2 }, { t: 'crate', at: 'edges', n: 2, w: 1, h: 1, solid: true }],
  powerplant: [{ t: 'reactor', at: 'center', n: 1, w: 5, h: 4, solid: true }, { t: 'solar', at: 'corners', n: 2, w: 2, h: 1, solid: true }, { t: 'barrel', at: 'edges', n: 2, w: 1, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 3, w: 1, h: 1 }, { t: 'floorvalve', at: 'edges', n: 2, w: 1, h: 1 }, { t: 'grate', at: 'edges', n: 3, w: 1, h: 1 }, { t: 'pipes_v', at: 'left', n: 2, w: 1, h: 3, solid: true }, { t: 'supplybox', at: 'edges', n: 2, w: 1, h: 1, solid: true }],
  outpost: [{ t: 'labbench', at: 'bottom', n: 2, w: 3, h: 1, solid: true }, { t: 'tent', at: 'corners', n: 1, w: 3, h: 2, solid: true }, { t: 'alienplant', at: 'scatter', n: 3, w: 1, h: 1, solid: true }, { t: 'crate', at: 'edges', n: 3, w: 1, h: 1, solid: true }, { t: 'sandpatch', at: 'scatter', n: 4, w: 3, h: 2 }, { t: 'rock', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'cart', at: 'corners', n: 1, w: 2, h: 1, solid: true }, { t: 'solar', at: 'corners', n: 2, w: 2, h: 1, solid: true }],
  // Helios
  quarters: [{ t: 'desk', at: 'center', n: 1, w: 3, h: 1, solid: true }, { t: 'bunk', at: 'left', n: 1, w: 2, h: 1, solid: true }, { t: 'flag', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'rug', at: 'scatter', n: 1, w: 4, h: 2 }, { t: 'locker', at: 'right', n: 3, w: 1, h: 1, solid: true }, { t: 'shelf', at: 'top', n: 2, w: 1, h: 1, solid: true }, { t: 'bench_seat', at: 'scatter', n: 2, w: 3, h: 1, solid: true }, { t: 'lamp', at: 'top', n: 2, w: 1, h: 1 }, { t: 'panelpatch', at: 'edges', n: 2, w: 2, h: 2 }],
  weapons: [{ t: 'console', at: 'bottom', n: 3, w: 2, h: 1, solid: true }, { t: 'turret', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'rack', at: 'right', n: 1, w: 1, h: 2, solid: true }, { t: 'weaponrack', at: 'left', n: 2, w: 1, h: 2, solid: true }, { t: 'supplybox', at: 'edges', n: 3, w: 1, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'grate', at: 'edges', n: 3, w: 1, h: 1 }, { t: 'locker', at: 'corners', n: 2, w: 1, h: 1, solid: true }],
  tactical: [{ t: 'holotable', at: 'center', n: 1, w: 3, h: 2, solid: true }, { t: 'console', at: 'bottom', n: 2, w: 2, h: 1, solid: true }, { t: 'flag', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'chair', at: 'scatter', n: 4, w: 1, h: 1 }, { t: 'rack', at: 'right', n: 2, w: 1, h: 2, solid: true }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'runner', at: 'center', n: 1, w: 6, h: 3 }, { t: 'lamp', at: 'top', n: 3, w: 1, h: 1 }],
  hangar: [{ t: 'jet', at: 'center', n: 1, w: 6, h: 4, solid: true }, { t: 'crates', at: 'corners', n: 3, w: 2, h: 2, solid: true }, { t: 'hazard', at: 'edges', n: 1, w: 2, h: 1 }, { t: 'barrel', at: 'edges', n: 3, w: 1, h: 1, solid: true }, { t: 'supplybox', at: 'edges', n: 4, w: 1, h: 1, solid: true }, { t: 'grate', at: 'edges', n: 4, w: 1, h: 1 }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'cart', at: 'corners', n: 2, w: 2, h: 1, solid: true }],
  armory: [{ t: 'weaponrack', at: 'left', n: 2, w: 1, h: 2, solid: true }, { t: 'weaponrack', at: 'right', n: 2, w: 1, h: 2, solid: true }, { t: 'crate', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'supplybox', at: 'edges', n: 4, w: 1, h: 1, solid: true }, { t: 'console', at: 'bottom', n: 1, w: 2, h: 1, solid: true }, { t: 'locker', at: 'top', n: 3, w: 1, h: 1, solid: true }, { t: 'grate', at: 'edges', n: 3, w: 1, h: 1 }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }],
  engineering: [{ t: 'engine', at: 'center', n: 1, w: 4, h: 4, solid: true }, { t: 'rack', at: 'left', n: 2, w: 1, h: 2, solid: true }, { t: 'barrel', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 3, w: 1, h: 1 }, { t: 'floorvalve', at: 'edges', n: 3, w: 1, h: 1 }, { t: 'grate', at: 'edges', n: 4, w: 1, h: 1 }, { t: 'pipes_v', at: 'right', n: 2, w: 1, h: 3, solid: true }, { t: 'supplybox', at: 'edges', n: 2, w: 1, h: 1, solid: true }],
  prison: [{ t: 'cell', at: 'left', n: 2, w: 2, h: 2, solid: true }, { t: 'cell', at: 'right', n: 2, w: 2, h: 2, solid: true }, { t: 'console', at: 'bottom', n: 1, w: 2, h: 1, solid: true }, { t: 'locker', at: 'top', n: 2, w: 1, h: 1, solid: true }, { t: 'bench_seat', at: 'scatter', n: 2, w: 3, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'grate', at: 'edges', n: 3, w: 1, h: 1 }, { t: 'supplybox', at: 'corners', n: 2, w: 1, h: 1, solid: true }],
  // Starlight Carnival
  midway: [{ t: 'tent', at: 'grid', n: 4, w: 3, h: 2, solid: true }, { t: 'bench_seat', at: 'scatter', n: 4, w: 3, h: 1, solid: true }, { t: 'bin', at: 'edges', n: 3, w: 1, h: 1, solid: true }, { t: 'lamp', at: 'top', n: 5, w: 1, h: 1 }, { t: 'crate', at: 'corners', n: 3, w: 1, h: 1, solid: true }],
  carousel: [{ t: 'fountain', at: 'center', n: 1, w: 6, h: 6, solid: true }, { t: 'bench_seat', at: 'corners', n: 3, w: 3, h: 1, solid: true }, { t: 'lamp', at: 'top', n: 4, w: 1, h: 1 }, { t: 'plant', at: 'scatter', n: 3, w: 1, h: 1, solid: true }],
  bigtop: [{ t: 'tent', at: 'center', n: 1, w: 6, h: 4, solid: true }, { t: 'bench_seat', at: 'bottom', n: 3, w: 3, h: 1, solid: true }, { t: 'flag', at: 'corners', n: 4, w: 1, h: 1 }, { t: 'crates', at: 'corners', n: 2, w: 2, h: 2, solid: true }],
  ferris: [{ t: 'dish', at: 'center', n: 1, w: 5, h: 5, solid: true }, { t: 'generator', at: 'right', n: 1, w: 3, h: 2, solid: true }, { t: 'bench_seat', at: 'bottom', n: 2, w: 3, h: 1, solid: true }, { t: 'lamp', at: 'top', n: 4, w: 1, h: 1 }],
  funhouse: [{ t: 'scanner', at: 'grid', n: 4, w: 2, h: 2 }, { t: 'rack', at: 'left', n: 3, w: 1, h: 2, solid: true }, { t: 'rack', at: 'right', n: 3, w: 1, h: 2, solid: true }, { t: 'lamp', at: 'top', n: 3, w: 1, h: 1 }],
  arcade: [{ t: 'console', at: 'top', n: 4, w: 2, h: 1, solid: true }, { t: 'console', at: 'bottom', n: 4, w: 2, h: 1, solid: true }, { t: 'vending', at: 'right', n: 2, w: 1, h: 1, solid: true }, { t: 'rug', at: 'center', n: 1, w: 6, h: 3 }],
  prizes: [{ t: 'shelf', at: 'top', n: 4, w: 1, h: 1, solid: true }, { t: 'shelf', at: 'left', n: 3, w: 1, h: 1, solid: true }, { t: 'crates', at: 'corners', n: 3, w: 2, h: 2, solid: true }, { t: 'desk', at: 'center', n: 1, w: 4, h: 1, solid: true }],
  // Verdant Drift
  meadow: [{ t: 'garden_bed', at: 'grid', n: 6, w: 3, h: 2, solid: true }, { t: 'tree', at: 'corners', n: 3, w: 2, h: 2, solid: true }, { t: 'plant', at: 'scatter', n: 6, w: 1, h: 1, solid: true }, { t: 'grasstuft', at: 'scatter', n: 8, w: 2, h: 2 }],
  orchard: [{ t: 'tree', at: 'grid', n: 6, w: 2, h: 2, solid: true }, { t: 'crate', at: 'edges', n: 4, w: 1, h: 1, solid: true }, { t: 'cart', at: 'corners', n: 2, w: 2, h: 1, solid: true }, { t: 'grasstuft', at: 'scatter', n: 6, w: 2, h: 2 }],
  pond: [{ t: 'pool', at: 'center', n: 1, w: 8, h: 5, solid: true }, { t: 'coral', at: 'corners', n: 3, w: 1, h: 1, solid: true }, { t: 'puddle', at: 'scatter', n: 6, w: 2, h: 1 }, { t: 'tree', at: 'corners', n: 2, w: 2, h: 2, solid: true }],
  commons: [{ t: 'table_round', at: 'grid', n: 4, w: 3, h: 3, solid: true }, { t: 'tree', at: 'corners', n: 2, w: 2, h: 2, solid: true }, { t: 'bench_seat', at: 'scatter', n: 3, w: 3, h: 1, solid: true }, { t: 'lamp', at: 'top', n: 3, w: 1, h: 1 }],
  greenhouse: [{ t: 'garden_bed', at: 'grid', n: 4, w: 3, h: 2, solid: true }, { t: 'labbench', at: 'bottom', n: 2, w: 3, h: 1, solid: true }, { t: 'tank', at: 'right', n: 3, w: 1, h: 1, solid: true }, { t: 'plant', at: 'scatter', n: 4, w: 1, h: 1, solid: true }],
  silo: [{ t: 'crates', at: 'corners', n: 4, w: 2, h: 2, solid: true }, { t: 'barrel', at: 'left', n: 3, w: 1, h: 1, solid: true }, { t: 'chute', at: 'center', n: 1, w: 3, h: 3, solid: true }],
  pump: [{ t: 'generator', at: 'center', n: 1, w: 4, h: 3, solid: true }, { t: 'pipes_v', at: 'left', n: 3, w: 1, h: 3, solid: true }, { t: 'gauges', at: 'right', n: 2, w: 1, h: 2, solid: true }, { t: 'floorvalve', at: 'bottom', n: 2, w: 1, h: 1, solid: true }],
  medstation: [{ t: 'bed', at: 'left', n: 2, w: 2, h: 1, solid: true }, { t: 'scanner', at: 'center', n: 1, w: 2, h: 2 }, { t: 'cabinet', at: 'right', n: 2, w: 1, h: 1, solid: true }],
};

// Second pass: every room also gets "dressing" — the small stuff that makes a space look lived in
// rather than like a blocked-out greybox. Almost all of it is non-solid floor detail, so it can be
// laid on thickly without ever walling a player in or breaking a path.
// Each station dresses differently, so the same room kind reads as a different place per map.
const DRESS: Record<string, Place[]> = {
  orbital: [ // Orbital Nexus — clean, lit, corporate. Maintenance has been here; nobody has lived here.
    { t: 'grate', at: 'edges', n: 4, w: 1, h: 1 }, { t: 'panelpatch', at: 'edges', n: 4, w: 2, h: 2 },
    { t: 'lamp', at: 'top', n: 3, w: 1, h: 1 }, { t: 'supplybox', at: 'edges', n: 3, w: 1, h: 1, solid: true },
    { t: 'plant', at: 'scatter', n: 3, w: 1, h: 1, solid: true }, { t: 'runner', at: 'edges', n: 3, w: 3, h: 2 },
    { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 }, { t: 'bin', at: 'corners', n: 2, w: 1, h: 1, solid: true },
    { t: 'chair', at: 'scatter', n: 2, w: 1, h: 1 }, { t: 'floorvalve', at: 'edges', n: 1, w: 1, h: 1 },
  ],
  frostfall: [ // Frostfall — snowed-in, frozen over, and losing the fight against the cold
    { t: 'snowdrift', at: 'scatter', n: 8, w: 2, h: 2 }, { t: 'icecrystal', at: 'edges', n: 5, w: 1, h: 1, solid: true },
    { t: 'snowpile', at: 'scatter', n: 6, w: 2, h: 1 }, { t: 'icepatch', at: 'scatter', n: 6, w: 2, h: 2 },
    { t: 'heater', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'lamp', at: 'top', n: 3, w: 1, h: 1 },
    { t: 'gaugepanel', at: 'top', n: 1, w: 1, h: 1 }, { t: 'supplybox', at: 'edges', n: 2, w: 1, h: 1, solid: true },
    { t: 'pipes_v', at: 'corners', n: 2, w: 1, h: 3, solid: true }, { t: 'oxytank', at: 'edges', n: 2, w: 1, h: 1, solid: true },
  ],
  abyssal: [ // Abyssal Rift — wet, pressurised, encrusted; everything drips and everything is watched
    { t: 'puddle', at: 'scatter', n: 8, w: 2, h: 1 }, { t: 'coral', at: 'scatter', n: 6, w: 1, h: 1, solid: true },
    { t: 'grate', at: 'edges', n: 4, w: 1, h: 1 }, { t: 'pipes_v', at: 'corners', n: 2, w: 1, h: 3, solid: true },
    { t: 'gaugepanel', at: 'top', n: 3, w: 1, h: 1 }, { t: 'barrel', at: 'edges', n: 3, w: 1, h: 1, solid: true },
    { t: 'floorvalve', at: 'edges', n: 2, w: 1, h: 1 }, { t: 'oxytank', at: 'corners', n: 2, w: 1, h: 1, solid: true },
    { t: 'lamp', at: 'top', n: 2, w: 1, h: 1 }, { t: 'supplybox', at: 'edges', n: 1, w: 1, h: 1, solid: true },
  ],
  colony: [ // The Lost Colony — abandoned, half buried, slowly going back to the planet
    { t: 'sandpatch', at: 'scatter', n: 8, w: 3, h: 2 }, { t: 'debris', at: 'scatter', n: 7, w: 1, h: 1 },
    { t: 'dune', at: 'scatter', n: 5, w: 3, h: 1 }, { t: 'rock', at: 'scatter', n: 5, w: 1, h: 1, solid: true },
    { t: 'alienplant', at: 'scatter', n: 4, w: 1, h: 1, solid: true }, { t: 'grasstuft', at: 'scatter', n: 4, w: 2, h: 2 },
    { t: 'crate', at: 'edges', n: 2, w: 1, h: 1, solid: true }, { t: 'lamp', at: 'top', n: 2, w: 1, h: 1 },
    { t: 'solar', at: 'corners', n: 2, w: 2, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 1, w: 1, h: 1 },
  ],
  helios: [ // Helios Dreadnought — military, utilitarian, stowed for action
    { t: 'hazard', at: 'edges', n: 3, w: 2, h: 1 }, { t: 'grate', at: 'edges', n: 4, w: 1, h: 1 },
    { t: 'crate', at: 'edges', n: 3, w: 1, h: 1, solid: true }, { t: 'flag', at: 'top', n: 2, w: 1, h: 1 },
    { t: 'locker', at: 'corners', n: 2, w: 1, h: 1, solid: true }, { t: 'lamp', at: 'top', n: 3, w: 1, h: 1 },
    { t: 'supplybox', at: 'edges', n: 3, w: 1, h: 1, solid: true }, { t: 'gaugepanel', at: 'top', n: 2, w: 1, h: 1 },
    { t: 'panelpatch', at: 'edges', n: 2, w: 2, h: 2 }, { t: 'floorvalve', at: 'edges', n: 1, w: 1, h: 1 },
  ],
  carnival: [ // Starlight Carnival — lights, litter, leftovers of a crowd
    { t: 'lamp', at: 'top', n: 5, w: 1, h: 1 }, { t: 'flag', at: 'top', n: 4, w: 1, h: 1 },
    { t: 'debris', at: 'scatter', n: 5, w: 1, h: 1 }, { t: 'bin', at: 'edges', n: 3, w: 1, h: 1, solid: true },
    { t: 'panelpatch', at: 'edges', n: 4, w: 2, h: 2 }, { t: 'crate', at: 'edges', n: 3, w: 1, h: 1, solid: true },
  ],
  verdant: [ // Verdant Drift — overgrown, damp, alive
    { t: 'grasstuft', at: 'scatter', n: 9, w: 2, h: 2 }, { t: 'plant', at: 'scatter', n: 6, w: 1, h: 1, solid: true },
    { t: 'puddle', at: 'scatter', n: 4, w: 2, h: 1 }, { t: 'alienplant', at: 'scatter', n: 4, w: 1, h: 1, solid: true },
    { t: 'rock', at: 'scatter', n: 3, w: 1, h: 1, solid: true }, { t: 'lamp', at: 'top', n: 3, w: 1, h: 1 },
  ],
  lobby: [ // Departure Lounge — a waiting room, so: seating, signage, somebody's leftovers
    { t: 'runner', at: 'edges', n: 3, w: 3, h: 2 }, { t: 'bench_seat', at: 'scatter', n: 3, w: 3, h: 1, solid: true },
    { t: 'lamp', at: 'top', n: 3, w: 1, h: 1 }, { t: 'plant', at: 'scatter', n: 4, w: 1, h: 1, solid: true },
    { t: 'panelpatch', at: 'edges', n: 2, w: 2, h: 2 }, { t: 'bin', at: 'corners', n: 2, w: 1, h: 1, solid: true },
    { t: 'vending', at: 'right', n: 2, w: 1, h: 1, solid: true }, { t: 'supplybox', at: 'edges', n: 1, w: 1, h: 1, solid: true },
    { t: 'grate', at: 'edges', n: 1, w: 1, h: 1 }, { t: 'chair', at: 'scatter', n: 3, w: 1, h: 1 },
  ],
};
// Used when a theme has no entry of its own. Keys above are the map `theme` ids from the map specs
// (orbital / lobby / frostfall / abyssal / colony / helios / carnival / verdant) — they used to be
// descriptive nicknames (`station`, `ice`, `deep`, `desert`, `warship`) that matched no map at all,
// so six of the eight maps silently fell through to this three-entry fallback and looked empty.
const DRESS_FALLBACK: Place[] = [{ t: 'grate', at: 'edges', n: 4, w: 1, h: 1 }, { t: 'supplybox', at: 'edges', n: 3, w: 1, h: 1, solid: true }, { t: 'lamp', at: 'top', n: 3, w: 1, h: 1 }];

const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const hit = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function decorateRoom(r: Room, theme: string, keep: Rect[], spots: Spot[], soft: Rect[] = []): PropSpec[] {
  const out: PropSpec[] = []; const tpl = T[r.kind] || T.cargo; const rand = rng(r.idx * 977 + theme.length * 131 + r.w);
  const tiles = (n: number) => n * TILE; const inner = { x: r.x + TILE, y: r.y + TILE, w: r.w - TILE * 2, h: r.h - TILE * 2 };
  // `gap` is the breathing room demanded around an existing prop. Big furniture keeps its wide
  // berth; small floor detail is allowed to tuck in close, which is what lets a room actually fill
  // up instead of rejecting every candidate after the first handful.
  const ok = (b: Rect, flat = false, central = false, gap = 8) => { if (b.x < r.x + 4 || b.y < r.y + TILE * 0.5 || b.x + b.w > r.x + r.w - 4 || b.y + b.h > r.y + r.h - 4) return false;
    if (!flat && keep.some(k => hit(k, b))) return false; if (!flat && !central && soft.some(k => hit(k, b))) return false; return !out.some(o => hit({ x: o.x - gap, y: o.y - gap, w: o.w + gap * 2, h: o.h + gap * 2 }, b)); };
  for (const pl of [...tpl, ...(DRESS[theme] || DRESS_FALLBACK)]) {
    const w = tiles(pl.w), h = tiles(pl.h); let placed = 0;
    const cand: Rect[] = [];
    if (pl.at === 'center') { const pts: Rect[] = []; for (let dy = -r.h / 2; dy <= r.h / 2; dy += TILE / 2) for (let dx = -r.w / 2; dx <= r.w / 2; dx += TILE / 2) pts.push({ x: r.cx - w / 2 + dx, y: r.cy - h / 2 + TILE * 0.5 + dy, w, h }); pts.sort((a, b) => Math.hypot(a.x + w / 2 - r.cx, a.y + h / 2 - r.cy) - Math.hypot(b.x + w / 2 - r.cx, b.y + h / 2 - r.cy)); cand.push(...pts); }
    if (pl.at === 'grid') { const cols = 2, rows = Math.ceil(pl.n / 2); for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) cand.push({ x: r.x + r.w * (j ? 0.72 : 0.28) - w / 2, y: r.y + r.h * ((i + 1) / (rows + 1)) - h / 2 + TILE * 0.4, w, h }); }
    const along = (side: string) => { const n = 9; for (let i = 0; i < n; i++) { const k = (i + 0.5) / n;
      if (side === 'top') cand.push({ x: inner.x + (inner.w - w) * k, y: r.y + TILE * 0.7, w, h });
      if (side === 'bottom') cand.push({ x: inner.x + (inner.w - w) * k, y: r.y + r.h - h - TILE * 0.35, w, h });
      if (side === 'left') cand.push({ x: r.x + TILE * 0.35, y: inner.y + (inner.h - h) * k, w, h });
      if (side === 'right') cand.push({ x: r.x + r.w - w - TILE * 0.35, y: inner.y + (inner.h - h) * k, w, h }); } };
    if (['top', 'bottom', 'left', 'right'].includes(pl.at)) along(pl.at);
    if (pl.at === 'corners') cand.push({ x: r.x + TILE * 0.4, y: r.y + r.h - h - TILE * 0.4, w, h }, { x: r.x + r.w - w - TILE * 0.4, y: r.y + r.h - h - TILE * 0.4, w, h }, { x: r.x + r.w - w - TILE * 0.4, y: r.y + TILE * 1.2, w, h }, { x: r.x + TILE * 0.4, y: r.y + TILE * 1.2, w, h });
    if (pl.at === 'scatter') for (let i = 0; i < 30; i++) cand.push({ x: inner.x + rand() * (inner.w - w), y: inner.y + rand() * (inner.h - h), w, h });
    // `edges`: anywhere inside a band about a tile and a half deep around the room's perimeter, so
    // the clutter lines the walls and the middle of the room stays walkable and uncluttered.
    if (pl.at === 'edges') { const band = TILE * 1.6;
      for (let i = 0; i < 40; i++) { const side = Math.floor(rand() * 4); const t2 = rand();
        if (side === 0) cand.push({ x: inner.x + t2 * (inner.w - w), y: r.y + TILE * 0.6 + rand() * band, w, h });
        else if (side === 1) cand.push({ x: inner.x + t2 * (inner.w - w), y: r.y + r.h - h - TILE * 0.35 - rand() * band, w, h });
        else if (side === 2) cand.push({ x: r.x + TILE * 0.35 + rand() * band, y: inner.y + t2 * (inner.h - h), w, h });
        else cand.push({ x: r.x + r.w - w - TILE * 0.35 - rand() * band, y: inner.y + t2 * (inner.h - h), w, h }); } }
    // shuffle wall candidates a little so rooms of the same kind differ
    if (pl.at !== 'center' && pl.at !== 'grid') for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
    const small = !pl.solid || (pl.w <= 1 && pl.h <= 1);
    for (const c of cand) { if (placed >= pl.n) break; const flat = !pl.solid; if (!ok(c, flat && pl.t !== 'chair', pl.at === 'center' || pl.at === 'grid', small ? 3 : 8)) continue;
      out.push({ t: pl.t, x: c.x, y: c.y, w: c.w, h: c.h, v: Math.floor(rand() * 1000), room: r.id, solid: pl.solid ? shrink(pl.t, c) : undefined }); placed++; }
  }
  return out;
}
// collision footprint is a bit smaller than the art so players can brush past
function shrink(t: string, c: Rect): Rect { const k = t === 'table_round' || t === 'reactor' || t === 'fountain' || t === 'dish' ? 0.18 : 0.08; return { x: c.x + c.w * k, y: c.y + c.h * (k + 0.15), w: c.w * (1 - 2 * k), h: c.h * (1 - k * 2 - 0.15) }; }
