import type { Profile, ProfileDraft, ProfileFilters, SearchResult } from '../domain/model';

const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
type Envelope<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

export class ApiError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}/api${path}`, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(12000),
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers }
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Unable to reach the server. Check your connection and retry.');
  }
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new ApiError('API_ERROR', 'The server returned an unexpected response.');
  let payload: Envelope<T>;
  try { payload = await response.json() as Envelope<T>; }
  catch { throw new ApiError('API_ERROR', 'The server response could not be read.'); }
  if (!response.ok || !payload.success) {
    const error = payload.success ? { code: 'API_ERROR', message: 'The request failed.' } : payload.error;
    throw new ApiError(error.code, error.message);
  }
  return payload.data;
}

const body = (value: unknown): RequestInit => ({ body: JSON.stringify(value) });

export const api = {
  search(filters: ProfileFilters): Promise<SearchResult> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') query.set(key, String(value));
    return request(`/profiles?${query}`);
  },
  filters(): Promise<{ universities: string[]; faculties: string[]; departments: string[]; degrees: string[]; academicYears: string[] }> {
    return request('/profiles/filters');
  },
  get(id: string): Promise<Profile> { return request(`/profiles/${encodeURIComponent(id)}`); },
  create(draft: ProfileDraft, passcode: string): Promise<{ id: string }> {
    return request('/profiles', { method: 'POST', ...body({ ...draft, passcode }) });
  },
  verify(id: string, passcode: string): Promise<{ valid: boolean }> {
    return request(`/profiles/${encodeURIComponent(id)}/verify`, { method: 'POST', ...body({ passcode }) });
  },
  update(id: string, draft: ProfileDraft, passcode: string): Promise<{ id: string }> {
    return request(`/profiles/${encodeURIComponent(id)}`, { method: 'PUT', ...body({ ...draft, passcode }) });
  },
  remove(id: string, passcode: string): Promise<void> {
    return request(`/profiles/${encodeURIComponent(id)}`, { method: 'DELETE', ...body({ passcode }) });
  }
};
