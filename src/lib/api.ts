import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { z } from 'zod';
import {
  CatalogResponse,
  CreateSessionResponse,
  ExportResponse,
  FilesResponse,
  FoldersResponse,
  MessagesResponse,
  PresetsResponse,
  ProjectsResponse,
  SearchResponse,
  SessionsResponse,
  Upload,
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
  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw new ApiError(typeof body?.error === 'string' ? body.error : `Mac returned ${res.status}`, res.status);
  }
  return schema.parse(await res.json());
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

// Sends a local file (picker or camera output) to the Mac as the raw request body.
async function upload(uri: string, name: string, mediaType: string): Promise<Upload> {
  const pairing = useConnection.getState().pairing;
  if (!pairing) throw new ApiError('Not paired with a Mac');
  const headers = { Authorization: `Bearer ${pairing.token}`, 'Content-Type': mediaType, 'X-File-Name': encodeURIComponent(name) };
  const url = `${pairing.url}/api/uploads`;
  let status: number;
  let body: string;
  try {
    if (Platform.OS === 'web') {
      const res = await fetch(url, { method: 'POST', headers, body: await (await fetch(uri)).blob() });
      status = res.status;
      body = await res.text();
    } else {
      const res = await new File(uri).upload(url, { httpMethod: 'POST', headers });
      status = res.status;
      body = res.body;
    }
  } catch {
    throw new ApiError(`Couldn't send ${name} to ${pairing.name}`);
  }
  if (status !== 201) throw new ApiError(status === 413 ? `${name} is too large` : `Upload failed (${status})`, status);
  return Upload.parse(JSON.parse(body));
}

// Source for an <Image> served by the Mac (attachments, images in past messages).
export function imageSource(url: string) {
  const pairing = useConnection.getState().pairing;
  if (!pairing) return undefined;
  return { uri: pairing.url + url, headers: { Authorization: `Bearer ${pairing.token}` } };
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
    request(CreateSessionResponse, '/api/sessions', undefined, post(body)),
  messages: (id: string, offset: number, limit = 100) =>
    request(MessagesResponse, `/api/sessions/${encodeURIComponent(id)}/messages${qs({ offset, limit })}`),
  upload,
  files: (scope: { session?: string; project?: string }, q: string) => request(FilesResponse, `/api/files${qs({ ...scope, q })}`),
  folders: (path?: string) => request(FoldersResponse, `/api/folders${qs({ path })}`),
  presets: () => request(PresetsResponse, '/api/presets'),
  fork: (id: string, body: { upToMessageId?: string; before?: boolean }) =>
    request(CreateSessionResponse, `/api/sessions/${encodeURIComponent(id)}/fork`, undefined, post(body)),
  search: (id: string, q: string) => request(SearchResponse, `/api/sessions/${encodeURIComponent(id)}/search${qs({ q })}`),
  exportChat: (id: string) => request(ExportResponse, `/api/sessions/${encodeURIComponent(id)}/export`),
};
