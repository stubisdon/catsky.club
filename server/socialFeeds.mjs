/**
 * Social post fetching for the landing page feed.
 *
 * Kept out of server.js so the normalisers and the cache can be unit tested without booting
 * Express, and so the credential handling for three different APIs lives in one place.
 *
 * Design rules this module follows:
 *   - Tokens never leave the server. The browser only ever sees the normalised post shape.
 *   - Every platform degrades independently. One expired token must not blank the whole
 *     section, so failures are reported per platform and the others still render.
 *   - A failed refresh serves the last good response rather than an empty list. Instagram
 *     long-lived tokens expire every 60 days, and the feed going blank is a worse outcome
 *     than the feed being a few hours stale.
 */

const DEFAULT_LIMIT = 3

/** How long a successful response is reused before we call the APIs again. */
export const CACHE_TTL_MS = 15 * 60 * 1000

/**
 * How long a stale entry may still be served after a refresh fails. A week is deliberately
 * generous: it covers a token expiring over a weekend without the page losing its content.
 */
export const STALE_MAX_MS = 7 * 24 * 60 * 60 * 1000

/**
 * YouTube's uploads playlist for a channel is the channel id with the leading `UC` swapped
 * for `UU`. Listing that playlist costs 1 quota unit; search.list costs 100 for the same
 * answer, which would burn the default daily quota in a few hundred page loads.
 */
export function uploadsPlaylistId(channelId) {
  if (typeof channelId !== 'string' || !channelId.startsWith('UC')) return ''
  return `UU${channelId.slice(2)}`
}

/** Collapse an Instagram/TikTok caption to a single tidy line for the card. */
export function tidyCaption(value, maxLength = 140) {
  if (typeof value !== 'string') return ''
  const collapsed = value.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= maxLength) return collapsed
  return `${collapsed.slice(0, maxLength - 1).trimEnd()}…`
}

function toIsoDate(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

/* -------------------------------------------------------------------------- */
/* Normalisers: raw API payload -> the single shape the client renders.        */
/* -------------------------------------------------------------------------- */

export function normalizeInstagramPosts(payload, limit = DEFAULT_LIMIT) {
  const items = Array.isArray(payload?.data) ? payload.data : []
  return items
    .filter((item) => item && item.permalink)
    .slice(0, limit)
    .map((item) => ({
      platform: 'instagram',
      id: String(item.id ?? item.permalink),
      url: item.permalink,
      // Videos expose a poster frame in thumbnail_url; images only have media_url.
      thumbnailUrl: item.thumbnail_url || item.media_url || '',
      caption: tidyCaption(item.caption),
      publishedAt: toIsoDate(item.timestamp),
    }))
}

export function normalizeTikTokPosts(payload, limit = DEFAULT_LIMIT) {
  const items = Array.isArray(payload?.data?.videos) ? payload.data.videos : []
  return items
    .filter((item) => item && item.share_url)
    .slice(0, limit)
    .map((item) => ({
      platform: 'tiktok',
      id: String(item.id ?? item.share_url),
      url: item.share_url,
      thumbnailUrl: item.cover_image_url || '',
      caption: tidyCaption(item.title),
      // TikTok returns create_time as unix seconds.
      publishedAt: toIsoDate(item.create_time ? item.create_time * 1000 : ''),
    }))
}

export function normalizeYouTubePosts(payload, limit = DEFAULT_LIMIT) {
  const items = Array.isArray(payload?.items) ? payload.items : []
  return items
    .map((item) => {
      const snippet = item?.snippet ?? {}
      const videoId = snippet?.resourceId?.videoId || item?.id?.videoId || ''
      if (!videoId) return null
      const thumbs = snippet.thumbnails ?? {}
      return {
        platform: 'youtube',
        id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: (thumbs.medium || thumbs.high || thumbs.default || {}).url || '',
        caption: tidyCaption(snippet.title),
        publishedAt: toIsoDate(snippet.publishedAt),
      }
    })
    .filter(Boolean)
    .slice(0, limit)
}

/**
 * Parse YouTube's public Atom upload feed.
 *
 * This is the no-credentials fallback: the feed needs no API key and has no quota, so the
 * YouTube column keeps working before anyone sets YOUTUBE_API_KEY. Parsed with regex rather
 * than an XML dependency because the feed's shape is fixed and narrow.
 */
export function parseYouTubeFeed(xml, limit = DEFAULT_LIMIT) {
  if (typeof xml !== 'string') return []
  const entries = xml.split('<entry>').slice(1)
  return entries
    .slice(0, limit)
    .map((entry) => {
      const videoId = /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(entry)?.[1] ?? ''
      if (!videoId) return null
      const title = /<title>([^<]*)<\/title>/.exec(entry)?.[1] ?? ''
      const published = /<published>([^<]+)<\/published>/.exec(entry)?.[1] ?? ''
      const thumb = /<media:thumbnail[^>]*url="([^"]+)"/.exec(entry)?.[1] ?? ''
      return {
        platform: 'youtube',
        id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: thumb || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        caption: tidyCaption(decodeXmlEntities(title)),
        publishedAt: toIsoDate(published),
      }
    })
    .filter(Boolean)
}

