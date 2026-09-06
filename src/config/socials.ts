import { type PlatformId } from '../components/graphics'

/** Platforms the landing page shows a post feed for. Ordered as they render. */
export const SOCIAL_FEED_PLATFORMS = ['instagram', 'tiktok', 'youtube'] as const
export type SocialPlatform = (typeof SOCIAL_FEED_PLATFORMS)[number]

export interface SocialProfile {
  platform: SocialPlatform
  handle: string
  profileUrl: string
  /** Glyph to draw; matches the platform in every current case but stays explicit. */
  glyph: PlatformId
}

/**
 * Verified profiles, cross-checked against the artist's own Linktree and SubmitHub smart link
 * rather than guessed from the domain name.
 *
 * Note the SoundCloud split: the catalogue in src/config/tracks.ts embeds from
 * `soundcloud.com/catsky_club` while the smart link points listeners at
 * `soundcloud.com/catsky_music`. Both resolve, so neither is touched here.
 */
export const SOCIAL_PROFILES: SocialProfile[] = [
  {
    platform: 'instagram',
    handle: '@catsky.club',
    profileUrl: 'https://www.instagram.com/catsky.club/',
    glyph: 'instagram',
  },
  {
    platform: 'tiktok',
    handle: '@catsky.club',
    profileUrl: 'https://www.tiktok.com/@catsky.club',
    glyph: 'tiktok',
  },
  {
    platform: 'youtube',
    handle: '@catsky_club',
    profileUrl: 'https://www.youtube.com/@catsky_club',
    glyph: 'youtube',
  },
]

/** Streaming homes, shown alongside the social profiles. */
export const LISTEN_PROFILES: { label: string; url: string; glyph: PlatformId }[] = [
  {
    label: 'spotify',
    url: 'https://open.spotify.com/artist/2u0XZJEmVoefq3eVIY9ytM',
    glyph: 'spotify',
  },
  {
    label: 'apple music',
    url: 'https://music.apple.com/us/artist/catsky/1654856385',
    glyph: 'appleMusic',
  },
  {
    label: 'soundcloud',
    url: 'https://soundcloud.com/catsky_music',
    glyph: 'soundcloud',
  },
  {
    label: 'more platforms',
    url: 'https://www.submithub.com/link/listen-to-catsky',
    glyph: 'more',
  },
]

export function getSocialProfile(platform: SocialPlatform): SocialProfile | undefined {
  return SOCIAL_PROFILES.find((profile) => profile.platform === platform)
}
