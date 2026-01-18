/**
 * Audio helper utilities for different hosting solutions
 */

export type AudioSourceType = 'direct' | 'soundcloud'

export interface DirectAudioSource {
  type: 'direct'
  url: string // Direct URL to MP3 file (e.g., from Cloudflare R2, Backblaze B2, etc.)
}

export interface SoundCloudAudioSource {
  type: 'soundcloud'
  trackId?: string // SoundCloud track ID (for individual tracks)
  trackUrl?: string // Full SoundCloud track URL (alternative to trackId)
  setId?: string // SoundCloud set/playlist ID or URL (for playlists)
  secretToken?: string // Optional: for private tracks/sets with secret links
}

export type AudioSource = DirectAudioSource | SoundCloudAudioSource

/**
 * Get the streaming URL for a SoundCloud track
 * Note: This requires a SoundCloud API client_id for actual streaming
 * For now, this returns the embed URL which can be used with SoundCloud's widget
 */
export function getSoundCloudStreamUrl(trackId: string, secretToken?: string): string {
  const baseUrl = `https://api.soundcloud.com/tracks/${trackId}`
  const params = new URLSearchParams()
  if (secretToken) {
    params.append('secret_token', secretToken)
  }
  return `${baseUrl}${params.toString() ? '?' + params.toString() : ''}`
}

/**
 * Get SoundCloud embed URL for iframe widget
 * Supports both individual tracks and sets/playlists
 * Can use trackId, trackUrl (full URL), or setId
 */
export function getSoundCloudEmbedUrl(
  trackId?: string,
  trackUrl?: string,
  setId?: string, 
  secretToken?: string
): string {
  let resourceUrl: string
  
  if (setId) {
    // Handle set/playlist
    // setId can be a full URL like "catsky_club/sets/soft-and-sound" or just the ID
    if (setId.includes('soundcloud.com') || setId.includes('/')) {
      // Full URL provided, use as-is
      resourceUrl = setId.startsWith('http') ? setId : `https://soundcloud.com/${setId}`
    } else {
      // Just the ID, construct URL
      resourceUrl = `https://soundcloud.com/sets/${setId}`
    }
    
    // Add secret token if provided
    if (secretToken) {
      const separator = resourceUrl.includes('?') ? '&' : '?'
      resourceUrl = `${resourceUrl}${separator}secret_token=${secretToken}`
    }
  } else if (trackUrl) {
    // Handle full track URL (e.g., from private share link)
    // SoundCloud embed widget needs the URL in a specific format
    // For private tracks with secret tokens in path (e.g., /s-XXXXX), we need to extract
    // the base track URL and pass the secret token as a query parameter
    if (trackUrl.includes('/s-')) {
      // URL contains secret token in path (e.g., soundcloud.com/user/track/s-XXXXX)
      // Extract base URL and secret token
      const urlParts = trackUrl.split('/s-')
      if (urlParts.length === 2) {
        const baseUrl = urlParts[0].split('?')[0] // Remove any existing query params
        const token = 's-' + urlParts[1].split('?')[0] // Extract token, remove query params
        // Use base URL and add secret_token as query parameter (SoundCloud embed format)
        resourceUrl = `${baseUrl}?secret_token=${token}`
      } else {
        // Fallback: use URL as-is but clean query params
        resourceUrl = trackUrl.split('?')[0]
      }
    } else if (secretToken) {
      // Add secret token to URL as query parameter
      resourceUrl = `${trackUrl}${trackUrl.includes('?') ? '&' : '?'}secret_token=${secretToken}`
    } else {
      resourceUrl = trackUrl
    }
  } else if (trackId) {
    // Handle individual track by ID
    if (secretToken) {
      resourceUrl = `https://api.soundcloud.com/tracks/${trackId}?secret_token=${secretToken}`
    } else {
      resourceUrl = `https://soundcloud.com/tracks/${trackId}`
    }
  } else {
    throw new Error('Either trackId, trackUrl, or setId must be provided')
  }
  
  const params = new URLSearchParams({
    url: resourceUrl,
    color: '#ffffff',
    auto_play: 'false',
    show_comments: 'false',
    show_user: 'false',
    show_reposts: 'false',
    visual: 'false',
  })
  
  return `https://w.soundcloud.com/player/?${params.toString()}`
}

/**
 * Check if we should use SoundCloud widget or direct audio element
 */
export function shouldUseSoundCloudWidget(source: AudioSource): boolean {
  return source.type === 'soundcloud'
}

/**
 * Get direct audio URL (for HTML5 audio element)
 * Returns null if source is SoundCloud (requires widget)
 */
export function getDirectAudioUrl(source: AudioSource): string | null {
  if (source.type === 'direct') {
    return source.url
  }
  return null
}
