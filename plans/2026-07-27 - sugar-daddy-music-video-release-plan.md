# "Sugar Daddy" Music Video — Launch Plan (contacts + 6-day runway)

**Premiere: Saturday, August 1, 2026.** Referred to below as **P** (premiere hour). Today is Sunday July 26, so there are 6 days of runway.

---

## Context

The "Sugar Daddy" music video premieres Aug 1. Catsky wants to reach every personal contact across Telegram, Instagram, Gmail, phone, Facebook, and VK (1000+ people) asking them to watch, and then, if they liked it, like / subscribe / comment.

Two things make a naive one-day blast harmful, and this plan is built around avoiding them:

1. **Platform safety.** Hundreds of near-identical messages, especially carrying the same URL, is the exact fingerprint Instagram, Messenger, and VK use to restrict accounts. Losing IG DMs on premiere day would be the worst possible outcome.
2. **Algorithm quality.** YouTube weights average view duration and returning viewers far above raw like/comment counts. Obligation-clicks that bounce at 20 seconds drag the retention curve down during the exact 48h window when YouTube decides whether to recommend the video, and dead subscribers dilute the channel permanently, suppressing future videos.

The fix is to **route each contact to the channel that matches how well they know you**, and to lead with a single ask (watch it fully) with like/subscribe/comment conditional on them actually liking it. That conditional framing is self-selecting, so only people who genuinely connected add engagement signal.

**Video content note:** the video depicts sex trafficking and closes on WHO/UN statistics with a RAINN resource. It is heavier than "a toxic relationship," which is how earlier planning docs described it. The video itself makes the statement; the DMs should not use trauma as a hook.

---

## Already done (as of Jul 26)

- Premiere scheduled for Aug 1, already accruing "notify me" views on the countdown page.
- Title set: `Catsky - Sugar Daddy (official music video)` (en dash fixed to hyphen).
- Thumbnail, description, and pinned comment written.
- Description includes the logline, content warning, streaming link, full credits, the WHO statistic, a RAINN resource line, newsletter CTA, hashtags, and lyrics.
- **Restrictions check passed:** the Notices column in Studio is clear on every row. No age restriction, no strikes. Self-restriction was deliberately left off, because age-restricting would block logged-out viewers (most of the 1000 contacts clicking from phones), break the YouTube embeds on `src/Watch.tsx` and `src/Video.tsx`, and lock out the under-20 audience named in the video's own statistic.

---

## Remaining prep (Jul 26 to Jul 31)

**Small fixes, today:**
- Lyrics block in the description: remove the en dash in `I cannot say the only word –`, normalize `Daddy` vs `daddy` (currently alternates mid-verse), and resolve `you keep me going` vs the screenplay's `you keep it going`.
- Delete the five unlisted `demo export` videos (16, 18, 19, 20, 22). All are 3:26 rough cuts of this same video; "demo export 16" has 36 views, so those links circulated. If anyone shares one instead of the premiere you split traffic and someone's first impression is an ungraded cut.
- `src/config/tracks.ts` lists "Sugar Daddy" (id 5) with `announcedReleaseDate` / `lockedLabel` of **"coming May 8, 2026"**, which contradicts the Aug 1 launch for anyone landing on the site from these messages. `src/Watch.tsx:61` and `src/Video.tsx:47` are the pages that traffic will hit.
- Copy the Premiere URL and open it in a private window. Every message depends on it resolving to a countdown page for a logged-out stranger.

**The big one, do it early in the week:**
- **Contact triage.** See the tier model below. Budget 30 to 60 minutes. This is what makes launch day paste-only instead of panicked.

**Rest of the week:**
- Fill the message drafts with the real link and premiere time.
- Batch-cut teaser clips and post a few, per the existing plan in `zagreb-v3/.context/plans/sugar-daddy-music-video-teaser-launch-plan.md`.

---

## The honest math on 1000+ contacts

You cannot personally message 1000+ people in one day. At safe per-platform rates the ceiling is roughly **165 to 215 individual messages**, plus email. So this is a three-tier funnel:

