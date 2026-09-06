import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GhostContentError,
  fetchPostBySlug,
  fetchPosts,
  formatPublishedDate,
} from './ghostContent'

const API_KEY = 'test-content-key'

function setApiKey(key: string | null): void {
  document.getElementById('ghost-portal-config')?.remove()
  if (key === null) return
  const el = document.createElement('div')
  el.id = 'ghost-portal-config'
  el.setAttribute('data-key', key)
  document.body.appendChild(el)
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

const fullPost = {
  id: 'post-1',
  slug: 'sugar-daddy-sample-pack',
  title: 'Sugar Daddy Sample Pack 📦',
  excerpt: 'A pack of samples.',
  feature_image: 'https://catsky.club/content/images/pack.jpg',
  feature_image_alt: 'pack cover',
  published_at: '2026-02-26T10:00:00.000Z',
  reading_time: 4,
  visibility: 'public',
  access: true,
  html: '<p>Body</p>',
}

describe('ghostContent', () => {
  beforeEach(() => {
    setApiKey(API_KEY)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setApiKey(null)
  })

  describe('fetchPosts', () => {
    it('returns normalized posts and requests the feed with member credentials', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(jsonResponse({ posts: [fullPost] }))

      await expect(fetchPosts()).resolves.toEqual([
        {
          id: 'post-1',
          slug: 'sugar-daddy-sample-pack',
          title: 'Sugar Daddy Sample Pack 📦',
          excerpt: 'A pack of samples.',
          featureImage: 'https://catsky.club/content/images/pack.jpg',
          featureImageAlt: 'pack cover',
          publishedAt: '2026-02-26T10:00:00.000Z',
          readingTime: 4,
          visibility: 'public',
          access: true,
        },
      ])

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const [url, init] = fetchSpy.mock.calls[0]
      expect(String(url)).toContain('/ghost/api/content/posts/?key=test-content-key')
      expect(String(url)).toContain('limit=all')
      expect(String(url)).toContain('order=published_at%20desc')
      expect(String(url)).toContain('fields=id,slug,title,excerpt,feature_image,feature_image_alt,published_at,visibility,access')
      expect(init).toMatchObject({ credentials: 'include', cache: 'no-store' })
    })

    it('normalizes null and missing fields', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse({
          posts: [
            {
              id: 'post-2',
              slug: 'gated',
              title: 'Gated',
              excerpt: null,
              feature_image: null,
              feature_image_alt: null,
              published_at: null,
              reading_time: null,
              visibility: 'members',
              access: false,
            },
          ],
        })
      )

      await expect(fetchPosts()).resolves.toEqual([
        {
          id: 'post-2',
          slug: 'gated',
          title: 'Gated',
          excerpt: '',
          featureImage: null,
          featureImageAlt: null,
          publishedAt: '',
          readingTime: null,
          visibility: 'members',
          access: false,
        },
      ])
    })

    it('returns an empty list when no Content API key is configured', async () => {
      setApiKey(null)
      const fetchSpy = vi.spyOn(globalThis, 'fetch')

      await expect(fetchPosts()).resolves.toEqual([])
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('throws on server errors', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ errors: [] }, 500))

      await expect(fetchPosts()).rejects.toBeInstanceOf(GhostContentError)
    })

    it('throws on 429 brute-force throttling instead of retrying', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(jsonResponse({ errors: [{ type: 'TooManyRequestsError' }] }, 429))

      await expect(fetchPosts()).rejects.toMatchObject({ status: 429 })
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it('throws on network failures', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))

      await expect(fetchPosts()).rejects.toBeInstanceOf(GhostContentError)
    })

    it('throws on malformed JSON', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>nope</html>', { status: 200 }))

      await expect(fetchPosts()).rejects.toBeInstanceOf(GhostContentError)
    })

    it('throws when the payload has no posts array', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ unexpected: true }))

      await expect(fetchPosts()).rejects.toBeInstanceOf(GhostContentError)
    })
  })

  describe('fetchPostBySlug', () => {
    it('returns the full post including html', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(jsonResponse({ posts: [fullPost] }))

      const post = await fetchPostBySlug('sugar-daddy-sample-pack')

      expect(post).toMatchObject({ slug: 'sugar-daddy-sample-pack', html: '<p>Body</p>', access: true })
      const [url, init] = fetchSpy.mock.calls[0]
      expect(String(url)).toBe(
        '/ghost/api/content/posts/slug/sugar-daddy-sample-pack/?key=test-content-key'
      )
      expect(init).toMatchObject({ credentials: 'include', cache: 'no-store' })
    })

    it('encodes the slug', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(jsonResponse({ posts: [fullPost] }))

      await fetchPostBySlug('a b/c')

      expect(String(fetchSpy.mock.calls[0][0])).toContain('/slug/a%20b%2Fc/')
    })

    it('returns an empty body when Ghost withholds it', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse({ posts: [{ ...fullPost, access: false, visibility: 'paid', html: null }] })
      )

      await expect(fetchPostBySlug('gated')).resolves.toMatchObject({
        html: '',
        access: false,
        visibility: 'paid',
      })
    })

    it('returns null for unknown slugs', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse({ errors: [{ type: 'NotFoundError' }] }, 404)
      )

      await expect(fetchPostBySlug('nope')).resolves.toBeNull()
    })

    it('returns null when no Content API key is configured', async () => {
      setApiKey(null)
      const fetchSpy = vi.spyOn(globalThis, 'fetch')

      await expect(fetchPostBySlug('anything')).resolves.toBeNull()
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('throws on server errors', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ errors: [] }, 500))

      await expect(fetchPostBySlug('boom')).rejects.toBeInstanceOf(GhostContentError)
    })

    it('throws on 429 brute-force throttling', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ errors: [] }, 429))

      await expect(fetchPostBySlug('boom')).rejects.toMatchObject({ status: 429 })
    })
  })

  describe('formatPublishedDate', () => {
    it('formats ISO dates', () => {
      // Midday UTC so the assertion holds regardless of the runner's timezone.
      expect(formatPublishedDate('2026-02-26T12:00:00.000Z')).toBe('Feb 26, 2026')
    })

    it('returns an empty string for missing or unparsable dates', () => {
      expect(formatPublishedDate('')).toBe('')
      expect(formatPublishedDate('not-a-date')).toBe('')
    })
  })
})
