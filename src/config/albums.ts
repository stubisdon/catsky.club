import { TRACKS, type Track } from './tracks'

export type AlbumState = 'released' | 'upcoming'

export interface Album {
  id: string
  title: string
  /** Printed above the title on the plate, e.g. "five tracks". */
  caption: string
  state: AlbumState
  /** Short line shown under the plate on the landing page. */
  note: string
  /**
   * Track ids from src/config/tracks.ts, in running order. Empty for an album with no
   * revealed tracklist yet.
   */
  trackIds: string[]
}

/**
 * The release shelf on the landing page.
 *
 * Two plates, and the difference between them is the whole call to action:
 *   - the released collection opens its tracklist, so the reward for clicking is the music;
 *   - the upcoming record is held back in tone and opens the email prompt, so the reward for
 *     clicking is being told when it lands.
 *
 * Adding a third album is a matter of appending here; the landing page lays out whatever is
 * in this list.
 */
export const ALBUMS: Album[] = [
  {
    id: 'collection-one',
    title: 'Volume One',
    caption: 'five tracks',
    state: 'released',
    note: 'everything released so far, in one place',
    trackIds: ['1', '2', '3', '4', '5'],
  },
  {
    id: 'collection-two',
    title: 'Volume Two',
    caption: 'in progress',
    state: 'upcoming',
    note: 'unreleased. subscribe to hear it first',
    trackIds: [],
  },
]

/** Resolve an album's track ids to Track records, preserving the album's running order. */
export function getAlbumTracks(album: Album): Track[] {
  return album.trackIds
    .map((id) => TRACKS.find((track) => track.id === id))
    .filter((track): track is Track => Boolean(track))
}

export function getReleasedAlbum(): Album | undefined {
  return ALBUMS.find((album) => album.state === 'released')
}

export function getUpcomingAlbum(): Album | undefined {
  return ALBUMS.find((album) => album.state === 'upcoming')
}
