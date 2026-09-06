import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createOembedCache, isAllowedOembedUrl, resolveOembed } from '../server/socialOembed.mjs'

describe('isAllowedOembedUrl', () => {
  test('allows the real social hosts the config can point at', () => {
    expect(isAllowedOembedUrl('https://www.instagram.com/p/abc/')).toBe(true)
    expect(isAllowedOembedUrl('https://www.tiktok.com/@catsky.club/video/1')).toBe(true)
    expect(isAllowedOembedUrl('https://www.youtube.com/watch?v=abc123')).toBe(true)
    expect(isAllowedOembedUrl('https://youtu.be/abc123')).toBe(true)
  })

  test('rejects a link-local/metadata host', () => {
    expect(isAllowedOembedUrl('http://169.254.169.254/latest/meta-data/')).toBe(false)
  })

  test('rejects an arbitrary third-party host', () => {
    expect(isAllowedOembedUrl('https://evil.example.com/x')).toBe(false)
  })

  test('rejects malformed input, missing input, and non-http(s) schemes', () => {
    expect(isAllowedOembedUrl(undefined)).toBe(false)
    expect(isAllowedOembedUrl('')).toBe(false)
    expect(isAllowedOembedUrl('not a url')).toBe(false)
    expect(isAllowedOembedUrl('file:///etc/passwd')).toBe(false)
    // A hostile host cannot sneak past a naive substring check by hiding behind the real one.
    expect(isAllowedOembedUrl('https://www.tiktok.com.evil.example.com/x')).toBe(false)
  })
})

describe('resolveOembed', () => {
  test('never calls fetchImpl for a disallowed host', async () => {
    const fetchImpl = vi.fn()
    const result = await resolveOembed('https://evil.example.com/x', { fetchImpl })

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(result).toEqual({ url: 'https://evil.example.com/x', thumbnailUrl: '', title: '' })
  })

  test('never calls fetchImpl for a link-local/metadata URL', async () => {
    const fetchImpl = vi.fn()
    const result = await resolveOembed('http://169.254.169.254/latest/meta-data/', { fetchImpl })

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(result.thumbnailUrl).toBe('')
  })

  test('returns empty for Instagram: there is no public oEmbed endpoint for it', async () => {
    const fetchImpl = vi.fn()
    const result = await resolveOembed('https://www.instagram.com/p/abc/', { fetchImpl })

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(result).toEqual({ url: 'https://www.instagram.com/p/abc/', thumbnailUrl: '', title: '' })
  })

  test('resolves a valid YouTube URL from a stubbed oEmbed response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      thumbnail_url: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
      title: 'a video',
    })

    const result = await resolveOembed('https://www.youtube.com/watch?v=abc123', { fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0][0]).toContain('https://www.youtube.com/oembed?url=')
    expect(result).toEqual({
      url: 'https://www.youtube.com/watch?v=abc123',
      thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
      title: 'a video',
    })
  })

  test('resolves a valid TikTok URL against the tiktok oEmbed endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      thumbnail_url: 'https://p16.tiktokcdn.com/cover.jpg',
      title: 'a clip',
    })

    const result = await resolveOembed('https://www.tiktok.com/@catsky.club/video/1', { fetchImpl })

    expect(fetchImpl.mock.calls[0][0]).toContain('https://www.tiktok.com/oembed?url=')
    expect(result.thumbnailUrl).toBe('https://p16.tiktokcdn.com/cover.jpg')
  })

  test('returns an empty thumbnail, not a rejection, when the upstream lookup fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('upstream is down'))

    const result = await resolveOembed('https://www.youtube.com/watch?v=abc123', { fetchImpl })

    expect(result).toEqual({
      url: 'https://www.youtube.com/watch?v=abc123',
      thumbnailUrl: '',
      title: '',
    })
  })

  test('with a cache, a second lookup for the same URL is served without a second fetch', async () => {
    const cache = createOembedCache()
    const fetchImpl = vi.fn().mockResolvedValue({ thumbnail_url: 'https://cdn/thumb.jpg', title: 't' })

    const first = await resolveOembed('https://www.youtube.com/watch?v=abc123', { fetchImpl, cache })
    const second = await resolveOembed('https://www.youtube.com/watch?v=abc123', { fetchImpl, cache })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(first.thumbnailUrl).toBe('https://cdn/thumb.jpg')
    expect(second.thumbnailUrl).toBe('https://cdn/thumb.jpg')
  })

  test('with a cache, a failed refresh serves the previously cached thumbnail', async () => {
    let now = 1000
    const cache = createOembedCache({ ttlMs: 500, now: () => now })
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ thumbnail_url: 'https://cdn/cached.jpg', title: 't' })
      .mockRejectedValue(new Error('upstream is down'))

    await resolveOembed('https://www.youtube.com/watch?v=abc123', { fetchImpl, cache })
    now += 600 // past the TTL, forcing a refresh attempt that will fail
    const stale = await resolveOembed('https://www.youtube.com/watch?v=abc123', { fetchImpl, cache })

    expect(stale.thumbnailUrl).toBe('https://cdn/cached.jpg')
  })
})

