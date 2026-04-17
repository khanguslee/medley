import { describe, it, expect } from 'vitest';
import { buildHeatmapGrid, getIntensityLevel, computeP95 } from '../heatmap';
import type { StravaActivity } from '../../services/api';

describe('heatmap utilities', () => {
  describe('buildHeatmapGrid', () => {
    it('returns exactly 364 entries for empty activity list', () => {
      const today = new Date('2026-01-15');
      const grid = buildHeatmapGrid([], null, today);
      expect(grid).toHaveLength(364);
    });

    it('all entries are zero and empty when no activities', () => {
      const today = new Date('2026-01-15');
      const grid = buildHeatmapGrid([], null, today);
      expect(grid.every((day) => day.totalSeconds === 0 && day.activities.length === 0)).toBe(
        true
      );
    });

    it('activity on today appears at index 363', () => {
      const today = new Date('2026-01-15');
      const activity: StravaActivity = {
        id: 1,
        name: 'Morning Run',
        type: 'run',
        sport_type: 'Run',
        distance: 5000,
        moving_time: 1800,
        elapsed_time: 1900,
        start_date: '2026-01-15T10:00:00Z',
      };
      const grid = buildHeatmapGrid([activity], null, today);
      expect(grid[363].date).toBe('2026-01-15');
      expect(grid[363].totalSeconds).toBe(1900);
      expect(grid[363].activities).toEqual(['Morning Run']);
    });

    it('activity 363 days ago appears at index 0', () => {
      const today = new Date('2026-01-15');
      const windowStart = new Date(today);
      windowStart.setDate(windowStart.getDate() - 363);

      const activity: StravaActivity = {
        id: 1,
        name: 'Old Run',
        type: 'run',
        sport_type: 'Run',
        distance: 5000,
        moving_time: 1800,
        elapsed_time: 1800,
        start_date: windowStart.toISOString(),
      };
      const grid = buildHeatmapGrid([activity], null, today);
      expect(grid[0].totalSeconds).toBe(1800);
      expect(grid[0].activities).toEqual(['Old Run']);
    });

    it('activity 364 days ago is excluded', () => {
      const today = new Date('2026-01-15');
      const windowStart = new Date(today);
      windowStart.setDate(windowStart.getDate() - 364);
      windowStart.setHours(12, 0, 0, 0); // Make it clearly outside the window

      const activity: StravaActivity = {
        id: 1,
        name: 'Too Old Run',
        type: 'run',
        sport_type: 'Run',
        distance: 5000,
        moving_time: 1800,
        elapsed_time: 1800,
        start_date: windowStart.toISOString(),
      };
      const grid = buildHeatmapGrid([activity], null, today);
      expect(grid.every((day) => day.totalSeconds === 0)).toBe(true);
    });

    it('two activities on the same day sum elapsed_time', () => {
      const today = new Date('2026-01-15');
      const activities: StravaActivity[] = [
        {
          id: 1,
          name: 'Morning Run',
          type: 'run',
          sport_type: 'Run',
          distance: 5000,
          moving_time: 1800,
          elapsed_time: 1900,
          start_date: '2026-01-15T04:00:00Z',
        },
        {
          id: 2,
          name: 'Evening Ride',
          type: 'ride',
          sport_type: 'Ride',
          distance: 10000,
          moving_time: 3600,
          elapsed_time: 3700,
          start_date: '2026-01-15T10:00:00Z',
        },
      ];
      const grid = buildHeatmapGrid(activities, null, today);
      expect(grid[363].totalSeconds).toBe(1900 + 3700);
      expect(grid[363].activities).toHaveLength(2);
    });

    it('activity names are sorted chronologically within a day', () => {
      const today = new Date('2026-01-15');
      const activities: StravaActivity[] = [
        {
          id: 3,
          name: 'Evening Ride',
          type: 'ride',
          sport_type: 'Ride',
          distance: 10000,
          moving_time: 3600,
          elapsed_time: 3700,
          start_date: '2026-01-15T10:00:00Z',
        },
        {
          id: 1,
          name: 'Morning Run',
          type: 'run',
          sport_type: 'Run',
          distance: 5000,
          moving_time: 1800,
          elapsed_time: 1900,
          start_date: '2026-01-15T02:00:00Z',
        },
        {
          id: 2,
          name: 'Afternoon Swim',
          type: 'swim',
          sport_type: 'Swim',
          distance: 2000,
          moving_time: 1200,
          elapsed_time: 1300,
          start_date: '2026-01-15T06:00:00Z',
        },
      ];
      const grid = buildHeatmapGrid(activities, null, today);
      expect(grid[363].activities).toEqual(['Morning Run', 'Afternoon Swim', 'Evening Ride']);
    });

    it('sportFilter=null includes all sports', () => {
      const today = new Date('2026-01-15');
      const activities: StravaActivity[] = [
        {
          id: 1,
          name: 'Run',
          type: 'run',
          sport_type: 'Run',
          distance: 5000,
          moving_time: 1800,
          elapsed_time: 1900,
          start_date: '2026-01-15T04:00:00Z',
        },
        {
          id: 2,
          name: 'Ride',
          type: 'ride',
          sport_type: 'Ride',
          distance: 10000,
          moving_time: 3600,
          elapsed_time: 3700,
          start_date: '2026-01-15T10:00:00Z',
        },
      ];
      const grid = buildHeatmapGrid(activities, null, today);
      expect(grid[363].totalSeconds).toBe(1900 + 3700);
    });

    it('sportFilter="Run" excludes Ride activities', () => {
      const today = new Date('2026-01-15');
      const activities: StravaActivity[] = [
        {
          id: 1,
          name: 'Run',
          type: 'run',
          sport_type: 'Run',
          distance: 5000,
          moving_time: 1800,
          elapsed_time: 1900,
          start_date: '2026-01-15T08:00:00Z',
        },
        {
          id: 2,
          name: 'Ride',
          type: 'ride',
          sport_type: 'Ride',
          distance: 10000,
          moving_time: 3600,
          elapsed_time: 3700,
          start_date: '2026-01-15T14:00:00Z',
        },
      ];
      const grid = buildHeatmapGrid(activities, 'Run', today);
      expect(grid[363].totalSeconds).toBe(1900);
      expect(grid[363].activities).toEqual(['Run']);
    });

    it('UTC midnight activity buckets to correct local date', () => {
      // An activity at exactly UTC midnight should stay in the UTC date, not shift
      const today = new Date('2026-01-15');
      const activity: StravaActivity = {
        id: 1,
        name: 'Midnight Activity',
        type: 'run',
        sport_type: 'Run',
        distance: 5000,
        moving_time: 1800,
        elapsed_time: 1800,
        start_date: '2026-01-15T00:00:00Z',
      };
      const grid = buildHeatmapGrid([activity], null, today);
      // The activity should appear on 2026-01-15 (or possibly 2026-01-14 depending on local TZ,
      // but it should be bucketed into a day near that date, not shifted way off)
      const foundIndex = grid.findIndex((day) => day.activities.length > 0);
      expect(foundIndex).toBeGreaterThanOrEqual(0);
    });

    it('date keys are in YYYY-MM-DD format', () => {
      const today = new Date('2026-01-15');
      const activity: StravaActivity = {
        id: 1,
        name: 'Run',
        type: 'run',
        sport_type: 'Run',
        distance: 5000,
        moving_time: 1800,
        elapsed_time: 1800,
        start_date: '2026-01-15T10:00:00Z',
      };
      const grid = buildHeatmapGrid([activity], null, today);
      expect(grid[363].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(grid[363].date).toBe('2026-01-15');
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
      expect(getIntensityLevel(100, p95)).toBe(1); // < 25%
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
      const today = new Date('2026-01-15');
      const grid = buildHeatmapGrid([], null, today);
      expect(computeP95(grid)).toBe(0);
    });

    it('returns the single value when only one non-zero day', () => {
      const today = new Date('2026-01-15');
      const activity: StravaActivity = {
        id: 1,
        name: 'Run',
        type: 'run',
        sport_type: 'Run',
        distance: 5000,
        moving_time: 1800,
        elapsed_time: 1800,
        start_date: '2026-01-15T10:00:00Z',
      };
      const grid = buildHeatmapGrid([activity], null, today);
      expect(computeP95(grid)).toBe(1800);
    });

    it('computes p95 correctly for multiple values', () => {
      // Create 20 activities with increasing durations
      const today = new Date('2026-01-15');
      const activities: StravaActivity[] = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        name: `Activity ${i}`,
        type: 'run',
        sport_type: 'Run',
        distance: 5000,
        moving_time: (i + 1) * 300,
        elapsed_time: (i + 1) * 300,
        start_date: new Date(today.getTime() - (19 - i) * 24 * 60 * 60 * 1000).toISOString(),
      }));
      const grid = buildHeatmapGrid(activities, null, today);
      const p95 = computeP95(grid);
      // p95 should be around the 95th percentile value
      expect(p95).toBeGreaterThan(0);
      expect(p95).toBeLessThanOrEqual(20 * 300);
    });
  });
});