| Tier | Size | Channel | Effort |
|---|---|---|---|
| **A — people who'd be glad to hear from you anyway** | 60–80 | Individually written DM/SMS, personal first line | ~90 min |
| **B — real but not close relationships** | 120–150 | Light template + one personalized clause, throttled | ~60 min |
| **C — everyone else (~800)** | rest | Broadcast only: IG Story, TG channel, FB/VK post, newsletter | ~20 min |

Tier A is the retention floor. They watch properly, which is the only signal that matters. Tier C costs nothing and risks nothing.

**How to triage fast (do NOT hand-sort 1000 people):** ask *"would I message this person if I had good news that had nothing to do with my career?"* Yes → Tier A. Cap at 80; if you're over, cut. Then *"have we had a real two-way conversation in the last ~12 months?"* Yes → Tier B. Everyone else → C.

---

## Per-platform rules and day-of caps

Caps assume messages are **not** identical and are spaced 1 to 2 minutes apart.

- **Telegram — safest, do the most here.** ~40 direct messages to *existing* chats. Never use "forward to many chats"; that is the flagged action, not the messaging itself. Post to your channel separately for Tier C.
- **Instagram — highest value, second highest risk.** ~25–30 DMs, strongly prefer existing threads. **Do not put the URL in Tier B DMs.** An identical link repeated across dozens of DMs is a stronger spam signal than the text. Say "link's in my bio" and put the real link only in Tier A. Story + Reel carries Tier C.
- **Facebook Messenger — highest ban risk of all six.** DM only 15–20 genuinely close people. Everyone else gets the wall post.
- **VK — aggressive antispam.** Wall post for reach, ~20–25 DMs to close contacts only.
- **Phone (iMessage/SMS)** — ~40–50 *individual* sends. Never a mass group thread.
- **Gmail — needs the most care.** Personal Gmail caps at 500 recipients/day and a BCC blast to hundreds lands in spam. Split three ways:
  - **Ghost members** → the existing Ghost newsletter (`server.js` has Admin API config; run `scripts/check-ghost.sh` first). Legitimate opt-in mail.
  - **Real people you know** → batches of 25–30 individual sends spread through the day.
  - **Everyone else** → **skip.** Emailing hundreds of non-opt-in addresses from the catsky.club domain risks spam complaints that would kill deliverability for the actual newsletter.

---

## Message drafts

Voice per `~/.claude/skills/write-as-dmitry/SKILL.md`: lowercase except names, warm first / ask second, short lines, at most one exclamation per sentence, one emoji at the end, open-ended closer, **no em or en dashes**. No "grind", "hustle", "support", "struggling", "save".

Every draft leads with the watch ask. Like/subscribe/comment is conditional and second, and the comment ask is *specific*, because generic emoji comments are worthless and read as engagement bait.

### A. Tier A, sent Friday July 31 (the day before)

The most important message in the plan. Sent the day before so they show up *live* at the premiere.

```
hey, [name]!

it's been a minute, hope you've been doing well 🧡

my music video for "sugar daddy" is premiering tomorrow, august 1 at [P time]. i've been sitting on this one for a long time, it's the most honest thing i've made so far.

if you're around, i'd love it if you watched it all the way through with sound on. that part actually matters to me more than anything else.

[premiere link]

and if it lands for you, a like and a comment saying what you think it's about would help a lot. youtube pays attention to that.

let me know if you'll be around?
```

### B. Tier B, sent on the day (no link, link in bio)

```
hey, [name]! [one personal clause]

my music video for "sugar daddy" is out today, it's the first real one i've made.

it's on my youtube, link's in my bio. if you watch it all the way through i'd appreciate it a whole lot 🧡
```

### C. Tier C broadcast (IG Story, Telegram channel, FB wall, VK wall)

Different shape so cross-platform followers don't see the same words twice.

```
it's out.

"sugar daddy" is a song about a relationship that was slowly taking me apart, and the video is the closest i've gotten to showing what that actually felt like.

it's 4 minutes. watch it to the end if you can, that's the whole ask.

if it hits you, tell me what you saw in it 🧡

[link]
```

### D. Email (Ghost newsletter). Subject: `it's out`

```
hey,

the music video for "sugar daddy" is live.

this one took the longest of anything i've made, and it's the most honest. it's about a relationship that was quietly taking me apart.

it's 4 minutes. if you have them today, watch it all the way through with sound on. that's the only thing i'm asking for.

[watch it here]

if it lands for you, a like and a comment with whatever you felt would genuinely help youtube show it to other people.

thank you for being here 🧡

catsky
```

