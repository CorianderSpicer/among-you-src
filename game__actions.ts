// What the local player can interact with right now, and what each button/key does.
import { rt } from './game__runtime';
import { useGame } from './store__game';
import { useHud, Interact } from './store__hud';
import { useApp } from './store__app';
import { USE_RANGE, REPORT_RANGE, TILE } from './game__core__constants';
import { ROLE } from './game__roles__roles';
import { roomOf } from './game__maps__builder';
import { SAB_GAME } from './game__sim__sim';
import { sfx } from './game__audio__audio';
import { GAMES } from './game__tasks__tasks';
import type { PlayerPublic } from './game__core__types';

export const LOBBY_POINTS = { customize: { x: 0, y: 0 }, settings: { x: 0, y: 0 } };
export function computeInteract(others: PlayerPublic[]): Interact {
  const v = rt.view, m = rt.map; const me = rt.me; const out: Interact = { use: null, report: null, kill: null, vent: null, abilityTarget: null, abilityBody: null, room: m ? roomOf(m, me.x, me.y) : '', nearCams: false };
  if (!v || !m) return out; const pv = v.me; const d = (o: { x: number; y: number }) => Math.hypot(o.x - me.x, o.y - me.y);
  if (v.ph === 'lobby') { const lp = LOBBY_POINTS; if (d(lp.customize) < 70) out.use = { kind: 'customize', id: 'customize', label: 'Customize' }; else if (d(lp.settings) < 70) out.use = { kind: 'settings', id: 'settings', label: rt.isHost ? 'Game settings' : 'View settings' }; return out; }
  if (v.ph !== 'play') return out;
  if (pv.vent) { out.vent = pv.vent; return out; }
  let best = USE_RANGE + 10; const consider = (o: { x: number; y: number }, u: Interact['use'], extra = 0) => { const dist = d(o) - extra; if (dist < best) { best = dist; out.use = u; } };
  const spot = (id: string) => m.byId[id];
  if (pv.alive || (pv.ghost && rt.settings.ghostTasks)) for (const t of pv.tasks) { if (t.done) continue; const sp = spot(t.steps[t.step]); if (sp) consider(sp, { kind: pv.fake ? 'fake' : 'task', id: sp.id, label: (pv.fake ? 'Fake · ' : '') + (GAMES[sp.game!]?.name || 'Task'), game: sp.game }); }
  if (pv.alive) {
    if (v.sab) for (const id of v.sab.spots) { if (v.sab.done.includes(id)) continue; const sp = spot(id); if (sp) consider(sp, { kind: 'fix', id, label: 'Repair', game: SAB_GAME[sp.sab!] }, 20); }
    const em = spot('emergency'); if (em) consider(em, { kind: 'emergency', id: 'emergency', label: 'Emergency meeting' }, 30);
    for (const k of ['cams', 'admin', 'logs'] as const) { const sp = spot(k); if (sp) { consider(sp, { kind: k, id: k, label: k === 'cams' ? 'Security cameras' : k === 'admin' ? 'Admin map' : 'Access logs' }); if (k === 'cams' && d(sp) < USE_RANGE + 26) out.nearCams = true; } }
    for (const sp of m.spots) if (sp.kind === 'passage') consider(sp, { kind: 'passage', id: sp.id, label: 'Hidden passage' });
    if (!pv.access && spot('keycard')) consider(spot('keycard'), { kind: 'keycard', id: 'keycard', label: 'Request keycard' });
    for (const l of v.leak || []) consider(l, { kind: 'leak', id: String(l.id), label: 'Seal leak' });
    // report
    let rb = REPORT_RANGE; for (const b of v.bodies) { const dist = d(b); if (dist < rb && rt.world.los(me.x, me.y - 10, b.x, b.y - 10)) { rb = dist; out.report = b.id; } }
    // kill
    const role = ROLE[pv.role]; if (role.kills && !(pv.role === 'bounty' && pv.done)) { let kb = (rt.settings.killRange * TILE) + 4; for (const o of others) { if (!o.al || o.gh || o.s >= 1000) continue; if (pv.faction === 'infiltrator' && pv.team.includes(o.s)) continue; if (pv.role === 'bounty' && o.s !== pv.bounty) continue; const dist = d(o); if (dist < kb) { kb = dist; out.kill = o.s; } } }
    // vent
    if (role.vents) for (const sp of m.spots) if (sp.kind === 'vent' && d(sp) < USE_RANGE + 6) out.vent = sp.id;
    // ability targets
    const ab = role.ability; if (ab && (ab.target === 'player')) { let r = (ab.range || 2) * TILE + 6; for (const o of others) { if (!o.al || o.gh || o.s >= 1000) continue; if (pv.role === 'bounty') continue; const dist = d(o); if (dist < r) { r = dist; out.abilityTarget = o.s; } } }
    if (ab && ab.target === 'body') { let r = (ab.range || 2) * TILE + 6; for (const b of v.bodies) { if (pv.role === 'paramedic' && !b.downed) continue; const dist = d(b); if (dist < r) { r = dist; out.abilityBody = b.id; } } }
  }
  return out;
}

