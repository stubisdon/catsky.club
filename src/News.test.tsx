import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import News from './News'
import type { GhostPostSummary } from './utils/ghostContent'

const ghost = vi.hoisted(() => ({
  fetchPosts: vi.fn(),
}))

vi.mock('./utils/ghostContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils/ghostContent')>()
  return { ...actual, fetchPosts: ghost.fetchPosts }
})

function makePost(overrides: Partial<GhostPostSummary> = {}): GhostPostSummary {
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
    ...overrides,
  }
}

describe('News', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/news')
  })

  it('shows the loading state and then the feed', async () => {
    ghost.fetchPosts.mockResolvedValue([makePost(), makePost({ id: 'post-2', slug: 'second', title: 'Second Post' })])

    render(<News />)

    expect(screen.getByTestId('news-loading')).toBeInTheDocument()

    expect(await screen.findByTestId('news-feed')).toBeInTheDocument()
    const cards = screen.getAllByTestId('news-post-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveAttribute('href', '/news/first-post')
    expect(cards[1]).toHaveAttribute('href', '/news/second')

    const titles = screen.getAllByTestId('news-post-title')
    expect(titles[0]).toHaveTextContent('Sugar Daddy Sample Pack 📦')
    expect(screen.getAllByText('Feb 26, 2026')).toHaveLength(2)
  })

  it('marks gated posts and still lists them', async () => {
    ghost.fetchPosts.mockResolvedValue([makePost({ access: false, visibility: 'members' })])

    render(<News />)

    expect(await screen.findByTestId('news-feed')).toBeInTheDocument()
    expect(screen.getByText('members only')).toBeInTheDocument()
  })

  it('marks tiers/paid gated posts as paid members only', async () => {
    ghost.fetchPosts.mockResolvedValue([
      makePost({ id: 'post-tiers', slug: 'tiers-post', access: false, visibility: 'tiers' }),
      makePost({ id: 'post-paid', slug: 'paid-post', access: false, visibility: 'paid' }),
    ])

    render(<News />)

    expect(await screen.findByTestId('news-feed')).toBeInTheDocument()
    expect(screen.getAllByText('paid members only')).toHaveLength(2)
  })

  it('renders the feature image only when the post has one', async () => {
    ghost.fetchPosts.mockResolvedValue([
      makePost({ featureImage: 'https://catsky.club/cover.jpg', featureImageAlt: 'cover' }),
      makePost({ id: 'post-2', slug: 'no-image' }),
    ])

    render(<News />)

    await screen.findByTestId('news-feed')
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(1)
    expect(images[0]).toHaveAttribute('src', 'https://catsky.club/cover.jpg')
  })

  it('shows the empty state when Ghost has no posts', async () => {
    ghost.fetchPosts.mockResolvedValue([])

    render(<News />)

    expect(await screen.findByTestId('news-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('news-feed')).not.toBeInTheDocument()
  })

  it('shows the error state and reloads the feed on retry', async () => {
    ghost.fetchPosts.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([makePost()])
    const user = userEvent.setup()

    render(<News />)

    expect(await screen.findByTestId('news-error')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'retry' }))

    await waitFor(() => {
      expect(screen.getByTestId('news-feed')).toBeInTheDocument()
    })
    expect(ghost.fetchPosts).toHaveBeenCalledTimes(2)
    expect(screen.queryByTestId('news-error')).not.toBeInTheDocument()
  })

  it('does not lowercase post titles', async () => {
    ghost.fetchPosts.mockResolvedValue([makePost()])

    render(<News />)

    const title = await screen.findByTestId('news-post-title')
    expect(title).toHaveClass('news-card-title')
    expect(title.textContent).toBe('Sugar Daddy Sample Pack 📦')
  })
})
