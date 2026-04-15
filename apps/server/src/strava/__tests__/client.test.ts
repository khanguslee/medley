import { describe, expect, it, vi } from 'vitest';
import {
  StravaApiError,
  fetchAllActivities,
  isTokenExpired,
  refreshAccessToken,
  type StravaActivity,
  type StravaToken,
} from '../client.js';

const config = {
  clientId: 'test-id',
  clientSecret: 'test-secret',
  redirectUri: 'http://localhost:5173/callback',
};

const baseToken: StravaToken = {
  access_token: 'access-abc',
  refresh_token: 'refresh-xyz',
  expires_at: 9999999999,
};

// ---- isTokenExpired --------------------------------------------------------

describe('isTokenExpired', () => {
  it('returns false when token is in the future', () => {
    const token = { ...baseToken, expires_at: 9999999999 };
    expect(isTokenExpired(token, Date.now())).toBe(false);
  });

  it('returns true when token expired in the past', () => {
    const token = { ...baseToken, expires_at: 1000 };
    expect(isTokenExpired(token, Date.now())).toBe(true);
  });

  it('returns true at the exact expiry boundary', () => {
    const expiresAt = 1000;
    expect(isTokenExpired({ ...baseToken, expires_at: expiresAt }, expiresAt * 1000)).toBe(true);
  });
});

// ---- refreshAccessToken ----------------------------------------------------

describe('refreshAccessToken', () => {
  it('sends the correct POST body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_at: 2000000000,
      }),
    });

    await refreshAccessToken(mockFetch as unknown as typeof fetch, config, baseToken);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.strava.com/oauth/token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: baseToken.refresh_token,
          grant_type: 'refresh_token',
        }),
      }),
    );
  });

  it('merges refreshed fields over old token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_at: 2000000000,
      }),
    });

    const result = await refreshAccessToken(mockFetch as unknown as typeof fetch, config, baseToken);

    expect(result.access_token).toBe('new-access');
    expect(result.refresh_token).toBe('new-refresh');
    expect(result.expires_at).toBe(2000000000);
  });

  it('preserves athlete from oldToken when response has no athlete', async () => {
    const tokenWithAthlete: StravaToken = {
      ...baseToken,
      athlete: { id: 42, firstname: 'Ada', lastname: 'Lovelace' },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_at: 2000000000,
      }),
    });

    const result = await refreshAccessToken(
      mockFetch as unknown as typeof fetch,
      config,
      tokenWithAthlete,
    );

    expect(result.athlete).toEqual({ id: 42, firstname: 'Ada', lastname: 'Lovelace' });
  });

  it('throws StravaApiError on non-2xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Authorization Error' }),
    });

    await expect(
      refreshAccessToken(mockFetch as unknown as typeof fetch, config, baseToken),
    ).rejects.toBeInstanceOf(StravaApiError);
  });
});

// ---- fetchAllActivities ----------------------------------------------------

const makeActivity = (id: number): StravaActivity => ({
  id,
  name: `Activity ${id}`,
  type: 'Run',
  sport_type: 'Run',
  distance: 5000,
  moving_time: 1800,
  start_date: '2026-01-01T00:00:00Z',
});

describe('fetchAllActivities', () => {
  it('paginates until a short page is returned', async () => {
    const page1 = Array.from({ length: 3 }, (_, i) => makeActivity(i + 1));
    const page2 = Array.from({ length: 3 }, (_, i) => makeActivity(i + 4));
    const page3 = [makeActivity(7)]; // short page → stop

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => page1 })
      .mockResolvedValueOnce({ ok: true, json: async () => page2 })
      .mockResolvedValueOnce({ ok: true, json: async () => page3 });

    const result = await fetchAllActivities(
      mockFetch as unknown as typeof fetch,
      'access-abc',
      { perPage: 3 },
    );

    expect(result).toHaveLength(7);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('stops immediately on an empty first page', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => [] });

    const result = await fetchAllActivities(
      mockFetch as unknown as typeof fetch,
      'access-abc',
      { perPage: 100 },
    );

    expect(result).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('passes after and before query params to Strava', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });

    await fetchAllActivities(
      mockFetch as unknown as typeof fetch,
      'access-abc',
      { after: 1700000000, before: 1800000000, perPage: 100 },
    );

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('after=1700000000');
    expect(calledUrl).toContain('before=1800000000');
  });

  it('throws StravaApiError on non-2xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Forbidden' }),
    });

    await expect(
      fetchAllActivities(mockFetch as unknown as typeof fetch, 'access-abc'),
    ).rejects.toBeInstanceOf(StravaApiError);
  });
});