describe('createOembedCache', () => {
  test('keys entries independently by URL', async () => {
    const cache = createOembedCache()
    const loadA = vi.fn().mockResolvedValue({ thumbnailUrl: 'a', title: '' })
    const loadB = vi.fn().mockResolvedValue({ thumbnailUrl: 'b', title: '' })

    const a = await cache.get<{ thumbnailUrl: string; title: string }>('https://x/a', loadA)
    const b = await cache.get<{ thumbnailUrl: string; title: string }>('https://x/b', loadB)

    expect(a.thumbnailUrl).toBe('a')
    expect(b.thumbnailUrl).toBe('b')
    expect(loadA).toHaveBeenCalledTimes(1)
    expect(loadB).toHaveBeenCalledTimes(1)
  })

  test('collapses concurrent misses for the same key into a single load', async () => {
    const cache = createOembedCache()
    const load = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ thumbnailUrl: 'x', title: '' }), 10))
    )

    await Promise.all([cache.get('https://x/a', load), cache.get('https://x/a', load), cache.get('https://x/a', load)])

    expect(load).toHaveBeenCalledTimes(1)
  })

  /*
    The cache key arrives on the query string, and any youtube.com URL clears the allowlist, so
    a caller can mint unlimited distinct keys. Without a ceiling the map grows until the process
    dies. These two tests are the guard on that.
  */
  test('evicts the oldest entries once the ceiling is reached', async () => {
    const cache = createOembedCache({ maxEntries: 3 })
    const load = (value: string) => vi.fn().mockResolvedValue({ thumbnailUrl: value, title: '' })

    for (const key of ['a', 'b', 'c', 'd']) {
      await cache.get(`https://x/${key}`, load(key))
    }

    // 'a' was pushed out by 'd', so asking for it again has to go back upstream.
    const reloadA = load('a')
    const again = await cache.get<{ thumbnailUrl: string; title: string }>('https://x/a', reloadA)
    expect(reloadA).toHaveBeenCalledTimes(1)
    expect(again.cache).toBe('miss')

    // 'd' is still the newest survivor and must not have been evicted.
    const reloadD = load('d')
    const d = await cache.get<{ thumbnailUrl: string; title: string }>('https://x/d', reloadD)
    expect(reloadD).not.toHaveBeenCalled()
    expect(d.cache).toBe('hit')
  })

  test('never grows past the ceiling no matter how many distinct keys arrive', async () => {
    const cache = createOembedCache({ maxEntries: 5 })
    const hits: string[] = []

    for (let i = 0; i < 100; i += 1) {
      await cache.get(`https://x/${i}`, vi.fn().mockResolvedValue({ thumbnailUrl: String(i), title: '' }))
    }

    // Only the last `maxEntries` keys may still be resident.
    for (let i = 0; i < 100; i += 1) {
      const load = vi.fn().mockResolvedValue({ thumbnailUrl: String(i), title: '' })
      const result = await cache.get<{ thumbnailUrl: string; title: string }>(`https://x/${i}`, load)
      if (result.cache === 'hit') hits.push(String(i))
    }

    expect(hits.length).toBeLessThanOrEqual(5)
  })
})

/* -------------------------------------------------------------------------- */
/* Route wiring: the parts of /api/social-oembed that live in server.js       */
/* -------------------------------------------------------------------------- */

describe('/api/social-oembed route', () => {
  let appProcess: ChildProcessWithoutNullStreams
  let appBaseUrl = ''

  beforeAll(async () => {
    const appPort = 3054
    appBaseUrl = `http://127.0.0.1:${appPort}`
    appProcess = spawn('node', ['server.js'], {
      env: { ...process.env, PORT: String(appPort) },
      stdio: 'pipe',
    })

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for server startup')), 15_000)
      appProcess.stdout.on('data', (chunk) => {
        if (String(chunk).includes('Server running on')) {
          clearTimeout(timeout)
          resolve()
        }
      })
      appProcess.on('exit', (code) => {
        clearTimeout(timeout)
        reject(new Error(`server.js exited during startup with code ${code}`))
      })
    })
  }, 20_000)

  afterAll(() => {
    if (appProcess && !appProcess.killed) appProcess.kill('SIGTERM')
  })

  // These three cases are all rejected by the allowlist before any outbound fetch happens, so
  // they are safe to exercise against the real, unstubbed route.
  test('400s when url is missing', async () => {
    const response = await fetch(`${appBaseUrl}/api/social-oembed`)
    expect(response.status).toBe(400)
  })

  test('400s for a link-local/metadata host', async () => {
    const response = await fetch(
      `${appBaseUrl}/api/social-oembed?url=${encodeURIComponent('http://169.254.169.254/latest/meta-data/')}`
    )
    expect(response.status).toBe(400)
  })

  test('400s for an arbitrary third-party host', async () => {
    const response = await fetch(
      `${appBaseUrl}/api/social-oembed?url=${encodeURIComponent('https://evil.example.com/x')}`
    )
    expect(response.status).toBe(400)
  })
})
