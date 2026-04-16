import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from '../Home'
import type { StravaActivity, StravaAthlete } from '../../services/api'

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
    id: 1,
    name: 'Morning Run',
    type: 'Run',
    sport_type: 'Run',
    distance: 5000,
    moving_time: 1800,
    start_date: '2026-04-01T08:00:00Z',
  },
]

const baseContext = {
  athlete: null as StravaAthlete | null,
  isAuthenticated: false,
  authUrl: 'https://strava.com/auth',
  activities: [] as StravaActivity[],
  loading: false,
  error: null as string | null,
  disconnect: vi.fn().mockResolvedValue(undefined),
  reload: vi.fn().mockResolvedValue(undefined),
}

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )
}

describe('Home', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows loading state', () => {
    vi.mocked(useActivity).mockReturnValue({ ...baseContext, loading: true })

    renderHome()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows connect prompt when unauthenticated', () => {
    vi.mocked(useActivity).mockReturnValue({ ...baseContext })

    renderHome()
    expect(screen.getByText('Connect with Strava')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Connect with Strava' })).toHaveAttribute(
      'href',
      'https://strava.com/auth'
    )
  })

  it('shows athlete greeting when authenticated', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderHome()
    expect(screen.getByText('Hi, Alice!')).toBeInTheDocument()
  })

  it('renders activity list', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
      activities: mockActivities,
    })

    renderHome()
    expect(screen.getByText('Morning Run')).toBeInTheDocument()
    expect(screen.getByText('Run')).toBeInTheDocument()
  })

  it('links each activity to Strava', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
      activities: mockActivities,
    })

    renderHome()
    const link = screen.getByRole('link', { name: 'View on Strava' })
    expect(link).toHaveAttribute('href', 'https://www.strava.com/activities/1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toMatch(/noopener/)
  })

  it('shows empty message when no activities', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderHome()
    expect(screen.getByText('No recent activities found.')).toBeInTheDocument()
  })

  it('shows error state with retry button', () => {
    const reload = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
      error: 'Network error',
      reload,
    })

    renderHome()
    expect(screen.getByText('Network error')).toBeInTheDocument()
    screen.getByText('Retry').click()
    expect(reload).toHaveBeenCalled()
  })

  it('calls disconnect when Disconnect button clicked', () => {
    const disconnect = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
      disconnect,
    })

    renderHome()
    screen.getByText('Disconnect').click()
    expect(disconnect).toHaveBeenCalled()
  })
})
