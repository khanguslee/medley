import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../Dashboard'
import type { StravaToken, StravaActivity } from '../../services/strava'

// Mock recharts to avoid jsdom SVG/ResizeObserver issues
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../context/ActivityContext', () => ({
  useActivity: vi.fn(),
}))

vi.mock('../../services/strava', () => ({
  getAuthUrl: vi.fn(() => 'https://strava.com/auth'),
}))

import { useActivity } from '../../context/ActivityContext'

const mockToken: StravaToken = {
  access_token: 'tok',
  refresh_token: 'ref',
  expires_at: 9999999999,
  athlete: { firstname: 'Alice', lastname: 'Smith' },
}

const mockActivities: StravaActivity[] = [
  {
    id: 1, name: 'Run 1', type: 'Run', sport_type: 'Run',
    distance: 5000, moving_time: 3600, start_date: new Date().toISOString(),
  },
  {
    id: 2, name: 'Ride 1', type: 'Ride', sport_type: 'Ride',
    distance: 20000, moving_time: 7200, start_date: new Date().toISOString(),
  },
]

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Fix "now" to Wednesday 2026-04-08 so date-range labels are predictable
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-08T14:30:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows loading state', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: null, activities: [], loading: true, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderDashboard()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows connect prompt when unauthenticated', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: null, activities: [], loading: false, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderDashboard()
    expect(screen.getByRole('link', { name: 'Connect with Strava' })).toBeInTheDocument()
  })

  it('renders time period filter buttons', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: mockToken, activities: [], loading: false, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderDashboard()
    expect(screen.getByRole('button', { name: 'This week' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'This month' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'This year' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All time' })).toBeInTheDocument()
  })

  it('defaults to "This month" as active period', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: mockToken, activities: [], loading: false, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderDashboard()
    expect(screen.getByRole('button', { name: 'This month' })).toHaveClass('active')
    expect(screen.getByRole('button', { name: 'This week' })).not.toHaveClass('active')
  })

  it('changes active period when filter button is clicked', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: mockToken, activities: [], loading: false, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'This year' }))

    expect(screen.getByRole('button', { name: 'This year' })).toHaveClass('active')
    expect(screen.getByRole('button', { name: 'This month' })).not.toHaveClass('active')
  })

  it('shows "no activities" message when there are no matching activities', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: mockToken, activities: [], loading: false, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderDashboard()
    expect(screen.getByText('No activities for this period.')).toBeInTheDocument()
  })

  it('renders chart and summary list when there are activities', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: mockToken, activities: mockActivities, loading: false, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderDashboard()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getByText('Run')).toBeInTheDocument()
    expect(screen.getByText('Ride')).toBeInTheDocument()
  })

  it('does not show chart when there are no matching activities', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: mockToken, activities: [], loading: false, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderDashboard()
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
  })

  it('shows a date range label for the default "This month" period', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: mockToken, activities: [], loading: false, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderDashboard()
    expect(screen.getByText('April 2026')).toBeInTheDocument()
  })

  it('shows "2026" as range label when "This year" is selected', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: mockToken, activities: [], loading: false, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'This year' }))
    expect(screen.getByText('2026')).toBeInTheDocument()
  })

  it('hides the range label when "All time" is selected', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: mockToken, activities: [], loading: false, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'All time' }))
    expect(screen.queryByText('April 2026')).not.toBeInTheDocument()
  })
})
