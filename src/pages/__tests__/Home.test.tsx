import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from '../Home'
import type { StravaToken, StravaActivity } from '../../services/strava'

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
    id: 1,
    name: 'Morning Run',
    type: 'Run',
    sport_type: 'Run',
    distance: 5000,
    moving_time: 1800,
    start_date: '2026-04-01T08:00:00Z',
  },
]

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
    vi.mocked(useActivity).mockReturnValue({
      token: null, activities: [], loading: true, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderHome()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows connect prompt when unauthenticated', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: null, activities: [], loading: false, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderHome()
    expect(screen.getByText('Connect with Strava')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Connect with Strava' })).toHaveAttribute(
      'href',
      'https://strava.com/auth'
    )
  })

  it('shows athlete greeting when authenticated', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: mockToken, activities: [], loading: false, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderHome()
    expect(screen.getByText('Hi, Alice')).toBeInTheDocument()
  })

  it('renders activity list', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: mockToken, activities: mockActivities, loading: false, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderHome()
    expect(screen.getByText('Morning Run')).toBeInTheDocument()
    expect(screen.getByText('Run')).toBeInTheDocument()
  })

  it('shows empty message when no activities', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: mockToken, activities: [], loading: false, error: null,
      disconnect: vi.fn(), reload: vi.fn(),
    })

    renderHome()
    expect(screen.getByText('No recent activities found.')).toBeInTheDocument()
  })

  it('shows error state with retry button', () => {
    const reload = vi.fn()
    vi.mocked(useActivity).mockReturnValue({
      token: mockToken, activities: [], loading: false, error: 'Network error',
      disconnect: vi.fn(), reload,
    })

    renderHome()
    expect(screen.getByText('Network error')).toBeInTheDocument()
    screen.getByText('Retry').click()
    expect(reload).toHaveBeenCalled()
  })

  it('calls disconnect when Disconnect button clicked', () => {
    const disconnect = vi.fn()
    vi.mocked(useActivity).mockReturnValue({
      token: mockToken, activities: [], loading: false, error: null,
      disconnect, reload: vi.fn(),
    })

    renderHome()
    screen.getByText('Disconnect').click()
    expect(disconnect).toHaveBeenCalled()
  })
})
