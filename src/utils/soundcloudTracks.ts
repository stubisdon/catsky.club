/**
 * Utility functions for working with SoundCloud tracks
 */

export interface SoundCloudTrackInfo {
  id: string
  title: string
  trackUrl: string
  secretToken?: string
}

/**
 * Extract track information from a SoundCloud private share link
 * 
 * @param shareLink - Full private share link from SoundCloud (e.g., https://soundcloud.com/user/track/s-XXXXX?in=...)
 * @param title - Track title (optional, will try to extract from URL if not provided)
 * @returns Track information
 */
export function parseSoundCloudShareLink(
  shareLink: string,
  title?: string
): SoundCloudTrackInfo {
  // Remove query parameters
  const url = shareLink.split('?')[0]
  
  // Extract secret token if present (format: /s-XXXXX)
  const secretTokenMatch = url.match(/\/s-([^/]+)$/)
  const secretToken = secretTokenMatch ? `s-${secretTokenMatch[1]}` : undefined
  
  // Extract title from URL if not provided
  // Format: soundcloud.com/user/track-name
  let trackTitle = title
  if (!trackTitle) {
    const urlParts = url.split('/')
    const trackSlug = urlParts[urlParts.length - (secretToken ? 2 : 1)]
    if (trackSlug && trackSlug !== 'soundcloud.com') {
      // Convert slug to title (e.g., "vision-v1" -> "Vision v1")
      trackTitle = trackSlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
  }
  
  return {
    id: '', // Will be set when adding to tracks array
    title: trackTitle || 'Untitled Track',
    trackUrl: url,
    secretToken
  }
}

/**
 * Generate a track ID from index or title
 */
export function generateTrackId(index: number, title?: string): string {
  if (title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
  return String(index + 1)
}

/**
 * Helper to add multiple tracks from SoundCloud share links
 * 
 * Example usage:
 * ```typescript
 * const shareLinks = [
 *   'https://soundcloud.com/catsky_club/vision-v1/s-L5q3Tw7Jyvp?in=...',
 *   'https://soundcloud.com/catsky_club/track-2/s-XXXXX?in=...',
 * ]
 * 
 * const tracks = shareLinks.map((link, index) => {
 *   const info = parseSoundCloudShareLink(link)
 *   return {
 *     id: generateTrackId(index, info.title),
 *     title: info.title,
 *     audioSource: {
 *       type: 'soundcloud' as const,
 *       trackUrl: info.trackUrl
 *     }
 *   }
 * })
 * ```
 */
export function createTracksFromShareLinks(
  shareLinks: string[],
  titles?: string[]
): Array<{
  id: string
  title: string
  audioSource: {
    type: 'soundcloud'
    trackUrl: string
  }
}> {
  return shareLinks.map((link, index) => {
    const info = parseSoundCloudShareLink(link, titles?.[index])
    return {
      id: generateTrackId(index, info.title),
      title: info.title,
      audioSource: {
        type: 'soundcloud' as const,
        trackUrl: info.trackUrl
      }
    }
  })
}
