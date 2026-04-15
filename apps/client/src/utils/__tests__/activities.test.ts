import { describe, it, expect } from 'vitest'
import { aggregateHoursBySport } from '../activities'
import type { StravaActivity } from '../../services/api'

function makeActivity(
  id: number,
  sport_type: string,
  moving_time: number,
  start_date: string
): StravaActivity {
  return { id, name: `Activity ${id}`, type: sport_type, sport_type, distance: 0, moving_time, start_date }
}

describe('aggregateHoursBySport', () => {
  it('returns empty array for empty activities', () => {
    expect(aggregateHoursBySport([], null)).toEqual([])
  })

  it('aggregates a single activity into hours', () => {
    const activities = [makeActivity(1, 'Run', 3600, '2025-01-01T10:00:00Z')]
    expect(aggregateHoursBySport(activities, null)).toEqual([{ sport: 'Run', hours: 1 }])
  })

  it('groups activities by sport_type and sums moving_time', () => {
    const activities = [
      makeActivity(1, 'Run', 3600, '2025-01-01T10:00:00Z'),
      makeActivity(2, 'Run', 1800, '2025-01-02T10:00:00Z'),
      makeActivity(3, 'Ride', 7200, '2025-01-03T10:00:00Z'),
    ]
    const result = aggregateHoursBySport(activities, null)
    expect(result).toHaveLength(2)
    const run = result.find(r => r.sport === 'Run')!
    expect(run.hours).toBe(1.5)
    const ride = result.find(r => r.sport === 'Ride')!
    expect(ride.hours).toBe(2)
  })

  it('sorts results descending by hours', () => {
    const activities = [
      makeActivity(1, 'Run', 1800, '2025-01-01T10:00:00Z'),
      makeActivity(2, 'Ride', 7200, '2025-01-02T10:00:00Z'),
      makeActivity(3, 'Swim', 3600, '2025-01-03T10:00:00Z'),
    ]
    const result = aggregateHoursBySport(activities, null)
    expect(result.map(r => r.sport)).toEqual(['Ride', 'Swim', 'Run'])
  })

  it('rounds hours to 1 decimal place', () => {
    const activities = [makeActivity(1, 'Run', 5400 + 90, '2025-01-01T10:00:00Z')]
    const result = aggregateHoursBySport(activities, null)
    // 5490s / 3600 = 1.525 → rounds to 1.5
    expect(result[0].hours).toBe(1.5)
  })

  it('filters activities by after date', () => {
    const activities = [
      makeActivity(1, 'Run', 3600, '2025-01-01T10:00:00Z'),
      makeActivity(2, 'Run', 3600, '2025-03-01T10:00:00Z'),
    ]
    const after = new Date('2025-02-01T00:00:00Z')
    const result = aggregateHoursBySport(activities, after)
    expect(result).toHaveLength(1)
    expect(result[0].hours).toBe(1)
  })

  it('includes all activities when after is null', () => {
    const activities = [
      makeActivity(1, 'Run', 3600, '2020-01-01T10:00:00Z'),
      makeActivity(2, 'Ride', 3600, '2024-06-01T10:00:00Z'),
    ]
    const result = aggregateHoursBySport(activities, null)
    expect(result).toHaveLength(2)
  })

  it('returns empty array when all activities are before the after date', () => {
    const activities = [makeActivity(1, 'Run', 3600, '2024-01-01T10:00:00Z')]
    const after = new Date('2025-01-01T00:00:00Z')
    expect(aggregateHoursBySport(activities, after)).toEqual([])
  })

  it('filters activities by before date', () => {
    const activities = [
      makeActivity(1, 'Run', 3600, '2025-01-01T10:00:00Z'),
      makeActivity(2, 'Run', 3600, '2025-03-01T10:00:00Z'),
    ]
    const before = new Date('2025-02-01T00:00:00Z')
    const result = aggregateHoursBySport(activities, null, before)
    expect(result).toHaveLength(1)
    expect(result[0].hours).toBe(1)
  })

  it('filters activities within a closed date range [after, before]', () => {
    const activities = [
      makeActivity(1, 'Run', 3600, '2025-01-01T10:00:00Z'),
      makeActivity(2, 'Ride', 7200, '2025-03-15T10:00:00Z'),
      makeActivity(3, 'Swim', 1800, '2025-06-01T10:00:00Z'),
    ]
    const after = new Date('2025-02-01T00:00:00Z')
    const before = new Date('2025-05-01T00:00:00Z')
    const result = aggregateHoursBySport(activities, after, before)
    expect(result).toHaveLength(1)
    expect(result[0].sport).toBe('Ride')
  })

  it('includes activities exactly on the after boundary', () => {
    const boundary = new Date('2025-03-01T00:00:00Z')
    const activities = [makeActivity(1, 'Run', 3600, '2025-03-01T00:00:00Z')]
    const result = aggregateHoursBySport(activities, boundary)
    expect(result).toHaveLength(1)
  })

  it('includes activities exactly on the before boundary', () => {
    const before = new Date('2025-03-01T00:00:00Z')
    const activities = [makeActivity(1, 'Run', 3600, '2025-03-01T00:00:00Z')]
    // Exactly on boundary — filter is strict >, so boundary date is included
    const result = aggregateHoursBySport(activities, null, before)
    expect(result).toHaveLength(1)
  })
})
