import { describe, it, expect } from 'vitest'
import { aggregateBySport, SPORT_METRICS } from '../activities'
import type { StravaActivity } from '../../services/api'

function makeActivity(
  id: number,
  sport_type: string,
  moving_time: number,
  start_date: string,
  elapsed_time = moving_time + 300
): StravaActivity {
  return { id, name: `Activity ${id}`, type: sport_type, sport_type, distance: 0, moving_time, elapsed_time, start_date }
}

describe('aggregateBySport — moving_time metric', () => {
  const metric = SPORT_METRICS.moving_time

  it('returns empty array for empty activities', () => {
    expect(aggregateBySport([], metric, null)).toEqual([])
  })

  it('aggregates a single activity into hours', () => {
    const activities = [makeActivity(1, 'Run', 3600, '2025-01-01T10:00:00Z')]
    expect(aggregateBySport(activities, metric, null)).toEqual([{ sport: 'Run', value: 1 }])
  })

  it('groups activities by sport_type and sums moving_time', () => {
    const activities = [
      makeActivity(1, 'Run', 3600, '2025-01-01T10:00:00Z'),
      makeActivity(2, 'Run', 1800, '2025-01-02T10:00:00Z'),
      makeActivity(3, 'Ride', 7200, '2025-01-03T10:00:00Z'),
    ]
    const result = aggregateBySport(activities, metric, null)
    expect(result).toHaveLength(2)
    const run = result.find(r => r.sport === 'Run')!
    expect(run.value).toBe(1.5)
    const ride = result.find(r => r.sport === 'Ride')!
    expect(ride.value).toBe(2)
  })

  it('sorts results descending by value', () => {
    const activities = [
      makeActivity(1, 'Run', 1800, '2025-01-01T10:00:00Z'),
      makeActivity(2, 'Ride', 7200, '2025-01-02T10:00:00Z'),
      makeActivity(3, 'Swim', 3600, '2025-01-03T10:00:00Z'),
    ]
    const result = aggregateBySport(activities, metric, null)
    expect(result.map(r => r.sport)).toEqual(['Ride', 'Swim', 'Run'])
  })

  it('rounds hours to 1 decimal place', () => {
    const activities = [makeActivity(1, 'Run', 5400 + 90, '2025-01-01T10:00:00Z')]
    const result = aggregateBySport(activities, metric, null)
    // 5490s / 3600 = 1.525 → rounds to 1.5
    expect(result[0].value).toBe(1.5)
  })

  it('filters activities by after date', () => {
    const activities = [
      makeActivity(1, 'Run', 3600, '2025-01-01T10:00:00Z'),
      makeActivity(2, 'Run', 3600, '2025-03-01T10:00:00Z'),
    ]
    const after = new Date('2025-02-01T00:00:00Z')
    const result = aggregateBySport(activities, metric, after)
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(1)
  })

  it('includes all activities when after is null', () => {
    const activities = [
      makeActivity(1, 'Run', 3600, '2020-01-01T10:00:00Z'),
      makeActivity(2, 'Ride', 3600, '2024-06-01T10:00:00Z'),
    ]
    const result = aggregateBySport(activities, metric, null)
    expect(result).toHaveLength(2)
  })

  it('returns empty array when all activities are before the after date', () => {
    const activities = [makeActivity(1, 'Run', 3600, '2024-01-01T10:00:00Z')]
    const after = new Date('2025-01-01T00:00:00Z')
    expect(aggregateBySport(activities, metric, after)).toEqual([])
  })

  it('filters activities by before date', () => {
    const activities = [
      makeActivity(1, 'Run', 3600, '2025-01-01T10:00:00Z'),
      makeActivity(2, 'Run', 3600, '2025-03-01T10:00:00Z'),
    ]
    const before = new Date('2025-02-01T00:00:00Z')
    const result = aggregateBySport(activities, metric, null, before)
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(1)
  })

  it('filters activities within a closed date range [after, before]', () => {
    const activities = [
      makeActivity(1, 'Run', 3600, '2025-01-01T10:00:00Z'),
      makeActivity(2, 'Ride', 7200, '2025-03-15T10:00:00Z'),
      makeActivity(3, 'Swim', 1800, '2025-06-01T10:00:00Z'),
    ]
    const after = new Date('2025-02-01T00:00:00Z')
    const before = new Date('2025-05-01T00:00:00Z')
    const result = aggregateBySport(activities, metric, after, before)
    expect(result).toHaveLength(1)
    expect(result[0].sport).toBe('Ride')
  })

  it('includes activities exactly on the after boundary', () => {
    const boundary = new Date('2025-03-01T00:00:00Z')
    const activities = [makeActivity(1, 'Run', 3600, '2025-03-01T00:00:00Z')]
    const result = aggregateBySport(activities, metric, boundary)
    expect(result).toHaveLength(1)
  })

  it('includes activities exactly on the before boundary', () => {
    const before = new Date('2025-03-01T00:00:00Z')
    const activities = [makeActivity(1, 'Run', 3600, '2025-03-01T00:00:00Z')]
    // Exactly on boundary — filter is strict >, so boundary date is included
    const result = aggregateBySport(activities, metric, null, before)
    expect(result).toHaveLength(1)
  })
})

describe('aggregateBySport — elapsed_time metric', () => {
  const metric = SPORT_METRICS.elapsed_time

  it('returns empty array for empty activities', () => {
    expect(aggregateBySport([], metric, null)).toEqual([])
  })

  it('aggregates elapsed_time into hours', () => {
    // elapsed_time = moving_time + 300 (default in makeActivity)
    // 3600 + 300 = 3900s → 3900/3600 = 1.1h
    const activities = [makeActivity(1, 'Run', 3600, '2025-01-01T10:00:00Z')]
    expect(aggregateBySport(activities, metric, null)).toEqual([{ sport: 'Run', value: 1.1 }])
  })

  it('elapsed values are always >= moving_time values for the same activities', () => {
    const activities = [
      makeActivity(1, 'Run', 3600, '2025-01-01T10:00:00Z'),
      makeActivity(2, 'Ride', 7200, '2025-01-02T10:00:00Z'),
    ]
    const movingResult = aggregateBySport(activities, SPORT_METRICS.moving_time, null)
    const elapsedResult = aggregateBySport(activities, metric, null)

    for (const sport of ['Run', 'Ride']) {
      const moving = movingResult.find(r => r.sport === sport)!.value
      const elapsed = elapsedResult.find(r => r.sport === sport)!.value
      expect(elapsed).toBeGreaterThanOrEqual(moving)
    }
  })

  it('groups and sums elapsed_time by sport', () => {
    const activities = [
      makeActivity(1, 'Run', 3600, '2025-01-01T10:00:00Z', 4200),
      makeActivity(2, 'Run', 1800, '2025-01-02T10:00:00Z', 2100),
    ]
    // total elapsed = 4200 + 2100 = 6300s → 6300/3600 = 1.8h (rounded 1 decimal)
    const result = aggregateBySport(activities, metric, null)
    expect(result).toEqual([{ sport: 'Run', value: 1.8 }])
  })

  it('respects date filters the same way as moving_time metric', () => {
    const activities = [
      makeActivity(1, 'Run', 3600, '2025-01-01T10:00:00Z'),
      makeActivity(2, 'Run', 3600, '2025-03-01T10:00:00Z'),
    ]
    const after = new Date('2025-02-01T00:00:00Z')
    const result = aggregateBySport(activities, metric, after)
    expect(result).toHaveLength(1)
  })
})
