// Regression test for finding #3 (plans/2026-05-23-security-review-remediation.md):
// the paid video id is only gated by a client-side `isPaid` check, so it ships to every
// visitor in the bundle regardless of tier. The plan accepts two outcomes: move the id
// behind a server-side, tier-checked endpoint, or explicitly document the exposure as an
// accepted risk. This test fails if neither has happened — i.e. a hardcoded video id with
// no accepted-risk marker — so the choice can't be made silently by omission.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const SOURCE_PATH = path.join(__dirname, 'Video.tsx')
const YOUTUBE_EMBED_ID = /youtube\.com\/embed\/([A-Za-z0-9_-]+)/

describe('Video.tsx — paid video id must be server-gated or an explicitly accepted risk', () => {
  test('does not hardcode a paid video id without a documented accepted-risk decision', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8')
    const match = source.match(YOUTUBE_EMBED_ID)

    if (!match) {
      // Video id is no longer hardcoded client-side (moved server-side) — satisfies the plan.
      return
    }

    const hasAcceptedRiskMarker = /accepted[\s-]?risk/i.test(source)
    expect(hasAcceptedRiskMarker).toBe(true)
  })
})
