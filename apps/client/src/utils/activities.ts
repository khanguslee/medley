import type { StravaActivity } from '../services/api'

export interface SportMetric {
  id: string
  label: string
  shortLabel: string
  unit: 'h' | 'km' | 'm' | 'kcal'
  accessor: (a: StravaActivity) => number
  format: (total: number) => number
}

const round1 = (n: number) => Math.round(n * 10) / 10

export const SPORT_METRICS: Record<string, SportMetric> = {
  moving_time: {
    id: 'moving_time',
    label: 'Moving time',
    shortLabel: 'Moving',
    unit: 'h',
    accessor: a => a.moving_time,
    format: s => round1(s / 3600),
  },
  elapsed_time: {
    id: 'elapsed_time',
    label: 'Elapsed time',
    shortLabel: 'Elapsed',
    unit: 'h',
    accessor: a => a.elapsed_time,
    format: s => round1(s / 3600),
  },
}

export interface SportValue {
  sport: string
  value: number
}

export function aggregateBySport(
  activities: StravaActivity[],
  metric: SportMetric,
  after: Date | null,
  before?: Date | null
): SportValue[] {
  const filtered = activities.filter(a => {
    const date = new Date(a.start_date)
    if (after && date < after) return false
    if (before && date > before) return false
    return true
  })

  const totals = new Map<string, number>()
  for (const activity of filtered) {
    const current = totals.get(activity.sport_type) ?? 0
    totals.set(activity.sport_type, current + metric.accessor(activity))
  }

  return Array.from(totals.entries())
    .map(([sport, total]) => ({
      sport,
      value: metric.format(total),
    }))
    .sort((a, b) => b.value - a.value)
}
