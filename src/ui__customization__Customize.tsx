import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from './store__app';
import { ScreenHeader, Seg } from './ui__common__kit';
import { GlimCanvas, thumb } from './ui__common__GlimCanvas';
import { CATALOG, Slot } from './game__art__cosmetics';
import { COLORS } from './game__core__constants';
import { sfx } from './game__audio__audio';

const TABS: { id: 'color' | Slot; l: string }[] = [{ id: 'color', l: 'Color' }, { id: 'helmet', l: 'Helmet' }, { id: 'hat', l: 'Hat' }, { id: 'outfit', l: 'Outfit' }, { id: 'backpack', l: 'Pack' }, { id: 'accessory', l: 'Extras' }, { id: 'pet', l: 'Pet' }, { id: 'trail', l: 'Trail' }, { id: 'victory', l: 'Victory' }];

export function Customize({ embedded, onClose }: { embedded?: boolean; onClose?: () => void }) {
  const { profile, setProfile, go, prev } = useApp(); const [tab, setTab] = useState<'color' | Slot>('color'); const [anim, setAnim] = useState('idle');
  const cos = profile.cos;
  const back = () => { if (onClose) onClose(); else go(prev === 'lobby' ? 'lobby' : 'menu'); };
  const animList = tab === 'victory' ? ['victory'] : anim === 'cycle' ? ['idle', 'walk', 'run', 'victory'] : [anim];
  return (
    <div className={`pe ${embedded ? '' : 'absolute inset-0'} flex flex-col overflow-hidden px-[max(16px,4vw)] py-6`}>
      {!embedded && <ScreenHeader title="Customize" sub="Your Glim — every item is rendered live" onBack={back} />}
      <div className="flex min-h-0 flex-1 flex-col gap-5 lg:flex-row">
        <div className="glass brackets relative flex shrink-0 flex-col items-center justify-between overflow-hidden p-5 lg:w-[400px]">
          <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: 'radial-gradient(circle at 50% 70%, rgba(63,240,224,.18), transparent 60%), repeating-linear-gradient(90deg, rgba(110,140,220,.07) 0 1px, transparent 1px 32px), repeating-linear-gradient(0deg, rgba(110,140,220,.07) 0 1px, transparent 1px 32px)' }} />
          <div className="relative w-full">
            <div className="label mb-1">Call sign</div>
            <input data-testid="name-input" className="field w-full text-lg font-semibold" maxLength={12} value={profile.name} onChange={e => setProfile({ name: e.target.value.replace(/[^\p{L}\p{N} _.-]/gu, '') })} onBlur={e => !e.target.value.trim() && setProfile({ name: 'Crewmate' })} />
          </div>
          <GlimCanvas cos={cos} size={embedded ? 220 : 300} anims={animList} cycle={anim === 'cycle' ? 2.6 : 0} className="relative my-2" />
          <div className="relative w-full"><Seg value={anim} onChange={setAnim} options={[{ v: 'idle', l: 'Idle' }, { v: 'walk', l: 'Walk' }, { v: 'run', l: 'Run' }, { v: 'cycle', l: 'All' }]} /></div>
          <div className="relative mt-1 text-center font-display text-[13px] tracking-wider text-mist">{COLORS[cos.color].name.toUpperCase()} · {CATALOG.helmet.find(h => h.id === cos.helmet)?.name}</div>
        </div>
        <div className="glass flex min-h-0 flex-1 flex-col p-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {TABS.map(t => <button key={t.id} data-testid={'tab-' + t.id} onMouseEnter={() => sfx('hover')} onClick={() => { sfx('toggle'); setTab(t.id); }} className={`relative rounded-lg px-3.5 py-2 font-display text-[13px] font-semibold uppercase tracking-wider ${tab === t.id ? 'text-[#04131a]' : 'text-mist hover:text-ink'}`}>
              {tab === t.id && <motion.span layoutId="cust-tab" className="absolute inset-0 rounded-lg bg-cyan shadow-[0_0_14px_rgba(63,240,224,.5)]" />}<span className="relative">{t.l}</span></button>)}
          </div>
          <div className="scroll-y min-h-0 flex-1 pr-1">
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2.5">
                {tab === 'color' ? COLORS.map((c, i) => (
                  <Tile key={i} sel={cos.color === i} onClick={() => setProfile({ cos: { ...cos, color: i } })} label={c.name}>
                    <img src={thumb({ ...cos, color: i, hat: 'none', pet: 'none' }, 'outfit', 72)} className="h-[72px] w-[72px]" draggable={false} />
                    <span className="absolute right-2 top-2 h-3 w-3 rounded-full border border-white/60" style={{ background: c.base }} />
                  </Tile>
                )) : CATALOG[tab].map(it => (
                  <Tile key={it.id} sel={(cos as any)[tab] === it.id} onClick={() => setProfile({ cos: { ...cos, [tab]: it.id } })} label={it.name} badge={it.anim ? 'animated' : undefined}>
                    <img src={thumb({ ...cos, [tab]: it.id }, tab, 72)} className="h-[72px] w-[72px]" draggable={false} />
                  </Tile>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
function Tile({ sel, onClick, label, children, badge }: { sel: boolean; onClick: () => void; label: string; children: React.ReactNode; badge?: string }) {
  return (
    <motion.button data-press onMouseEnter={() => sfx('hover')} onClick={() => { sfx('click'); onClick(); }}
      className={`relative flex flex-col items-center rounded-xl border p-2 pb-1.5 ${sel ? 'border-cyan bg-cyan/15 shadow-glow' : 'border-edge/70 bg-void/40 hover:border-mist/60'}`}>
      {children}
      <span className={`mt-1 w-full truncate text-center text-[11.5px] font-semibold ${sel ? 'text-cyan' : 'text-mist'}`}>{label}</span>
      {badge && <span className="absolute left-1.5 top-1.5 rounded bg-violet/30 px-1 text-[9px] font-bold uppercase tracking-wider text-violet">✦</span>}
    </motion.button>
  );
}
