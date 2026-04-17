import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Nav from '../Nav'
import type { StravaAthlete, StravaActivity } from '../../services/api'

vi.mock('../../context/ActivityContext', () => ({
  useActivity: vi.fn(),
}))

import { useActivity } from '../../context/ActivityContext'

const mockAthlete: StravaAthlete = { id: 1, firstname: 'Test', lastname: 'User' }

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

function renderNav(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Nav />
    </MemoryRouter>
  )
}

describe('Nav', () => {
  it('renders nothing when unauthenticated', () => {
    vi.mocked(useActivity).mockReturnValue({ ...baseContext })

    const { container } = renderNav()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders Activities and Dashboard links when authenticated', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderNav()

    expect(screen.getByRole('link', { name: 'Activities' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('links point to correct routes', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderNav()

    expect(screen.getByRole('link', { name: 'Activities' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
  })

  it('applies active class to Activities link when on /', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderNav('/')

    expect(screen.getByRole('link', { name: 'Activities' })).toHaveClass('active')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveClass('active')
  })

  it('applies active class to Dashboard link when on /dashboard', () => {
    vi.mocked(useActivity).mockReturnValue({
      ...baseContext,
      athlete: mockAthlete,
      isAuthenticated: true,
    })

    renderNav('/dashboard')

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveClass('active')
    expect(screen.getByRole('link', { name: 'Activities' })).not.toHaveClass('active')
  })
})