function decodeXmlEntities(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

/* -------------------------------------------------------------------------- */
/* Fetchers                                                                    */
/* -------------------------------------------------------------------------- */

async function fetchJson(url, init, timeoutMs = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const text = await response.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }
    if (!response.ok) {
      // Surface the provider's own message; it is what makes an expired token diagnosable.
      const message = json?.error?.message || json?.error_description || `HTTP ${response.status}`
      throw new Error(message)
    }
    return json
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchInstagramPosts({ accessToken, limit = DEFAULT_LIMIT, fetchImpl }) {
  if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is not set')
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp'
  const url = `https://graph.instagram.com/me/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(accessToken)}`
  const payload = fetchImpl ? await fetchImpl(url) : await fetchJson(url)
  return normalizeInstagramPosts(payload, limit)
}

export async function fetchTikTokPosts({ accessToken, limit = DEFAULT_LIMIT, fetchImpl }) {
  if (!accessToken) throw new Error('TIKTOK_ACCESS_TOKEN is not set')
  const url = 'https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,share_url,create_time'
  const init = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ max_count: limit }),
  }
  const payload = fetchImpl ? await fetchImpl(url, init) : await fetchJson(url, init)
  return normalizeTikTokPosts(payload, limit)
}

export async function fetchYouTubePosts({ apiKey, channelId, limit = DEFAULT_LIMIT, fetchImpl }) {
  if (!channelId) throw new Error('YOUTUBE_CHANNEL_ID is not set')

  if (apiKey) {
    const playlistId = uploadsPlaylistId(channelId)
    if (!playlistId) throw new Error(`YOUTUBE_CHANNEL_ID "${channelId}" is not a UC… channel id`)
    const url =
      'https://www.googleapis.com/youtube/v3/playlistItems' +
      `?part=snippet&maxResults=${limit}&playlistId=${playlistId}&key=${encodeURIComponent(apiKey)}`
    const payload = fetchImpl ? await fetchImpl(url) : await fetchJson(url)
    return normalizeYouTubePosts(payload, limit)
  }

  // No key configured: fall back to the public Atom feed so the column still renders.
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`
  if (fetchImpl) return parseYouTubeFeed(await fetchImpl(feedUrl), limit)
  const response = await fetch(feedUrl)
  if (!response.ok) throw new Error(`YouTube feed responded ${response.status}`)
  return parseYouTubeFeed(await response.text(), limit)
}

/* -------------------------------------------------------------------------- */
/* Cache                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Single-entry cache with stale-on-error.
 *
 * `now` is injectable so the TTL behaviour is testable without waiting on wall-clock time.
 */
export function createSocialPostsCache({ ttlMs = CACHE_TTL_MS, staleMaxMs = STALE_MAX_MS, now = Date.now } = {}) {
  let entry = null
  let inFlight = null

  return {
    async get(load) {
      const timestamp = now()

      if (entry && timestamp - entry.storedAt < ttlMs) {
        return { ...entry.value, cache: 'hit' }
      }

      // Collapse concurrent misses into one upstream round trip.
      if (inFlight) return inFlight

      const request = (async () => {
        try {
          const value = await load()
          entry = { value, storedAt: now() }
          return { ...value, cache: 'miss' }
        } catch (error) {
          if (entry && now() - entry.storedAt < staleMaxMs) {
            return { ...entry.value, cache: 'stale' }
          }
          throw error
        }
      })()

      inFlight = request
      // Cleared here rather than in a finally inside the IIFE: a `load` that threw
      // synchronously would run that finally before `inFlight` was ever assigned, leaving a
      // settled promise latched in place and the cache permanently stuck.
      const clear = () => {
        if (inFlight === request) inFlight = null
      }
      request.then(clear, clear)

      return request
    },

    clear() {
      entry = null
      inFlight = null
    },
  }
}

/**
 * Fetch every configured platform in parallel and fold the results into one payload.
 *
 * Uses allSettled rather than all: a rejected platform becomes an entry in `errors` and an
 * empty array in `posts`, and the remaining platforms are unaffected.
 */
export async function loadSocialPosts({ config, limit = DEFAULT_LIMIT, fetchers = {} } = {}) {
  const instagram = fetchers.instagram ?? fetchInstagramPosts
  const tiktok = fetchers.tiktok ?? fetchTikTokPosts
  const youtube = fetchers.youtube ?? fetchYouTubePosts

  const jobs = [
    ['instagram', () => instagram({ accessToken: config.instagramAccessToken, limit })],
    ['tiktok', () => tiktok({ accessToken: config.tiktokAccessToken, limit })],
    ['youtube', () => youtube({ apiKey: config.youtubeApiKey, channelId: config.youtubeChannelId, limit })],
  ]

  const settled = await Promise.allSettled(jobs.map(([, run]) => run()))

  const posts = {}
  const errors = {}
  settled.forEach((result, index) => {
    const platform = jobs[index][0]
    if (result.status === 'fulfilled') {
      posts[platform] = result.value
    } else {
      posts[platform] = []
      errors[platform] = String(result.reason?.message || result.reason)
    }
  })

  return { posts, errors, fetchedAt: new Date().toISOString() }
}
