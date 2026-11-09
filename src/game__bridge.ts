// Switches the Phaser scenes underneath the React UI.
import { game } from './game__phaser';
export function showMenuBackdrop() { if (!game) return; const sm = game.scene; if (sm.isActive('world')) sm.stop('world'); if (!sm.isActive('menu')) sm.start('menu'); }
export function showWorld(data: any) { if (!game) return; const sm = game.scene; if (sm.isActive('menu')) sm.stop('menu'); if (sm.isActive('world')) sm.stop('world'); sm.start('world', data); }
