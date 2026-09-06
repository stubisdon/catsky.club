# Invert site theme: black/white → beige off-white / dark brown

> Created: 2026-08-16 · For execution by: Codex (gpt-5.6-terra)
> Repo: catsky.club · Branch: `stubisdon/la-paz` · Base: `origin/fix/deploy-ghost-url-fallback`

## Goal

Flip the entire site from its current **pure-black background / pure-white text** immersive
theme to an inverted **warm beige off-white background / very dark brown text** theme.

Every surface that is currently black must become beige off-white. Every mark that is
currently white (text, borders, glyphs, progress fills, playheads) must become dark brown.
The layout, typography, spacing, animation timing, and copy must not change at all — this is
a pure color inversion.

## Non-goals (do not do these)

- Do **not** add a theme switcher, dark-mode toggle, or `prefers-color-scheme` variant.
- Do **not** restructure CSS, rename existing class names, extract components, or refactor.
- Do **not** change layout, font sizes, spacing, animation durations, or any copy.
- Do **not** touch auth/session logic, Ghost routing, nginx templates, `server.js`,
  `vite.config.ts` proxying, or the Ghost Portal patch script ordering in `index.html`.
  (The only `index.html` edit allowed is the critical first-paint `<style>` block at the top
  and adding one `<meta name="theme-color">`.)
- Do **not** commit or push. Leave changes in the working tree.

## Palette (use these exact values)

Add these to `:root` in `src/index.css`. The `-rgb` triplets exist so the many hard-coded
`rgba(255,255,255,a)` / `rgba(0,0,0,a)` values can be expressed as alpha ramps off the
theme colors instead of new magic hex codes.

```css
:root {
  /* Inverted theme: warm beige page, very dark brown ink */
  --color-bg: #F5F0E6;            /* was #000000 */
  --color-text: #241A14;          /* was #ffffff */
  --color-accent: #241A14;        /* was #ffffff */

  --color-bg-rgb: 245, 240, 230;
  --color-text-rgb: 36, 26, 20;

  --color-surface-raised: #FFFCF5; /* inputs, things that should read "above" the page */
  --color-surface-sunken: #EBE3D5; /* panels, tooltips, textareas — "below" the page */
  --color-error: #8C2F2F;          /* was rgba(255,180,180,0.95) */
  ...keep --font-mono and all existing brand color vars unchanged...
}
```

Keep the existing brand vars exactly as they are (`--color-warm-narrative: #A6563E`,
`--color-gentle-bond: #D7CCC8`, `--color-inspired-path: #8A55A5`, and the three
`--color-anchor` / `--color-support` / `--color-brand-accent` role aliases). They are
currently declared but unused; leave them alone.

Contrast check: `#241A14` on `#F5F0E6` is ~15:1 — comfortably AAA.

## Translation rules (apply consistently everywhere)

1. `#000000` / `#000` / `black` used as **page or container background** → `var(--color-bg)`.
2. `#ffffff` / `#fff` / `white` used as **text, border, or foreground mark** → `var(--color-text)`.
3. `rgba(255, 255, 255, A)` — this is always *ink on a dark page* in this codebase →
   `rgba(var(--color-text-rgb), A)`. Keep the same alpha `A` unless a rule below says otherwise.
4. `rgba(0, 0, 0, A)` — this is either a *surface* or a *shadow*. Decide by role:
   - surface/panel/scrim → `rgba(var(--color-bg-rgb), A)` or one of the surface tokens;
   - drop-shadow for depth → invert to a light halo, or use a low-alpha brown shadow.
   Each individual case is spelled out in the file-by-file section below — follow that,
   don't improvise.
5. Any hover state that currently does "transparent bg + white text → white bg + black text"
   keeps that same *inversion* relationship, now expressed as
   "transparent bg + brown text → brown bg + beige text" (`background: var(--color-text);
   color: var(--color-bg);`). Those rules already use the vars, so most need no edit.

## File-by-file work

### 1. `index.html` (2 edits only)

