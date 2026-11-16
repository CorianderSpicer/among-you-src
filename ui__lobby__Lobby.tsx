import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from './store__game';
import { useApp } from './store__app';
import { rt } from './game__runtime';
import { Btn, Panel, Modal, Seg, Slider, Stepper, Toggle, Tip } from './ui__common__kit';
import { portrait } from './game__art__chars';
import { ChatPanel } from './ui__hud__Overlays';
import { Customize } from './ui__customization__Customize';
import { MAP_LIST } from './game__maps__index';
import { ROLES, FACTION_COLOR } from './game__roles__roles';
import { MIN_PLAYERS, MAX_PLAYERS } from './game__core__constants';
import { TouchControls } from './ui__hud__Touch';
import { Minimap } from './ui__hud__Minimap';
import { sfx } from './game__audio__audio';
import type { Settings } from './game__core__types';
import { Logo } from './ui__menus__MainMenu';

export function LobbyUI() {
  const G = useGame(); const [settingsOpen, setSettings] = useState(false); const [cust, setCust] = useState(false); const [ready, setReady] = useState(false); const [chat, setChat] = useState(innerWidth > 900);
  const roster = Object.values(G.roster).sort((a, b) => a.s - b.s); const s = G.settings; const isHost = rt.isHost; const c = isHost ? rt.canStart() : null;
  useEffect(() => { const h = () => setSettings(true); addEventListener('ay:lobby-settings', h); return () => removeEventListener('ay:lobby-settings', h); }, []);
  const copy = async () => { try { await navigator.clipboard.writeText(G.code); useApp.getState().toast('Room code copied.', 'ok'); } catch { useApp.getState().toast('Copy failed — the code is ' + G.code, 'warn'); } };
  if (!s) return null; const map = MAP_LIST.find(m => m.id === s.map);
  return (
    <div className="absolute inset-0">
      <TouchControls />
      <div className="pe absolute left-3 right-3 top-3 flex flex-wrap items-center gap-3">
        <div className="glass-dark flex items-center gap-4 px-4 py-2.5">
          <div><div className="label">{G.mode === 'local' ? 'Practice match' : 'Room code'}</div>{G.mode === 'local' ? <div className="h-display text-xl text-ink">Solo with AI crew</div> : <div className="h-display text-3xl tracking-[0.35em] text-cyan glow-text" data-testid="room-code">{G.code || '·····'}</div>}</div>
          {G.code && <Btn size="sm" onClick={copy}>Copy</Btn>}
        </div>
        <div className="glass-dark px-4 py-2.5"><div className="label">Crew</div><div className="font-display text-xl text-ink">{roster.length}<span className="text-mist">/{MAX_PLAYERS}</span></div></div>
        <div className="glass-dark hidden px-4 py-2.5 sm:block"><div className="label">Map</div><div className="font-display text-[15px] text-ink">{map?.name}</div></div>
        <div className="ml-auto flex gap-2"><Btn size="sm" onClick={() => setCust(true)} testid="lobby-customize">Customize</Btn><Btn size="sm" onClick={() => setSettings(true)} testid="lobby-settings">{isHost ? 'Game settings' : 'Settings'}</Btn><Btn size="sm" variant="danger" onClick={() => rt.leave()} testid="lobby-leave">Leave</Btn></div>
      </div>
      {/* roster */}
      <div className="pe absolute bottom-24 right-3 top-[92px] w-[min(300px,44vw)] max-sm:hidden">
        <Panel title={`Players ${roster.length}/${MAX_PLAYERS}`} className="flex h-full flex-col !p-3" right={isHost ? <span className="flex items-center gap-1 text-[12px] text-mist">AI <button className="rounded border border-edge px-1.5 text-cyan" onClick={() => rt.updateSettings({ bots: Math.max(0, s.bots - 1) })}>−</button><b className="text-ink">{s.bots}</b><button className="rounded border border-edge px-1.5 text-cyan" onClick={() => rt.updateSettings({ bots: Math.min(14, s.bots + 1) })} data-testid="add-bot">+</button></span> : null}>
          <div className="scroll-y -mr-1 flex-1 space-y-1.5 pr-1" data-testid="roster">
            <AnimatePresence>{roster.map(r => <motion.div layout key={r.s} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${r.s === rt.slot ? 'border-cyan/50 bg-cyan/10' : 'border-edge/50 bg-void/40'} ${!r.conn ? 'opacity-50' : ''}`}>
              <img src={portrait(r.cos, 56)} className="h-9 w-9" /><div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold">{r.host && <span className="mr-1 text-amber">♛</span>}{r.name}</div><div className="text-[11px] text-mist">{r.bot ? 'AI crew' : r.host ? 'Host' : r.conn ? (r.ready ? 'Ready' : 'Not ready') : 'Disconnected'}</div></div>
              {!r.bot && !r.host && <span className={`h-2.5 w-2.5 rounded-full ${r.ready ? 'bg-lime shadow-[0_0_8px_#8dff7a]' : 'bg-mist/40'}`} />}
              {isHost && !r.bot && !r.host && <Tip text="Remove from room"><button className="text-mist hover:text-crimson" onClick={() => rt.kick(r.s)}>✕</button></Tip>}
            </motion.div>)}</AnimatePresence>
          </div>
        </Panel>
      </div>
      {/* chat */}
      <div className="pe absolute bottom-24 left-3 w-[min(340px,calc(100vw-24px))] max-sm:bottom-48">
        <button onClick={() => setChat(v => !v)} className="glass-dark mb-1 px-3 py-1 font-display text-[12px] uppercase tracking-wider text-mist">Chat {chat ? '−' : '+'}{!chat && G.unread ? ` (${G.unread})` : ''}</button>
        <AnimatePresence>{chat && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 260, opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="glass overflow-hidden p-3"><ChatPanel className="h-full" /></motion.div>}</AnimatePresence>
      </div>
      {/* start / ready */}
      <div className="pe absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 max-sm:left-auto max-sm:right-3 max-sm:translate-x-0 max-sm:items-end">
        {isHost ? <>
          <Btn variant="primary" size="lg" disabled={!c!.ok} onClick={() => rt.startMatch()} testid="start-game" className="min-w-[240px] max-sm:min-w-0">Start game</Btn>
          <div className="text-[12.5px] text-mist">{c!.n < MIN_PLAYERS ? `Need at least ${MIN_PLAYERS} players (add AI crew with + )` : !c!.ready ? 'Waiting for everyone to be ready…' : `${s.infiltrators} infiltrator${s.infiltrators > 1 ? 's' : ''} · ${map?.name}`}</div>
        </> : <><Btn variant={ready ? 'ghost' : 'primary'} size="lg" className="min-w-[220px]" testid="ready" onClick={() => { const v = !ready; setReady(v); rt.setReady(v); }}>{ready ? 'Not ready' : 'Ready'}</Btn><div className="text-[12.5px] text-mist">Waiting for the host to start · {map?.name}</div></>}
      </div>
      <Modal open={settingsOpen} onClose={() => setSettings(false)} className="w-[min(1100px,calc(100vw-24px))]"><GameSettings onClose={() => setSettings(false)} /></Modal>
      <Modal open={cust} onClose={() => { setCust(false); rt.updateProfile(); }} className="h-[min(760px,92vh)] w-[min(1100px,calc(100vw-24px))]"><div className="glass relative flex h-full flex-col"><button className="absolute right-4 top-3 z-10 text-xl text-mist hover:text-ink" onClick={() => { setCust(false); rt.updateProfile(); }}>✕</button><Customize embedded onClose={() => { setCust(false); rt.updateProfile(); }} /></div></Modal>
    </div>
  );
}

export function GameSettings({ onClose }: { onClose: () => void }) {
  const s = useGame(st => st.settings)!; const ro = !rt.isHost; const up = (p: Partial<Settings>) => !ro && rt.updateSettings(p); const [tab, setTab] = useState<'game' | 'roles' | 'map'>('map');
  return (
    <Panel title={ro ? 'Game settings (host controls these)' : 'Game settings'} right={<button className="text-mist hover:text-ink" onClick={onClose}>✕</button>} className="max-h-[88vh] overflow-y-auto">
      <Seg value={tab} onChange={setTab} options={[{ v: 'map', l: 'Map' }, { v: 'game', l: 'Rules' }, { v: 'roles', l: 'Roles' }]} />
      <div className={ro ? 'pointer-events-none opacity-80' : ''}>
      {tab === 'map' && <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{MAP_LIST.map(m => <button key={m.id} data-testid={'map-' + m.id} onClick={() => { up({ map: m.id }); sfx('click'); }} className={`overflow-hidden rounded-2xl border-2 text-left transition-colors ${s.map === m.id ? 'border-cyan shadow-glow' : 'border-edge/60 hover:border-mist/60'}`}>
        <div className="grid h-36 place-items-center" style={{ background: `radial-gradient(circle at 50% 40%, ${m.tint}40, #070b18)` }}><MapThumb id={m.id} /></div><div className="p-3"><div className="h-display text-[17px]" style={{ color: m.tint }}>{m.name}</div><div className="text-[12.5px] text-mist">{m.sub}</div></div></button>)}</div>}
      {tab === 'game' && <div className="mt-3 grid gap-x-8 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
        <div><div className="label mb-1 mt-2">Factions</div>
          <Stepper label="Infiltrators" value={s.infiltrators} min={1} max={3} onChange={v => up({ infiltrators: v })} />
          <Stepper label="Neutral roles (max)" value={s.neutrals} min={0} max={3} onChange={v => up({ neutrals: v })} />
          <Stepper label="Special crew roles (max)" value={s.specialCrew} min={0} max={12} onChange={v => up({ specialCrew: v })} />
          <Seg label="Role reveal on eject / end" value={s.roleReveal} onChange={v => up({ roleReveal: v })} options={[{ v: 'role', l: 'Role' }, { v: 'faction', l: 'Faction' }, { v: 'none', l: 'Hidden' }]} />
          <Toggle label="Confirm ejects" value={s.confirmEjects} onChange={v => up({ confirmEjects: v })} />
          <Toggle label="Anonymous votes" value={s.anonymousVotes} onChange={v => up({ anonymousVotes: v })} />
          <Toggle label="Rescue mode (downed state, Paramedic)" value={s.rescue} onChange={v => up({ rescue: v })} /></div>
        <div><div className="label mb-1 mt-2">Gameplay</div>
          <Slider label="Kill cooldown" value={s.killCooldown} min={10} max={60} step={2.5} fmt={v => v + ' s'} onChange={v => up({ killCooldown: v })} />
          <Seg label="Kill distance" value={s.killRange} onChange={v => up({ killRange: v })} options={[{ v: 1.2, l: 'Short' }, { v: 1.6, l: 'Normal' }, { v: 2.2, l: 'Long' }]} />
          <Slider label="Player speed" value={s.speed} min={0.75} max={1.5} step={0.05} fmt={v => v.toFixed(2) + '×'} onChange={v => up({ speed: v })} />
          <Slider label="Crew vision" value={s.crewVision} min={4} max={12} step={0.5} fmt={v => v + ' tiles'} onChange={v => up({ crewVision: v })} />
          <Slider label="Infiltrator vision" value={s.infVision} min={4} max={14} step={0.5} fmt={v => v + ' tiles'} onChange={v => up({ infVision: v })} />
          <Slider label="Ability cooldowns" value={s.abilityCooldownMul} min={0.5} max={2} step={0.1} fmt={v => v.toFixed(1) + '×'} onChange={v => up({ abilityCooldownMul: v })} />
          <Slider label="Ability durations" value={s.abilityDurationMul} min={0.5} max={2} step={0.1} fmt={v => v.toFixed(1) + '×'} onChange={v => up({ abilityDurationMul: v })} />
          <Toggle label="Map events (storms, gravity…)" value={s.mapEvents} onChange={v => up({ mapEvents: v })} /></div>
        <div><div className="label mb-1 mt-2">Tasks & meetings</div>
          <Stepper label="Common tasks" value={s.commonTasks} min={0} max={2} onChange={v => up({ commonTasks: v })} /><Stepper label="Short tasks" value={s.shortTasks} min={0} max={6} onChange={v => up({ shortTasks: v })} /><Stepper label="Long tasks" value={s.longTasks} min={0} max={3} onChange={v => up({ longTasks: v })} />
          <Seg label="Task bar updates" value={s.taskBar} onChange={v => up({ taskBar: v })} options={[{ v: 'always', l: 'Always' }, { v: 'meetings', l: 'Meetings' }, { v: 'never', l: 'Never' }]} />
          <Toggle label="Ghosts can do tasks" value={s.ghostTasks} onChange={v => up({ ghostTasks: v })} />
          <Stepper label="Emergency meetings each" value={s.meetings} min={0} max={5} onChange={v => up({ meetings: v })} />
          <Stepper label="Emergency cooldown" value={s.emergencyCooldown} min={0} max={60} step={5} fmt={v => v + 's'} onChange={v => up({ emergencyCooldown: v })} />
          <Stepper label="Discussion time" value={s.discussion} min={0} max={120} step={5} fmt={v => v + 's'} onChange={v => up({ discussion: v })} />
          <Stepper label="Voting time" value={s.voting} min={15} max={180} step={15} fmt={v => v + 's'} onChange={v => up({ voting: v })} />
          <div className="label mb-1 mt-3">AI crew</div><Stepper label="AI players" value={s.bots} min={0} max={14} onChange={v => up({ bots: v })} />
          <Seg label="AI skill" value={s.botSkill} onChange={v => up({ botSkill: v })} options={[{ v: 'easy', l: 'Easy' }, { v: 'normal', l: 'Normal' }, { v: 'hard', l: 'Hard' }]} /></div>
      </div>}
      {tab === 'roles' && <div className="mt-3"><div className="mb-2 text-[13px] text-mist">Spawn chance for each special role (0 disables it). Roles never repeat within a match; counts are capped by the faction limits on the Rules tab.</div>
        <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">{(['crew', 'infiltrator', 'neutral'] as const).map(f => <div key={f}><div className="label mb-1 mt-2" style={{ color: FACTION_COLOR[f] }}>{f}</div>
          {ROLES.filter(r => r.faction === f && r.id !== 'crewmate' && r.id !== 'infiltrator').map(r => <Slider key={r.id} label={<Tip text={<><b>{r.ability?.name || 'Passive'}</b>: {r.ability?.desc || r.passive}<br /><i>Counter:</i> {r.counter}</>}><span><span style={{ color: r.color }}>{r.glyph}</span> {r.name}{r.requires ? ' *' : ''}</span></Tip>} value={s.roleChance[r.id] ?? r.chance} min={0} max={100} step={5} fmt={v => v + '%'} onChange={v => up({ roleChance: { ...s.roleChance, [r.id]: v } })} />)}</div>)}</div>
        <div className="mt-2 text-[12px] text-mist">* Paramedic only appears when Rescue mode is on.</div></div>}
      </div>
    </Panel>
  );
}
function MapThumb({ id }: { id: string }) { const [ok, setOk] = useState(false); useEffect(() => { setOk(true); }, []); if (!ok) return null; return <MiniStatic id={id} />; }
import { getMap } from './game__runtime';
import { THEMES } from './game__art__themes';
import { TILE } from './game__core__constants';
function MiniStatic({ id }: { id: string }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  useEffect(() => { const m = getMap(id as any); const c = ref.current!; const px = 2.4; c.width = m.w * px; c.height = m.h * px; const x = c.getContext('2d')!; const th = THEMES[m.theme];
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) { const g = m.grid[ty * m.w + tx]; if (!g) continue; x.fillStyle = g === 2 ? th.topEdge : m.roomAt[ty * m.w + tx] >= 0 ? th.accent + '66' : th.accent + '33'; x.fillRect(tx * px, ty * px, px, px); } }, [id]);
  return <canvas ref={ref} className="max-h-[128px] max-w-[92%]" />;
}
