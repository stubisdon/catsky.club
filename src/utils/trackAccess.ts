import type { Track } from '../config/tracks'
import type { MembershipTier } from './subscription'

function getReleaseInstant(availableFrom: string): number {
  return Date.parse(`${availableFrom}T00:00:00.000Z`)
}

export function isTrackAvailableByDate(track: Track, now = new Date()): boolean {
  if (!track.availableFrom) return true

  const releaseInstant = getReleaseInstant(track.availableFrom)
  if (Number.isNaN(releaseInstant)) {
    console.warn(`Invalid track availableFrom date for "${track.title}": ${track.availableFrom}`)
    return true
  }

  return now.getTime() >= releaseInstant
}

export function hasTrackAccess(track: Track, membershipTier: MembershipTier, now = new Date()): boolean {
  if (!isTrackAvailableByDate(track, now)) return false
  if (track.accessTier === 'public') return true
  if (track.accessTier === 'free_member') return membershipTier !== 'none'
  if (track.accessTier === 'paid_5') return membershipTier === 'paid_5' || membershipTier === 'paid_20'
  return membershipTier === 'paid_20'
}

export function getLockedTrackLabel(track: Track): string {
  if (track.lockedLabel) return track.lockedLabel
  return 'in progress'
}
