import { describe, expect, test, vi } from 'vitest'
import {
  createSocialPostsCache,
  fetchYouTubePosts,
  loadSocialPosts,
  normalizeInstagramPosts,
  normalizeTikTokPosts,
  normalizeYouTubePosts,
  parseYouTubeFeed,
  tidyCaption,
  uploadsPlaylistId,
} from '../server/socialFeeds.mjs'

describe('uploadsPlaylistId', () => {
  test('rewrites a UC channel id to its UU uploads playlist', () => {
    expect(uploadsPlaylistId('UCaDbdaRYUr6-5aExHdnwa7Q')).toBe('UUaDbdaRYUr6-5aExHdnwa7Q')
  })

  test('returns empty for anything that is not a channel id', () => {
    expect(uploadsPlaylistId('@catsky_club')).toBe('')
    expect(uploadsPlaylistId('')).toBe('')
    expect(uploadsPlaylistId(undefined)).toBe('')
  })
})

describe('tidyCaption', () => {
  test('collapses whitespace', () => {
    expect(tidyCaption('  new   track\n\nout now  ')).toBe('new track out now')
  })

  test('truncates with an ellipsis past the limit', () => {
    const result = tidyCaption('a'.repeat(200))
    expect(result).toHaveLength(140)
    expect(result.endsWith('…')).toBe(true)
  })

  test('leaves a short caption untouched', () => {
    expect(tidyCaption('short')).toBe('short')
  })

  test('tolerates a missing caption', () => {
    expect(tidyCaption(undefined)).toBe('')
  })
})

describe('normalizeInstagramPosts', () => {
  test('maps media to the shared post shape and prefers the video poster frame', () => {
    const posts = normalizeInstagramPosts({
      data: [
        {
          id: '1',
          caption: 'a  video',
          media_type: 'VIDEO',
          media_url: 'https://cdn/video.mp4',
          thumbnail_url: 'https://cdn/poster.jpg',
          permalink: 'https://instagram.com/p/1',
          timestamp: '2026-09-01T10:00:00+0000',
        },
      ],
    })

    expect(posts).toEqual([
      {
        platform: 'instagram',
        id: '1',
        url: 'https://instagram.com/p/1',
        // thumbnail_url wins: media_url on a VIDEO is the mp4, which cannot render in an <img>.
        thumbnailUrl: 'https://cdn/poster.jpg',
        caption: 'a video',
        publishedAt: '2026-09-01T10:00:00.000Z',
      },
    ])
  })

  test('falls back to media_url for images', () => {
    const posts = normalizeInstagramPosts({
      data: [{ id: '2', media_url: 'https://cdn/photo.jpg', permalink: 'https://instagram.com/p/2' }],
    })
    expect(posts[0].thumbnailUrl).toBe('https://cdn/photo.jpg')
  })

  test('drops entries with no permalink and honours the limit', () => {
    const posts = normalizeInstagramPosts(
      { data: [{ id: '1' }, { id: '2', permalink: 'a' }, { id: '3', permalink: 'b' }] },
      1
    )
    expect(posts).toHaveLength(1)
    expect(posts[0].url).toBe('a')
  })

  test('returns an empty list for a malformed payload', () => {
    expect(normalizeInstagramPosts(null)).toEqual([])
    expect(normalizeInstagramPosts({})).toEqual([])
  })
})

describe('normalizeTikTokPosts', () => {
  test('converts unix seconds to an ISO timestamp', () => {
    const posts = normalizeTikTokPosts({
      data: {
        videos: [
          {
            id: '7',
            title: 'clip',
            cover_image_url: 'https://cdn/cover.jpg',
            share_url: 'https://tiktok.com/@catsky.club/video/7',
            create_time: 1756000000,
          },
        ],
      },
    })

    expect(posts[0].publishedAt).toBe(new Date(1756000000 * 1000).toISOString())
    expect(posts[0].platform).toBe('tiktok')
  })

  test('returns an empty list when the videos array is absent', () => {
    expect(normalizeTikTokPosts({ data: {} })).toEqual([])
  })
})

describe('normalizeYouTubePosts', () => {
  test('reads the video id out of a playlistItems snippet', () => {
    const posts = normalizeYouTubePosts({
      items: [
        {
          snippet: {
            title: 'sugar daddy (official music video)',
            publishedAt: '2026-08-01T22:00:06Z',
            resourceId: { videoId: 'xRxUcF_wFSQ' },
            thumbnails: { medium: { url: 'https://i.ytimg.com/vi/xRxUcF_wFSQ/mqdefault.jpg' } },
          },
        },
      ],
    })

    expect(posts[0].url).toBe('https://www.youtube.com/watch?v=xRxUcF_wFSQ')
    expect(posts[0].thumbnailUrl).toContain('mqdefault.jpg')
  })

  test('skips items with no resolvable video id', () => {
    expect(normalizeYouTubePosts({ items: [{ snippet: {} }] })).toEqual([])
  })
})

