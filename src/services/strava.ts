export interface StravaToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: { firstname: string; lastname: string };
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

const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID as string;
const CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET as string;
const REDIRECT_URI = import.meta.env.VITE_STRAVA_REDIRECT_URI as string;
const TOKEN_KEY = "strava_token";

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "read,activity:read_all",
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}

export async function exchangeCodeForToken(
  code: string
): Promise<StravaToken> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Token exchange failed");
  const token: StravaToken = await res.json();
  saveToken(token);
  return token;
}

async function refreshAccessToken(
  refreshToken: string
): Promise<StravaToken> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Token refresh failed");
  const token: StravaToken = await res.json();
  saveToken(token);
  return token;
}

export function saveToken(token: StravaToken): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

export function getToken(): StravaToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function isTokenExpired(token: StravaToken): boolean {
  return Date.now() / 1000 >= token.expires_at;
}

export async function getValidToken(): Promise<StravaToken | null> {
  const token = getToken();
  if (!token) return null;
  if (!isTokenExpired(token)) return token;
  try {
    return await refreshAccessToken(token.refresh_token);
  } catch {
    clearToken();
    return null;
  }
}

export async function fetchActivities(
  accessToken: string,
  page = 1,
  perPage = 30
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error("Failed to fetch activities");
  return res.json();
}
