export type TimePeriod = 'week' | 'month' | 'year' | 'all' | 'custom'

function getMondayOf(now: Date): Date {
  const day = now.getDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day // roll back to Monday
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function getStartOfPeriod(period: TimePeriod): Date | null {
  if (period === 'all' || period === 'custom') return null

  const now = new Date()

  if (period === 'week') {
    return getMondayOf(now)
  }

  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }

  // year
  return new Date(now.getFullYear(), 0, 1)
}

export interface CustomRange {
  start: Date
  end: Date
}

export function formatPeriodRange(period: TimePeriod, now = new Date(), customRange?: CustomRange): string {
  if (period === 'all') return ''

  if (period === 'custom') {
    if (!customRange) return ''
    if (isNaN(customRange.start.getTime()) || isNaN(customRange.end.getTime())) return ''
    const fmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${fmt.format(customRange.start)} – ${fmt.format(customRange.end)}`
  }

  if (period === 'month') {
    return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(now)
  }

  if (period === 'year') {
    return String(now.getFullYear())
  }

  // week: Mon–Sun range
  const monday = getMondayOf(now)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const dayFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
  const sameMonth = monday.getMonth() === sunday.getMonth()
  const sameYear = monday.getFullYear() === sunday.getFullYear()

  if (sameYear) {
    if (sameMonth) {
      // e.g. "Apr 6 – 12, 2026"
      const startStr = dayFmt.format(monday)
      const endDay = sunday.getDate()
      return `${startStr} – ${endDay}, ${sunday.getFullYear()}`
    } else {
      // e.g. "Mar 30 – Apr 5, 2026"
      return `${dayFmt.format(monday)} – ${dayFmt.format(sunday)}, ${sunday.getFullYear()}`
    }
  } else {
    // straddles a year boundary e.g. "Dec 29, 2025 – Jan 4, 2026"
    const fullFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${fullFmt.format(monday)} – ${fullFmt.format(sunday)}`
  }
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
