import { describe, expect, it, vi, afterEach } from 'vitest'
import type { Track } from '../config/tracks'
import { getLockedTrackLabel, hasTrackAccess, isTrackAvailableByDate } from './trackAccess'

describe('trackAccess', () => {
  const baseTrack: Track = {
    id: 'track-1',
    title: 'Test Track',
    accessTier: 'free_member',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/test-track',
    },
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps future-dated tracks locked before their unlock date for paid members too', () => {
    const track: Track = {
      ...baseTrack,
      title: 'Motherless Child',
      availableFrom: '2026-04-10',
      lockedLabel: 'coming Apr 10, 2026',
    }

    expect(isTrackAvailableByDate(track, new Date('2026-04-09T23:59:59.999Z'))).toBe(false)
    expect(hasTrackAccess(track, 'paid_20', new Date('2026-04-09T23:59:59.999Z'))).toBe(false)
  })

  it('unlocks future-dated tracks on their release date using UTC midnight', () => {
    const track: Track = {
      ...baseTrack,
      availableFrom: '2026-04-10',
    }

    expect(isTrackAvailableByDate(track, new Date('2026-04-10T00:00:00.000Z'))).toBe(true)
    expect(hasTrackAccess(track, 'free', new Date('2026-04-10T00:00:00.000Z'))).toBe(true)
  })

  it('falls back to configured locked label before using the default copy', () => {
    expect(getLockedTrackLabel({ ...baseTrack, lockedLabel: 'coming Apr 10, 2026' })).toBe('coming Apr 10, 2026')
    expect(getLockedTrackLabel(baseTrack)).toBe('in progress')
  })

  it('treats invalid release dates as available and warns instead of breaking listen access', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const track: Track = {
      ...baseTrack,
      availableFrom: 'not-a-date',
    }

    expect(isTrackAvailableByDate(track)).toBe(true)
    expect(warnSpy).toHaveBeenCalledOnce()
  })
})