- Line ~8–10, the critical first-paint block. Currently:
  ```html
  <!-- Critical: black first paint so no white flash before CSS loads -->
  <style>
    html, body { background: #000; color: #fff; margin: 0; }
  ```
  Change to beige/brown and update the comment to say "beige first paint so no white flash
  before CSS loads". This must stay first so there is no flash of the wrong color.
- Add `<meta name="theme-color" content="#F5F0E6">` in `<head>` (mobile browser chrome).
- Change nothing else in this file. The Ghost Portal patch/hardening script order is
  load-bearing (see `AGENTS.md` §4).

### 2. `src/index.css` (the bulk of the work — 665 lines, ~34 color sites)

Update the file header comment `/* Immersive Black Screen Experience */` to reflect the
light theme (e.g. `/* Immersive Light Screen Experience */`).

Add `color-scheme: light;` to the `html` rule so native scrollbars, form controls, and
autofill styling render light instead of dark.

Then work through these, in file order:

| Line (approx) | Current | Target |
|---|---|---|
| 4–6 | `--color-bg: #000000`, `--color-text/#accent: #ffffff` | new palette above |
| 151–153 | `.connect-auth-input` `background: rgba(255,255,255,0.92)`, `color: #101010` | `background: var(--color-surface-raised)`, `color: var(--color-text)`; border stays `2px solid var(--color-text)` |
| 169, 173 | `.connect-portal-btn-text` `color: rgba(255,255,255,0.8)`, `border-bottom: 1px solid rgba(255,255,255,0.3)` | `rgba(var(--color-text-rgb), 0.8)` / `rgba(var(--color-text-rgb), 0.35)` |
| 196 | `.connect-auth-error` `color: rgba(255,180,180,0.95)` | `color: var(--color-error)` |
| 256 | `.ghost-portal-triggers button[data-portal="signin"]` `border-color: rgba(255,255,255,0.3)` | `rgba(var(--color-text-rgb), 0.35)` |
| 267–281 | `.app-container.flash-white` + `@keyframes flashFade` flash to `rgba(255,255,255,0.8)` | flash must now be **dark** to read against a beige page: `rgba(var(--color-text-rgb), 0.8)` at 0%/4.76%, fading to `var(--color-bg)` at 100%. Keep the class name `flash-white` and the `flashFade` keyframe name unchanged — renaming is churn, and the class is currently unused by any component. |
| 378, 424, 431 | `.text-display`, `.greeting`, `.form-label` `text-shadow: 2px 2px 4px rgba(0,0,0,0.8)` | These are decorative depth over a black page, not legibility-over-video (the videos are in contained iframes on `/watch` and `/video`). A hard black drop shadow under dark brown text on beige reads as mud. Replace with a soft light halo: `text-shadow: 0 1px 2px rgba(var(--color-bg-rgb), 0.9)`. |
| 456 | `.nav-link` disabled/dim `color: rgba(255,255,255,0.3)` | `rgba(var(--color-text-rgb), 0.35)` |
| 505–507 | `.glow-text` triple white glow | A white glow is invisible on beige. Use a warm dark glow at the same radii: `0 0 10px rgba(var(--color-text-rgb), 0.35), 0 0 20px rgba(var(--color-text-rgb), 0.22), 0 0 30px rgba(var(--color-text-rgb), 0.12)`. |
| 564–565 | `.timeline-container` `background: rgba(0,0,0,0.8)`, `border-top: 1px solid rgba(255,255,255,0.2)` | `background: rgba(var(--color-bg-rgb), 0.9)`, `border-top: 1px solid rgba(var(--color-text-rgb), 0.2)` |
| 576 | `.timeline-track` `background: rgba(255,255,255,0.2)` | `rgba(var(--color-text-rgb), 0.2)` |
| 602 | `.timeline-playhead` `box-shadow: 0 0 4px rgba(255,255,255,0.5)` | `0 0 4px rgba(var(--color-text-rgb), 0.5)` |
| 612, 619 | `.timeline-marker` `rgba(255,255,255,0.6)` / hover `rgba(255,255,255,1)` | `rgba(var(--color-text-rgb), 0.6)` / `var(--color-text)` |
| 627–628 | `.timeline-marker-tooltip` `background: rgba(0,0,0,0.9)`, `border: 1px solid rgba(255,255,255,0.3)` | `background: var(--color-surface-sunken)`, `border: 1px solid rgba(var(--color-text-rgb), 0.3)` — a tooltip must stay legible against the beige page, so give it a real surface, not a translucent scrim. |
| 640 | `.timeline-tooltip-time` `color: rgba(255,255,255,0.8)` | `rgba(var(--color-text-rgb), 0.8)` |

