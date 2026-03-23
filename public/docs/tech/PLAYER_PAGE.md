# Listen Page Documentation (V1.0)

## Overview
The Listen page (`/listen`) is the primary music destination. It must support all V1.0 access use cases:
- public listening for released tracks
- free registered access to finished unreleased songs
- paid-tier access to unfinished demos

`/player` may redirect to `/listen`, but `/listen` is canonical.

## Access Model

### 1) Unregistered
- Can listen to **released** music only.
- Sees locked cards for unreleased content with CTA to sign up.

### 2) Registered (Free)
- Can listen to:
  - released music
  - finished unreleased songs
- Cannot access unfinished demos.
- Sees upgrade CTA for demo-only content.

### 3) Paid $5
- Can listen to:
  - released music
  - finished unreleased songs
  - unfinished demos
- In the current V1 build, the full paid demo catalog is available at `$5`; there are no listen-only `$20` exclusives.

### 4) Paid $20
- V1.0 parity with $5 for listening features.
- May include support-forward positioning/copy.

## Track Classification
Each track should include an access flag:
- `released_public`
- `finished_unreleased_registered`
- `unfinished_demo_paid`

Example shape:
```ts
interface Track {
  id: string
  title: string
  audioSource: AudioSource
  access: 'released_public' | 'finished_unreleased_registered' | 'unfinished_demo_paid'
  version?: string
  date?: string
}
```

## UX Requirements
- Public tracks playable without auth wall.
- Locked tracks remain visible for discovery but cannot play.
- Every locked state includes release-status copy and an upgrade CTA on hover.
  - `Motherless Child` shows `coming Apr 10, 2026`.
  - `Sugar Daddy` shows `coming May 8, 2026`.
  - Other locked songs show `in progress`.
  - Hovering a locked card reveals `listen early` and routes to `/connect` on click.
- Copy should be concise and non-manipulative.

## Audio Sources
Current supported sources:
- SoundCloud private/public links
- direct URLs (if configured)

## Testing Scenarios
1. Unregistered user: released tracks play, others locked.
2. Registered free user: finished unreleased unlocked, demos locked.
3. Paid $5 user: all categories unlocked.
4. Paid $20 user: all categories unlocked.
5. Locked CTA routes correctly to `/connect` and returns to `/listen` after auth/upgrade.


## 2026-03 listen stability notes
- Keep the selected-player module rendered above the track list so it remains visible immediately after selecting a public track.
- Use `max-height: 100dvh` on the `/listen` content panel to avoid desktop browser chrome causing an extra phantom inner scrollbar.

## Related
- `public/docs/tech/V1_UX_USE_CASES.md`
- `public/docs/tech/V1_UX_USE_CASES_VS_BIZ_2026_REVIEW.md`
