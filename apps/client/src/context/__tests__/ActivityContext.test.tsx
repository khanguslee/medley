import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { ActivityProvider, useActivity } from '../ActivityContext'
import type { StravaActivity, StravaAthlete } from '../../services/api'

vi.mock('../../services/api', () => ({
  fetchAuthUrl: vi.fn(),
  fetchMe: vi.fn(),
  fetchActivitiesStream: vi.fn(),
  deleteStravaToken: vi.fn(),
}))

import { fetchAuthUrl, fetchMe, fetchActivitiesStream, deleteStravaToken } from '../../services/api'

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
    elapsed_time: 2100,
    start_date: '2026-04-01T08:00:00Z',
  },
]

const mockActivitiesPage2: StravaActivity[] = [
  {
    id: 2,
    name: 'Evening Ride',
    type: 'Ride',
    sport_type: 'Ride',
    distance: 20000,
    moving_time: 3600,
    elapsed_time: 4200,
    start_date: '2026-04-02T18:00:00Z',
  },
]

function Consumer() {
  const { athlete, isAuthenticated, activities, loading, loadedCount, isInitialLoad, error } = useActivity()
  if (loading) return <div>loading: {loadedCount}</div>
  if (error) return <div>error: {error}</div>
  if (!isAuthenticated) return <div>unauthenticated</div>
  return (
    <div>
      <div>athlete: {athlete?.firstname ?? 'unknown'}</div>
      <div>count: {activities.length}</div>
      <div>initialLoad: {String(isInitialLoad)}</div>
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
    vi.mocked(fetchActivitiesStream).mockImplementation(({ onPage, onDone }) => {
      onPage(mockActivities, mockActivities.length)
      onDone(mockActivities.length)
      return () => {}
    })

    renderWithProvider(<Consumer />)
    expect(screen.getByText('loading: 0')).toBeInTheDocument()

    await waitFor(() => expect(screen.queryByText(/^loading:/)).not.toBeInTheDocument())
  })

  it('provides athlete and activities after successful fetch', async () => {
    vi.mocked(fetchMe).mockResolvedValue(mockAthlete)
    vi.mocked(fetchActivitiesStream).mockImplementation(({ onPage, onDone }) => {
      onPage(mockActivities, mockActivities.length)
      onDone(mockActivities.length)
      return () => {}
    })

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
    expect(fetchActivitiesStream).not.toHaveBeenCalled()
  })

  it('shows error state when stream errors', async () => {
    vi.mocked(fetchMe).mockResolvedValue(mockAthlete)
    vi.mocked(fetchActivitiesStream).mockImplementation(({ onError }) => {
      onError('Network error')
      return () => {}
    })

    renderWithProvider(<Consumer />)

    await waitFor(() => {
      expect(screen.getByText('error: Network error')).toBeInTheDocument()
    })
  })

  it('disconnect calls deleteStravaToken and clears state', async () => {
    vi.mocked(fetchMe).mockResolvedValue(mockAthlete)
    vi.mocked(fetchActivitiesStream).mockImplementation(({ onPage, onDone }) => {
      onPage(mockActivities, mockActivities.length)
      onDone(mockActivities.length)
      return () => {}
    })
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

  it('loadedCount increments as pages arrive and activities appear before final page', async () => {
    vi.mocked(fetchMe).mockResolvedValue(mockAthlete)

    let resolveDone!: () => void
    const donePromise = new Promise<void>((r) => { resolveDone = r })

    vi.mocked(fetchActivitiesStream).mockImplementation(({ onPage, onDone }) => {
      onPage(mockActivities, 1)
      void donePromise.then(() => {
        onPage(mockActivitiesPage2, 2)
        onDone(2)
      })
      return () => {}
    })

    renderWithProvider(<Consumer />)

    // After first page: count shows in loading state
    await waitFor(() => {
      expect(screen.getByText('loading: 1')).toBeInTheDocument()
    })

    // Complete the stream
    await act(async () => { resolveDone() })

    await waitFor(() => {
      expect(screen.getByText('count: 2')).toBeInTheDocument()
    })
  })

  it('isInitialLoad is false after first page lands', async () => {
    vi.mocked(fetchMe).mockResolvedValue(mockAthlete)
    vi.mocked(fetchActivitiesStream).mockImplementation(({ onPage, onDone }) => {
      onPage(mockActivities, 1)
      onDone(1)
      return () => {}
    })

    renderWithProvider(<Consumer />)

    await waitFor(() => {
      expect(screen.getByText('initialLoad: false')).toBeInTheDocument()
    })
  })
})
