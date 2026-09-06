import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { ALBUMS } from './config/albums'

const trackEventMock = vi.hoisted(() => vi.fn())
const fetchSocialPostsMock = vi.hoisted(() => vi.fn())

vi.mock('./utils/analytics', () => ({
  trackEvent: trackEventMock,
  trackPageView: vi.fn(),
  identifyMember: vi.fn(),
  resetAnalyticsIdentity: vi.fn(),
}))

vi.mock('./utils/socialPosts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils/socialPosts')>()
  return { ...actual, fetchSocialPosts: fetchSocialPostsMock }
})

const mockPushState = vi.fn()
const mockDispatchEvent = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  fetchSocialPostsMock.mockResolvedValue({ posts: {}, errors: {}, fetchedAt: '' })
  window.history.pushState = mockPushState
  window.dispatchEvent = mockDispatchEvent
})

const releasedAlbum = ALBUMS.find((album) => album.state === 'released')!
const upcomingAlbum = ALBUMS.find((album) => album.state === 'upcoming')!

/**
 * Render and flush the social feed's initial fetch. Without this, the feed resolves after the
 * test body finishes and React logs an act() warning for a state update nobody is asserting on.
 */
async function renderLanding() {
  const result = render(<App />)
  await act(async () => {})
  return result
}

describe('App landing page', () => {
  it('renders the masthead and tagline', async () => {
    await renderLanding()
    expect(screen.getByRole('heading', { level: 1, name: 'catsky' })).toBeInTheDocument()
    expect(screen.getByText(/in the world of data/i)).toBeInTheDocument()
  })

  it('renders both album covers', async () => {
    await renderLanding()
    expect(screen.getByTestId(`album-cover-${releasedAlbum.id}`)).toBeInTheDocument()
    expect(screen.getByTestId(`album-cover-${upcomingAlbum.id}`)).toBeInTheDocument()
  })

  it('renders the music video section and social feed', async () => {
    await renderLanding()
    expect(screen.getByTestId('video-feature')).toBeInTheDocument()
    expect(screen.getByTestId('social-feed')).toBeInTheDocument()
  })

  it('links out to each streaming platform', async () => {
    await renderLanding()
    expect(screen.getByRole('link', { name: /spotify/i })).toHaveAttribute(
      'href',
      expect.stringContaining('open.spotify.com')
    )
    expect(screen.getByRole('link', { name: /apple music/i })).toHaveAttribute(
      'href',
      expect.stringContaining('music.apple.com')
    )
    expect(screen.getByRole('link', { name: /more platforms/i })).toBeInTheDocument()
  })

  it('opens the tracklist when the released cover is clicked', async () => {
    const user = userEvent.setup()
    await renderLanding()

    await user.click(screen.getByTestId(`album-cover-${releasedAlbum.id}`))

    const dialog = await screen.findByTestId('album-dialog')
    const tracklist = within(dialog).getByTestId('album-tracklist')
    // The released collection is the five tracks the album config names.
    expect(within(tracklist).getAllByRole('listitem')).toHaveLength(releasedAlbum.trackIds.length)
    expect(within(dialog).getByText('Sugar Daddy')).toBeInTheDocument()
  })

  it('opens the subscribe prompt when the upcoming cover is clicked', async () => {
    const user = userEvent.setup()
    await renderLanding()

    await user.click(screen.getByTestId(`album-cover-${upcomingAlbum.id}`))

    const dialog = await screen.findByTestId('subscribe-dialog')
    expect(within(dialog).getByText(/subscribe for updates about upcoming releases/i)).toBeInTheDocument()
    expect(within(dialog).getByTestId('subscribe-email')).toBeInTheDocument()
  })

  it('closes a dialog with the escape key', async () => {
    const user = userEvent.setup()
    await renderLanding()

    await user.click(screen.getByTestId(`album-cover-${upcomingAlbum.id}`))
    await screen.findByTestId('subscribe-dialog')

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByTestId('subscribe-dialog')).not.toBeInTheDocument()
    })
  })

  it('navigates to the full catalogue', async () => {
    const user = userEvent.setup()
    await renderLanding()

    await user.click(screen.getByRole('link', { name: /the full catalogue/i }))

    await waitFor(() => {
      expect(mockPushState).toHaveBeenCalledWith({}, '', '/listen')
    })
  })
})
