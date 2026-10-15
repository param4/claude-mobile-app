// One WebSocket to the Mac, shared by every open chat. Reconnects and resubscribes on its own.
import { Platform } from 'react-native';
import { create } from 'zustand';
import type {
  ChatItem,
  ClientMessage,
  CommandInfo,
  LiveSettings,
  LiveState,
  ModelOption,
  PendingPermission,
  ServerMessage,
} from '@claude-mobile/protocol';
import { useConnection } from './connection';

type ToolResult = NonNullable<Extract<ChatItem, { kind: 'tool' }>['result']>;

export type LiveChat = {
  state: LiveState;
  settings?: LiveSettings;
  pending: PendingPermission[];
  draft: string;
  items: ChatItem[];
  toolResults: Record<string, ToolResult>;
  commands: CommandInfo[];
  models: ModelOption[];
  error?: string;
  turnsEnded: number;
};

const emptyChat = (): LiveChat => ({
  state: 'idle',
  pending: [],
  draft: '',
  items: [],
  toolResults: {},
  commands: [],
  models: [],
  turnsEnded: 0,
});

type LiveStore = {
  connected: boolean;
  chats: Record<string, LiveChat>;
  subscribe: (id: string) => () => void;
  send: (msg: ClientMessage) => void;
  clearItems: (id: string) => void;
};

let socket: WebSocket | undefined;
let retry = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
const subscribed = new Map<string, number>();

function wsUrl() {
  const p = useConnection.getState().pairing;
  if (!p) return undefined;
  const base = p.url.replace(/^http/, 'ws') + '/api/ws';
  // Browsers can't set headers on WebSockets; the web preview passes the token in the URL instead.
  return { url: Platform.OS === 'web' ? `${base}?token=${encodeURIComponent(p.token)}` : base, token: p.token };
}

function connect() {
  const target = wsUrl();
  if (!target || socket) return;
  const ws: WebSocket =
    Platform.OS === 'web'
      ? new WebSocket(target.url)
      : // React Native's WebSocket accepts headers as a third argument.
        new (WebSocket as any)(target.url, undefined, { headers: { Authorization: `Bearer ${target.token}` } });
  socket = ws;
  ws.onopen = () => {
    retry = 0;
    useLive.setState({ connected: true });
    for (const id of subscribed.keys()) raw({ type: 'subscribe', sessionId: id });
    for (const msg of outbox.splice(0)) raw(msg);
  };
  ws.onmessage = (e) => {
    try {
      apply(JSON.parse(String(e.data)) as ServerMessage);
    } catch {
      // ignore malformed frames
    }
  };
  ws.onclose = () => {
    socket = undefined;
    useLive.setState({ connected: false });
    if (!subscribed.size) return;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(connect, Math.min(15_000, 500 * 2 ** retry++));
  };
}

// Actions taken while reconnecting are sent once the socket is back; subscriptions are replayed separately.
const outbox: ClientMessage[] = [];

function raw(msg: ClientMessage) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
  else if (msg.type !== 'subscribe' && msg.type !== 'unsubscribe') {
    outbox.push(msg);
    connect();
  }
}

function update(id: string, fn: (c: LiveChat) => Partial<LiveChat>) {
  useLive.setState((s) => {
    const chat = s.chats[id] ?? emptyChat();
    return { chats: { ...s.chats, [id]: { ...chat, ...fn(chat) } } };
  });
}

function apply(m: ServerMessage) {
  if (!('sessionId' in m) || !m.sessionId) return;
  const id = m.sessionId;
  switch (m.type) {
    case 'snapshot':
      // recent = this turn so far; replaces whatever the app had, which may be stale after a reconnect.
      return update(id, () => ({ state: m.state, settings: m.settings, pending: m.pending, draft: m.draft, items: m.recent, error: undefined }));
    case 'catalog':
      return update(id, () => ({ commands: m.commands, models: m.models }));
    case 'state':
      return update(id, () => ({ state: m.state }));
    case 'settings':
      return update(id, () => ({ settings: m.settings }));
    case 'item':
      return update(id, (c) => ({ items: [...c.items, m.item], draft: m.item.kind === 'assistant' ? '' : c.draft }));
    case 'tool_result':
      return update(id, (c) => ({ toolResults: { ...c.toolResults, [m.toolId]: m.result } }));
    case 'delta':
      return update(id, (c) => ({ draft: c.draft + m.text }));
    case 'permission':
      return update(id, (c) => ({ pending: [...c.pending.filter((p) => p.requestId !== m.pending.requestId), m.pending] }));
    case 'permission_resolved':
      return update(id, (c) => ({ pending: c.pending.filter((p) => p.requestId !== m.requestId) }));
    case 'turn_end':
      return update(id, (c) => ({ draft: '', turnsEnded: c.turnsEnded + 1, error: m.ok ? undefined : `Turn ended: ${m.error}` }));
    case 'notice':
      return update(id, (c) => ({ items: [...c.items, { kind: 'assistant', id: `notice:${Date.now()}`, text: `_${m.text}_` }] }));
    case 'error':
      return update(id, () => ({ error: m.message }));
  }
}

export const useLive = create<LiveStore>(() => ({
  connected: false,
  chats: {},
  subscribe: (id) => {
    subscribed.set(id, (subscribed.get(id) ?? 0) + 1);
    if (socket?.readyState === WebSocket.OPEN) raw({ type: 'subscribe', sessionId: id });
    else connect();
    return () => {
      const n = (subscribed.get(id) ?? 1) - 1;
      if (n > 0) return subscribed.set(id, n);
      subscribed.delete(id);
      raw({ type: 'unsubscribe', sessionId: id });
    };
  },
  send: (msg) => {
    if (msg.type === 'send' || msg.type === 'interrupt') update(msg.sessionId, () => ({ error: undefined }));
    raw(msg);
  },
  clearItems: (id) => update(id, () => ({ items: [], toolResults: {} })),
}));

export function useChat(id: string): LiveChat {
  return useLive((s) => s.chats[id]) ?? EMPTY;
}

const EMPTY = emptyChat();
