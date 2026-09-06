/**
 * Ghost Content API — posts.
 *
 * Requests are same-origin (`/ghost/...` is proxied to Ghost by nginx in
 * production and by Vite in dev) and always send credentials: the member cookie
 * is what makes Ghost return the full body of a gated post.
 *
 * Gating is never inferred from the payload: every post carries an `access`
 * boolean that is true when the current requester may read the whole thing.
 */
import { getGhostContentApiKey } from './ghostApi'

export interface GhostPostSummary {
  id: string
  slug: string
  title: string
  excerpt: string
  featureImage: string | null
  featureImageAlt: string | null
  publishedAt: string
  readingTime: number | null
  visibility: 'public' | 'members' | 'paid' | 'tiers' | string
  access: boolean
}

export interface GhostPostDetail extends GhostPostSummary {
  html: string
}

/** Thrown for network failures, non-2xx responses and malformed payloads. */
export class GhostContentError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'GhostContentError'
    this.status = status
  }
}

interface RawGhostPost {
  id?: unknown
  slug?: unknown
  title?: unknown
  excerpt?: unknown
  feature_image?: unknown
  feature_image_alt?: unknown
  published_at?: unknown
  reading_time?: unknown
  visibility?: unknown
  access?: unknown
  html?: unknown
}

// Ghost only computes `reading_time` when the response includes `html` (it's
// derived from the body word count). The feed request excludes `html` for
// payload size, so Ghost silently drops `reading_time` too — verified
// against production, where the feed response never carries this field.
// `readingTime` still normalizes to a number on the single-post fetch,
// which does request `html`. Do not add `reading_time` back here.
const FEED_FIELDS = [
  'id',
  'slug',
  'title',
  'excerpt',
  'feature_image',
  'feature_image_alt',
  'published_at',
  'visibility',
  'access',
].join(',')

function toText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toNullableText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeSummary(raw: RawGhostPost): GhostPostSummary {
  return {
    id: toText(raw.id),
    slug: toText(raw.slug),
    title: toText(raw.title),
    excerpt: toText(raw.excerpt),
    featureImage: toNullableText(raw.feature_image),
    featureImageAlt: toNullableText(raw.feature_image_alt),
    publishedAt: toText(raw.published_at),
    readingTime: toNullableNumber(raw.reading_time),
    visibility: typeof raw.visibility === 'string' ? raw.visibility : 'public',
    // Only an explicit false means Ghost withheld the body.
    access: typeof raw.access === 'boolean' ? raw.access : true,
  }
}

/** Maps a Ghost `visibility` value to the label used in gating copy. */
export function requiredLevelLabel(visibility: string): string {
  if (visibility === 'paid' || visibility === 'tiers') return 'paid members'
  return 'members'
}

/** `2026-02-26T…` -> `Feb 26, 2026`. Empty string for missing/unparsable dates. */
export function formatPublishedDate(publishedAt: string): string {
  if (!publishedAt) return ''
  const date = new Date(publishedAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function ghostFetch(url: string): Promise<Response> {
  try {
    return await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
    })
  } catch {
    throw new GhostContentError('Ghost Content API request failed')
  }
}

async function readPosts(response: Response): Promise<RawGhostPost[]> {
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new GhostContentError('Ghost Content API returned malformed JSON', response.status)
  }

  const posts = (payload as { posts?: unknown } | null)?.posts
  if (!Array.isArray(posts)) {
    throw new GhostContentError('Ghost Content API returned an unexpected payload', response.status)
  }

  return posts.filter((post): post is RawGhostPost => typeof post === 'object' && post !== null)
}

/**
 * Newest-first feed. Returns `[]` when no Content API key is configured;
 * throws `GhostContentError` when Ghost itself fails (including the 429 Ghost
 * answers after repeated bad-key requests — the caller shows a retry state and
 * must not retry in a loop).
 */
export async function fetchPosts(): Promise<GhostPostSummary[]> {
  const apiKey = getGhostContentApiKey()
  if (!apiKey) return []

  const url =
    `/ghost/api/content/posts/?key=${encodeURIComponent(apiKey)}` +
    `&limit=all&order=published_at%20desc&fields=${FEED_FIELDS}`

  const response = await ghostFetch(url)
  if (!response.ok) {
    throw new GhostContentError(`Ghost Content API responded with ${response.status}`, response.status)
  }

  return (await readPosts(response)).map(normalizeSummary)
}

/** Full post including `html`. Returns `null` when the slug is unknown. */
export async function fetchPostBySlug(slug: string): Promise<GhostPostDetail | null> {
  const apiKey = getGhostContentApiKey()
  if (!apiKey || !slug) return null

  const url = `/ghost/api/content/posts/slug/${encodeURIComponent(slug)}/?key=${encodeURIComponent(apiKey)}`

  const response = await ghostFetch(url)
  if (response.status === 404) return null
  if (!response.ok) {
    throw new GhostContentError(`Ghost Content API responded with ${response.status}`, response.status)
  }

  const posts = await readPosts(response)
  const raw = posts[0]
  if (!raw) return null

  return {
    ...normalizeSummary(raw),
    // Gated posts return the free preview or an empty string; both are valid.
    html: toText(raw.html),
  }
}
