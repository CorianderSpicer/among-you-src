// Cosmetic catalog. Every item is drawn procedurally in chars.ts (no text placeholders).
export interface Item { id: string; name: string; tag?: string; anim?: boolean }
export const HELMETS: Item[] = [
  { id: 'bubble', name: 'Classic Bubble' }, { id: 'gold', name: 'Gold Visor' }, { id: 'mirror', name: 'Mirror Glass' },
  { id: 'neon', name: 'Neon Rim', anim: true }, { id: 'retro', name: 'Retro Dome' }, { id: 'fin', name: 'Shark Fin' },
  { id: 'scanner', name: 'Scanner Visor', anim: true }, { id: 'frost', name: 'Frosted Glass' },
];
export const HATS: Item[] = [
  { id: 'none', name: 'No Hat' }, { id: 'beanie', name: 'Beanie' }, { id: 'cap', name: 'Flight Cap' }, { id: 'tophat', name: 'Top Hat' },
  { id: 'crown', name: 'Crown' }, { id: 'headphones', name: 'Headphones' }, { id: 'flower', name: 'Space Flower', anim: true }, { id: 'horns', name: 'Little Horns' },
  { id: 'halo', name: 'Halo', anim: true }, { id: 'chef', name: 'Chef Hat' }, { id: 'propeller', name: 'Propeller Cap', anim: true }, { id: 'party', name: 'Party Hat' },
  { id: 'cowboy', name: 'Ranger Hat' }, { id: 'wizard', name: 'Star Wizard' }, { id: 'ears', name: 'Cat Ears' }, { id: 'sprout', name: 'Sprout', anim: true },
];
export const OUTFITS: Item[] = [
  { id: 'none', name: 'Standard Suit' }, { id: 'labcoat', name: 'Lab Coat' }, { id: 'vest', name: 'Tactical Vest' }, { id: 'poncho', name: 'Explorer Poncho' },
  { id: 'hazmat', name: 'Hazard Stripes' }, { id: 'captain', name: 'Captain Jacket' }, { id: 'scarf', name: 'Long Scarf', anim: true }, { id: 'hoodie', name: 'Cozy Hoodie' },
  { id: 'circuit', name: 'Circuit Suit', anim: true }, { id: 'tux', name: 'Formal Tux' },
];
export const BACKPACKS: Item[] = [
  { id: 'tank', name: 'Oxygen Tank' }, { id: 'jetpack', name: 'Jetpack', anim: true }, { id: 'satchel', name: 'Satchel' }, { id: 'wings', name: 'Glider Wings' },
  { id: 'rocket', name: 'Mini Rocket', anim: true }, { id: 'plush', name: 'Plush Buddy' }, { id: 'radio', name: 'Field Radio', anim: true }, { id: 'none', name: 'No Pack' },
];
export const PETS: Item[] = [
  { id: 'none', name: 'No Pet' }, { id: 'drone', name: 'Mini Drone', anim: true }, { id: 'jelly', name: 'Space Jelly', anim: true }, { id: 'rock', name: 'Rock Buddy', anim: true },
  { id: 'sprite', name: 'Star Sprite', anim: true }, { id: 'pup', name: 'Robo Pup', anim: true }, { id: 'slime', name: 'Goo Blob', anim: true }, { id: 'owl', name: 'Astro Owl', anim: true },
];
export const TRAILS: Item[] = [
  { id: 'none', name: 'No Trail' }, { id: 'sparkle', name: 'Sparkles', anim: true }, { id: 'bubbles', name: 'Bubbles', anim: true }, { id: 'neon', name: 'Neon Steps', anim: true },
  { id: 'flame', name: 'Ember Trail', anim: true }, { id: 'snow', name: 'Snowflakes', anim: true }, { id: 'hearts', name: 'Hearts', anim: true }, { id: 'notes', name: 'Music Notes', anim: true },
];
export const ACCESSORIES: Item[] = [
  { id: 'none', name: 'None' }, { id: 'goggles', name: 'Goggles' }, { id: 'bowtie', name: 'Bow Tie' }, { id: 'monocle', name: 'Monocle' },
  { id: 'badge', name: 'Star Badge' }, { id: 'glasses', name: 'Round Glasses' }, { id: 'bandana', name: 'Bandana' }, { id: 'medal', name: 'Medal' },
];
export const VICTORIES: Item[] = [
  { id: 'jump', name: 'Jump for Joy', anim: true }, { id: 'spin', name: 'Spin', anim: true }, { id: 'dance', name: 'Shuffle Dance', anim: true }, { id: 'flex', name: 'Power Pose', anim: true },
];
export const CATALOG = { helmet: HELMETS, hat: HATS, outfit: OUTFITS, backpack: BACKPACKS, pet: PETS, trail: TRAILS, accessory: ACCESSORIES, victory: VICTORIES };
export type Slot = keyof typeof CATALOG;
