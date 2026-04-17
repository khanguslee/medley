import type { StravaActivity } from '../services/api';

export interface HeatmapDay {
  date: string; // "YYYY-MM-DD" in local time
  totalSeconds: number;
  activities: string[]; // activity names in chronological order
}

export type HeatmapGrid = HeatmapDay[]; // always a multiple of 7 (complete weeks)

/**
 * Returns the Sunday on or before Jan 1 of the given year (local time).
 * This is the first cell in the heatmap grid for that year.
 */
export function getGridStart(year: number): Date {
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay(); // 0=Sun, 6=Sat
  const start = new Date(year, 0, 1 - dayOfWeek);
  return start;
}

/**
 * Returns the Saturday on or after Dec 31 of the given year (local time).
 * This is the last cell in the heatmap grid for that year.
 */
export function getGridEnd(year: number): Date {
  const dec31 = new Date(year, 11, 31);
  const dayOfWeek = dec31.getDay(); // 0=Sun, 6=Sat
  const end = new Date(year, 11, 31 + (6 - dayOfWeek));
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Returns a descending list of years that have activities, always including
 * the current year so there is always at least one option.
 */
export function getAvailableYears(activities: StravaActivity[]): number[] {
  const currentYear = new Date().getFullYear();
  const years = new Set<number>([currentYear]);
  for (const activity of activities) {
    years.add(new Date(activity.start_date).getFullYear());
  }
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Build a full-year heatmap grid, padded to complete week boundaries.
 *
 * The grid starts on the Sunday on or before Jan 1 of `year` and ends on
 * the Saturday on or after Dec 31 of `year`. This guarantees:
 *   - Row 0 = Sunday, Row 1 = Monday, … Row 6 = Saturday (correct alignment)
 *   - Complete weeks (grid.length is always a multiple of 7)
 *   - 52 or 53 weeks depending on the year
 *
 * @param activities - All available activities
 * @param sportFilter - null for all sports, or a specific sport_type string
 * @param year - The calendar year to display
 */
export function buildHeatmapGrid(
  activities: StravaActivity[],
  sportFilter: string | null,
  year: number
): HeatmapGrid {
  const windowStartDate = getGridStart(year);
  const windowEndDate = getGridEnd(year);

  // Filter and group activities by local-date key
  const grouped = new Map<
    string,
    { totalSeconds: number; activities: { name: string; timestamp: Date }[] }
  >();

  for (const activity of activities) {
    if (sportFilter && activity.sport_type !== sportFilter) continue;

    const activityDate = new Date(activity.start_date);
    const y = activityDate.getFullYear();
    const m = String(activityDate.getMonth() + 1).padStart(2, '0');
    const d = String(activityDate.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;

    // Compare using local date (not UTC)
    const activityLocalDate = new Date(y, activityDate.getMonth(), activityDate.getDate());
    if (activityLocalDate < windowStartDate || activityLocalDate > windowEndDate) continue;

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, { totalSeconds: 0, activities: [] });
    }
    const bucket = grouped.get(dateKey)!;
    bucket.totalSeconds += activity.elapsed_time;
    bucket.activities.push({ name: activity.name, timestamp: activityDate });
  }

  // Sort activity names within each day chronologically
  for (const bucket of grouped.values()) {
    bucket.activities.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Materialise every calendar day in the window
  const grid: HeatmapGrid = [];
  const current = new Date(windowStartDate);

  while (current <= windowEndDate) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;
    const bucket = grouped.get(dateKey);

    grid.push({
      date: dateKey,
      totalSeconds: bucket?.totalSeconds ?? 0,
      activities: bucket?.activities.map((a) => a.name) ?? [],
    });

    current.setDate(current.getDate() + 1);
  }

  return grid;
}

/**
 * Map elapsed seconds to a color intensity level (0–4).
 * Uses p95 normalization to prevent outlier days from washing out the scale.
 */
export function getIntensityLevel(
  seconds: number,
  p95Seconds: number
): 0 | 1 | 2 | 3 | 4 {
  if (seconds === 0) return 0;
  if (p95Seconds === 0) return 0;

  const ratio = Math.min(seconds / p95Seconds, 1);
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

/**
 * Compute the 95th percentile of non-zero elapsed-second values across the grid.
 */
export function computeP95(grid: HeatmapGrid): number {
  const nonZero = grid
    .map((day) => day.totalSeconds)
    .filter((s) => s > 0)
    .sort((a, b) => a - b);

  if (nonZero.length === 0) return 0;

  const index = Math.ceil(nonZero.length * 0.95) - 1;
  return nonZero[Math.max(0, index)];
}
