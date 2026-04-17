import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../Dashboard'
import type { StravaActivity, StravaAthlete } from '../../services/api'

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

import { useActivity } from '../../context/ActivityContext'

const mockAthlete: StravaAthlete = {
  id: 1,
  firstname: 'Alice',
  lastname: 'Smith',
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

const baseContext = {
  athlete: null as StravaAthlete | null,
  isAuthenticated: false,
  authUrl: 'https://strava.com/auth',
  activities: [] as StravaActivity[],
  loading: false,
  loadedCount: 0,
  isInitialLoad: false,
  error: null as string | null,
  disconnect: vi.fn().mockResolvedValue(undefined),
  reload: vi.fn().mockResolvedValue(undefined),
}

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

  it('shows "Connecting to Strava…" before first page arrives', () => {
    vi.mocked(useActivity).mockReturnValue({ ...baseContext, loading: true, loadedCount: 0 })

    renderDashboard()
    expect(screen.getByText('Connecting to Strava…')).toBeInTheDocument()
  })

  it('shows inline count when loading with no activities yet', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
      loading: true,
      loadedCount: 47,
      activities: [],
    })

    renderDashboard()
    expect(screen.getByText('Loaded 47 activities…')).toBeInTheDocument()
  })

  it('shows sync badge (not count) when loading with activities already visible', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
      loading: true,
      loadedCount: 47,
      activities: mockActivities,
    })

    renderDashboard()
    expect(screen.getByText('Syncing…')).toBeInTheDocument()
    expect(screen.queryByText('Loaded 47 activities…')).not.toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('shows connect prompt when unauthenticated', () => {
    vi.mocked(useActivity).mockReturnValue({ ...baseContext })

    renderDashboard()
    expect(screen.getByRole('link', { name: 'Connect with Strava' })).toBeInTheDocument()
  })

  it('renders time period filter buttons', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderDashboard()
    expect(screen.getByRole('button', { name: 'This week' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'This month' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'This year' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All time' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument()
  })

  it('defaults to "This month" as active period', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderDashboard()
    expect(screen.getByRole('button', { name: 'This month' })).toHaveClass('active')
    expect(screen.getByRole('button', { name: 'This week' })).not.toHaveClass('active')
  })

  it('changes active period when filter button is clicked', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'This year' }))

    expect(screen.getByRole('button', { name: 'This year' })).toHaveClass('active')
    expect(screen.getByRole('button', { name: 'This month' })).not.toHaveClass('active')
  })

  it('shows "no activities" message when there are no matching activities', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderDashboard()
    expect(screen.getByText('No activities for this period.')).toBeInTheDocument()
  })

  it('renders chart and summary list when there are activities', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
      activities: mockActivities,
    })

    renderDashboard()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getByText('Run')).toBeInTheDocument()
    expect(screen.getByText('Ride')).toBeInTheDocument()
  })

  it('does not show chart when there are no matching activities', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderDashboard()
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
  })

  it('shows a date range label for the default "This month" period', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderDashboard()
    expect(screen.getByText('April 2026')).toBeInTheDocument()
  })

  it('shows "2026" as range label when "This year" is selected', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'This year' }))
    expect(screen.getByText('2026')).toBeInTheDocument()
  })

  it('hides the range label when "All time" is selected', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'All time' }))
    expect(screen.queryByText('April 2026')).not.toBeInTheDocument()
  })

  it('shows date inputs when "Custom" is selected', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderDashboard()
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }))

    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)
    expect(dateInputs).toHaveLength(2)
  })

  it('hides date inputs when switching away from "Custom"', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }))
    expect(screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'This month' }))
    expect(screen.queryAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)).toHaveLength(0)
  })

  it('shows formatted custom range label when custom dates are set', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }))

    const [startInput, endInput] = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)
    fireEvent.change(startInput, { target: { value: '2026-03-01' } })
    fireEvent.change(endInput, { target: { value: '2026-03-31' } })

    const rangeLabel = screen.getByText(/Mar.*2026.*Mar.*2026/)
    expect(rangeLabel).toBeInTheDocument()
  })
})
