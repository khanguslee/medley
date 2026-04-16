export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  start_date: string;
}

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
}

/** Internal helper — prepends nothing (Vite proxies /api), throws on non-2xx. */
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res;
}

/** Fetch the Strava OAuth authorization URL from the server. */
export async function fetchAuthUrl(): Promise<string> {
  const res = await apiFetch('/api/strava/auth-url');
  const { url } = (await res.json()) as { url: string };
  return url;
}

/** Exchange an OAuth authorization code for a token via the server. */
export async function exchangeCode(code: string): Promise<void> {
  await apiFetch('/api/strava/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
}

/** Fetch the authenticated athlete, or null if not connected. */
export async function fetchMe(): Promise<StravaAthlete | null> {
  const res = await apiFetch('/api/strava/me');
  const { athlete } = (await res.json()) as { athlete: StravaAthlete | null };
  return athlete;
}

/** Delete the stored Strava token (disconnect). */
export async function deleteStravaToken(): Promise<void> {
  await apiFetch('/api/strava/token', { method: 'DELETE' });
}

/** Fetch activities from the server, optionally filtered by ISO date range. */
export async function fetchActivities(range?: { from?: string; to?: string }): Promise<StravaActivity[]> {
  const params = new URLSearchParams();
  if (range?.from) params.set('from', range.from);
  if (range?.to) params.set('to', range.to);
  const query = params.size > 0 ? `?${params}` : '';
  const res = await apiFetch(`/api/activities${query}`);
  return res.json();
}
