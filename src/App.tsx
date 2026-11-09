import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from './store__app';
import { MainMenu } from './ui__menus__MainMenu';
import { Toasts, screenAnim } from './ui__common__kit';
import { Customize } from './ui__customization__Customize';
import { SettingsScreen } from './ui__settings__Settings';
import { Credits } from './ui__menus__Credits';
import { CreateRoom, FindGame } from './ui__menus__Rooms';
import { LobbyUI } from './ui__lobby__Lobby';
import { GameUI } from './ui__hud__GameUI';
import { ReplayUI } from './ui__end__Replay';
import { startPractice } from './game__runtime';
import { showMenuBackdrop } from './game__bridge';

class Boundary extends React.Component<{ children: React.ReactNode }, { err: any }> {
  state = { err: null as any };
  static getDerivedStateFromError(err: any) { return { err }; }
  componentDidCatch(err: any) { console.error('UI error', err); useApp.getState().toast('Interface error recovered: ' + String(err?.message || err), 'error'); setTimeout(() => this.setState({ err: null }), 50); }
  render() { return this.state.err ? null : this.props.children; }
}
export function App() {
  const screen = useApp(s => s.screen); const prefs = useApp(s => s.prefs);
  useEffect(() => { document.documentElement.style.setProperty('--ui', String(prefs.uiScale)); document.body.classList.toggle('hc', prefs.highContrast); document.body.classList.toggle('rm', prefs.reducedMotion); }, [prefs.uiScale, prefs.highContrast, prefs.reducedMotion]);
  useEffect(() => { if (['menu', 'create', 'find', 'customize', 'settings', 'credits'].includes(screen)) showMenuBackdrop(); }, [screen]);
  const menuish = ['menu', 'create', 'find', 'customize', 'settings', 'credits'].includes(screen);
  return (
    <div className="scale-ui absolute inset-0 font-body" style={{ width: `calc(100% / ${prefs.uiScale})`, height: `calc(100% / ${prefs.uiScale})` }}>
      {menuish && <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#060914]/85 via-[#060914]/40 to-transparent" />}
      <AnimatePresence mode="wait">
        <motion.div key={screen} {...screenAnim} className="absolute inset-0">
          {screen === 'menu' && <MainMenu onPlay={() => startPractice()} />}
          {screen === 'customize' && <Customize />}
          {screen === 'settings' && <SettingsScreen />}
          {screen === 'credits' && <Credits />}
          {screen === 'create' && <CreateRoom />}
          {screen === 'find' && <FindGame />}
          {screen === 'lobby' && <LobbyUI />}
          {screen === 'game' && <Boundary><GameUI /></Boundary>}
          {screen === 'replay' && <ReplayUI />}
        </motion.div>
      </AnimatePresence>
      <Toasts />
      <LoadingOverlay />
    </div>
  );
}
function LoadingOverlay() {
  const l = useApp(s => s.loading);
  return <AnimatePresence>{l && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pe fixed inset-0 z-[80] grid place-items-center bg-[#04060f]/90">
    <div className="flex flex-col items-center gap-5"><div className="relative h-16 w-16"><div className="absolute inset-0 rounded-full border-4 border-cyan/15" /><div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-cyan" /></div><div className="h-display tracking-[0.3em] text-cyan glow-text">{l}</div></div>
  </motion.div>}</AnimatePresence>;
}
