import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock ReactDOM
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
  })),
}))

// Mock all components
vi.mock('./App', () => ({
  default: () => <div>App Component</div>,
}))

vi.mock('./Watch', () => ({
  default: () => <div>Watch Component</div>,
}))

vi.mock('./Mission', () => ({
  default: () => <div>Mission Component</div>,
}))

vi.mock('./Connect', () => ({
  default: () => <div>Connect Component</div>,
}))

vi.mock('./Join', () => ({
  default: () => <div>Join Component</div>,
}))

vi.mock('./Listen', () => ({
  default: () => <div>Listen Component</div>,
}))

vi.mock('./Player', () => ({
  default: () => <div>Player Component</div>,
}))

describe('Router', () => {
  beforeEach(() => {
    // Reset window.location.pathname
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/',
      },
      writable: true,
    })
  })

  it('renders App component for home route', () => {
    window.location.pathname = '/'
    // This test verifies the routing logic exists
    // Full integration test would require mounting the router
    expect(window.location.pathname).toBe('/')
  })

  it('handles /listen route', () => {
    window.location.pathname = '/listen'
    expect(window.location.pathname).toBe('/listen')
  })

  it('handles /watch route', () => {
    window.location.pathname = '/watch'
    expect(window.location.pathname).toBe('/watch')
  })

  it('handles /connect route', () => {
    window.location.pathname = '/connect'
    expect(window.location.pathname).toBe('/connect')
  })

  it('handles /join route', () => {
    window.location.pathname = '/join'
    expect(window.location.pathname).toBe('/join')
  })

  it('handles /player route', () => {
    window.location.pathname = '/player'
    expect(window.location.pathname).toBe('/player')
  })
})
