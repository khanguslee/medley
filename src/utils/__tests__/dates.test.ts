import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getStartOfPeriod } from '../dates'

describe('getStartOfPeriod', () => {
  beforeEach(() => {
    // Fix "now" to Wednesday 2026-04-08 14:30:00 UTC
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-08T14:30:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for "all"', () => {
    expect(getStartOfPeriod('all')).toBeNull()
  })

  it('returns start of current month', () => {
    const result = getStartOfPeriod('month')!
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(3) // April = 3
    expect(result.getDate()).toBe(1)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
  })

  it('returns start of current year', () => {
    const result = getStartOfPeriod('year')!
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(0) // January = 0
    expect(result.getDate()).toBe(1)
  })

  it('returns start of current week (Monday) when today is Wednesday', () => {
    const result = getStartOfPeriod('week')!
    // Wednesday Apr 8 → Monday Apr 6
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(3) // April
    expect(result.getDate()).toBe(6)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })

  it('returns same day (Monday) when today is Monday', () => {
    vi.setSystemTime(new Date('2026-04-06T09:00:00Z')) // Monday Apr 6
    const result = getStartOfPeriod('week')!
    expect(result.getDate()).toBe(6)
  })

  it('returns correct Monday when today is Sunday', () => {
    vi.setSystemTime(new Date('2026-04-12T09:00:00Z')) // Sunday Apr 12
    const result = getStartOfPeriod('week')!
    // Sunday → go back 6 days to Monday Apr 6
    expect(result.getDate()).toBe(6)
  })
})
