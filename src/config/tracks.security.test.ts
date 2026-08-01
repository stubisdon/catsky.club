// Regression test for finding #2 (plans/2026-05-23-security-review-remediation.md):
// gated SoundCloud secret URLs must not be committed client-side, since anything in
// TRACKS ships in the public bundle regardless of the visitor's membership tier.
import { describe, expect, test } from 'vitest'
import { TRACKS, type TrackAccessTier } from './tracks'

const GATED_TIERS: TrackAccessTier[] = ['free_member', 'paid_5', 'paid_20']
const SOUNDCLOUD_SECRET_TOKEN = /\/s-[A-Za-z0-9]{6,}(?:$|[/?])/

describe('TRACKS — no gated SoundCloud secret URLs in client bundle', () => {
  for (const track of TRACKS) {
    if (!GATED_TIERS.includes(track.accessTier)) continue

    test(`"${track.title}" (${track.accessTier}) does not embed a raw SoundCloud secret token`, () => {
      const trackUrl = track.audioSource.type === 'soundcloud' ? track.audioSource.trackUrl : ''
      expect(trackUrl).not.toMatch(SOUNDCLOUD_SECRET_TOKEN)
    })
  }
})
