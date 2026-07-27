# Execution Plan — Micro-Influencer Discovery & Outreach for "Sugar Daddy"

> **Executor:** gpt-terra (web-browsing research agent).
> **Mode:** research + outreach ops. No code changes.
> **Deliverable:** ONE comprehensive markdown report (details in "Output" below).

---

## Context

Catsky is a cold-start solo music artist (<500 followers on any platform). The **"Sugar Daddy"** music video premieres on **YouTube ~Jul 30–Aug 1, 2026** (~10 days from now). Existing launch plans (`.context/plans/sugar-daddy-music-video-teaser-launch-plan.md`, `…-lean-ads-led-launch-plan.md`) cover paid short-form ads → YouTube Premiere but **do not cover influencer outreach — that gap is what this task fills.**

Goal: find and enlist **micro-influencers** across Instagram, TikTok, and blogs who will post about the video and drive traffic to the artist's YouTube — a warm, credible, human referral feeding the Day-1 premiere spike, complementing the paid ad plan.

### The song
**"Sugar Daddy"** — theme is a **toxic / abusive / unhealthy relationship** with a relative, partner, substance, or lover. Emotionally raw, ambivalent, honest. This is the lens for content-fit: creators whose world touches heartbreak, addiction/recovery, complicated family, mental health, "sad" / cathartic music, and cinematic melancholy will resonate; upbeat/lifestyle/hype accounts will not.

### The artist's mission (frame every pitch against this)
1. Become **established as a credible artist** first.
2. Then **change the music business in favor of artists and smaller businesses** instead of labels.
3. Ultimately **change the world** — final goal: no wars, no harm to animals and plants.

Outreach should read as inviting people into an honest, independent, artist-first project — not a marketing blast.

### Fit is the hard constraint, not reach
Priorities: small, high-trust, taste-making creators over big cheap reach. Quiet, honest, intimate voice (all-lowercase, first-person). Avoid hustle/grind, motivational, hype, or "support a struggling artist / save me" framing.

**Geography:** Los Angeles = Tier 1. Rest of US = Tier 2.
**Budget:** organic / gifting first (early access, free membership, shoutout swaps); small paid placements only for the best-fit few. Do not spend or commit money — surface paid candidates + rate estimates for artist approval.

---

## Files gpt-terra reads first (grounding — psychology only)

- `2026-07-19-music-artist-pshychology-v1.md` (repo root) — the **only** brand/strategy doc to use. It's the 6-tier "what fans desire" framework (feel something → be understood → identity signal → belong → closeness → matter to the story) with the thesis "never sell the feelings themselves; those stay free." Use it to frame the ask and judge fit. **Do NOT use `public/docs/biz/*` or `artifacts/*`.**
- `.context/plans/sugar-daddy-music-video-teaser-launch-plan.md` — premiere timing / asset context (finished video, teaser clips, trailer, B-roll on hand).
- `src/config/tracks.ts` — track list + SoundCloud handle `catsky_club` (reference material to share; also a warm-lead source).

Channel URL and IG/TikTok handles are NOT required inputs for this task — leave clearly-marked placeholders (`[YT CHANNEL]`, `[IG]`, `[TIKTOK]`) in drafts for the artist to fill at send time.

---

## Step 1 — Ideal-fit profile (ICP)

- **Size band:** nano + micro only — **~2k–50k followers**. Reject >100k. Prefer **engagement rate ≥ 4%** over raw follower count.
- **Categories to hunt (priority order):**
  1. **Independent-music discovery / curators** — "new music", "underrated artists", bedroom-pop / indie / lo-fi / singer-songwriter tastemakers, sad/cathartic-music accounts, Spotify/YouTube playlist curators.
  2. **LA local scene / lifestyle** — LA music, DTLA/Echo Park/Silver Lake scene, local gig & culture accounts.
  3. **Aesthetic + theme match** — moody/cinematic/film-photography/"sad girl"/nightdrive melancholy accounts; heartbreak / breakup / complicated-relationships storytelling creators.
  4. **Adjacent-community creators (handle with care)** — mental-health, addiction-recovery, healing-from-toxic-relationships voices who share music. Only where genuine and non-exploitative; the song explores the wound honestly, it does not moralize.
  5. **Music blogs & newsletters** — indie/DIY blogs, Substacks, "artist to watch" columns, submission-friendly review sites, playlist blogs.
- **Hard-reject gates:** hustle/grind or "save a struggling artist" framing; engagement-pod / fake-follower patterns; dormant (no post in 30 days); audience clearly outside US; anything that would trivialize abuse/addiction for clicks.

## Step 2 — Discovery (full web browsing)

Run multi-modal searches — no single method finds everyone. Capture handle, URL, platform, apparent size for each.

- **Hashtag / keyword sweep (IG + TikTok):** `#newmusicfriday #indiemusic #bedroompop #undergroundmusic #sadgirlmusic #heartbreaksongs #musicdiscovery #unsignedartist #songwriter` + LA geo tags (`#lamusic #lamusicscene #dtla #echopark #silverlake`). Record accounts that post about *other people's* music (curators), not just artists.
- **TikTok search:** "songs that feel like…", "artists you should know", "underrated music", "songs for a toxic situationship", LA creator search. Note duet/stitch-friendly creators.
- **Playlist → curator pivot:** find Spotify/YouTube/Apple indie & sad/heartbreak playlists in the lane, trace each owner to their socials.
- **Blog / newsletter search:** `indie music blog submissions`, `bedroom pop blog`, `LA music blog`, `Substack new music`, submission-friendly curators; capture form/email.
- **Snowball:** for every strong find, mine "similar accounts", tagged collabs, and reposts.
- **Warm leads:** anyone already engaging with `catsky_club` on SoundCloud / Spotify / YouTube comments → flag as priority.

