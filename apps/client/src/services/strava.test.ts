import { describe, it, expect, vi, beforeEach } from "vitest";
import { getValidToken, saveToken } from "./strava";
import type { StravaToken } from "./strava";

const mockAthlete = { firstname: "Jane", lastname: "Doe" };

const validToken: StravaToken = {
  access_token: "valid_access",
  refresh_token: "refresh_abc",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  athlete: mockAthlete,
};

const expiredToken: StravaToken = {
  access_token: "old_access",
  refresh_token: "refresh_abc",
  expires_at: Math.floor(Date.now() / 1000) - 100,
  athlete: mockAthlete,
};

// Minimal localStorage mock
const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
});

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  vi.restoreAllMocks();
});

describe("getValidToken", () => {
  it("returns null when no token is stored", async () => {
    expect(await getValidToken()).toBeNull();
  });

  it("returns the token as-is when it is not expired", async () => {
    saveToken(validToken);
    const result = await getValidToken();
    expect(result).toEqual(validToken);
  });

  it("preserves athlete data after a token refresh", async () => {
    saveToken(expiredToken);

    // Strava refresh response — no athlete field
    const refreshResponse = {
      access_token: "new_access",
      refresh_token: "refresh_xyz",
      expires_at: Math.floor(Date.now() / 1000) + 7200,
      expires_in: 7200,
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(refreshResponse),
      })
    );

    const result = await getValidToken();
    expect(result).not.toBeNull();
    expect(result!.access_token).toBe("new_access");
    expect(result!.athlete).toEqual(mockAthlete);
  });

  it("clears token and returns null when refresh fails", async () => {
    saveToken(expiredToken);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false })
    );

    const result = await getValidToken();
    expect(result).toBeNull();
    expect(store["strava_token"]).toBeUndefined();
  });
});
