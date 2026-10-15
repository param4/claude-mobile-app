import { z } from 'zod';
import {
  CatalogResponse,
  CreateSessionResponse,
  MessagesResponse,
  ProjectsResponse,
  SessionsResponse,
  type CreateSessionRequest,
  type PairingPayload,
  type SessionQuery,
} from '@claude-mobile/protocol';
import { useConnection } from './connection';

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

const Health = z.object({ ok: z.literal(true), name: z.string() });

async function request<T extends z.ZodType>(schema: T, path: string, pairing = useConnection.getState().pairing, init?: RequestInit): Promise<z.infer<T>> {
  if (!pairing) throw new ApiError('Not paired with a Mac');
  let res: Response;
  try {
    res = await fetch(pairing.url + path, { ...init, headers: { Authorization: `Bearer ${pairing.token}`, 'Content-Type': 'application/json' } });
  } catch {
    throw new ApiError(`Can't reach ${pairing.name}. Is the Mac awake and on Tailscale?`);
  }
  if (res.status === 401) throw new ApiError('This phone is no longer paired. Scan the QR code again.', 401);
  if (!res.ok) throw new ApiError(`Mac returned ${res.status}`, res.status);
  return schema.parse(await res.json());
}

function qs(params: Record<string, string | number | undefined>) {
  const s = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return s ? `?${s}` : '';
}

export const api = {
  health: (pairing?: PairingPayload) => request(Health, '/api/health', pairing),
  projects: () => request(ProjectsResponse, '/api/projects'),
  sessions: (q: Partial<SessionQuery>) => request(SessionsResponse, `/api/sessions${qs(q)}`),
  catalog: (project: string) => request(CatalogResponse, `/api/catalog${qs({ project })}`),
  createSession: (body: CreateSessionRequest) =>
    request(CreateSessionResponse, '/api/sessions', undefined, { method: 'POST', body: JSON.stringify(body) }),
  messages: (id: string, offset: number, limit = 100) =>
    request(MessagesResponse, `/api/sessions/${encodeURIComponent(id)}/messages${qs({ offset, limit })}`),
};
