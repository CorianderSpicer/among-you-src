import { useSticky } from './ui__common__sticky';
import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from './store__game';
import { useApp } from './store__app';
import { rt } from './game__runtime';
import { ROLE, FACTION_COLOR } from './game__roles__roles';
import { GlimCanvas } from './ui__common__GlimCanvas';
import { portrait } from './game__art__chars';
import { Btn } from './ui__common__kit';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export function EndScreen() {
  const end = useSticky(useGame(s => s.end))!; const roster = useGame(s => s.roster); const replay = useGame(s => s.replay); const go = useApp(s => s.go);
  const me = rt.slot; const won = end.winners.includes(me) || end.side.includes(me);
  const title = end.winner === 'crew' ? 'CREW VICTORY' : end.winner === 'infiltrator' ? 'INFILTRATORS WIN' : 'JESTER WINS';
  const col = end.winner === 'crew' ? '#55b6ff' : end.winner === 'infiltrator' ? '#ff4d6d' : '#ff6fae';
  const winners = end.stats.filter((s: any) => end.winners.includes(s.s)); const mvp: Record<number, string[]> = {}; for (const a of end.mvp) (mvp[a.s] = mvp[a.s] || []).push(a.name);
  const download = () => { const data = replay; if (!data) { rt.requestReplay(); return; } const b = new Blob([JSON.stringify(data)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `among-you-replay-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  return (
    <motion.div className="pe fixed inset-0 z-[58] overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: `radial-gradient(ellipse at 50% 20%, ${col}40, #04060e 65%)` }}>
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="label text-[14px]" style={{ color: won ? '#8dff7a' : '#ff8b95' }} data-testid="end-result">{won ? 'Victory' : 'Defeat'}</motion.div>
        <motion.h1 initial={{ scale: 2, opacity: 0, filter: 'blur(12px)' }} animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }} transition={{ delay: 0.2, type: 'spring', stiffness: 120 }} className="h-display text-center text-[clamp(44px,8vw,96px)] leading-none" style={{ color: col, textShadow: `0 0 50px ${col}` }} data-testid="end-title">{title}</motion.h1>
        <div className="mt-2 text-center text-[16px] text-ink/85">{end.reason} · {fmt(end.duration)}</div>
        <div className="mt-6 flex flex-wrap items-end justify-center">
          {winners.map((w: any, i: number) => <motion.div key={w.s} initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.12 }} className="flex flex-col items-center"><GlimCanvas cos={w.cos} size={winners.length > 5 ? 120 : 170} anims={[w.alive ? 'victory' : 'ghost']} /><span className="-mt-2 font-display text-ink">{w.name}</span><span className="text-[12px]" style={{ color: ROLE[w.role].color }}>{ROLE[w.role].name}</span></motion.div>)}
        </div>
        {end.side.length > 0 && <div className="mt-3 text-[14px] text-[#ffe08a]">Also won: {end.side.map((s: number) => roster[s]?.name).join(', ')}</div>}
        <div className="glass mt-7 w-full overflow-x-auto p-4">
          <div className="label mb-3">Role reveal & match statistics</div>
          <table className="w-full min-w-[720px] text-[13.5px]">
            <thead><tr className="text-left font-display text-[11px] uppercase tracking-wider text-mist"><th className="pb-2">Player</th><th>Role</th><th>Status</th><th className="text-center">Tasks</th><th className="text-center">Elims</th><th className="text-center">Investigations</th><th className="text-center">Votes recv.</th><th className="text-center">Meetings</th><th>Awards</th></tr></thead>
            <tbody>{end.stats.map((s: any) => { const R = ROLE[s.role]; return (
              <tr key={s.s} className={`border-t border-edge/40 ${s.s === me ? 'bg-cyan/5' : ''}`}>
                <td className="py-2"><div className="flex items-center gap-2"><img src={portrait(s.cos, 48, { dead: !s.alive })} className="h-8 w-8" /><span className="font-semibold">{s.name}</span>{s.won && <span className="text-lime">★</span>}</div></td>
                <td><span style={{ color: R.color }}>{R.glyph} {R.name}</span> <span className="text-[11px]" style={{ color: FACTION_COLOR[s.faction as 'crew'] }}>· {s.faction}</span></td>
                <td className={s.alive ? 'text-lime' : 'text-mist'}>{s.alive ? 'Alive' : 'Dead'}</td>
                <td className="text-center">{s.faction === 'crew' ? `${s.tasks}/${s.tasksTotal}` : '—'}</td><td className="text-center">{s.kills}</td><td className="text-center">{s.investigations}</td><td className="text-center">{s.votesRecv}</td><td className="text-center">{s.meetings}</td>
                <td>{(mvp[s.s] || []).map(a => <span key={a} className="mr-1 rounded-md bg-amber/20 px-1.5 py-0.5 text-[11px] font-semibold text-amber">🏅 {a}</span>)}</td>
              </tr>); })}</tbody>
          </table>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {rt.isHost ? <Btn variant="primary" size="lg" testid="play-again" onClick={() => rt.backToLobby()}>Play again</Btn> : <div className="glass-dark px-4 py-3 text-mist">Waiting for the host to start another round…</div>}
          <Btn onClick={() => { if (!replay) rt.requestReplay(); go('replay'); }} testid="watch-replay">Watch replay</Btn>
          <Btn onClick={download}>{replay ? 'Download replay' : 'Fetch replay'}</Btn>
          <Btn variant="danger" onClick={() => rt.leave()}>Leave</Btn>
        </div>
      </div>
    </motion.div>
  );
}
