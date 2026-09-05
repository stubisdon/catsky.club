import { type AudioSource } from '../utils/audioHelpers'

export type TrackAccessTier = 'public' | 'free_member' | 'paid_5' | 'paid_20'

/**
 * Where a released track can be streamed off-site.
 *
 * `more` is the catch-all smart link (Hyperfollow, Linkfire, Songwhick, etc.) behind the
 * "more platforms" glyph. Every field is optional and the UI renders only the ones that are
 * set, so a track with no distribution links yet simply shows its player and nothing else -
 * it never renders a dead icon.
 */
export interface TrackListenLinks {
  spotify?: string
  appleMusic?: string
  more?: string
}

export interface Track {
  id: string
  title: string
  audioSource: AudioSource
  accessTier: TrackAccessTier
  availableFrom?: string
  lockedLabel?: string
  announcedReleaseDate?: string
  version?: string
  date?: string
  /** Public streaming links. See TrackListenLinks. */
  listenLinks?: TrackListenLinks
}

/**
 * Artist-level smart link behind the "more platforms" glyph. SubmitHub fans this out to
 * Deezer, Tidal, Amazon and the rest, so adding a new store never means editing this file.
 */
const SMART_LINK = 'https://www.submithub.com/link/listen-to-catsky'

/**
 * Listen catalog ordering and access tiers.
 */
export const TRACKS: Track[] = [
  {
    id: '1',
    title: 'Intro',
    accessTier: 'public',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/intro',
    },
    listenLinks: {
      spotify: 'https://open.spotify.com/track/5I7H7vSygxqSw8wqK20M8N',
      appleMusic: 'https://music.apple.com/us/album/intro-single/1811034050',
      more: SMART_LINK,
    },
  },
  {
    id: '2',
    title: 'Baby Mama',
    accessTier: 'public',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/baby-mama-2',
    },
    listenLinks: {
      spotify: 'https://open.spotify.com/track/2LhXgSv5aClmMaYb9QGJFp',
      appleMusic: 'https://music.apple.com/us/album/baby-mama-single/1873620524',
      more: SMART_LINK,
    },
  },
  {
    id: '3',
    title: 'Plank Song',
    accessTier: 'public',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/catsky-plank-song/s-I3zejyelPY1',
    },
    listenLinks: {
      spotify: 'https://open.spotify.com/track/5jQHa5saLGL53v1DWuLUYC',
      appleMusic: 'https://music.apple.com/us/album/plank-song-single/1873620445',
      more: SMART_LINK,
    },
  },
  {
    id: '4',
    title: 'Motherless Child',
    accessTier: 'free_member',
    availableFrom: '2026-04-10',
    announcedReleaseDate: '2026-04-10',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/catsky-motherless-child/s-VKabkUnt9Jf',
    },
    listenLinks: {
      spotify: 'https://open.spotify.com/track/4Z8iJnGdnSpwINB4RHLbvF',
      appleMusic: 'https://music.apple.com/us/album/motherless-child-single/1874074633',
      more: SMART_LINK,
    },
  },
  {
    id: '5',
    title: 'Sugar Daddy',
    accessTier: 'paid_5',
    lockedLabel: 'coming May 8, 2026',
    announcedReleaseDate: '2026-05-08',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/catsky-sugar-daddy/s-aX8EIUCGf9C',
    },
    listenLinks: {
      spotify: 'https://open.spotify.com/track/5CwmQasgAAfAOfLzMBhDMG',
      appleMusic: 'https://music.apple.com/us/album/sugar-daddy-single/1873584554',
      more: SMART_LINK,
    },
  },
  {
    id: '6',
    title: 'Overpriced Airbnb',
    accessTier: 'paid_5',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/overpriced-airbnb/s-u9k6bZFCZSI',
    },
  },
  {
    id: '7',
    title: 'Nova',
    accessTier: 'paid_5',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/nova-v1/s-yckE6Pvc2jO',
    },
  },
  {
    id: '8',
    title: 'Vision',
    accessTier: 'paid_5',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/vision-v1/s-L5q3Tw7Jyvp',
    },
  },
]
