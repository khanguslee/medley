import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Nav from '../Nav'

vi.mock('../../context/ActivityContext', () => ({
  useActivity: vi.fn(),
}))

import { useActivity } from '../../context/ActivityContext'

function renderNav(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Nav />
    </MemoryRouter>
  )
}

describe('Nav', () => {
  it('renders nothing when unauthenticated', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: null,
      activities: [],
      loading: false,
      error: null,
      disconnect: vi.fn(),
      reload: vi.fn(),
    })

    const { container } = renderNav()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders Activities and Dashboard links when authenticated', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: { access_token: 'tok', refresh_token: 'ref', expires_at: 9999, athlete: { firstname: 'Test', lastname: 'User' } },
      activities: [],
      loading: false,
      error: null,
      disconnect: vi.fn(),
      reload: vi.fn(),
    })

    renderNav()

    expect(screen.getByRole('link', { name: 'Activities' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('links point to correct routes', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: { access_token: 'tok', refresh_token: 'ref', expires_at: 9999, athlete: { firstname: 'Test', lastname: 'User' } },
      activities: [],
      loading: false,
      error: null,
      disconnect: vi.fn(),
      reload: vi.fn(),
    })

    renderNav()

    expect(screen.getByRole('link', { name: 'Activities' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
  })

  it('applies active class to Activities link when on /', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: { access_token: 'tok', refresh_token: 'ref', expires_at: 9999, athlete: { firstname: 'Test', lastname: 'User' } },
      activities: [],
      loading: false,
      error: null,
      disconnect: vi.fn(),
      reload: vi.fn(),
    })

    renderNav('/')

    expect(screen.getByRole('link', { name: 'Activities' })).toHaveClass('active')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveClass('active')
  })

  it('applies active class to Dashboard link when on /dashboard', () => {
    vi.mocked(useActivity).mockReturnValue({
      token: { access_token: 'tok', refresh_token: 'ref', expires_at: 9999, athlete: { firstname: 'Test', lastname: 'User' } },
      activities: [],
      loading: false,
      error: null,
      disconnect: vi.fn(),
      reload: vi.fn(),
    })

    renderNav('/dashboard')

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveClass('active')
    expect(screen.getByRole('link', { name: 'Activities' })).not.toHaveClass('active')
  })
})
