# Sugar Daddy — reach-first channel sweep (executable brief)

**For:** an autonomous research agent (GPT / Terra).
**Type:** research + drafting only. Do **not** contact anyone, submit any form, or authorize any payment. Output is a ranked, verified prospect list plus drafts the artist will send by hand.
**Created:** 2026-07-23. Premiere window: **2026-07-30 – 08-01**, so this is time-sensitive — finish within one working session.

## Why this exists

The prior file (`plans/2026-07-21-sugar-daddy-influencer-outreach.md`) targeted small indie blogs and curators. A verification pass showed they are mostly tiny or dormant (Coconut Spaceship's blog dead since 2022, the loop dead ~7 years, most others <2K IG followers and below SimilarWeb's tracking floor). Good for a tasteful cosign, wrong altitude for **traffic and subscribers**.

**This sweep's single goal: find channels with real, verified reach that will post a clip of the *sugar daddy* music video and link back to the YouTube premiere / IG / site.** Earned reach that drives clicks beats prestige that doesn't.

## Artist / product context

- Artist: **catsky** — alternative-pop, based in LA. IG: https://www.instagram.com/catsky.club/
- Asset: a cinematic music video for a song called ***sugar daddy***, honest and a little mysterious, about a toxic relationship. Premieres ~2026-07-30–08-01 on YouTube.
- The ask to each channel: an early private look, and a **premiere-day post that links back** to the YouTube premiere (that link-back is the whole point — a post with no link does not count).

## Target channel types (in priority order)

1. **IG / TikTok music-clip repost accounts, 50K–500K** — accounts that repost artist clips/reels and tag the artist (alt-pop, sad-girl, bedroom-pop, "songs that hit different," heartbreak/toxic-relationship themed). Highest leverage.
2. **YouTube first-listen / reaction / discovery channels** — channels that react to or feature unsigned/indie alt-pop, with subs and recent uploads. Sends subscribers directly on-platform.
3. **Large Spotify playlists (editorial-style, independent)** — alt-pop / sad-girl / heartbreak playlists with real save/follower counts; find the curator's contact.
4. **Mid-size alt-pop blogs/zines with a live social presence** — only if their IG/TikTok actually posts clips with links (not static reviews).

LA is now a **nice-to-have, not a filter** — reach outranks geo for this sweep. Keep it US/English-audience-facing.

## Hard rules (do not break)

- **No invented metrics.** Every follower/subscriber/save count must have a source and be dated. If you cannot verify a number, write `not found` — never estimate to fill a cell.
- **Verify before listing.** A prospect only makes the ranked table if you have: (a) a real, sourced follower/sub count in the target range, (b) evidence it posted within the last 30 days, and (c) a real, public contact route (DM open, email, form, or booking/submission link).
- **Engagement floor.** For social accounts, compute `(likes + comments) / followers` across the 6–10 most recent posts. Reject below **4%**, or any obvious pod / bought-follower pattern (round-number spikes, comment farms). Note the computed rate.
- **No pay-to-play unless flagged.** If a channel only offers paid placement, list it but set `comp_model: paid-flagged` with the exact price and deliverable, and mark it approval-only. Do not treat paid reach as earned reach.
- **Brand safety / ethics.** Never frame the song as recovery advice or use trauma as a hook. Never target mental-health/recovery creators to use the song as testimony. Any paid or gifted post must use `#ad` / paid-partnership disclosure.
- **Do not contact anyone.** Drafting only.

## Method

1. Run these query families (adapt/expand): `alt pop music promo instagram submit`, `sad girl music tiktok feature submit`, `bedroom pop reels curator tag artist`, `indie music youtube first listen submit`, `unsigned alt pop reaction channel`, `sad girl heartbreak spotify playlist submit`, `toxic relationship songs playlist curator`, `music video premiere instagram feature 50k`. Snowball from whoever the big accounts repost.
2. For each candidate: open the profile, capture the handle, pull the follower/sub count (state the source and date), confirm last-post recency, compute engagement, find the contact route, and judge genre fit (alt-pop / toxic-relationship theme).
3. Disposition every raw lead: passed / rejected (too small, dormant, no contact, wrong genre, fake engagement, non-US). Report the counts (`N found → M passed → K rejected` with reason buckets), like the prior file did.
4. Rank by a reach-weighted score: verified reach ×3, engagement ×2, genre fit ×2, contactability ×1, authenticity ×1. Tier 1 = clears all hard rules with the best reach; Tier 2 = smaller or thinner fit; flagged = paid-only or unverified.

## Deliverables (write to a new file `plans/2026-07-23-sugar-daddy-reach-first-results.md`)

1. **Summary** — what was searched, raw-lead disposition counts, and the honest top of the list.
2. **Ranked prospect table**, minimum **20 verified prospects**, columns:
   `id | type (IG/TikTok/YouTube/Spotify/blog) | name | handle | url | tier | followers (sourced+dated) | engagement_rate | last_post_date | genre_fit | contact_method | contact_value | comp_model | est_rate_if_paid | status | notes`
3. **At-a-glance table** (like the prior file): `platform | contact | vibe | one-line ask`.
4. **Drafts for the top 10** — reuse catsky's established voice exactly:
   - all-lowercase (artist choice), mysterious (honest about the song, teases more than explains), confident/pushy about the ask without begging.
   - identity: `catsky`, LA, alternative pop.
   - warm-first opener with one true, source-specific detail; then the ask.
   - always request a **premiere-day post that links back** to `[PREMIERE LINK]` / `[YT CHANNEL]`; leave `[YT CHANNEL]`, `[PREMIERE LINK]`, `[IG]`, `[TIKTOK]` as placeholders.
   - close every message `thank you in advance 🐾` then `catsky`.
   - avoid `grind`, `hustle`, `support`, `struggling`, `save`, `not a campaign`.
   - Give both a short DM and (where a form/email exists) a submission version.
5. **CRM scaffold** — Kanban by status + a dated follow-up schedule keyed to the 07-30–08-01 premiere (initial send now, +3d, +6d, mark `dead` after the second unanswered follow-up; don't chase during premiere week).
6. **Verification record** — a short audit confirming every listed count is sourced and dated, engagement was computed (not guessed), and no ethics/brand-safety line was crossed.

## Definition of done

A single markdown file with ≥20 reach-verified prospects (each with a sourced follower/sub count in range, ≥4% engagement or noted exception, recent activity, and a real contact route), an at-a-glance table, 10 ready-to-paste drafts in catsky's voice, a CRM scaffold, and a verification record. Nothing sent, nothing paid.
