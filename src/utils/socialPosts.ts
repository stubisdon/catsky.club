import { type SocialPlatform } from '../config/socials'

export interface SocialPost {
  platform: SocialPlatform
  id: string
  url: string
  thumbnailUrl: string
  caption: string
  publishedAt: string
}

export interface SocialPostsResponse {
  posts: Partial<Record<SocialPlatform, SocialPost[]>>
  errors: Partial<Record<SocialPlatform | 'all', string>>
  fetchedAt: string
  cache?: 'hit' | 'miss' | 'stale'
}

const EMPTY: SocialPostsResponse = { posts: {}, errors: {}, fetchedAt: '' }

/**
 * Fetch the latest posts from server.js.
 *
 * The endpoint answers 502 with a well-formed body when everything upstream is down, so the
 * caller gets the same shape either way and never has to branch on transport failure. A
 * platform that failed shows up as an empty array plus an entry in `errors`.
 */
export async function fetchSocialPosts(limit = 3, signal?: AbortSignal): Promise<SocialPostsResponse> {
  try {
    const res = await fetch(`/api/social-posts?limit=${limit}`, { signal })
    const data = (await res.json().catch(() => null)) as SocialPostsResponse | null
    if (!data || typeof data !== 'object') return EMPTY
    return {
      posts: data.posts ?? {},
      errors: data.errors ?? {},
      fetchedAt: data.fetchedAt ?? '',
      cache: data.cache,
    }
  } catch {
    // Includes the abort case; an unmounting component does not need an error state.
    return EMPTY
  }
}

/** "3 days ago" style dateline for post cards. Empty string when the date is missing. */
export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  if (!iso) return ''
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''

  const seconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000))
  const days = Math.floor(seconds / 86400)

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return minutes <= 1 ? 'just now' : `${minutes} min ago`
  }
  if (days < 1) {
    const hours = Math.floor(seconds / 3600)
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) {
    const months = Math.floor(days / 30)
    return months === 1 ? '1 month ago' : `${months} months ago`
  }
  const years = Math.floor(days / 365)
  return years === 1 ? '1 year ago' : `${years} years ago`
}