### E. SMS / iMessage

```
hey [name]! my music video is out today. it's called "sugar daddy" 🧡 would mean a lot if you watched the whole thing: [link]
```

### F. Sunday Aug 2 follow-up, Tier A only, warm non-watchers only

Do **not** nudge silent contacts. That is where this turns into spam.

```
hey! did you get a chance to see it? no pressure at all, i just really wanted you specifically to see this one 🧡
```

---

## Hour-by-hour runbook

**Premiere time:** contacts span US and post-Soviet timezones and you cannot serve both live. The target market is US/LA, so set **P for US evening** and tell Telegram/VK Russian-speaking contacts to watch "today," not live. Live attendance is a bonus from Tier A, not the goal for everyone.

### Friday July 31 (P−1 day)
| Time | Action |
|---|---|
| Morning | Confirm the Premiere link resolves logged-out. Final description check. |
| Afternoon | **Send all 60–80 Tier A messages**, spread across TG / IG / SMS / FB per where you actually talk to each person. This block determines whether the launch works. |
| Evening | "Tomorrow" Story + Telegram channel note. Queue Tier B and C copy so day-of is paste-only. |

### Saturday August 1
| Time | Action |
|---|---|
| P−3h | Broadcast wave 1: IG Story, TG channel, FB wall, VK wall. Zero DM risk, reaches all of Tier C. |
| P−2h | Send the Ghost newsletter. |
| P−1h | One-line reminder to the ~20 Tier A people who said they'd be around. |
| **P** | **Premiere live. Be in the live chat the whole time.** Highest-leverage hour of the month. |
| P → P+2h | Reply to every YouTube comment. Do not send DMs in this window, be present instead. |
| P+2h → P+4h | **Tier B wave 1:** Telegram (~40) and SMS (~40). |
| P+4h → P+6h | **Tier B wave 2:** Instagram (~25, no link) and VK (~20). |
| P+6h | Facebook Messenger (~15 close only). Gmail batch (25–30 individual). |
| P+6h → close | Broadcast wave 2, different angle: a reaction/BTS clip or a screenshot of a real comment. Keep replying to comments. |

### Sunday August 2 (P+1)
Still inside the 48h velocity window. Second broadcast wave, remaining Gmail batch, Tier A soft follow-up (draft F) to warm non-watchers only. Keep replying to every comment.

---

## What not to do

- No identical text repeated verbatim. Vary at least one clause per send.
- No URL in bulk Tier B/C DMs. Link in bio.
- No mass group threads on iMessage, WhatsApp, or Messenger.
- No BCC blast to non-opt-in addresses from the catsky.club domain.
- No "please like and subscribe" as the *lead* ask, and no asking for comments without saying what to comment.
- Do not chase silent contacts.

---

## Files to create

Under `.context/launch/`:

- **`contacts.csv`** — `name, platform, handle_or_email, tier, sent_at, replied, watched, notes`. Primarily for deduplication: with 1000+ contacts across six platforms, double-messaging the same person on two platforms is the most likely embarrassing failure.
- **`messages.md`** — the drafts above with `[name]`, `[P time]`, and `[premiere link]` filled in, ready to paste.
- **`day-of-schedule.md`** — the runbook above with real clock times substituted for P.

---

## Verification

1. **Before sending:** run `scripts/check-ghost.sh` to confirm Ghost mail config. Send draft D to yourself and confirm it does not land in spam. Confirm the Premiere link opens for a logged-out user.
2. **Account safety, hourly on the day:** after each DM wave, confirm you can still send on that platform. If a send fails or a warning appears, stop that platform for 24h. Do not push through it.
3. **The real success metric, in YT Studio:** watch **Traffic Source Types**. External/Direct spiking is just your friends. The signal you want is **Browse + Suggested impressions rising over the following days**, which means recommendation kicked in. Watch average view duration too; if it collapses during the DM waves the traffic is low quality, and the answer is fewer messages, not more.
4. **Dedup check:** after the day, sort `contacts.csv` by name and confirm nobody got the same message on two platforms.
