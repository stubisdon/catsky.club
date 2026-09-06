/**
 * Thumbnail resolution for hand-pinned social posts (src/config/socialPins.ts).
 *
 * Kept out of server.js so the URL guard and the cache can be unit tested without booting
 * Express, same reasoning as server/socialFeeds.mjs.
 *
 * Design rules this module follows:
 *   - The URL comes from a request, so it is treated as untrusted even though only our own
 *     config is expected to reach it. Only a fixed allowlist of real social hosts is ever
 *     fetched; everything else is rejected before any network call happens.
 *   - resolveOembed() never throws. A disallowed URL, an unsupported platform, or an upstream
 *     failure all resolve to the same empty-thumbnail shape rather than an error the caller
 *     has to branch on.
 *   - A pinned post's thumbnail effectively never changes, so a successful lookup is cached
 *     for a day and, unlike the live feed's cache, a failed refresh serves the stale value
 *     forever rather than expiring it — there is no token to go bad here, only a transient
 *     upstream hiccup.
 */

/** How long a successful lookup is reused before we call the provider again. */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000

/** A failed refresh keeps serving the last good thumbnail rather than ever dropping it. */
export const STALE_MAX_MS = Infinity

/**
 * Ceiling on how many URLs the cache will remember.
 *
 * Unlike the live feed's cache, this one is keyed by a URL that arrives on the query string.
 * Any youtube.com or tiktok.com URL passes the allowlist, so without a cap a caller could mint
 * unlimited distinct keys and grow the map until the process runs out of memory. The real
 * pinned list is a handful of posts, so anything above this is not a legitimate caller.
 */
export const MAX_CACHE_ENTRIES = 200

const REQUEST_TIMEOUT_MS = 5000

/** oEmbed responses are a few KB of JSON; this is a generous cap against a hostile upstream. */
const MAX_RESPONSE_BYTES = 200_000

/**
 * Real social hosts we will ever fetch on behalf of a pinned post. This is the SSRF guard:
 * without it, a bad config entry (or a future caller that forgets this endpoint is meant only
 * for our own pins) could make the server fetch an arbitrary attacker-supplied URL.
 */
const ALLOWED_HOSTS = new Set([
  'instagram.com',
  'www.instagram.com',
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
])

function parseUrl(value) {
  if (typeof value !== 'string' || !value) return null
  try {
    return new URL(value)
  } catch {
    return null
  }
}

/** Whether a URL is http(s) and points at a real, known social host. */
export function isAllowedOembedUrl(value) {
  const parsed = parseUrl(value)
  if (!parsed) return false
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
  return ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())
}

function detectPlatform(value) {
  const parsed = parseUrl(value)
  if (!parsed) return ''
  const host = parsed.hostname.toLowerCase()
  if (host.endsWith('instagram.com')) return 'instagram'
  if (host.endsWith('tiktok.com')) return 'tiktok'
  if (host.endsWith('youtube.com') || host.endsWith('youtu.be')) return 'youtube'
  return ''
}

function buildOembedEndpoint(platform, url) {
  const encoded = encodeURIComponent(url)
  if (platform === 'tiktok') return `https://www.tiktok.com/oembed?url=${encoded}`
  if (platform === 'youtube') return `https://www.youtube.com/oembed?url=${encoded}&format=json`
  return ''
}

/**
 * Fetch and parse one oEmbed endpoint, with a timeout and a size cap. Throws on any failure;
 * callers decide what "failure" should look like to their own caller.
 */
async function fetchOembedJson(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > MAX_RESPONSE_BYTES) throw new Error('oEmbed response too large')

    const text = await response.text()
    if (text.length > MAX_RESPONSE_BYTES) throw new Error('oEmbed response too large')

    return text ? JSON.parse(text) : null
  } finally {
    clearTimeout(timer)
  }
}

