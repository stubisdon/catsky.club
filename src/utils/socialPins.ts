interface PinnedThumbnailResponse {
  url: string
  thumbnailUrl: string
  title: string
}

/**
 * Fetch a pinned post's thumbnail from /api/social-oembed.
 *
 * Mirrors fetchSocialPosts in src/utils/socialPosts.ts: never throws, and any transport
 * failure, non-JSON response, or abort resolves to an empty string rather than rejecting, so a
 * caller can await it directly without a try/catch. This helper does not know about
 * src/config/socialPins.ts — a pin with an explicit `thumbnailUrl` override should simply
 * never call it.
 */
export async function fetchPinnedThumbnail(url: string, signal?: AbortSignal): Promise<string> {
  try {
    const res = await fetch(`/api/social-oembed?url=${encodeURIComponent(url)}`, { signal })
    const data = (await res.json().catch(() => null)) as PinnedThumbnailResponse | null
    if (!data || typeof data !== 'object') return ''
    return typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : ''
  } catch {
    // Includes the abort case; an unmounting component does not need an error state.
    return ''
  }
}
