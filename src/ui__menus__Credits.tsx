import React from 'react';
import { useApp } from './store__app';
import { Panel, ScreenHeader } from './ui__common__kit';
import { GlimCanvas } from './ui__common__GlimCanvas';

export function Credits() {
  const go = useApp(s => s.go);
  const crew = [
    { color: 5, helmet: 'bubble', hat: 'headphones', outfit: 'hoodie', backpack: 'radio', pet: 'drone', trail: 'none', accessory: 'glasses', victory: 'dance' },
    { color: 0, helmet: 'gold', hat: 'crown', outfit: 'captain', backpack: 'jetpack', pet: 'none', trail: 'none', accessory: 'medal', victory: 'flex' },
    { color: 8, helmet: 'neon', hat: 'wizard', outfit: 'circuit', backpack: 'wings', pet: 'sprite', trail: 'none', accessory: 'none', victory: 'spin' },
  ];
  return (
    <div className="pe absolute inset-0 scroll-y px-[max(16px,4vw)] py-6">
      <ScreenHeader title="Credits" onBack={() => go('menu')} />
      <div className="grid max-w-5xl gap-4 md:grid-cols-[1fr_1.4fr]">
        <Panel className="flex items-end justify-center gap-0 overflow-hidden">{crew.map((c, i) => <GlimCanvas key={i} cos={c} size={150} anims={['victory']} showPet />)}</Panel>
        <Panel title="AMONG YOU">
          <div className="space-y-3 text-[14.5px] leading-relaxed text-ink/90">
            <p>An original 2D social-deduction game. Characters (the bubble-helmeted <b>Glims</b>), all five stations, props, effects and interface art are drawn procedurally in code. Every sound and music cue is synthesised live with the Web Audio API — there are no third-party art or audio assets.</p>
            <p>Built with <b>Phaser 3</b> (MIT), <b>React</b> (MIT), <b>PeerJS</b> (MIT), <b>Zustand</b> (MIT), <b>Framer Motion</b> (MIT) and <b>Tailwind CSS</b> (MIT). Fonts: <b>Chakra Petch</b> and <b>Exo 2</b> (SIL Open Font License).</p>
            <p className="text-mist">Inspired by the social-deduction genre. All roles, maps, mechanics and characters here are original. A personal, non-commercial project.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
