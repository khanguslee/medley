import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { ActivityProvider, useActivity } from '../ActivityContext'
import type { StravaActivity, StravaAthlete } from '../../services/api'

vi.mock('../../services/api', () => ({
  fetchAuthUrl: vi.fn(),
  fetchMe: vi.fn(),
  fetchActivities: vi.fn(),
  deleteStravaToken: vi.fn(),
}))

import { fetchAuthUrl, fetchMe, fetchActivities, deleteStravaToken } from '../../services/api'

const mockAthlete: StravaAthlete = {
  id: 42,
  firstname: 'Test',
  lastname: 'User',
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

function Consumer() {
  const { athlete, isAuthenticated, activities, loading, error } = useActivity()
  if (loading) return <div>loading</div>
  if (error) return <div>error: {error}</div>
  if (!isAuthenticated) return <div>unauthenticated</div>
  return (
    <div>
      <div>athlete: {athlete?.firstname ?? 'unknown'}</div>
      <div>count: {activities.length}</div>
    </div>
  )
}

function DisconnectConsumer() {
  const { isAuthenticated, disconnect } = useActivity()
  return (
    <div>
      <div>{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <button onClick={() => { void disconnect() }}>disconnect</button>
    </div>
  )
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<ActivityProvider>{ui}</ActivityProvider>)
}

describe('ActivityContext', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fetchAuthUrl).mockResolvedValue('https://strava.com/auth')
  })

  it('shows loading state while fetching', async () => {
    vi.mocked(fetchMe).mockResolvedValue(mockAthlete)
    vi.mocked(fetchActivities).mockResolvedValue(mockActivities)

    renderWithProvider(<Consumer />)
    expect(screen.getByText('loading')).toBeInTheDocument()

    await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())
  })

  it('provides athlete and activities after successful fetch', async () => {
    vi.mocked(fetchMe).mockResolvedValue(mockAthlete)
    vi.mocked(fetchActivities).mockResolvedValue(mockActivities)

    renderWithProvider(<Consumer />)

    await waitFor(() => {
      expect(screen.getByText('athlete: Test')).toBeInTheDocument()
      expect(screen.getByText('count: 1')).toBeInTheDocument()
    })
  })

  it('shows unauthenticated state when fetchMe returns null', async () => {
    vi.mocked(fetchMe).mockResolvedValue(null)

    renderWithProvider(<Consumer />)

    await waitFor(() => {
      expect(screen.getByText('unauthenticated')).toBeInTheDocument()
    })
    expect(fetchActivities).not.toHaveBeenCalled()
  })

  it('shows error state when fetchActivities throws', async () => {
    vi.mocked(fetchMe).mockResolvedValue(mockAthlete)
    vi.mocked(fetchActivities).mockRejectedValue(new Error('Network error'))

    renderWithProvider(<Consumer />)

    await waitFor(() => {
      expect(screen.getByText('error: Network error')).toBeInTheDocument()
    })
  })

  it('disconnect calls deleteStravaToken and clears state', async () => {
    vi.mocked(fetchMe).mockResolvedValue(mockAthlete)
    vi.mocked(fetchActivities).mockResolvedValue(mockActivities)
    vi.mocked(deleteStravaToken).mockResolvedValue(undefined)

    renderWithProvider(<DisconnectConsumer />)

    await waitFor(() => {
      expect(screen.getByText('authenticated')).toBeInTheDocument()
    })

    await act(async () => {
      screen.getByText('disconnect').click()
    })

    expect(deleteStravaToken).toHaveBeenCalled()
    expect(screen.getByText('unauthenticated')).toBeInTheDocument()
  })

  it('throws when useActivity is used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow(
      'useActivity must be used within ActivityProvider'
    )
    consoleError.mockRestore()
  })
})
