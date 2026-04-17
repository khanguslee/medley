import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HeatmapCalendar from '../HeatmapCalendar';
import type { HeatmapGrid } from '../../utils/heatmap';

describe('HeatmapCalendar', () => {
  it('renders exactly 364 cells', () => {
    const today = new Date('2026-01-15');
    const grid: HeatmapGrid = Array.from({ length: 364 }, (_, i) => ({
      date: new Date(today.getTime() - (363 - i) * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      totalSeconds: 0,
      activities: [],
    }));

    const { container } = render(<HeatmapCalendar grid={grid} />);
    const cells = container.querySelectorAll('.heatmap-cell');
    expect(cells).toHaveLength(364);
  });

  it('renders cells with data-level="0" for days with no activities', () => {
    const grid: HeatmapGrid = [
      {
        date: '2026-01-01',
        totalSeconds: 0,
        activities: [],
      },
    ];

    const { container } = render(
      <HeatmapCalendar
        grid={[
          ...grid,
          ...Array.from({ length: 363 }, (_, i) => ({
            date: new Date(new Date('2026-01-01').getTime() + (i + 1) * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10),
            totalSeconds: 0,
            activities: [],
          })),
        ]}
      />
    );
    const cells = container.querySelectorAll('[data-level="0"]');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('renders cells with data-level > 0 for active days', () => {
    const grid: HeatmapGrid = [
      {
        date: '2026-01-01',
        totalSeconds: 3600, // 1 hour
        activities: ['Test Activity'],
      },
      ...Array.from({ length: 363 }, (_, i) => ({
        date: new Date(new Date('2026-01-01').getTime() + (i + 1) * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        totalSeconds: 0,
        activities: [],
      })),
    ];

    const { container } = render(<HeatmapCalendar grid={grid} />);
    const activeCells = container.querySelectorAll(
      '[data-level="1"], [data-level="2"], [data-level="3"], [data-level="4"]'
    );
    expect(activeCells.length).toBeGreaterThan(0);
  });

  it('shows tooltip on hover with date and activity names', async () => {
    const user = userEvent.setup();
    const grid: HeatmapGrid = [
      ...Array.from({ length: 363 }, (_, i) => ({
        date: new Date(new Date('2026-01-01').getTime() + i * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        totalSeconds: 0,
        activities: [],
      })),
      {
        date: '2026-12-31',
        totalSeconds: 3600,
        activities: ['Morning Run', 'Evening Ride'],
      },
    ];

    const { container } = render(<HeatmapCalendar grid={grid} />);
    const cells = container.querySelectorAll('.heatmap-cell');
    const activeCell = cells[cells.length - 1];

    await user.hover(activeCell);
    expect(screen.getByText(/Morning Run/)).toBeInTheDocument();
    expect(screen.getByText(/Evening Ride/)).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', async () => {
    const user = userEvent.setup();
    const grid: HeatmapGrid = [
      ...Array.from({ length: 363 }, (_, i) => ({
        date: new Date(new Date('2026-01-01').getTime() + i * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        totalSeconds: 0,
        activities: [],
      })),
      {
        date: '2026-12-31',
        totalSeconds: 3600,
        activities: ['Test Activity'],
      },
    ];

    const { container } = render(<HeatmapCalendar grid={grid} />);
    const cells = container.querySelectorAll('.heatmap-cell');
    const activeCell = cells[cells.length - 1];

    await user.hover(activeCell);
    expect(screen.getByText(/Test Activity/)).toBeInTheDocument();

    await user.unhover(activeCell);
    expect(screen.queryByText(/Test Activity/)).not.toBeInTheDocument();
  });

  it('shows "No activities" tooltip on empty day hover', async () => {
    const user = userEvent.setup();
    const grid: HeatmapGrid = Array.from({ length: 364 }, (_, i) => ({
      date: new Date(new Date('2026-01-01').getTime() + i * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      totalSeconds: 0,
      activities: [],
    }));

    const { container } = render(<HeatmapCalendar grid={grid} />);
    const firstCell = container.querySelector('.heatmap-cell');

    if (firstCell) {
      await user.hover(firstCell);
      expect(screen.getByText('No activities')).toBeInTheDocument();
    }
  });

  it('renders month labels above the grid', () => {
    const grid: HeatmapGrid = Array.from({ length: 364 }, (_, i) => ({
      date: new Date(new Date('2025-12-15').getTime() + i * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      totalSeconds: 0,
      activities: [],
    }));

    const { container } = render(<HeatmapCalendar grid={grid} />);
    const monthLabels = container.querySelectorAll('.heatmap-month-label');
    expect(monthLabels.length).toBeGreaterThan(0);
  });

  it('renders day labels on the left', () => {
    const grid: HeatmapGrid = Array.from({ length: 364 }, (_, i) => ({
      date: new Date(new Date('2026-01-01').getTime() + i * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      totalSeconds: 0,
      activities: [],
    }));

    render(<HeatmapCalendar grid={grid} />);
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
  });

  it('formats tooltip date correctly', async () => {
    const user = userEvent.setup();
    const grid: HeatmapGrid = [
      ...Array.from({ length: 363 }, (_, i) => ({
        date: new Date(new Date('2026-01-01').getTime() + i * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        totalSeconds: 0,
        activities: [],
      })),
      {
        date: '2026-12-31',
        totalSeconds: 1800,
        activities: ['Activity'],
      },
    ];

    const { container } = render(<HeatmapCalendar grid={grid} />);
    const lastCell = container.querySelectorAll('.heatmap-cell')[363];

    await user.hover(lastCell);
    // Should show the date in a readable format like "Thu, Dec 31"
    const tooltipDate = screen.getByText(/Dec 31/);
    expect(tooltipDate).toBeInTheDocument();
  });
});
