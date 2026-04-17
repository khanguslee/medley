import { Hono } from 'hono';
import { clearStravaToken, getStravaToken, saveStravaToken } from '../db/stravaTokens.js';
import {
  StravaApiError,
  buildAuthUrl,
  exchangeCodeForToken,
  fetchAllActivities,
  isTokenExpired,
  refreshAccessToken,
} from '../strava/client.js';
import { loadStravaConfig } from '../strava/config.js';

const stravaRoutes = new Hono();

function getConfig() {
  return loadStravaConfig();
}

stravaRoutes.get('/api/strava/auth-url', (c) => {
  try {
    const url = buildAuthUrl(getConfig());
    return c.json({ url });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

stravaRoutes.post('/api/strava/callback', async (c) => {
  try {
    const { code } = await c.req.json<{ code: string }>();
    if (!code) return c.json({ error: 'Missing code' }, 400);

    const config = getConfig();
    const token = await exchangeCodeForToken(fetch, config, code);

    saveStravaToken({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      athlete_id: token.athlete?.id ?? null,
      athlete_firstname: token.athlete?.firstname ?? null,
      athlete_lastname: token.athlete?.lastname ?? null,
    });

    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof StravaApiError) {
      return c.json({ error: err.message }, err.status as 400 | 401 | 403 | 500);
    }
    return c.json({ error: (err as Error).message }, 500);
  }
});

stravaRoutes.get('/api/strava/me', (c) => {
  try {
    const row = getStravaToken();
    if (!row) return c.json({ athlete: null });

    const athlete =
      row.athlete_id !== null
        ? {
            id: row.athlete_id,
            firstname: row.athlete_firstname ?? '',
            lastname: row.athlete_lastname ?? '',
          }
        : null;

    return c.json({ athlete });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

stravaRoutes.delete('/api/strava/token', (c) => {
  try {
    clearStravaToken();
    return c.body(null, 204);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

stravaRoutes.get('/api/activities/stream', async (c) => {
  let row = getStravaToken();
  if (!row) return c.json({ error: 'Not authenticated' }, 401);

  const config = getConfig();

  if (isTokenExpired({ access_token: row.access_token, refresh_token: row.refresh_token, expires_at: row.expires_at })) {
    const refreshed = await refreshAccessToken(fetch, config, {
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      expires_at: row.expires_at,
    });
    saveStravaToken({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
      athlete_id: row.athlete_id,
      athlete_firstname: row.athlete_firstname,
      athlete_lastname: row.athlete_lastname,
    });
    row = getStravaToken()!;
  }

  const accessToken = row.access_token;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let loaded = 0;
      try {
        await fetchAllActivities(fetch, accessToken, {
          onPage(activities, page) {
            loaded += activities.length;
            const data = JSON.stringify({ page, activities, loaded });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          },
        });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, total: loaded })}\n\n`));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

stravaRoutes.get('/api/activities', async (c) => {
  try {
    let row = getStravaToken();
    if (!row) return c.json({ error: 'Not authenticated' }, 401);

    const config = getConfig();

    if (isTokenExpired({ access_token: row.access_token, refresh_token: row.refresh_token, expires_at: row.expires_at })) {
      const refreshed = await refreshAccessToken(fetch, config, {
        access_token: row.access_token,
        refresh_token: row.refresh_token,
        expires_at: row.expires_at,
      });
      saveStravaToken({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
        athlete_id: row.athlete_id,
        athlete_firstname: row.athlete_firstname,
        athlete_lastname: row.athlete_lastname,
      });
      row = getStravaToken()!;
    }

    const fromParam = c.req.query('from');
    const toParam = c.req.query('to');

    const after = fromParam ? Math.floor(new Date(fromParam).getTime() / 1000) : undefined;
    const before = toParam ? Math.floor(new Date(toParam).getTime() / 1000) : undefined;

    const activities = await fetchAllActivities(fetch, row.access_token, { after, before });
    return c.json(activities);
  } catch (err) {
    if (err instanceof StravaApiError) {
      return c.json({ error: err.message }, err.status as 400 | 401 | 403 | 500);
    }
    return c.json({ error: (err as Error).message }, 500);
  }
});

export default stravaRoutes;
