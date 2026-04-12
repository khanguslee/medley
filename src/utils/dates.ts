export type TimePeriod = 'week' | 'month' | 'year' | 'all'

export function getStartOfPeriod(period: TimePeriod): Date | null {
  if (period === 'all') return null

  const now = new Date()

  if (period === 'week') {
    const day = now.getDay() // 0=Sun, 1=Mon, ...
    const diff = (day === 0 ? -6 : 1 - day) // roll back to Monday
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }

  // year
  return new Date(now.getFullYear(), 0, 1)
}
