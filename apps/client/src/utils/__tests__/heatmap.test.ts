import { describe, it, expect } from 'vitest';
import {
  buildHeatmapGrid,
  getIntensityLevel,
  computeP95,
  getGridStart,
  getGridEnd,
  getAvailableYears,
} from '../heatmap';
import type { StravaActivity } from '../../services/api';

describe('heatmap utilities', () => {
  describe('getGridStart', () => {
    it('returns the Sunday on or before Jan 1', () => {
      // 2025: Jan 1 = Wednesday (day 3) → start = Dec 29, 2024 (Sunday)
      const start = getGridStart(2025);
      expect(start.getDay()).toBe(0); // Sunday
      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(11); // December
      expect(start.getDate()).toBe(29);
    });

    it('returns Jan 1 itself when Jan 1 is a Sunday', () => {
      // 2023: Jan 1 = Sunday
      const start = getGridStart(2023);
      expect(start.getDay()).toBe(0);
      expect(start.getFullYear()).toBe(2023);
      expect(start.getMonth()).toBe(0);
      expect(start.getDate()).toBe(1);
    });
  });

  describe('getGridEnd', () => {
    it('returns the Saturday on or after Dec 31', () => {
      // 2025: Dec 31 = Wednesday (day 3) → end = Jan 3, 2026 (Saturday)
      const end = getGridEnd(2025);
      expect(end.getDay()).toBe(6); // Saturday
      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(0); // January
      expect(end.getDate()).toBe(3);
    });

    it('returns Dec 31 itself when Dec 31 is a Saturday', () => {
      // 2022: Dec 31 = Saturday
      const end = getGridEnd(2022);
      expect(end.getDay()).toBe(6);
      expect(end.getFullYear()).toBe(2022);
      expect(end.getMonth()).toBe(11);
      expect(end.getDate()).toBe(31);
    });
  });

  describe('getAvailableYears', () => {
    it('always includes the current year', () => {
      const years = getAvailableYears([]);
      expect(years).toContain(new Date().getFullYear());
    });

    it('includes years from activity start_dates', () => {
      const activities: StravaActivity[] = [
        {
          id: 1, name: 'Run', type: 'run', sport_type: 'Run',
          distance: 5000, moving_time: 1800, elapsed_time: 1900,
          start_date: '2023-06-15T10:00:00Z',
        },
        {
          id: 2, name: 'Ride', type: 'ride', sport_type: 'Ride',
          distance: 10000, moving_time: 3600, elapsed_time: 3700,
          start_date: '2024-03-20T10:00:00Z',
        },
      ];
      const years = getAvailableYears(activities);
      expect(years).toContain(2023);
      expect(years).toContain(2024);
    });

    it('returns years in descending order', () => {
      const activities: StravaActivity[] = [
        {
          id: 1, name: 'Run', type: 'run', sport_type: 'Run',
          distance: 5000, moving_time: 1800, elapsed_time: 1900,
          start_date: '2022-06-15T10:00:00Z',
        },
      ];
      const years = getAvailableYears(activities);
      for (let i = 0; i < years.length - 1; i++) {
        expect(years[i]).toBeGreaterThan(years[i + 1]);
      }
    });
  });

  describe('buildHeatmapGrid', () => {
    it('returns a grid with length that is a multiple of 7', () => {
      const grid = buildHeatmapGrid([], null, 2025);
      expect(grid.length % 7).toBe(0);
    });

    it('first cell is always a Sunday', () => {
      const grid = buildHeatmapGrid([], null, 2025);
      const firstDate = new Date(grid[0].date + 'T00:00:00');
      expect(firstDate.getDay()).toBe(0); // Sunday
    });

    it('last cell is always a Saturday', () => {
      const grid = buildHeatmapGrid([], null, 2025);
      const lastDate = new Date(grid[grid.length - 1].date + 'T00:00:00');
      expect(lastDate.getDay()).toBe(6); // Saturday
    });

    it('grid covers at least the full year (Jan 1 to Dec 31)', () => {
      const grid = buildHeatmapGrid([], null, 2025);
      const firstDate = new Date(grid[0].date + 'T00:00:00');
      const lastDate = new Date(grid[grid.length - 1].date + 'T00:00:00');
      expect(firstDate.getFullYear()).toBeLessThanOrEqual(2025);
      expect(firstDate.getMonth() === 11 ? firstDate.getDate() >= 25 : firstDate.getMonth() === 0).toBeTruthy();
      expect(lastDate.getFullYear()).toBeGreaterThanOrEqual(2025);
    });

    it('all entries are zero when no activities', () => {
      const grid = buildHeatmapGrid([], null, 2025);
      expect(grid.every((day) => day.totalSeconds === 0 && day.activities.length === 0)).toBe(true);
    });

    it('activity within the year appears in the grid', () => {
      const activities: StravaActivity[] = [
        {
          id: 1, name: 'Morning Run', type: 'run', sport_type: 'Run',
          distance: 5000, moving_time: 1800, elapsed_time: 1900,
          start_date: '2025-06-15T10:00:00Z',
        },
      ];
      const grid = buildHeatmapGrid(activities, null, 2025);
      const activeDay = grid.find((d) => d.date === '2025-06-15');
      expect(activeDay).toBeDefined();
      expect(activeDay!.totalSeconds).toBe(1900);
      expect(activeDay!.activities).toEqual(['Morning Run']);
    });

    it('activity from a different year is excluded', () => {
      const activities: StravaActivity[] = [
        {
          id: 1, name: 'Old Run', type: 'run', sport_type: 'Run',
          distance: 5000, moving_time: 1800, elapsed_time: 1800,
          start_date: '2024-06-15T10:00:00Z',
        },
      ];
      const grid = buildHeatmapGrid(activities, null, 2025);
      expect(grid.every((day) => day.totalSeconds === 0)).toBe(true);
    });

    it('two activities on the same day sum elapsed_time', () => {
      const activities: StravaActivity[] = [
        {
          id: 1, name: 'Morning Run', type: 'run', sport_type: 'Run',
          distance: 5000, moving_time: 1800, elapsed_time: 1900,
          start_date: '2025-06-15T04:00:00Z',
        },
        {
          id: 2, name: 'Evening Ride', type: 'ride', sport_type: 'Ride',
          distance: 10000, moving_time: 3600, elapsed_time: 3700,
          start_date: '2025-06-15T10:00:00Z',
        },
      ];
      const grid = buildHeatmapGrid(activities, null, 2025);
      const day = grid.find((d) => d.date === '2025-06-15')!;
      expect(day.totalSeconds).toBe(1900 + 3700);
      expect(day.activities).toHaveLength(2);
    });

    it('activity names are sorted chronologically within a day', () => {
      const activities: StravaActivity[] = [
        {
          id: 3, name: 'Evening Ride', type: 'ride', sport_type: 'Ride',
          distance: 10000, moving_time: 3600, elapsed_time: 3700,
          start_date: '2025-06-15T10:00:00Z',
        },
        {
          id: 1, name: 'Morning Run', type: 'run', sport_type: 'Run',
          distance: 5000, moving_time: 1800, elapsed_time: 1900,
          start_date: '2025-06-15T02:00:00Z',
        },
        {
          id: 2, name: 'Afternoon Swim', type: 'swim', sport_type: 'Swim',
          distance: 2000, moving_time: 1200, elapsed_time: 1300,
          start_date: '2025-06-15T06:00:00Z',
        },
      ];
      const grid = buildHeatmapGrid(activities, null, 2025);
      const day = grid.find((d) => d.date === '2025-06-15')!;
      expect(day.activities).toEqual(['Morning Run', 'Afternoon Swim', 'Evening Ride']);
    });

    it('sportFilter=null includes all sports', () => {
      const activities: StravaActivity[] = [
        {
          id: 1, name: 'Run', type: 'run', sport_type: 'Run',
          distance: 5000, moving_time: 1800, elapsed_time: 1900,
          start_date: '2025-06-15T04:00:00Z',
        },
        {
          id: 2, name: 'Ride', type: 'ride', sport_type: 'Ride',
          distance: 10000, moving_time: 3600, elapsed_time: 3700,
          start_date: '2025-06-15T10:00:00Z',
        },
      ];
      const grid = buildHeatmapGrid(activities, null, 2025);
      const day = grid.find((d) => d.date === '2025-06-15')!;
      expect(day.totalSeconds).toBe(1900 + 3700);
    });

    it('sportFilter="Run" excludes Ride activities', () => {
      const activities: StravaActivity[] = [
        {
          id: 1, name: 'Run', type: 'run', sport_type: 'Run',
          distance: 5000, moving_time: 1800, elapsed_time: 1900,
          start_date: '2025-06-15T04:00:00Z',
        },
        {
          id: 2, name: 'Ride', type: 'ride', sport_type: 'Ride',
          distance: 10000, moving_time: 3600, elapsed_time: 3700,
          start_date: '2025-06-15T10:00:00Z',
        },
      ];
      const grid = buildHeatmapGrid(activities, 'Run', 2025);
      const day = grid.find((d) => d.date === '2025-06-15')!;
      expect(day.totalSeconds).toBe(1900);
      expect(day.activities).toEqual(['Run']);
    });

    it('date keys are in YYYY-MM-DD format', () => {
      const grid = buildHeatmapGrid([], null, 2025);
      expect(grid[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getIntensityLevel', () => {
    it('returns 0 for zero seconds', () => {
      expect(getIntensityLevel(0, 3600)).toBe(0);
    });

    it('returns 0 when p95Seconds is zero', () => {
      expect(getIntensityLevel(3600, 0)).toBe(0);
    });

    it('returns correct level for different ratios', () => {
      const p95 = 3600;
      expect(getIntensityLevel(100, p95)).toBe(1);  // < 25%
      expect(getIntensityLevel(1000, p95)).toBe(2); // 25-50%
      expect(getIntensityLevel(2000, p95)).toBe(3); // 50-75%
      expect(getIntensityLevel(3500, p95)).toBe(4); // > 75%
    });

    it('clamps to max level when exceeding p95', () => {
      expect(getIntensityLevel(5000, 3600)).toBe(4);
    });
  });

  describe('computeP95', () => {
    it('returns 0 for grid with no activities', () => {
      const grid = buildHeatmapGrid([], null, 2025);
      expect(computeP95(grid)).toBe(0);
    });

    it('returns the single value when only one non-zero day', () => {
      const activities: StravaActivity[] = [
        {
          id: 1, name: 'Run', type: 'run', sport_type: 'Run',
          distance: 5000, moving_time: 1800, elapsed_time: 1800,
          start_date: '2025-06-15T10:00:00Z',
        },
      ];
      const grid = buildHeatmapGrid(activities, null, 2025);
      expect(computeP95(grid)).toBe(1800);
    });
  });
});
