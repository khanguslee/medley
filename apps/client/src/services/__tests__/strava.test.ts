import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAllActivities } from '../strava'
import type { StravaActivity } from '../strava'

function makeActivity(id: number): StravaActivity {
  return {
    id,
    name: `Activity ${id}`,
    type: 'Run',
    sport_type: 'Run',
    distance: 5000,
    moving_time: 1800,
    start_date: '2025-01-01T10:00:00Z',
  }
}

function makeBatch(count: number, startId = 1): StravaActivity[] {
  return Array.from({ length: count }, (_, i) => makeActivity(startId + i))
}

describe('fetchAllActivities', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns all activities from a single page when fewer than perPage', async () => {
    const activities = makeBatch(3)
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(activities),
    } as Response)

    const result = await fetchAllActivities('token', 100)

    expect(result).toHaveLength(3)
    expect(result).toEqual(activities)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('paginates until a batch is smaller than perPage', async () => {
    const page1 = makeBatch(2, 1)
    const page2 = makeBatch(2, 3)
    const page3 = makeBatch(1, 5)

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page1) } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page2) } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page3) } as Response)

    const result = await fetchAllActivities('token', 2)

    expect(result).toHaveLength(5)
    expect(result.map(a => a.id)).toEqual([1, 2, 3, 4, 5])
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('stops immediately when first page is empty', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response)

    const result = await fetchAllActivities('token', 100)

    expect(result).toHaveLength(0)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('throws when fetch returns a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve([]),
    } as Response)

    await expect(fetchAllActivities('token', 100)).rejects.toThrow(
      'Failed to fetch activities'
    )
  })

  it('passes the correct Authorization header', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response)

    await fetchAllActivities('my-access-token', 100)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('page=1'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer my-access-token' },
      })
    )
  })
})
