// PeerJS wrapper: room codes map to peer ids `amongyou-<CODE>`. The host accepts many DataConnections; guests open one.
import Peer, { DataConnection } from 'peerjs';
import { useApp } from './store__app';

export const CODE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY3479';
export const CODE_RE = new RegExp(`^[${CODE_ALPHABET}]{5}$`);
export const newCode = () => Array.from({ length: 5 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
const PREFIX = 'amongyou-';

export function peerOptions(): any {
  const pr = useApp.getState().prefs; const q = new URLSearchParams(location.search); const sig = q.get('signal') || pr.signal; const o: any = { debug: 0 };
  if (sig) { const m = sig.match(/^(?:(wss?|https?):\/\/)?([^:/]+)(?::(\d+))?(\/.*)?$/); if (m) { o.host = m[2]; o.port = m[3] ? +m[3] : (m[1] === 'http' || m[1] === 'ws' ? 80 : 443); o.path = m[4] || '/'; o.secure = m[1] ? /s$/.test(m[1]) : o.port === 443; } }
  const ice: any[] = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
  const turn = q.get('turn') || pr.turn; if (turn) { const [urls, username, credential] = turn.split('|'); ice.push({ urls, username, credential }); }
  o.config = { iceServers: ice }; return o;
}
const ERR: Record<string, string> = {
  'unavailable-id': 'That room code is already in use.', 'peer-unavailable': 'Room not found — check the code (the host may have closed it).', network: 'Could not reach the signalling server. Check your connection.',
  'server-error': 'The signalling server returned an error.', 'socket-error': 'Lost connection to the signalling server.', 'browser-incompatible': 'This browser does not support WebRTC.', disconnected: 'Disconnected from the signalling server.', 'ssl-unavailable': 'Secure connection to the signalling server failed.',
};
export const netError = (e: any) => ERR[e?.type] || e?.message || 'Network error.';

export class Net {
  peer: Peer | null = null; conns = new Map<string, DataConnection>(); code = '';
  onMsg: (id: string, m: any) => void = () => { }; onOpen: (id: string) => void = () => { }; onClose: (id: string) => void = () => { }; onPeerError: (msg: string) => void = () => { };
  open(id?: string): Promise<string> {
    return new Promise((res, rej) => { const p = id ? new Peer(id, peerOptions()) : new Peer(peerOptions()); this.peer = p; let opened = false;
      const to = setTimeout(() => { if (!opened) { rej(new Error('Timed out contacting the signalling server.')); try { p.destroy(); } catch { } } }, 12000);
      p.on('open', pid => { opened = true; clearTimeout(to); res(pid); });
      p.on('error', (e: any) => { if (!opened) { clearTimeout(to); rej(Object.assign(new Error(netError(e)), { type: e.type })); } else this.onPeerError(netError(e)); });
      p.on('connection', c => this.adopt(c));
      p.on('disconnected', () => { if (!p.destroyed) setTimeout(() => { try { p.reconnect(); } catch { } }, 1500); }); });
  }
  async host(code: string) { this.code = code; await this.open(PREFIX + code); return code; }
  adopt(c: DataConnection) { c.on('open', () => { this.conns.set(c.peer, c); this.onOpen(c.peer); }); c.on('data', d => this.onMsg(c.peer, d)); c.on('close', () => { if (this.conns.get(c.peer) === c) { this.conns.delete(c.peer); this.onClose(c.peer); } }); c.on('error', () => { }); }
  async join(code: string): Promise<string> {
    if (!this.peer || this.peer.destroyed) await this.open();
    return new Promise((res, rej) => { const c = this.peer!.connect(PREFIX + code, { reliable: true, serialization: 'json' }); let done = false;
      const to = setTimeout(() => { if (!done) { done = true; rej(new Error('Connection timed out — the host did not answer.')); } }, 15000);
      const onErr = (e: any) => { if (!done && e?.type === 'peer-unavailable') { done = true; clearTimeout(to); rej(new Error(netError(e))); } }; this.peer!.on('error', onErr);
      c.on('open', () => { if (done) return; done = true; clearTimeout(to); this.peer!.off('error', onErr); this.conns.set(c.peer, c); res(c.peer); });
      c.on('data', d => this.onMsg(c.peer, d)); c.on('close', () => { this.conns.delete(c.peer); this.onClose(c.peer); }); c.on('error', () => { }); });
  }
  send(id: string, m: any) { const c = this.conns.get(id); if (c && c.open) try { c.send(m); } catch { } }
  close(id: string) { const c = this.conns.get(id); try { c?.close(); } catch { } this.conns.delete(id); }
  listRooms(): Promise<string[]> { return new Promise(res => { try { if (!this.peer) return res([]); (this.peer as any).listAllPeers((ids: string[]) => res((ids || []).filter(i => i.startsWith(PREFIX)).map(i => i.slice(PREFIX.length)).filter(c => CODE_RE.test(c)))); setTimeout(() => res([]), 4000); } catch { res([]); } }); }
  destroy() { for (const c of this.conns.values()) try { c.close(); } catch { } this.conns.clear(); try { this.peer?.destroy(); } catch { } this.peer = null; }
}