export function doAction(a: string) {
  const G = useGame.getState(); const H = useHud.getState(); const v = rt.view; const app = useApp.getState(); if (!v) return;
  if (a === 'escape') { if (G.minigame) { useGame.getState().set({ minigame: null }); if (G.minigame.kind === 'fix' && G.minigame.game === 'handscan') rt.act({ k: 'hold', spot: G.minigame.spot, on: false }); sfx('close'); return; } if (G.panel) { if (G.panel === 'cams') rt.act({ k: 'cams', on: false }); if (G.panel === 'admin') rt.act({ k: 'admin', on: false }); useGame.getState().set({ panel: null }); sfx('close'); return; } return; }
  if (a === 'chat') { if (v.ph === 'lobby' || v.me.ghost) useGame.getState().set({ panel: G.panel === 'chat' ? null : 'chat', unread: 0 }); return; }
  if (G.minigame || v.ph === 'meeting' || v.ph === 'intro') return;
  switch (a) {
    case 'map': useGame.getState().set({ panel: G.panel === 'map' ? null : 'map' }); sfx('open'); return;
    case 'sabotage': if (v.me.faction === 'infiltrator' && v.ph === 'play') { useGame.getState().set({ panel: G.panel === 'sabotage' ? null : 'sabotage' }); sfx('open'); } return;
    case 'report': if (H.report !== null) rt.act({ k: 'report', body: H.report }); return;
    case 'kill': if (H.kill !== null && v.me.kcd <= 0) rt.act({ k: 'kill', target: H.kill }); return;
    case 'vent': if (H.vent) { rt.act({ k: 'vent', spot: H.vent }); sfx('vent'); } return;
    case 'cams': if (v.me.role === 'security' && v.ph === 'play') { rt.act({ k: 'cams', on: true }); useGame.getState().set({ panel: 'cams' }); } return;
    case 'ability': return useAbility();
    case 'use': {
      const u = H.use; if (!u) { if (H.report !== null) rt.act({ k: 'report', body: H.report }); return; }
      if (u.kind === 'customize') { app.go('customize'); return; } if (u.kind === 'settings') { useGame.getState().set({ panel: 'tasks' }); window.dispatchEvent(new CustomEvent('ay:lobby-settings')); return; }
      if (u.kind === 'task') { rt.act({ k: 'task_open', spot: u.id }); useGame.getState().set({ minigame: { spot: u.id, game: u.game!, kind: 'task' } }); sfx('open'); return; }
      if (u.kind === 'fake') { app.toast('Fake task — stand here to blend in.', 'info'); return; }
      if (u.kind === 'fix') { useGame.getState().set({ minigame: { spot: u.id, game: u.game!, kind: 'fix', sab: rt.map.byId[u.id].sab } }); sfx('open'); return; }
      if (u.kind === 'emergency') { if (v.me.meetingsLeft <= 0) app.toast('You have no emergency meetings left.', 'warn'); else if (v.me.emCd > 0) app.toast(`Emergency button ready in ${Math.ceil(v.me.emCd)} s.`, 'warn'); else rt.act({ k: 'emergency' }); return; }
      if (u.kind === 'cams') { rt.act({ k: 'cams', on: true }); useGame.getState().set({ panel: 'cams' }); sfx('open'); return; }
      if (u.kind === 'admin') { rt.act({ k: 'admin', on: true }); useGame.getState().set({ panel: 'admin' }); sfx('open'); return; }
      if (u.kind === 'logs') { rt.act({ k: 'logs' }); return; }
      if (u.kind === 'passage') { rt.act({ k: 'passage', spot: u.id }); sfx('vent'); return; }
      if (u.kind === 'keycard') { rt.act({ k: 'keycard' }); sfx('task_step'); return; }
      if (u.kind === 'leak') { rt.act({ k: 'leak', id: +u.id }); sfx('task_step'); return; }
    }
  }
}
export function useAbility() {
  const v = rt.view!; const H = useHud.getState(); const role = ROLE[v.me.role]; const ab = role.ability; const app = useApp.getState(); if (!ab || v.ph !== 'play') return;
  if (v.me.jam > 0) return app.toast('Your ability is jammed!', 'error'); if (v.me.acd > 0) return; if (v.me.uses !== null && v.me.uses <= 0) return app.toast('No uses left.', 'warn');
  if (v.me.role === 'security') { rt.act({ k: 'ability' }); useGame.getState().set({ panel: 'cams' }); return; }
  if (ab.target === 'system') { useGame.getState().set({ panel: 'audit' }); return; }
  if (ab.target === 'player') { if (H.abilityTarget === null) return app.toast('Get closer to a player to use ' + ab.name + '.', 'info'); rt.act({ k: 'ability', target: H.abilityTarget }); return; }
  if (ab.target === 'body') { if (H.abilityBody === null) return app.toast(v.me.role === 'paramedic' ? 'Stand next to a downed player.' : 'Stand next to a body.', 'info'); rt.act({ k: 'ability', body: H.abilityBody }); return; }
  rt.act({ k: 'ability' });
}