Everything already written as `var(--color-text)` / `var(--color-bg)` (lines 38–39, 72,
120–121, 133–134, 239–240, 251–252, 287–288, 302–303, 334–335, 347–348, 355–356, 368–369,
440–441, 452, 469–470, 485–486, 536–537, 549–550, 587, 598, 646) inverts automatically once
the tokens change. **Verify each of those still reads correctly after the flip** — in
particular every `background: var(--color-text); color: var(--color-bg);` hover pair, which
now means "brown fill, beige label". That is the intended inversion; leave them as-is.

Finally: delete the trailing `/* Force reload 1765564342 */` comment only if it is already
stale — otherwise leave it. (Prefer leaving it. It is not your call to make.)

### 3. `src/components/Link.tsx` (4 sites)

- L24 `border: '2px solid rgba(255, 255, 255, 0.3)'` → `'2px solid rgba(36, 26, 20, 0.3)'`
- L32 `color: 'rgba(255, 255, 255, 0.5)'` → `'rgba(36, 26, 20, 0.5)'`
- L66 hover-in `'rgba(255, 255, 255, 1)'` → `'rgba(36, 26, 20, 1)'`
- L75 hover-out `'rgba(255, 255, 255, 0.5)'` → `'rgba(36, 26, 20, 0.5)'`

These are inline JS style strings, so `var(--color-text-rgb)` composition is awkward. Prefer
using `var(--color-text)` where the alpha is 1, and literal `rgba(36, 26, 20, A)` where an
alpha is needed. Do **not** introduce a JS color-constants module — that is a refactor.

Note: `e2e/landing.spec.ts` asserts that nav-link background *changes* on hover (it compares
computed values, not specific colors), so this stays green as long as the hover delta remains.

### 4. `src/Connect.tsx` (8 sites, lines 521–576)

Four repeated inline style blocks each with:
- `border: '1px solid rgba(255,255,255,0.4)'` → `'1px solid rgba(36, 26, 20, 0.4)'`
- `color: 'rgba(255,255,255,0.9)'` → `'rgba(36, 26, 20, 0.9)'`

Apply the same change to all four. Do not consolidate them into a shared object — that is a
refactor and `AGENTS.md` §3 forbids unrequested code motion. This file is high-risk
(login/signup/callback); change **only** these color literals.

### 5. `src/Listen.tsx` (16 sites)

Straight `rgba(255,255,255,A)` → `rgba(36, 26, 20, A)` on lines 217, 221, 233, 242, 259,
319, 323, 325, 346, 354, 361, 370, 377, 390, 407 — with these two exceptions:

- **L376** feedback textarea `background: 'rgba(0, 0, 0, 0.3)'` → `'var(--color-surface-sunken)'`.
  A textarea needs to read as an inset field against the beige page.
- **L323 / L325** selected + hover track row `rgba(255,255,255,0.1)` → `rgba(36, 26, 20, 0.08)`.
  Brown at 0.1 on beige is heavier than white at 0.1 on black; back it off slightly so the
  selected-row tint stays subtle. This is the one place where you should not preserve alpha
  verbatim.

`color: 'var(--color-text)'` occurrences (L346, L354, L377) need no change.

### 6. `src/Video.tsx` (1 site)

L38 `border: '1px solid rgba(255, 255, 255, 0.2)'` → `'1px solid rgba(36, 26, 20, 0.2)'`.

### 7. `src/utils/audioHelpers.ts` — inspect, probably no change

The SoundCloud embed is built with `color: '#8A55A5'` (brand "Inspired Path"). That is a
brand color, not a theme color — **keep it**. The widget renders `visual: 'false'` (the
compact/classic player), which has a light chrome, so it should sit fine on a beige page.
Load `/listen` and look at it. If the embed clearly clashes, report it in your summary
rather than changing the brand color unilaterally.

