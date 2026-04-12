import type { StravaActivity } from '../services/strava'

export interface SportHours {
  sport: string
  hours: number
}

export function aggregateHoursBySport(
  activities: StravaActivity[],
  after: Date | null
): SportHours[] {
  const filtered = after
    ? activities.filter(a => new Date(a.start_date) >= after)
    : activities

  const totals = new Map<string, number>()
  for (const activity of filtered) {
    const current = totals.get(activity.sport_type) ?? 0
    totals.set(activity.sport_type, current + activity.moving_time)
  }

  return Array.from(totals.entries())
    .map(([sport, totalSeconds]) => ({
      sport,
      hours: Math.round((totalSeconds / 3600) * 10) / 10,
    }))
    .sort((a, b) => b.hours - a.hours)
}
