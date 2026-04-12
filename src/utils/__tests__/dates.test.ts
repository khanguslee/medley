import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getStartOfPeriod, formatPeriodRange } from '../dates'

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

describe('formatPeriodRange', () => {
  beforeEach(() => {
    // Fix "now" to Wednesday 2026-04-08 14:30:00 UTC
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-08T14:30:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty string for "all"', () => {
    expect(formatPeriodRange('all')).toBe('')
  })

  it('returns year string for "year"', () => {
    expect(formatPeriodRange('year')).toBe('2026')
  })

  it('returns month name and year for "month"', () => {
    expect(formatPeriodRange('month')).toBe('April 2026')
  })

  it('returns week range with year for "week" mid-week (same month)', () => {
    // Wednesday Apr 8 → Mon Apr 6 – Sun Apr 12, 2026
    expect(formatPeriodRange('week')).toBe('Apr 6 – 12, 2026')
  })

  it('returns week range crossing months', () => {
    // Wednesday Apr 1, 2026 → Mon Mar 30 – Sun Apr 5, 2026
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'))
    expect(formatPeriodRange('week')).toBe('Mar 30 – Apr 5, 2026')
  })

  it('returns week range crossing years', () => {
    // Wednesday Dec 31, 2025 → Mon Dec 29, 2025 – Sun Jan 4, 2026
    vi.setSystemTime(new Date('2025-12-31T12:00:00Z'))
    expect(formatPeriodRange('week')).toBe('Dec 29, 2025 – Jan 4, 2026')
  })
})