Target: **~60–100 raw candidates** before filtering, weighted to LA.

## Step 3 — Vet & score

Verify each on-platform; reject hard-gate failures. Score 0–5 per dimension, weighted total:

| Dimension | Weight | Notes |
|---|---|---|
| Content + theme fit (voice, aesthetic, heartbreak/honesty resonance) | ×3 | The dealbreaker. |
| Engagement rate (likes+comments / followers) | ×2 | ≥4% good, ≥7% excellent; check 6–10 recent posts. |
| Audience geo overlap (LA > US > other) | ×2 | Infer from tags, comments, bio. |
| Audience authenticity (no fake-follower / pod signals) | ×2 | Erratic ratios, generic-emoji comments → reject. |
| Posting reliability (active, consistent) | ×1 | Posted in last 14–30 days. |
| Contactability (email/DM/form) | ×1 | No path → low priority. |

**Tiering:** LA → Tier 1; US non-LA → Tier 2. Rank by weighted score within tier. Mark top ~15–20 as the send-first cohort.

## Step 4 — Personalized draft voice rules

For each Tier-1 + top-cohort Tier-2 prospect, write a draft:
- all-lowercase, quiet, first-person, human — never a press-release/"collab opportunity" template.
- **Lead with genuine specificity** about *their* content (proves it isn't a blast).
- Small honest ask: "i made a video for a song called sugar daddy — it's about a toxic relationship, and i'd love for you to see it before it's out. would you be open to an early look?" Offer **early/exclusive access before premiere**, **free membership** (if authorized), and the asset kit (teaser clips, trailer, B-roll).
- Optionally connect to the mission (artist-first, independent) where it fits the recipient — never preachy.
- **Banned:** grind/hustle, "support a struggling artist", "save me", hype adjectives, title-case press tone.
- Provide **2 length variants** per prospect: DM-length and email/blog-submission length. For paid candidates, a short rate-inquiry variant that asks their posting rate before any commitment.
- Use placeholders `[YT CHANNEL]` / `[PREMIERE LINK]` / `[IG]` / `[TIKTOK]` for artist to fill.

## Step 5 — CRM / tracking workflow (inside the report)

- **Status vocabulary:** `new → researched → queued → contacted → replied → committed → posted → declined → dead`.
- **Follow-up cadence:** #1 at +3 days, #2 at +6 days, then `dead`. Cap at 2 follow-ups (respect the quiet brand).
- **Timeline (premiere ~Jul 30–Aug 1):** send Tier-1 in first 48h; lock commitments **≥4 days before premiere**; cluster committed posts on **premiere day ± 1** to concentrate the Day-1 spike.
- **Compliance:** paid/gifted posts use `#ad` / paid-partnership disclosure (FTC).

---

## Output — ONE comprehensive markdown file

Write everything to **`.context/outreach/sugar-daddy-influencer-outreach.md`** (create the dir). Single self-contained report with these sections:

1. **Summary** — what was done, counts (raw found / passed filter / Tier-1 / Tier-2 / paid-flagged), and top-5 recommended sends.
2. **ICP & method** — the profile and the discovery methods actually run (with which searches produced hits).
3. **Ranked influencer table** — one row per vetted candidate, columns:
   `id | platform | name | handle | profile_url | tier | category | followers | engagement_rate | last_post_date | audience_geo_est | authenticity (ok/suspect) | content_fit_score | weighted_score | brand_safety (ok/flag+reason) | contact_method | contact_value | comp_model (organic/gift/paid) | est_rate_if_paid | status | notes`
   (mark any unverifiable metric `unknown` — never invent stats). Sort by tier then weighted_score.
4. **Personalized drafts** — a subsection per send-first prospect, each with the DM + email variants (and rate-inquiry variant for paid), keyed by `id`.
5. **CRM tracker** — kanban-by-status board + a dated follow-up schedule; every row with status ≥ `queued` appears here.
6. **Operating guide** — send order, how to personalize the last mile, what to reply on interest, when to offer paid vs. gifting, how to log a post once live, timeline vs. premiere.
7. **Open items for the artist** — YouTube/premiere URL + IG/TikTok handles to paste into placeholders; paid budget ceiling + gifting authorization.

---

## Guardrails

- **Do not contact anyone** — build the list + drafts only; the artist sends.
- **Do not scrape abusively / violate ToS** — normal public browsing + search; no purchased follower data.
- **Do not invent stats** — unverifiable → `unknown`.
- **Do not spend or commit money** — surface paid options for approval.
- Keep the quiet, honest voice and the theme's sensitivity (no exploiting abuse/addiction for clicks) in every generated word.

## Verification

1. **Fit spot-check:** open 5 random Tier-1 profiles; confirm genuine match to the sad/honest/heartbreak brand and a defensible `content_fit_score`. Generic promo-spam accounts → rubric applied too loosely.
2. **Stat integrity:** re-derive engagement rate for 3 rows by hand; must match within reason; no blank-but-unmarked fields.
3. **Geo weighting:** Tier-1 is genuinely LA-anchored and leads the send-first cohort.
4. **Voice audit:** search the drafts for banned patterns ("grind", "hustle", "support", "struggling", "save", title-case sentence starts, hype adjectives) → ~zero hits; each draft names something specific about that creator.
5. **CRM completeness:** every `≥ queued` row appears in the tracker with dated follow-up slots.
6. **End-to-end dry run:** take the #1 Tier-1 prospect and walk profile → why it fits → draft DM → tracker entry → follow-up dates; artist could send in under a minute after pasting placeholder handles.
