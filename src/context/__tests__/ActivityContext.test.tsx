import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { ActivityProvider, useActivity } from '../ActivityContext'
import type { StravaToken, StravaActivity } from '../../services/strava'

vi.mock('../../services/strava', () => ({
  getValidToken: vi.fn(),
  clearToken: vi.fn(),
  fetchAllActivities: vi.fn(),
}))

import { getValidToken, clearToken, fetchAllActivities } from '../../services/strava'

const mockToken: StravaToken = {
  access_token: 'test-token',
  refresh_token: 'refresh',
  expires_at: 9999999999,
  athlete: { firstname: 'Test', lastname: 'User' },
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
  const { token, activities, loading, error } = useActivity()
  if (loading) return <div>loading</div>
  if (error) return <div>error: {error}</div>
  if (!token) return <div>unauthenticated</div>
  return (
    <div>
      <div>athlete: {token.athlete.firstname}</div>
      <div>count: {activities.length}</div>
    </div>
  )
}

function DisconnectConsumer() {
  const { token, disconnect } = useActivity()
  return (
    <div>
      <div>{token ? 'authenticated' : 'unauthenticated'}</div>
      <button onClick={disconnect}>disconnect</button>
    </div>
  )
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<ActivityProvider>{ui}</ActivityProvider>)
}

describe('ActivityContext', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows loading state while fetching', async () => {
    vi.mocked(getValidToken).mockResolvedValue(mockToken)
    vi.mocked(fetchAllActivities).mockResolvedValue(mockActivities)

    renderWithProvider(<Consumer />)
    expect(screen.getByText('loading')).toBeInTheDocument()

    await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())
  })

  it('provides token and activities after successful fetch', async () => {
    vi.mocked(getValidToken).mockResolvedValue(mockToken)
    vi.mocked(fetchAllActivities).mockResolvedValue(mockActivities)

    renderWithProvider(<Consumer />)

    await waitFor(() => {
      expect(screen.getByText('athlete: Test')).toBeInTheDocument()
      expect(screen.getByText('count: 1')).toBeInTheDocument()
    })
  })

  it('shows unauthenticated state when no token', async () => {
    vi.mocked(getValidToken).mockResolvedValue(null)

    renderWithProvider(<Consumer />)

    await waitFor(() => {
      expect(screen.getByText('unauthenticated')).toBeInTheDocument()
    })
    expect(fetchAllActivities).not.toHaveBeenCalled()
  })

  it('shows error state when fetch throws', async () => {
    vi.mocked(getValidToken).mockResolvedValue(mockToken)
    vi.mocked(fetchAllActivities).mockRejectedValue(new Error('Network error'))

    renderWithProvider(<Consumer />)

    await waitFor(() => {
      expect(screen.getByText('error: Network error')).toBeInTheDocument()
    })
  })

  it('disconnect clears the token', async () => {
    vi.mocked(getValidToken).mockResolvedValue(mockToken)
    vi.mocked(fetchAllActivities).mockResolvedValue(mockActivities)

    renderWithProvider(<DisconnectConsumer />)

    await waitFor(() => {
      expect(screen.getByText('authenticated')).toBeInTheDocument()
    })

    await act(async () => {
      screen.getByText('disconnect').click()
    })

    expect(clearToken).toHaveBeenCalled()
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
