import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Overview from '../Overview';
import type { StravaActivity } from '../../services/api';

// Mock the HeatmapCalendar component to avoid testing it here
vi.mock('../../components/HeatmapCalendar', () => ({
  default: () => <div data-testid="heatmap-calendar">Heatmap Calendar</div>,
}));

// Mock the activity context
vi.mock('../../context/ActivityContext', async () => {
  const actual = await vi.importActual('../../context/ActivityContext');
  return {
    ...actual,
    useActivity: vi.fn(),
  };
});

import { useActivity } from '../../context/ActivityContext';

describe('Overview page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when initially loading', () => {
    (useActivity as any).mockReturnValue({
      isAuthenticated: false,
      authUrl: null,
      activities: [],
      loading: true,
      loadedCount: 0,
    });

    render(<Overview />);
    expect(screen.getByText(/Connecting to Strava/)).toBeInTheDocument();
  });

  it('shows connect prompt when unauthenticated', () => {
    (useActivity as any).mockReturnValue({
      isAuthenticated: false,
      authUrl: 'https://example.com/auth',
      activities: [],
      loading: false,
      loadedCount: 0,
    });

    render(<Overview />);
    expect(screen.getByText(/Connect your Strava account/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Connect with Strava/ })).toBeInTheDocument();
  });

  it('renders activity calendar heading when authenticated', () => {
    (useActivity as any).mockReturnValue({
      isAuthenticated: true,
      authUrl: null,
      activities: [],
      loading: false,
      loadedCount: 0,
    });

    render(<Overview />);
    expect(screen.getByText('Activity calendar')).toBeInTheDocument();
  });

  it('renders heatmap calendar component when authenticated', () => {
    (useActivity as any).mockReturnValue({
      isAuthenticated: true,
      authUrl: null,
      activities: [],
      loading: false,
      loadedCount: 0,
    });

    render(<Overview />);
    expect(screen.getByTestId('heatmap-calendar')).toBeInTheDocument();
  });

  it('sport filter defaults to "All sports"', () => {
    (useActivity as any).mockReturnValue({
      isAuthenticated: true,
      authUrl: null,
      activities: [
        {
          id: 1,
          name: 'Run',
          type: 'run',
          sport_type: 'Run',
          distance: 5000,
          moving_time: 1800,
          elapsed_time: 1900,
          start_date: '2026-01-15T10:00:00Z',
        },
      ],
      loading: false,
      loadedCount: 0,
    });

    render(<Overview />);
    const select = screen.getByDisplayValue('All sports');
    expect(select).toBeInTheDocument();
  });

  it('sport filter dropdown lists unique sport types', () => {
    const activities: StravaActivity[] = [
      {
        id: 1,
        name: 'Run',
        type: 'run',
        sport_type: 'Run',
        distance: 5000,
        moving_time: 1800,
        elapsed_time: 1900,
        start_date: '2026-01-15T10:00:00Z',
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

    (useActivity as any).mockReturnValue({
      isAuthenticated: true,
      authUrl: null,
      activities,
      loading: false,
      loadedCount: 0,
    });

    render(<Overview />);
    expect(screen.getByRole('option', { name: 'Run' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ride' })).toBeInTheDocument();
  });

  it('allows selecting a sport filter', async () => {
    const user = userEvent.setup();
    const activities: StravaActivity[] = [
      {
        id: 1,
        name: 'Run',
        type: 'run',
        sport_type: 'Run',
        distance: 5000,
        moving_time: 1800,
        elapsed_time: 1900,
        start_date: '2026-01-15T10:00:00Z',
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

    (useActivity as any).mockReturnValue({
      isAuthenticated: true,
      authUrl: null,
      activities,
      loading: false,
      loadedCount: 0,
    });

    render(<Overview />);
    const select = screen.getByDisplayValue('All sports');
    await user.selectOptions(select, 'Run');
    expect((select as HTMLSelectElement).value).toBe('Run');
  });

  it('shows syncing badge while loading with existing activities', () => {
    (useActivity as any).mockReturnValue({
      isAuthenticated: true,
      authUrl: null,
      activities: [
        {
          id: 1,
          name: 'Run',
          type: 'run',
          sport_type: 'Run',
          distance: 5000,
          moving_time: 1800,
          elapsed_time: 1900,
          start_date: '2026-01-15T10:00:00Z',
        },
      ],
      loading: true,
      loadedCount: 10,
    });

    render(<Overview />);
    expect(screen.getByText(/Syncing/)).toBeInTheDocument();
  });
});