describe('parseYouTubeFeed', () => {
  const feed = `<?xml version="1.0"?><feed>
    <entry>
      <yt:videoId>xRxUcF_wFSQ</yt:videoId>
      <title>Catsky - sugar daddy &amp; friends</title>
      <published>2026-08-01T22:00:06+00:00</published>
      <media:thumbnail url="https://i.ytimg.com/vi/xRxUcF_wFSQ/hqdefault.jpg" width="480"/>
    </entry>
    <entry>
      <yt:videoId>zmcur3gtpYg</yt:videoId>
      <title>teaser</title>
      <published>2026-07-20T02:59:40+00:00</published>
    </entry>
  </feed>`

  test('extracts entries and decodes XML entities in the title', () => {
    const posts = parseYouTubeFeed(feed)
    expect(posts).toHaveLength(2)
    expect(posts[0].caption).toBe('Catsky - sugar daddy & friends')
    expect(posts[0].url).toBe('https://www.youtube.com/watch?v=xRxUcF_wFSQ')
  })

  test('synthesises a thumbnail when the feed omits one', () => {
    const posts = parseYouTubeFeed(feed)
    expect(posts[1].thumbnailUrl).toBe('https://i.ytimg.com/vi/zmcur3gtpYg/mqdefault.jpg')
  })

  test('respects the limit and tolerates junk input', () => {
    expect(parseYouTubeFeed(feed, 1)).toHaveLength(1)
    expect(parseYouTubeFeed('')).toEqual([])
    expect(parseYouTubeFeed(null)).toEqual([])
  })
})

describe('fetchYouTubePosts', () => {
  test('uses the cheap playlistItems endpoint when an API key is present', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ items: [] })
    await fetchYouTubePosts({ apiKey: 'key', channelId: 'UCaDbdaRYUr6-5aExHdnwa7Q', fetchImpl })

    const url = fetchImpl.mock.calls[0][0]
    expect(url).toContain('/youtube/v3/playlistItems')
    expect(url).toContain('playlistId=UUaDbdaRYUr6-5aExHdnwa7Q')
    // search.list would cost 100 quota units for the same answer.
    expect(url).not.toContain('/search')
  })

  test('falls back to the public Atom feed with no API key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue('<feed></feed>')
    await fetchYouTubePosts({ apiKey: '', channelId: 'UCaDbdaRYUr6-5aExHdnwa7Q', fetchImpl })

    expect(fetchImpl.mock.calls[0][0]).toContain('youtube.com/feeds/videos.xml')
  })

  test('rejects when no channel is configured', async () => {
    await expect(fetchYouTubePosts({ apiKey: 'key', channelId: '' })).rejects.toThrow(
      /YOUTUBE_CHANNEL_ID/
    )
  })
})

describe('loadSocialPosts', () => {
  const config = {
    instagramAccessToken: 'ig',
    tiktokAccessToken: 'tt',
    youtubeApiKey: 'yt',
    youtubeChannelId: 'UCaDbdaRYUr6-5aExHdnwa7Q',
  }

  test('isolates a failing platform from the others', async () => {
    const result = await loadSocialPosts({
      config,
      fetchers: {
        instagram: async () => [{ platform: 'instagram', id: '1' }],
        tiktok: async () => {
          throw new Error('token expired')
        },
        youtube: async () => [{ platform: 'youtube', id: '2' }],
      },
    })

    expect(result.posts.instagram).toHaveLength(1)
    expect(result.posts.youtube).toHaveLength(1)
    // The broken platform reports itself without blanking the section.
    expect(result.posts.tiktok).toEqual([])
    expect(result.errors.tiktok).toBe('token expired')
    expect(result.errors.instagram).toBeUndefined()
  })

  test('passes the limit through to every fetcher', async () => {
    const spy = vi.fn().mockResolvedValue([])
    await loadSocialPosts({
      config,
      limit: 5,
      fetchers: { instagram: spy, tiktok: spy, youtube: spy },
    })
    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls.every(([args]) => args.limit === 5)).toBe(true)
  })
})

describe('createSocialPostsCache', () => {
  test('reuses a fresh entry instead of calling upstream again', async () => {
    const now = 1000
    const cache = createSocialPostsCache({ ttlMs: 500, now: () => now })
    const load = vi.fn().mockResolvedValue({ posts: {}, errors: {} })

    const first = await cache.get(load)
    const second = await cache.get(load)

    expect(load).toHaveBeenCalledTimes(1)
    expect(first.cache).toBe('miss')
    expect(second.cache).toBe('hit')
  })

  test('refetches once the TTL has passed', async () => {
    let now = 1000
    const cache = createSocialPostsCache({ ttlMs: 500, now: () => now })
    const load = vi.fn().mockResolvedValue({ posts: {}, errors: {} })

    await cache.get(load)
    now += 600
    await cache.get(load)

    expect(load).toHaveBeenCalledTimes(2)
  })

  test('serves the last good value when a refresh fails', async () => {
    let now = 1000
    const cache = createSocialPostsCache({ ttlMs: 500, staleMaxMs: 10_000, now: () => now })
    const load = vi
      .fn()
      .mockResolvedValueOnce({ posts: { instagram: [{ id: 'cached' }] }, errors: {} })
      .mockRejectedValue(new Error('instagram token expired'))

    await cache.get(load)
    now += 600
    const stale = await cache.get<{ posts: { instagram: { id: string }[] } }>(load)

    // An expired token degrades to slightly old content, not an empty section.
    expect(stale.cache).toBe('stale')
    expect(stale.posts.instagram[0].id).toBe('cached')
  })

  test('propagates the error once the stale window has also passed', async () => {
    let now = 1000
    const cache = createSocialPostsCache({ ttlMs: 500, staleMaxMs: 1000, now: () => now })
    const load = vi
      .fn()
      .mockResolvedValueOnce({ posts: {}, errors: {} })
      .mockRejectedValue(new Error('still broken'))

    await cache.get(load)
    now += 5000

    await expect(cache.get(load)).rejects.toThrow('still broken')
  })

  test('collapses concurrent misses into a single upstream call', async () => {
    const cache = createSocialPostsCache({ ttlMs: 500 })
    const load = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ posts: {}, errors: {} }), 10))
    )

    await Promise.all([cache.get(load), cache.get(load), cache.get(load)])

    expect(load).toHaveBeenCalledTimes(1)
  })
})
