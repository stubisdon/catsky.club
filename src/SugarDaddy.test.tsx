import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import SugarDaddy from './SugarDaddy'

const mocks = vi.hoisted(() => ({
  getMembershipTierMock: vi.fn<() => Promise<'none' | 'free' | 'paid_5' | 'paid_20'>>(),
  loadMetaPixelMock: vi.fn(),
  trackPixelMock: vi.fn(),
  navigateToMock: vi.fn(),
}))

vi.mock('./utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils')>()
  return { ...actual, getMembershipTier: mocks.getMembershipTierMock }
})

vi.mock('./utils/metaPixel', () => ({
  loadMetaPixel: mocks.loadMetaPixelMock,
  trackPixel: mocks.trackPixelMock,
}))

vi.mock('./router/navigation', () => ({
  navigateTo: mocks.navigateToMock,
}))

async function renderSugarDaddy() {
  const result = render(<SugarDaddy />)
  await act(async () => {
    await Promise.resolve()
  })
  return result
}

describe('SugarDaddy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getMembershipTierMock.mockResolvedValue('none')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the heading and every external platform/follow link with the exact required URLs', async () => {
    await renderSugarDaddy()

    expect(screen.getByRole('heading', { name: /sugar daddy/i })).toBeInTheDocument()

    const expectations: Array<[string, string]> = [
      ['spotify', 'https://open.spotify.com/track/4HRAM5R5U0lV9tpUmfMrqa'],
      ['apple music', 'https://music.apple.com/us/song/sugar-daddy/6811689213'],
      ['youtube', 'https://www.youtube.com/watch?v=xRxUcF_wFSQ'],
      ['instagram', 'https://www.instagram.com/catsky.club/'],
      ['x', 'https://twitter.com/catsky_club'],
    ]

    for (const [name, href] of expectations) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('href', href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('renders the cover art with the required alt text', async () => {
    await renderSugarDaddy()

    const image = screen.getByAltText('catsky — sugar daddy cover art')
    expect(image).toHaveAttribute(
      'src',
      'https://i.scdn.co/image/ab67616d0000b273b03a55e382bf286ab375339d',
    )
  })

  it('renders internal explore links to /, /listen, /news and /mission', async () => {
    await renderSugarDaddy()

    expect(screen.getByRole('link', { name: /the site/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /the full catalogue/i })).toHaveAttribute('href', '/listen')
    expect(screen.getByRole('link', { name: 'news' })).toHaveAttribute('href', '/news')
    expect(screen.getByRole('link', { name: 'mission' })).toHaveAttribute('href', '/mission')
  })

  it('fires exactly one PageView pixel on mount', async () => {
    await renderSugarDaddy()

    expect(mocks.loadMetaPixelMock).toHaveBeenCalledTimes(1)
    expect(mocks.trackPixelMock).toHaveBeenCalledWith('PageView')
    expect(mocks.trackPixelMock.mock.calls.filter((call) => call[0] === 'PageView')).toHaveLength(1)
  })

  it('fires a ViewContent pixel with the platform content_type on each platform click', async () => {
    await renderSugarDaddy()

    fireEvent.click(screen.getByRole('link', { name: 'spotify' }))
    expect(mocks.trackPixelMock).toHaveBeenCalledWith('ViewContent', {
      content_name: 'catsky-sugar-daddy',
      content_type: 'spotify',
    })

    fireEvent.click(screen.getByRole('link', { name: 'apple music' }))
    expect(mocks.trackPixelMock).toHaveBeenCalledWith('ViewContent', {
      content_name: 'catsky-sugar-daddy',
      content_type: 'apple_music',
    })

    fireEvent.click(screen.getByRole('link', { name: 'youtube' }))
    expect(mocks.trackPixelMock).toHaveBeenCalledWith('ViewContent', {
      content_name: 'catsky-sugar-daddy',
      content_type: 'youtube',
    })
  })

  it('submits a valid email, POSTs to the magic-link endpoint with signup labels, shows confirmation, and fires the Lead pixel', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      statusText: 'Created',
      json: vi.fn().mockResolvedValue({ success: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await renderSugarDaddy()

    fireEvent.change(screen.getByTestId('subscribe-email'), {
      target: { value: 'ada@example.com' },
    })

    await act(async () => {
      fireEvent.submit(screen.getByTestId('subscribe-submit').closest('form')!)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/members/api/send-magic-link/')
    const body = JSON.parse(options.body as string)
    expect(body).toMatchObject({
      email: 'ada@example.com',
      emailType: 'signup',
      labels: ['sugar-daddy'],
    })

    await waitFor(() => {
      expect(screen.getByTestId('subscribe-confirmation')).toBeInTheDocument()
    })
    expect(mocks.trackPixelMock).toHaveBeenCalledWith('Lead', { content_name: 'catsky-sugar-daddy' })
  })

  it('shows a validation error and does not call fetch for an invalid email', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await renderSugarDaddy()

    fireEvent.change(screen.getByTestId('subscribe-email'), {
      target: { value: 'not-an-email' },
    })

    await act(async () => {
      fireEvent.submit(screen.getByTestId('subscribe-submit').closest('form')!)
      await Promise.resolve()
    })

    expect(screen.getByTestId('subscribe-error')).toHaveTextContent(/valid email/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the server error message on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: vi.fn().mockResolvedValue({ error: 'Invalid email address' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await renderSugarDaddy()

    fireEvent.change(screen.getByTestId('subscribe-email'), {
      target: { value: 'ada@example.com' },
    })

    await act(async () => {
      fireEvent.submit(screen.getByTestId('subscribe-submit').closest('form')!)
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.getByTestId('subscribe-error')).toHaveTextContent('Invalid email address')
    })
  })

  it('hides the email form and shows a members-only line when the visitor is already a member', async () => {
    mocks.getMembershipTierMock.mockResolvedValue('free')

    await renderSugarDaddy()

    await waitFor(() => {
      expect(screen.queryByTestId('subscribe-email')).not.toBeInTheDocument()
    })
    expect(screen.getByText(/you're in/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to the full catalogue/i })).toHaveAttribute(
      'href',
      '/listen',
    )
  })
})