### 8. Ghost Portal — verify only, no code change

Ghost Portal renders in its own iframe and takes its accent color from Ghost Admin settings,
not from this repo. On `/connect`, open the Portal (sign-in) and confirm the white Portal
card still reads correctly over the beige page and that the surrounding trigger buttons
(`.ghost-portal-triggers button`, `.connect-portal-btn`) are legible. If the Portal looks
wrong, note it as a follow-up for Ghost Admin — do not hack Portal CSS from here.

## Sweep for anything missed

After the edits, run this and confirm every remaining hit is intentional (brand colors,
`white-space: nowrap`, comments):

```bash
grep -rniE "#(000|fff|ffffff|000000)\b|rgba?\(255, ?255, ?255|rgba?\(0, ?0, ?0|\bblack\b|\bwhite\b" src index.html --include="*.tsx" --include="*.ts" --include="*.css" --include="*.html"
```

Expected surviving hits: `white-space: nowrap` (index.css ~631), the brand hex values in
`:root`, `#8A55A5` in `audioHelpers.ts`, and the `flash-white` class name. Nothing else.

## Verification (all of it — report exact commands and output)

```bash
npm run lint
npm test
npm run build
npm run test:e2e:landing
```

Then, per `AGENTS.md` §9 (screenshot evidence is mandatory for user-visible change):

```bash
npm run screenshots:journey     # writes artifacts/ui-journey/
```

If Playwright browsers are missing, run `npm run test:e2e:setup` first and retry before
declaring an environment blocker.

Beyond the scripted journey, manually load and eyeball every route with the dev server
(`npm run dev`, http://127.0.0.1:3000):

- `/` landing — nav links, hover states, glow text
- `/listen` — track list, selected row, play/progress timeline, vote buttons, feedback textarea
- `/watch` and the video route — iframe borders, locked/upsell state
- `/connect` — portal buttons, auth form inputs, error message state, portal overlay
- `/mission`
- the post-magic-link welcome flow (`src/Welcome.tsx`) — form input underline, field-label note

## Acceptance criteria

- [ ] No black page background survives anywhere, including the pre-CSS first paint in `index.html`.
- [ ] All body text, borders, and UI marks are dark brown (`#241A14`) or an alpha ramp of it.
- [ ] All hover inversions still invert (brown fill / beige label) and are clearly visible.
- [ ] Text over the beige page has no muddy black drop shadow.
- [ ] `.glow-text` still visibly glows.
- [ ] Tooltips, the timeline bar, and the feedback textarea read as distinct surfaces, not as
      translucent smudges.
- [ ] `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e:landing` all pass.
- [ ] Screenshots captured in `artifacts/ui-journey/`.
- [ ] No changes outside: `index.html` (2 spots), `src/index.css`, `src/components/Link.tsx`,
      `src/Connect.tsx`, `src/Listen.tsx`, `src/Video.tsx`, plus the doc updates below.
- [ ] Nothing committed or pushed.

## Documentation (mandatory per `AGENTS.md` §6)

- `docs/UX_UI_DOCUMENTATION.md` — update any description of the black/white immersive theme
  to the new beige/brown palette, and document the token set
  (`--color-bg`, `--color-text`, `--color-bg-rgb`, `--color-text-rgb`,
  `--color-surface-raised`, `--color-surface-sunken`, `--color-error`).
- Grep `docs/` and the root `*.md` files for "black" / "white" theme claims and fix any that
  are now wrong. Do not rewrite docs wholesale — fix only the stale color statements.
- `ARCHITECTURE.md` / `AGENTS.md`: only touch them if they make a color claim that is now
  false. If they don't, say so explicitly in your summary.

## Final summary to print

- Exact list of files changed and what changed in each.
- Exact test commands run and their real results (pass/fail with output — do not claim a pass
  you did not observe).
- Paths to the captured screenshots.
- Anything you could not complete, anything that looked visually wrong, and anything you
  judged out of scope.
