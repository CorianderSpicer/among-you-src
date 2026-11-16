import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from './store__app';
import { Btn, Panel, ScreenHeader } from './ui__common__kit';
import { rt } from './game__runtime';
import { Net, CODE_RE, CODE_ALPHABET } from './multiplayer__net';
import { GlimCanvas } from './ui__common__GlimCanvas';

export function CreateRoom() {
  const { go, profile, setLoading, toast } = useApp(); const [err, setErr] = useState('');
  const create = async () => { setErr(''); setLoading('OPENING ROOM'); try { const code = await rt.startHost(); const p = useApp.getState().prefs; useApp.getState().setPrefs({ recent: [code, ...p.recent.filter(c => c !== code)].slice(0, 5) }); } catch (e: any) { setErr(e.message || String(e)); rt.reset(); } finally { setLoading(null); } };
  return (
    <div className="pe absolute inset-0 scroll-y px-[max(16px,4vw)] py-6">
      <ScreenHeader title="Create Room" sub="Host an online match — friends join with your room code" onBack={() => go('menu')} />
      <div className="grid max-w-5xl gap-4 md:grid-cols-[1.3fr_1fr]">
        <Panel title="How hosting works">
          <ul className="space-y-2.5 text-[14.5px] text-ink/90">
            <li><b className="text-cyan">You are the host.</b> Your browser runs the match and checks every elimination, vote, task and sabotage. Keep this tab open.</li>
            <li><b className="text-cyan">4–15 players.</b> Share the 5-character code. Fill empty seats with AI crew from the lobby.</li>
            <li><b className="text-cyan">Private roles.</b> Each player only receives their own role; infiltrators also learn their teammates.</li>
            <li><b className="text-cyan">Connections</b> are peer-to-peer (WebRTC) via the PeerJS signalling service. A custom signalling server or TURN relay can be set in Settings → Network.</li>
          </ul>
          {err && <div className="mt-4 rounded-xl border border-crimson/60 bg-crimson/10 px-4 py-3 text-[14px] text-crimson" data-testid="create-error">{err}</div>}
          <div className="mt-5 flex gap-3"><Btn variant="primary" size="lg" onClick={create} testid="create-go">Create room</Btn><Btn onClick={() => go('customize')}>Customize first</Btn></div>
        </Panel>
        <Panel className="flex flex-col items-center justify-center"><GlimCanvas cos={profile.cos} size={240} anims={['idle', 'walk']} cycle={3} /><div className="h-display text-xl">{profile.name}</div><div className="text-[13px] text-mist">Host</div></Panel>
      </div>
    </div>
  );
}

export function FindGame() {
  const { go, prefs, setPrefs, setLoading } = useApp(); const [code, setCode] = useState(new URLSearchParams(location.search).get('room')?.toUpperCase() || ''); const [err, setErr] = useState(''); const [pub, setPub] = useState<string[] | null>(null);
  const join = async (c = code) => { setErr(''); c = c.trim().toUpperCase(); if (!CODE_RE.test(c)) { setErr(`Room codes are 5 characters using ${CODE_ALPHABET.length} letters/digits (no 0/O, 1/I, B/8).`); return; } setLoading('JOINING ' + c);
    try { await rt.join(c); setPrefs({ recent: [c, ...prefs.recent.filter(x => x !== c)].slice(0, 5), lastCode: c }); } catch (e: any) { setErr(e.message || String(e)); rt.reset(); useApp.getState().go('find'); } finally { setLoading(null); } };
  const scan = async () => { setPub(null); const n = new Net(); try { await n.open(); const l = await n.listRooms(); setPub(l); } catch { setPub([]); } finally { n.destroy(); } };
  useEffect(() => { scan(); }, []);
  return (
    <div className="pe absolute inset-0 scroll-y px-[max(16px,4vw)] py-6">
      <ScreenHeader title="Find Game" sub="Join a room with its code" onBack={() => go('menu')} />
      <div className="grid max-w-5xl gap-4 md:grid-cols-2">
        <Panel title="Room code">
          <form onSubmit={e => { e.preventDefault(); join(); }} className="flex flex-col gap-3">
            <input data-testid="join-code" autoFocus maxLength={5} value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="ABCDE" className="field h-display py-4 text-center text-4xl tracking-[0.5em] text-cyan" />
            <Btn variant="primary" size="lg" type="submit" testid="join-go">Join</Btn>
          </form>
          {err && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-xl border border-crimson/60 bg-crimson/10 px-4 py-3 text-[14px] text-crimson" data-testid="join-error">{err}</motion.div>}
          {prefs.recent.length > 0 && <div className="mt-4"><div className="label mb-1.5">Recent rooms</div><div className="flex flex-wrap gap-2">{prefs.recent.map(c => <button key={c} onClick={() => { setCode(c); join(c); }} className="chip font-display tracking-[0.2em] hover:border-cyan/60">{c}</button>)}</div></div>}
        </Panel>
        <Panel title="Public rooms" right={<Btn size="sm" onClick={scan}>Refresh</Btn>}>
          {pub === null ? <div className="text-mist">Searching…</div> : pub.length ? <div className="flex flex-wrap gap-2">{pub.map(c => <Btn key={c} onClick={() => join(c)}>{c}</Btn>)}</div> :
            <div className="text-[14px] text-mist">No public rooms listed. The public PeerJS cloud does not publish room lists — ask your host for their code. Self-hosted signalling servers with discovery enabled will list rooms here.</div>}
        </Panel>
      </div>
    </div>
  );
}
