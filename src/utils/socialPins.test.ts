import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPinnedThumbnail } from './socialPins'

describe('fetchPinnedThumbnail', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the thumbnail from a successful response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          url: 'https://www.youtube.com/watch?v=abc123',
          thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
          title: 'a video',
        }),
        { status: 200 }
      )
    )

    await expect(fetchPinnedThumbnail('https://www.youtube.com/watch?v=abc123')).resolves.toBe(
      'https://i.ytimg.com/vi/abc123/hqdefault.jpg'
    )
  })

  it('returns an empty string for a non-JSON response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not json', { status: 200 }))

    await expect(fetchPinnedThumbnail('https://www.tiktok.com/@catsky.club/video/1')).resolves.toBe('')
  })

  it('returns an empty string when the network request rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(fetchPinnedThumbnail('https://www.tiktok.com/@catsky.club/video/1')).resolves.toBe('')
  })

  it('returns an empty string when the request is aborted', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'))
    const controller = new AbortController()
    controller.abort()

    await expect(
      fetchPinnedThumbnail('https://www.youtube.com/watch?v=abc123', controller.signal)
    ).resolves.toBe('')
  })
})