async function fetchOembedPayload(url, platform, { fetchImpl } = {}) {
  const endpoint = buildOembedEndpoint(platform, url)
  if (!endpoint) throw new Error(`No oEmbed endpoint for platform "${platform}"`)

  const payload = fetchImpl ? await fetchImpl(endpoint) : await fetchOembedJson(endpoint)
  return {
    thumbnailUrl: typeof payload?.thumbnail_url === 'string' ? payload.thumbnail_url : '',
    title: typeof payload?.title === 'string' ? payload.title : '',
  }
}

/**
 * Resolve a pinned post's thumbnail.
 *
 * Never throws: a disallowed URL, an unsupported platform (Instagram — see the module comment
 * above), or an upstream failure with nothing cached all resolve to empty strings.
 *
 * `cache` is optional and expected to be a `createOembedCache()` instance keyed by URL; when
 * supplied, a failed refresh serves the last good value instead of falling through to empty.
 * `fetchImpl` is an injection point for tests, in the same spirit as server/socialFeeds.mjs.
 */
export async function resolveOembed(url, { fetchImpl, cache } = {}) {
  const empty = { url, thumbnailUrl: '', title: '' }
  if (!isAllowedOembedUrl(url)) return empty

  const platform = detectPlatform(url)
  if (platform !== 'tiktok' && platform !== 'youtube') {
    // Instagram's oEmbed endpoint is not publicly available without a Facebook app token, so
    // there is nothing to fetch here. The owner should set an explicit `thumbnailUrl` override
    // on Instagram pins in src/config/socialPins.ts instead.
    return empty
  }

  const load = () => fetchOembedPayload(url, platform, { fetchImpl })

  try {
    const value = cache ? await cache.get(url, load) : await load()
    return {
      url,
      thumbnailUrl: typeof value?.thumbnailUrl === 'string' ? value.thumbnailUrl : '',
      title: typeof value?.title === 'string' ? value.title : '',
    }
  } catch {
    return empty
  }
}

/* -------------------------------------------------------------------------- */
/* Cache                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Keyed cache with stale-on-error, in the same spirit as createSocialPostsCache in
 * server/socialFeeds.mjs but with one entry per URL instead of a single shared entry, and a
 * stale window that never expires by default: a pinned post's thumbnail is effectively
 * immutable once resolved once, so there is no reason to ever drop it just because the
 * provider is briefly unreachable.
 *
 * `now` is injectable so TTL behaviour is testable without waiting on wall-clock time.
 */
export function createOembedCache({
  ttlMs = CACHE_TTL_MS,
  staleMaxMs = STALE_MAX_MS,
  maxEntries = MAX_CACHE_ENTRIES,
  now = Date.now,
} = {}) {
  const entries = new Map()
  const inFlight = new Map()

  // A Map iterates in insertion order, so the first key is the oldest one still held. Deleting
  // before re-inserting keeps a refreshed entry from claiming its original, older position.
  const store = (key, value) => {
    entries.delete(key)
    entries.set(key, { value, storedAt: now() })
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next().value
      entries.delete(oldest)
    }
  }

  return {
    async get(key, load) {
      const timestamp = now()
      const entry = entries.get(key)

      if (entry && timestamp - entry.storedAt < ttlMs) {
        return { ...entry.value, cache: 'hit' }
      }

      // Collapse concurrent misses for the same URL into one upstream round trip.
      const pending = inFlight.get(key)
      if (pending) return pending

      const request = (async () => {
        try {
          const value = await load()
          store(key, value)
          return { ...value, cache: 'miss' }
        } catch (error) {
          const stale = entries.get(key)
          if (stale && now() - stale.storedAt < staleMaxMs) {
            return { ...stale.value, cache: 'stale' }
          }
          throw error
        }
      })()

      inFlight.set(key, request)
      // Cleared here rather than in a finally inside the IIFE: a `load` that threw
      // synchronously would run that finally before `inFlight` was ever assigned, leaving a
      // settled promise latched in place and this key permanently stuck.
      const clear = () => {
        if (inFlight.get(key) === request) inFlight.delete(key)
      }
      request.then(clear, clear)

      return request
    },

    clear() {
      entries.clear()
      inFlight.clear()
    },
  }
}
