const DAY = 24 * 60 * 60 * 1000;

export function relativeTime(ts: number, now = Date.now()): string {
  const diff = now - ts;
  if (diff < 60_000) return 'Now';
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}m`;
  const d = new Date(ts);
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  if (ts >= startOfToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (ts >= startOfToday - DAY) return 'Yesterday';
  if (ts >= startOfToday - 6 * DAY) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// claude-opus-5-5 -> Opus 5.5
export function modelLabel(model?: string): string | undefined {
  const m = model?.match(/claude-([a-z]+)-(\d+)-(\d+)/);
  if (!m) return model;
  return `${m[1]![0]!.toUpperCase()}${m[1]!.slice(1)} ${m[2]}.${m[3]}`;
}

export function effortLabel(effort?: string): string | undefined {
  if (!effort) return undefined;
  return effort === 'xhigh' ? 'XHigh' : effort[0]!.toUpperCase() + effort.slice(1);
}

export function shortenHome(p: string): string {
  return p.replace(/^\/Users\/[^/]+/, '~');
}
