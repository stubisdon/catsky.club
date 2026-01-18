import { type AudioSource } from '../utils/audioHelpers'

export interface Track {
  id: string
  title: string
  audioSource: AudioSource
  version?: string
  date?: string
}

/**
 * SoundCloud tracks configuration
 * 
 * To add tracks from your SoundCloud sets:
 * 1. Go to each track on SoundCloud
 * 2. Click "Share" and copy the private share link
 * 3. Use the URL (before the ?) as trackUrl
 * 
 * Example:
 * Private share link: https://soundcloud.com/catsky_club/track-name/s-XXXXX?in=...
 * Use: https://soundcloud.com/catsky_club/track-name/s-XXXXX
 */
export const TRACKS: Track[] = [
  // Track 1: Vision from "Soft and Sound" set
  {
    id: '1',
    title: 'Vision',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/vision-v1/s-L5q3Tw7Jyvp',
    },
    version: 'v1',
    date: '2024-01-15'
  },
  // Track 2: Overpriced Airbnb from "Soft and Sound" set
  {
    id: '2',
    title: 'Overpriced Airbnb',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/overpriced-airbnb/s-u9k6bZFCZSI',
    },
    version: 'v1',
    date: '2024-01-10'
  },
  // Track 3: Nova from "Soft and Sound" set
  {
    id: '3',
    title: 'Nova',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/nova-v1/s-yckE6Pvc2jO',
    },
    version: 'v1',
    date: '2024-01-05'
  },
]
