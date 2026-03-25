import { type AudioSource } from '../utils/audioHelpers'

export type TrackAccessTier = 'public' | 'free_member' | 'paid_5' | 'paid_20'

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
}

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
  },
  {
    id: '2',
    title: 'Baby Mama',
    accessTier: 'public',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/baby-mama-2',
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
  },
  {
    id: '4',
    title: 'Motherless Child',
    accessTier: 'free_member',
    availableFrom: '2026-04-10',
    lockedLabel: 'coming Apr 10, 2026',
    announcedReleaseDate: '2026-04-10',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/catsky-motherless-child/s-VKabkUnt9Jf',
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
