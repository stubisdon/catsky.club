# Read Section Documentation (V1.0)

## Overview

The Read section is Catsky's blog: Ghost posts rendered inside the Catsky SPA
shell instead of on the Ghost theme. It reuses the site's native aesthetic
(black background, `var(--font-mono)`, white text, lowercase chrome) — no web
fonts, no new colors, no light theme. A future typography pass is scoped at
the bottom of this document but is **not implemented in v1**.

Routes:

- `/read` — feed of posts, newest first.
- `/read/<slug>` — a single article.

Nav: a `read` link sits between `watch` and `connect` on the landing page
(`src/App.tsx`).

## Data flow

Posts are fetched client-side from Ghost's Content API, same-origin, through
whatever proxies `/ghost` (Vite in dev, nginx in prod — see `ARCHITECTURE.md`
§3/§6). Two new files carry this:

- `src/utils/ghostApi.ts` — `getGhostContentApiKey()`, the Content API key
  read from `#ghost-portal-config[data-key]`. This was moved out of
  `src/utils/subscription.ts` (which now imports it) so the key isn't
  duplicated between the member-tier flow and the read flow.
- `src/utils/ghostContent.ts` — `fetchPosts()` and `fetchPostBySlug(slug)`.

Both requests use `credentials: 'include'` and `cache: 'no-store'`. The
member session cookie is what tells Ghost whether the requester may see a
gated post's full body — without it, Ghost only ever returns the free
preview or an empty body, regardless of what the frontend asks for.

- Feed: `GET /ghost/api/content/posts/?key=<key>&limit=all&order=published_at%20desc&fields=id,slug,title,excerpt,feature_image,feature_image_alt,published_at,reading_time,visibility,access`
- Article: `GET /ghost/api/content/posts/slug/<slug>/?key=<key>` (full object, including `html`)

A missing/unconfigured key makes both functions return `[]` / `null` rather
than throwing — the read section degrades to an empty feed instead of an
error banner when Ghost isn't wired up. Any other failure (non-2xx, network
error, malformed JSON) throws, except a 404 on the detail endpoint, which
resolves to `null` (used for the not-found state). See `AGENTS.md` for what
an *invalid* key does (401, then Ghost's own brute-force 429 block) — both
surface as the generic error state; the app does not retry these in a loop.

## Gating matrix

Gating is not reimplemented on the frontend. Every post object Ghost returns
already carries the answer as an `access: boolean` — true means "the current
requester, based on their session cookie, may read the full body." The
frontend never infers gating from `html` length or client-side tier state;
it only reads `access`.

| `visibility` | Logged-out visitor | Free member | Paid member |
|---|---|---|---|
| `public` | full body (`access: true`) | full body | full body |
| `members` | locked (`access: false`, free preview or empty `html`) | full body | full body |
| `tiers` | locked | locked unless the member holds a matching tier | full body if tier matches |
| `paid` | locked | locked | full body |

Locked posts always stay **visible** in the feed (title, excerpt, date,
reading time, lock marker) — visibility of the post itself is public
regardless of the body's gating. Only the article body is withheld.

On the article page, a locked post (`access === false`) renders whatever
`html` Ghost returned (a free-preview fragment, or nothing) followed by a
`data-testid="read-locked-cta"` block naming the tier required (members /
paid) and a `Link` to `/connect`.

## Known v1 limitations

- **No pagination.** All 16 posts are fetched in one `limit=all` request and
  rendered in a single feed. Fine at this volume; will need real pagination
  or infinite scroll before the catalog grows much further.
- **No SEO / SSR.** The SPA fetches and renders posts entirely client-side,
  so `/read/<slug>` pages are not crawlable or link-preview-able as
  authored. Search engines and social scrapers see the empty app shell.
- **Slugs containing a dot would break.** Ghost slugs seen in production are
  all extension-free, so `/read/<slug>` correctly falls through to the SPA
  in `server.js`'s static/SPA-fallback routing (`server.js:836`). A slug
  containing a literal `.` (e.g. `v2.0-notes`) would instead be treated as a
  static-file request, 404 before ever reaching the React router. Ghost
  slugs are sanitized and don't currently produce dots, so this is a latent
  risk rather than an active bug — flag it before enabling arbitrary/custom
  slugs.
- No tag filtering, comments, search, or RSS (all explicitly out of scope
  for v1, see the implementation contract).

## Future: Perplexity-derived reading typography

**Not implemented in v1.** The read section currently uses the site's native
mono aesthetic (see "Overview" above) — no web fonts, no color, per the
locked v1 product decision. The spec below is captured for a later pass and
should not be treated as current behavior.

Perplexity's answer body now uses their proprietary PPLX Serif VF (sans
option: PPLX Sans VF); FK Grotesk Neue and Berkeley Mono are legacy and no
longer referenced. Headline face is GT Canon.

Closest self-hostable substitutes, ranked by measured x-height/cap ratio
against PPLX Sans (0.745):

| Font | x-height/cap ratio |
|---|---|
| Inter | 0.750 |
| Onest | 0.745 |
| Geist | 0.746 |
| Instrument Sans | 0.708 |
| Public Sans | 0.715 |

For the serif: **Literata** is a near-exact width match; **Newsreader**
should be rejected (x-height ~23% too small).

Shipped values (from Perplexity's production CSS):

| Property | Value |
|---|---|
| Body | `1rem` / line-height `1.75` |
| Article surface | `18px` / `1.6` |
| Letter spacing | `0` everywhere |
| `p` | `margin: 1.25em 0` |
| `h1` | `2.25em / 1.111 / weight 800` |
| `h2` | `1.5em / 1.333 / semibold`, `margin-top: 2em`, `margin-bottom: 1em` |
| `h3` | `1.25em / 1.6 / weight 600`, `mt 1.6em`, `mb .6em` |
| `h4` | `1em / 1.5 / weight 600`, `mt 1.5em`, `mb .5em` |
| `h2/h3/h4/hr + *` | `margin-top: 0` (see note below) |
| `ul, ol` | `margin: 0`, `padding-inline-start: 1.625em` |
| `li` | `margin: .5em 0`, `padding-inline-start: .375em` |
| `blockquote` | `border-inline-start: 4px solid`, `padding-left: 1rem`, `margin: 1.6em 0`, `font-style: normal`, `font-weight: 500` |
| `hr` | `margin: 2em 0` |
| inline `code` | `.875em`, weight 450, soft background, radius `.3125rem`, padding `.125rem .25rem` |
| Column width | `--thread-content-width: 720px` |

The `h2 + *, h3 + *, h4 + *, hr + * { margin-top: 0 }` rule is the key
detail — it's what creates the "big space above a heading, small space
below" feel; without it every heading gets symmetric spacing and reads as
generic.

Column width note: Perplexity's own `65ch` equals 718px in their own font,
but in Inter, `65ch` is only 656px — use a fixed `720px` (~70ch in Inter)
instead of a `ch`-based width if substituting fonts.

Weight tokens are theme-dependent (emulate with a variable font rather than
static weights):

| | Light | Dark |
|---|---|---|
| Sans regular/semibold | 400/560 | 350/530 |
| Serif regular/semibold | 435/635 | 370/600 |

Self-hosting cost: Inter variable subset to Latin is ~103 KB woff2
(`google/fonts/ofl/inter/Inter[opsz,wght].ttf`), Literata ~157 KB. Use
`font-display: swap`, split latin / latin-ext by `unicode-range`, and
preload only the latin file.
