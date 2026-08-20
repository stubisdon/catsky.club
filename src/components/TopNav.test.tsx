import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TopNav from './TopNav'
import { stubPrefersColorScheme, stubTimezone } from '../test/themeTestEnv'

// Helper to render and wait for async effects to settle
const renderAndWait = async (component: React.ReactNode) => {
  await act(async () => {
    render(component)
  })
}

const getMembershipTierMock = vi.hoisted(() => vi.fn())

vi.mock('../utils', () => ({
  getMembershipTier: getMembershipTierMock,
}))

beforeEach(() => {
  // Default to a resolved promise so state updates happen within render
  getMembershipTierMock.mockResolvedValue('none')
  // Set up theme test environment for ThemeToggle
  stubTimezone(undefined)
  stubPrefersColorScheme(null)
  window.localStorage.clear()
  document.documentElement.dataset.theme = 'light'
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.clear()
  vi.clearAllMocks()
})

describe('TopNav', () => {
  it('renders navigation links', async () => {
    await renderAndWait(<TopNav currentView="home" />)
    expect(screen.getByTestId('top-nav-link-listen')).toBeInTheDocument()
    expect(screen.getByTestId('top-nav-link-watch')).toBeInTheDocument()
    expect(screen.getByTestId('top-nav-link-connect')).toBeInTheDocument()
  })

  it('hides wordmark on home page', async () => {
    await renderAndWait(<TopNav currentView="home" />)
    expect(screen.queryByTestId('top-nav-wordmark')).not.toBeInTheDocument()
  })

  it('shows wordmark on non-home pages', async () => {
    await renderAndWait(<TopNav currentView="listen" />)
    expect(screen.getByTestId('top-nav-wordmark')).toBeInTheDocument()
    expect(screen.getByText('catsky.club')).toBeInTheDocument()
  })

  it('does not show secrets link for non-paid members', async () => {
    getMembershipTierMock.mockResolvedValue('none')

    render(<TopNav currentView="listen" />)

    await waitFor(() => {
      expect(screen.queryByTestId('top-nav-link-secrets')).not.toBeInTheDocument()
    })
  })

  it('does not show secrets link for free members', async () => {
    getMembershipTierMock.mockResolvedValue('free')

    render(<TopNav currentView="listen" />)

    await waitFor(() => {
      expect(screen.queryByTestId('top-nav-link-secrets')).not.toBeInTheDocument()
    })
  })

  it('shows secrets link for paid $5 members', async () => {
    getMembershipTierMock.mockResolvedValue('paid_5')

    render(<TopNav currentView="listen" />)

    await waitFor(() => {
      expect(screen.getByTestId('top-nav-link-secrets')).toBeInTheDocument()
      expect(screen.getByText('secrets')).toBeInTheDocument()
    })
  })

  it('shows secrets link for paid $20 members', async () => {
    getMembershipTierMock.mockResolvedValue('paid_20')

    render(<TopNav currentView="listen" />)

    await waitFor(() => {
      expect(screen.getByTestId('top-nav-link-secrets')).toBeInTheDocument()
    })
  })

  it('marks current view as active', async () => {
    getMembershipTierMock.mockResolvedValue('none')

    render(<TopNav currentView="listen" />)

    await waitFor(() => {
      const listenLink = screen.getByTestId('top-nav-link-listen')
      expect(listenLink).toHaveClass('active')
    })
  })

  it('does not mark other views as active', async () => {
    getMembershipTierMock.mockResolvedValue('none')

    render(<TopNav currentView="listen" />)

    await waitFor(() => {
      const watchLink = screen.getByTestId('top-nav-link-watch')
      expect(watchLink).not.toHaveClass('active')
    })
  })

  it('opens mobile menu when toggle is clicked', async () => {
    const user = userEvent.setup()
    getMembershipTierMock.mockResolvedValue('none')

    render(<TopNav currentView="listen" />)

    // Mobile menu should not be visible initially
    expect(screen.queryByTestId('top-nav-overlay')).not.toBeInTheDocument()

    // Click the toggle button
    const toggle = screen.getByTestId('top-nav-toggle')
    await user.click(toggle)

    // Mobile menu should now be visible
    await waitFor(() => {
      expect(screen.getByTestId('top-nav-overlay')).toBeInTheDocument()
    })
  })

  it('includes home link in mobile menu', async () => {
    const user = userEvent.setup()
    getMembershipTierMock.mockResolvedValue('none')

    render(<TopNav currentView="listen" />)

    // Open the menu
    const toggle = screen.getByTestId('top-nav-toggle')
    await user.click(toggle)

    await waitFor(() => {
      expect(screen.getByTestId('top-nav-overlay-link-home')).toBeInTheDocument()
      expect(screen.getByText('home')).toBeInTheDocument()
    })
  })

  it('closes mobile menu when escape key is pressed', async () => {
    const user = userEvent.setup()
    getMembershipTierMock.mockResolvedValue('none')

    render(<TopNav currentView="listen" />)

    // Open the menu
    const toggle = screen.getByTestId('top-nav-toggle')
    await user.click(toggle)

    await waitFor(() => {
      expect(screen.getByTestId('top-nav-overlay')).toBeInTheDocument()
    })

    // Press Escape
    await user.keyboard('{Escape}')

    // Menu should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('top-nav-overlay')).not.toBeInTheDocument()
    })
  })

  it('closes mobile menu when close button is clicked', async () => {
    const user = userEvent.setup()
    getMembershipTierMock.mockResolvedValue('none')

    render(<TopNav currentView="listen" />)

    // Open the menu
    const toggle = screen.getByTestId('top-nav-toggle')
    await user.click(toggle)

    await waitFor(() => {
      expect(screen.getByTestId('top-nav-overlay')).toBeInTheDocument()
    })

    // Click close button (use testid to be specific)
    const closeButton = screen.getByTestId('top-nav-overlay-close')
    await user.click(closeButton)

    // Menu should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('top-nav-overlay')).not.toBeInTheDocument()
    })
  })

  it('closes mobile menu when a link is clicked', async () => {
    const user = userEvent.setup()
    getMembershipTierMock.mockResolvedValue('none')

    render(<TopNav currentView="listen" />)

    // Open the menu
    const toggle = screen.getByTestId('top-nav-toggle')
    await user.click(toggle)

    await waitFor(() => {
      expect(screen.getByTestId('top-nav-overlay')).toBeInTheDocument()
    })

    // Click a link
    const homeLink = screen.getByTestId('top-nav-overlay-link-home')
    await user.click(homeLink)

    // Menu should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('top-nav-overlay')).not.toBeInTheDocument()
    })
  })

  it('includes secrets in mobile menu for paid users', async () => {
    const user = userEvent.setup()
    getMembershipTierMock.mockResolvedValue('paid_5')

    render(<TopNav currentView="listen" />)

    // Open the menu
    const toggle = screen.getByTestId('top-nav-toggle')
    await user.click(toggle)

    // Check that overlay has appeared and has secrets link
    await waitFor(() => {
      expect(screen.getByTestId('top-nav-overlay')).toBeInTheDocument()
      expect(screen.getByTestId('top-nav-overlay-link-secrets')).toBeInTheDocument()
    })
  })

  it('does not include secrets in mobile menu for free users', async () => {
    const user = userEvent.setup()
    getMembershipTierMock.mockResolvedValue('free')

    render(<TopNav currentView="listen" />)

    // Open the menu
    const toggle = screen.getByTestId('top-nav-toggle')
    await user.click(toggle)

    await waitFor(() => {
      expect(screen.queryByTestId('top-nav-link-secrets')).not.toBeInTheDocument()
    })
  })

  it('marks active view as active in mobile menu', async () => {
    const user = userEvent.setup()
    getMembershipTierMock.mockResolvedValue('none')

    render(<TopNav currentView="watch" />)

    // Open the menu
    const toggle = screen.getByTestId('top-nav-toggle')
    await user.click(toggle)

    // Check that the overlay appeared with active links
    await waitFor(() => {
      const overlay = screen.getByTestId('top-nav-overlay')
      expect(overlay).toBeInTheDocument()

      // Find the overlay watch link
      const overlayWatchLink = screen.getByTestId('top-nav-overlay-link-watch')
      expect(overlayWatchLink).toHaveClass('active')
    })
  })

  it('has proper aria attributes on nav', async () => {
    await renderAndWait(<TopNav currentView="listen" />)

    const nav = screen.getByTestId('top-nav')
    expect(nav.tagName).toBe('NAV')
    expect(nav).toHaveAttribute('aria-label', 'main')
  })

  it('has proper aria attributes on toggle button', async () => {
    await renderAndWait(<TopNav currentView="listen" />)

    const toggle = screen.getByTestId('top-nav-toggle')
    expect(toggle).toHaveAttribute('aria-label', 'menu')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'top-nav-overlay')
  })

  it('updates aria-expanded when menu opens', async () => {
    const user = userEvent.setup()
    getMembershipTierMock.mockResolvedValue('none')

    render(<TopNav currentView="listen" />)

    const toggle = screen.getByTestId('top-nav-toggle')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)

    await waitFor(() => {
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
    })
  })

  it('maintains grid alignment on home page (grid has 3 cells even when wordmark hidden)', async () => {
    await renderAndWait(<TopNav currentView="home" />)

    // On home, wordmark should not be visible
    expect(screen.queryByTestId('top-nav-wordmark')).not.toBeInTheDocument()

    // But the grid should still have 3 children (placeholder + links + right)
    const gridContent = screen.getByTestId('top-nav').querySelector('.top-nav-content')
    expect(gridContent).toBeInTheDocument()
    const children = gridContent!.children
    expect(children.length).toBe(3) // placeholder, links, right+toggle

    // Verify structure: placeholder in first cell, links in center, right on end
    expect(children[0].tagName).toBe('DIV') // placeholder div
    expect(children[1]).toHaveClass('top-nav-links') // center
    expect(children[2]).toHaveClass('top-nav-right') // right
  })
})
