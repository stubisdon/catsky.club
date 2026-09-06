import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReadPost from './ReadPost'
import type { GhostPostDetail } from './utils/ghostContent'

const ghost = vi.hoisted(() => ({
  fetchPostBySlug: vi.fn(),
}))

const analytics = vi.hoisted(() => ({
  trackEvent: vi.fn(),
}))

vi.mock('./utils/ghostContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils/ghostContent')>()
  return { ...actual, fetchPostBySlug: ghost.fetchPostBySlug }
})

vi.mock('./utils/analytics', () => ({
  trackEvent: analytics.trackEvent,
}))

function makePost(overrides: Partial<GhostPostDetail> = {}): GhostPostDetail {
  return {
    id: 'post-1',
    slug: 'first-post',
    title: 'Sugar Daddy Sample Pack 📦',
    excerpt: 'Sixteen loops from the session.',
    featureImage: null,
    featureImageAlt: null,
    publishedAt: '2026-02-26T12:00:00.000Z',
    readingTime: 4,
    visibility: 'public',
    access: true,
    html: '<p>the full body</p>',
    ...overrides,
  }
}

describe('ReadPost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/read/first-post')
  })

  it('shows the loading state and then the article body', async () => {
    ghost.fetchPostBySlug.mockResolvedValue(makePost())

    render(<ReadPost slug="first-post" />)

    expect(screen.getByTestId('read-loading')).toBeInTheDocument()

    const article = await screen.findByTestId('read-article')
    expect(article).toContainHTML('<p>the full body</p>')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sugar Daddy Sample Pack 📦')
    expect(screen.getByText('Feb 26, 2026')).toBeInTheDocument()
    expect(screen.getByText('· 4 min read')).toBeInTheDocument()
    expect(screen.queryByTestId('read-locked-cta')).not.toBeInTheDocument()
    expect(ghost.fetchPostBySlug).toHaveBeenCalledWith('first-post')
  })

  it('renders the free preview plus the locked CTA for gated posts', async () => {
    ghost.fetchPostBySlug.mockResolvedValue(
      makePost({ access: false, visibility: 'members', html: '<p>free preview</p>' })
    )

    render(<ReadPost slug="first-post" />)

    const cta = await screen.findByTestId('read-locked-cta')
    expect(cta).toHaveTextContent('the rest of this post is for members.')
    expect(screen.getByTestId('read-article')).toContainHTML('<p>free preview</p>')
    expect(screen.getByRole('link', { name: 'connect' })).toHaveAttribute('href', '/connect')
  })

  it('names the paid level for paid and tiers visibility, with no preview', async () => {
    ghost.fetchPostBySlug.mockResolvedValue(makePost({ access: false, visibility: 'paid', html: '' }))

    render(<ReadPost slug="first-post" />)

    expect(await screen.findByTestId('read-locked-cta')).toHaveTextContent(
      'this post is for paid members.'
    )
  })

  it('uses "this post is for" copy when html is empty (no preview)', async () => {
    ghost.fetchPostBySlug.mockResolvedValue(makePost({ access: false, visibility: 'members', html: '' }))

    render(<ReadPost slug="first-post" />)

    expect(await screen.findByTestId('read-locked-cta')).toHaveTextContent(
      'this post is for members.'
    )
  })

  it('uses "this post is for" copy when html is only whitespace', async () => {
    ghost.fetchPostBySlug.mockResolvedValue(makePost({ access: false, visibility: 'members', html: '   \n  ' }))

    render(<ReadPost slug="first-post" />)

    expect(await screen.findByTestId('read-locked-cta')).toHaveTextContent(
      'this post is for members.'
    )
  })

  it('does not render reading time when it is 0', async () => {
    ghost.fetchPostBySlug.mockResolvedValue(makePost({ readingTime: 0 }))

    render(<ReadPost slug="first-post" />)

    await screen.findByTestId('read-article')
    expect(screen.queryByText(/min read/)).not.toBeInTheDocument()
  })

  it('sets the document title to the post title and restores it on unmount', async () => {
    const originalTitle = document.title
    ghost.fetchPostBySlug.mockResolvedValue(makePost({ title: 'Sugar Daddy Sample Pack 📦' }))

    const { unmount } = render(<ReadPost slug="first-post" />)

    await screen.findByTestId('read-article')
    expect(document.title).toBe('Sugar Daddy Sample Pack 📦 — catsky.club')

    unmount()
    expect(document.title).toBe(originalTitle)
  })

  it('shows the not-found state with a link back to the feed', async () => {
    ghost.fetchPostBySlug.mockResolvedValue(null)

    render(<ReadPost slug="missing" />)

    expect(await screen.findByTestId('read-not-found')).toBeInTheDocument()
    expect(screen.queryByTestId('read-article')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'back to read' })).toHaveAttribute('href', '/read')
  })

  it('shows the error state and refetches on retry', async () => {
    ghost.fetchPostBySlug.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(makePost())
    const user = userEvent.setup()

    render(<ReadPost slug="first-post" />)

    expect(await screen.findByTestId('read-error')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'retry' }))

    await waitFor(() => {
      expect(screen.getByTestId('read-article')).toBeInTheDocument()
    })
    expect(ghost.fetchPostBySlug).toHaveBeenCalledTimes(2)
  })

  it('tracks read_post_opened once per post, without titles or bodies', async () => {
    ghost.fetchPostBySlug.mockResolvedValue(makePost({ access: false, visibility: 'members' }))

    const { rerender } = render(<ReadPost slug="first-post" />)

    await screen.findByTestId('read-article')

    expect(analytics.trackEvent).toHaveBeenCalledTimes(1)
    expect(analytics.trackEvent).toHaveBeenCalledWith('read_post_opened', {
      slug: 'first-post',
      visibility: 'members',
      locked: true,
    })

    rerender(<ReadPost slug="first-post" />)
    expect(analytics.trackEvent).toHaveBeenCalledTimes(1)
  })

  it('does not track anything when the post is missing', async () => {
    ghost.fetchPostBySlug.mockResolvedValue(null)

    render(<ReadPost slug="missing" />)

    await screen.findByTestId('read-not-found')
    expect(analytics.trackEvent).not.toHaveBeenCalled()
  })
})
