export interface Theme {
  floor: string; floor2: string; seam: string; hall: string; hallLine: string; faceTop: string; faceBot: string; top: string; topEdge: string; trim: string; lamp: string;
  accent: string; accent2: string; metal: string; metalDark: string; screen: string; bg: 'space' | 'ocean' | 'ice' | 'desert' | 'warp' | 'lounge'; amb: string; outdoorFloor?: string;
}
export const THEMES: Record<string, Theme> = {
  orbital: { floor: '#2c385a', floor2: '#26304f', seam: '#1b2440', hall: '#232b47', hallLine: '#ffb547', faceTop: '#5a6ca3', faceBot: '#2e3a68', top: '#121831', topEdge: '#3a4a80', trim: '#3ff0e0', lamp: '#bfe8ff', accent: '#3ff0e0', accent2: '#ffb547', metal: '#8e9bc0', metalDark: '#3e4a72', screen: '#5affea', bg: 'space', amb: '#1a2a5a' },
  lobby: { floor: '#352c58', floor2: '#2e2650', seam: '#211b3c', hall: '#2b2448', hallLine: '#a77bff', faceTop: '#6a5aa8', faceBot: '#352a6a', top: '#141030', topEdge: '#4a3a88', trim: '#a77bff', lamp: '#ffe2b8', accent: '#a77bff', accent2: '#ffb547', metal: '#9a94c8', metalDark: '#4a4278', screen: '#cdb0ff', bg: 'lounge', amb: '#2a1a5a' },
  frostfall: { floor: '#c7d9e8', floor2: '#b6cbdd', seam: '#93aec4', hall: '#a9cfe8', hallLine: '#ffffff', faceTop: '#8aa8c8', faceBot: '#4b6688', top: '#1b2638', topEdge: '#6f90b8', trim: '#9ff6ee', lamp: '#e2f4ff', accent: '#55b6ff', accent2: '#ff8a2a', metal: '#a8b8cc', metalDark: '#4f6280', screen: '#9ff6ee', bg: 'ice', amb: '#2a4a7a' },
  abyssal: { floor: '#21505a', floor2: '#1c4650', seam: '#143840', hall: '#1a4048', hallLine: '#5affd0', faceTop: '#3a7a80', faceBot: '#174046', top: '#081a20', topEdge: '#2a6066', trim: '#5affd0', lamp: '#9ff6e0', accent: '#5affd0', accent2: '#ff9a4a', metal: '#7aa8a8', metalDark: '#2a5054', screen: '#5affd0', bg: 'ocean', amb: '#0a3a4a' },
  colony: { floor: '#b88c60', floor2: '#a77d52', seam: '#8a643e', hall: '#c8a26e', hallLine: '#7a5230', faceTop: '#b7744a', faceBot: '#7a4428', top: '#3a2416', topEdge: '#8a5434', trim: '#ffb547', lamp: '#ffdcaa', accent: '#ff9a4a', accent2: '#8dff7a', metal: '#a89a88', metalDark: '#5a4a3a', screen: '#ffd27a', bg: 'desert', amb: '#5a3a1a', outdoorFloor: '#d9b07a' },
  helios: { floor: '#2c2e38', floor2: '#262831', seam: '#191a21', hall: '#24262e', hallLine: '#ff4d6d', faceTop: '#5a5e70', faceBot: '#2c2e3a', top: '#0e0f14', topEdge: '#44485a', trim: '#ff4d6d', lamp: '#ffd6c8', accent: '#ff4d6d', accent2: '#ffb547', metal: '#9096a8', metalDark: '#40434f', screen: '#ff8b95', bg: 'warp', amb: '#3a1018' },
};
export const FLOOR_STYLE: Record<string, string> = {
  cafeteria: 'tiles', bridge: 'carpet', reactor: 'grate', engine: 'grate', medbay: 'white', lab: 'white', security: 'plates', comms: 'carpet', cargo: 'cargo', garden: 'grass', lounge: 'carpet',
  cryo: 'ice', tunnel: 'ice', generator: 'grate', research: 'white', dome: 'carpet', thermal: 'grate', specimen: 'white', entrance: 'snow',
  aquarium: 'plates', dock: 'grate', pressure: 'grate', deeplab: 'white', flooded: 'plates', power: 'grate', command: 'carpet', oxystore: 'plates',
  residential: 'wood', hospital: 'white', plaza: 'sand', mining: 'sand', bunker: 'plates', tower: 'plates', powerplant: 'grate', outpost: 'sand',
  quarters: 'wood', weapons: 'plates', tactical: 'carpet', hangar: 'cargo', armory: 'grate', engineering: 'grate', prison: 'plates', medstation: 'white',
};
