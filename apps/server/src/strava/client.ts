export interface StravaToken {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete?: { id: number; firstname: string; lastname: string };
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  start_date: string;
}

export interface StravaConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class StravaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'StravaApiError';
  }
}

type FetchFn = typeof fetch;

export function buildAuthUrl(config: StravaConfig): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'read,activity:read_all',
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}

export async function exchangeCodeForToken(
  fetchFn: FetchFn,
  config: StravaConfig,
  code: string,
): Promise<StravaToken> {
  const res = await fetchFn('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new StravaApiError('Token exchange failed', res.status, body);
  }
  return res.json();
}

export async function refreshAccessToken(
  fetchFn: FetchFn,
  config: StravaConfig,
  oldToken: StravaToken,
): Promise<StravaToken> {
  const res = await fetchFn('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: oldToken.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new StravaApiError('Token refresh failed', res.status, body);
  }
  const refreshed = await res.json();
  return { ...oldToken, ...refreshed, athlete: refreshed.athlete ?? oldToken.athlete };
}

export function isTokenExpired(token: StravaToken, now = Date.now()): boolean {
  return now / 1000 >= token.expires_at;
}

export interface FetchActivitiesOptions {
  after?: number; // unix seconds
  before?: number; // unix seconds
  perPage?: number;
  onPage?: (activities: StravaActivity[], page: number) => void;
  onProgress?: (loaded: number, page: number) => void;
}

async function fetchActivitiesPage(
  fetchFn: FetchFn,
  accessToken: string,
  page: number,
  perPage: number,
  after?: number,
  before?: number,
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (after !== undefined) params.set('after', String(after));
  if (before !== undefined) params.set('before', String(before));

  const res = await fetchFn(
    `https://www.strava.com/api/v3/athlete/activities?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new StravaApiError('Failed to fetch activities', res.status, body);
  }
  return res.json();
}

export async function fetchAllActivities(
  fetchFn: FetchFn,
  accessToken: string,
  opts: FetchActivitiesOptions = {},
): Promise<StravaActivity[]> {
  const { after, before, perPage = 100, onPage, onProgress } = opts;
  const all: StravaActivity[] = [];
  let page = 1;
  while (true) {
    const batch = await fetchActivitiesPage(fetchFn, accessToken, page, perPage, after, before);
    all.push(...batch);
    onPage?.(batch, page);
    onProgress?.(all.length, page);
    if (batch.length < perPage) break;
    page++;
  }
  return all;
}
