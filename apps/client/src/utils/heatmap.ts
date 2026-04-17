import type { StravaActivity } from '../services/api';

export interface HeatmapDay {
  date: string; // "YYYY-MM-DD" in local time
  totalSeconds: number;
  activities: string[]; // activity names in chronological order
}

export type HeatmapGrid = HeatmapDay[]; // exactly 364 entries, oldest-first

/**
 * Build a 364-day heatmap grid for the trailing 52 weeks.
 *
 * @param activities - All available activities
 * @param sportFilter - null for all sports, or a specific sport_type string
 * @param today - Reference date (injectable for testing)
 * @returns Array of 364 HeatmapDay entries, oldest-first
 *
 * Timezone: Activities are bucketed into the browser's local calendar day,
 * using new Date(iso).getFullYear/Month/Date() methods (not UTC conversion).
 */
export function buildHeatmapGrid(
  activities: StravaActivity[],
  sportFilter: string | null,
  today: Date
): HeatmapGrid {
  // Compute the window start (today minus 363 days, at local midnight)
  const windowStartDate = new Date(today);
  windowStartDate.setDate(windowStartDate.getDate() - 363);
  windowStartDate.setHours(0, 0, 0, 0);

  // Window end (today at 23:59:59 local time)
  const windowEndDate = new Date(today);
  windowEndDate.setHours(23, 59, 59, 999);

  // Filter and group activities by local-date key
  const grouped = new Map<
    string,
    { totalSeconds: number; activities: { name: string; timestamp: Date }[] }
  >();

  for (const activity of activities) {
    // Sport filter
    if (sportFilter && activity.sport_type !== sportFilter) continue;

    // Parse start_date as UTC
    const activityDate = new Date(activity.start_date);

    // Extract local date: use getFullYear/Month/Date which use local timezone
    const year = activityDate.getFullYear();
    const month = String(activityDate.getMonth() + 1).padStart(2, '0');
    const day = String(activityDate.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    // Create a local date object for this activity to check window
    const activityLocalDate = new Date(
      year,
      activityDate.getMonth(),
      activityDate.getDate()
    );

    // Check if within window (local date boundaries)
    if (activityLocalDate < windowStartDate || activityLocalDate > windowEndDate) continue;

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, { totalSeconds: 0, activities: [] });
    }

    const bucket = grouped.get(dateKey)!;
    bucket.totalSeconds += activity.elapsed_time;
    bucket.activities.push({ name: activity.name, timestamp: activityDate });
  }

  // Sort activity names within each day by start_date
  for (const bucket of grouped.values()) {
    bucket.activities.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Build the full 364-day grid
  const grid: HeatmapGrid = [];
  let current = new Date(windowStartDate);

  while (current <= windowEndDate) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

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
 * Map elapsed seconds to a color intensity level (0-4).
 * Uses p95 normalization to prevent outliers from washing out the scale.
 *
 * @param seconds - Total seconds for a day
 * @param p95Seconds - 95th percentile of non-zero days
 * @returns Intensity level 0-4
 */
export function getIntensityLevel(
  seconds: number,
  p95Seconds: number
): 0 | 1 | 2 | 3 | 4 {
  if (seconds === 0) return 0;
  if (p95Seconds === 0) return 0; // Guard against all-zero grid

  const ratio = Math.min(seconds / p95Seconds, 1);
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

/**
 * Compute the 95th percentile of non-zero values.
 * Used to normalize color intensity across the heatmap.
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
