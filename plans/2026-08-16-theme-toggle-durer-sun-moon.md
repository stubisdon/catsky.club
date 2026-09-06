# Theme toggle: persistent top bar with Dürer-style sun/moon icons

> Created: 2026-08-16 · For execution by: Codex (gpt-5.6-terra)
> Repo: catsky.club · Branch: `stubisdon/invert-site-colors`
> Builds directly on the uncommitted beige/brown inversion already in the working tree
> (`plans/2026-08-16-invert-site-colors-light-beige-brown.md`). Read that first for palette context.

## Goal

Make the site switchable between the **new light theme** (warm beige `#F5F0E6` page / very dark
brown `#241A14` ink — currently the only theme) and the **previous dark theme** (pure black page /
pure white ink), via a toggle in a slim top bar that is visible on every route at all times.

The toggle's icons are the centrepiece: a **sun** and a **moon** drawn in the style of an
Albrecht Dürer engraving — anthropomorphic celestial faces, strong contour lines, fine hatching,
alternating straight and flame-like rays.

## Non-goals

- Do **not** add a third "system/auto" mode or a `prefers-color-scheme` media query. Two explicit
  modes only, chosen by the user, remembered across visits.
- Do **not** restyle, re-lay-out, or reword any page. The only new UI is the top bar + toggle.
- Do **not** touch auth/session logic, Ghost routing, nginx templates, `server.js`,
  `vite.config.ts`, or the Ghost Portal patch script's ordering in `index.html`.
- Do **not** add analytics events for the toggle. (Deliberately out of scope this round.)
- Do **not** commit or push.

---

## Part 1 — Make the theme actually switchable (do this FIRST)

This is the part that silently breaks if you skip it. **27 hard-coded brown literals** currently
live in inline JS styles. They were written as literal `rgba(36, 26, 20, A)` because at the time
there was only one theme. Under a toggle they will stay brown on the dark theme — invisible
text on black. Every one of them must become a CSS-variable alpha ramp.

### 1a. Convert the hard-coded literals

Replace every `rgba(36, 26, 20, A)` with `rgba(var(--color-text-rgb), A)`, preserving the alpha
exactly. This works in React inline styles and in imperative `element.style.x = '...'` assignments —
`var()` substitution applies to any property value, including ones set via the style attribute.

Exact sites (27 total):

- `src/components/Link.tsx` — L24 (`0.3`), L32 (`0.5`), L75 (`0.5`)
- `src/Video.tsx` — L38 (`0.2`)
- `src/Connect.tsx` — L521/522, 539/540, 557/558, 575/576 (`0.4` borders, `0.9` colors)
- `src/Listen.tsx` — L217 (`0.7`), 221 (`0.25`), 233 (`0.3`), 242 (`0.7`), 259 (`0.2`), 319 (`0.3`),
  323 (`0.08`), 325 (`0.08`), 346 (`0.5`), 354 (`0.5`), 361 (`0.3`), 370 (`0.2`), 377 (`0.3`),
  390 (`0.8`), 407 (`0.1`)

Leave existing `var(--color-text)` / `var(--color-bg)` usages alone — they already switch.

Verify with `grep -rnE "rgba\(36, ?26, ?20" src` → must return **zero** hits when you are done.

The two selected-row tints (Listen L323/L325) are the one place where the light and dark themes
genuinely want different alphas (`0.08` light, `0.10` dark — brown-on-beige reads heavier than
white-on-black at the same alpha). Introduce a dedicated token for these instead of an alpha ramp:

```
backgroundColor: currentTrackId === track.id ? 'var(--tint-selected)' : 'transparent'
```

with `--tint-selected: rgba(36, 26, 20, 0.08)` on light and `rgba(255, 255, 255, 0.1)` on dark.

### 1b. Restructure the tokens into two themes

In `src/index.css`, split `:root` into a light set and a dark set, keyed off a `data-theme`
attribute on `<html>`. Keep `--font-mono` and the brand colors (`--color-warm-narrative`,
`--color-gentle-bond`, `--color-inspired-path`, and the three role aliases) in a shared block —
they are theme-independent.

```css
:root {                      /* shared: fonts + brand colors */ }

html[data-theme="light"] {
  --color-bg: #F5F0E6;
  --color-text: #241A14;
  --color-accent: #241A14;
  --color-bg-rgb: 245, 240, 230;
  --color-text-rgb: 36, 26, 20;
  --color-surface-raised: #FFFCF5;
  --color-on-surface-raised: #241A14;
  --color-surface-sunken: #EBE3D5;
  --color-error: #8C2F2F;
  --tint-selected: rgba(36, 26, 20, 0.08);
  color-scheme: light;
}

html[data-theme="dark"] {
  --color-bg: #000000;
  --color-text: #ffffff;
  --color-accent: #ffffff;
  --color-bg-rgb: 0, 0, 0;
  --color-text-rgb: 255, 255, 255;
  --color-surface-raised: #EDEDED;
  --color-on-surface-raised: #101010;
  --color-surface-sunken: #0A0A0A;
  --color-error: #FFB4B4;
  --tint-selected: rgba(255, 255, 255, 0.1);
  color-scheme: dark;
}
```

The dark values above are chosen to restore the **original** pre-inversion appearance: black page,
white ink, the light `.connect-auth-input` with near-black text, the dark textarea/tooltip surface,
and the pale-red error text.

**`--color-on-surface-raised` is not optional.** `.connect-auth-input` currently sets
`color: var(--color-text)`. On the dark theme that resolves to white — white text inside a
near-white input box. Change that rule to `color: var(--color-on-surface-raised)`.

Note: `color-scheme` moves out of the `html { }` rule into the two theme blocks. Remove the now
duplicate `color-scheme: light` from the plain `html` rule.

### 1c. Theme module

New file `src/utils/theme.ts`:

- `export type Theme = 'light' | 'dark'`
- `const STORAGE_KEY = 'catsky_theme'`
- `export const DEFAULT_THEME: Theme = 'light'` — the light theme is the site's new default look,
  so a first-time visitor with no stored preference gets light.
- `getStoredTheme(): Theme | null` — reads localStorage, returns `null` for missing **or malformed**
  values (anything that isn't exactly `'light'`/`'dark'`). Wrap in try/catch: localStorage throws in
  Safari private mode and some embedded webviews, and a throw here must not break the page.
- `resolveInitialTheme(): Theme` — `getStoredTheme() ?? DEFAULT_THEME`.
- `applyTheme(theme: Theme): void` — sets `document.documentElement.dataset.theme` and updates the
  `<meta name="theme-color">` content to `#F5F0E6` / `#000000`.
- `storeTheme(theme: Theme): void` — writes localStorage, try/catch guarded.
- Guard every DOM/storage access with `typeof window === 'undefined'` so the module is import-safe.

Export it from `src/utils/index.ts` alongside the existing utils.

### 1d. No flash of the wrong theme

`index.html` must resolve the theme **before first paint**, or every dark-theme user gets a beige
flash on load. In `<head>`:

1. Add `<meta name="theme-color" content="#F5F0E6" />` — already present, leave it; the JS updates it.
2. Immediately **before** the existing critical `<style>` block, add a tiny inline script:

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('catsky_theme');
      document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
</script>
```

3. Rewrite the critical first-paint style so it covers both themes:

```css
html, body { background: #F5F0E6; color: #241A14; margin: 0; }
html[data-theme="dark"], html[data-theme="dark"] body { background: #000; color: #fff; }
```

This script is independent of the Ghost Portal patch script and must sit **above** it. Do not
reorder, modify, or wrap anything else in `index.html` — the Portal script order is load-bearing
(`AGENTS.md` §4).

---

## Part 2 — The Dürer sun and moon icons

This is the part worth spending effort on. A generic sun-with-8-spokes and a plain crescent is a
fail. The reference is Renaissance engraving/woodcut: **Dürer's** celestial bodies have faces,
their light is directional, and their shading is built from fine parallel hatch strokes.

Create `src/components/ThemeIcons.tsx` exporting `SunIcon` and `MoonIcon` as React components.

### Shared technical constraints (these are hard requirements)

- `viewBox="0 0 32 32"`, rendered at **28×28** in the toggle.
- `fill="none"`, `stroke="currentColor"`, `stroke-width="1.1"`, `stroke-linecap="round"`,
  `stroke-linejoin="round"`. Using `currentColor` means the icons inherit the theme's ink for free —
  never hard-code a color in the SVG.
- `aria-hidden="true"` and `focusable="false"` on the `<svg>`; the button carries the accessible name.
- Accept and spread a `className` / `style` prop so the toggle can size them.
- **Legibility floor:** at 28px, one SVG unit ≈ 0.875 device px. No two strokes may sit closer than
  **1.2 units** apart, and no detail may be smaller than **1.5 units**. Anything finer turns into
  grey mush. This constraint outranks fidelity — if a hatching pass would violate it, use fewer,
  more deliberate strokes. Dürer's authority comes from confident line economy, not from cramming.
- Both icons must sit on the same optical weight so the toggle doesn't jump when it swaps.

### SunIcon — art direction

- Central disc, radius ≈ 7 units, centred at (16, 16), drawn as a full circle contour.
- **A face.** Serene and frontal, not a smiley: two closed/downcast eyes as short shallow arcs, a
  short vertical nose stroke, and a small calm mouth curve. Renaissance sun faces are solemn.
- **Rays, alternating.** 8 straight tapered spikes at the cardinal/intercardinal angles, and 8
  wavy flame-like rays between them (16 total, every 22.5°). The alternation of "spike / flame" is
  the single most recognisably period-correct detail — do not use 16 identical spokes.
- **Directional hatching.** Dürer lights his subjects from the upper left, so add 3–4 short curved
  hatch strokes inside the disc's **lower-right** rim only, following the curvature. Never hatch
  the whole disc.

### MoonIcon — art direction

- Waxing crescent, the **lit limb facing left**, occupying roughly the same optical area as the sun's
  disc so the two icons balance.
- **A face in profile** on the lit inner edge: brow, nose, lips and chin described by the crescent's
  inner contour itself, so the profile emerges from the shape rather than being drawn on top of it.
  Add one closed eye as a short arc.
- **Hatching** on the shadow side: 3–5 strokes following the outer curve, spaced per the legibility
  floor above.
- **Two six-pointed stars** (the classic engraved asterisk form: three crossed lines, not a filled
  polygon) placed upper-right and lower-right, at clearly different sizes so it reads as depth.

Getting these right is iterative. Render them, look at them at 28px, and refine — do not ship the
first draft. If a detail cannot survive 28px, cut it rather than leaving it as noise.

---

## Part 3 — Top bar and toggle

### `src/components/ThemeToggle.tsx`

- `useState<Theme>(() => resolveInitialTheme())`, and a `useEffect` that calls `applyTheme` +
  `storeTheme` when it changes.
- Renders a single `<button type="button" class="theme-toggle">`.
- **Shows the icon of the mode it will switch you TO** — moon while light, sun while dark. This is
  the conventional pattern and the label removes any ambiguity.
- `aria-label` and `title`: `"switch to dark theme"` / `"switch to light theme"`, matching the state.
- Do **not** use `aria-pressed` — this is a mode switch, not a two-state press, and the changing
  label already conveys state.

### `src/components/TopBar.tsx`

- `<header class="top-bar">` containing the toggle, right-aligned.
- Renders on every route.

### Mounting

Mount `<TopBar />` in `src/router/Router.tsx` so it is route-independent: wrap the existing
`switch` result in a fragment with `<TopBar />` as the first child. Keep the switch itself
untouched. `src/router/Router.test.tsx` has 19 tests — run them; if any assert on the rendered
root shape, update the assertion, do not delete the test.

### CSS (`src/index.css`)

```css
:root { --topbar-height: 3rem; }

.top-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 1rem;
  background: var(--color-bg);
  z-index: 1500;
  box-sizing: border-box;
}
```

`z-index: 1500` sits above `.ghost-portal-triggers` (1000) and below `#ghost-portal-root` (999999),
so the Ghost Portal overlay still covers the bar as it should.

Style `.theme-toggle` to match the existing button language: transparent background, `1px solid
rgba(var(--color-text-rgb), 0.3)` border, `color: var(--color-text)`, square-ish padding, and the
same invert-on-hover the rest of the site uses (`background: var(--color-text); color:
var(--color-bg);`). Give it a `:focus-visible` outline consistent with the `.connect-auth-input:focus`
rule (`2px solid var(--color-accent)`, `outline-offset: 2px`). Wrap any transition in
`@media (prefers-reduced-motion: no-preference)`.

### Preventing overlap — verify this, don't assume

`.app-container` is `position: fixed; inset: 0` and vertically centres its content, so a fixed bar
will overlap top-aligned routes. Two routes top-align and are the real risk:

- `/listen` — `.listen-page-shell { align-items: flex-start }`, and its inner scroll container is
  `height: 100dvh`. That height **must** become `calc(100dvh - var(--topbar-height))` or the page
  will overflow by exactly the bar's height.
- `/connect` — `body.route-connect .app-container { align-items: flex-start }` with
  `padding-top: 2rem` on `.connect-content`.

Add `padding-top: var(--topbar-height)` to `.app-container` (it already has
`box-sizing: border-box`). Then **load every route and confirm nothing is clipped or hidden behind
the bar**, at desktop (1440×900) and mobile (390×844) widths:
`/`, `/listen`, `/watch`, `/video`, `/connect`, `/mission`, `/welcome`.

---

## Tests (required)

Add real unit tests — this is logic worth covering:

- `src/utils/theme.test.ts`: default when storage is empty; round-trips a stored value; falls back to
  the default on a malformed stored value (`'purple'`, `''`, `'null'`); does not throw when
  localStorage access throws.
- `src/components/ThemeToggle.test.tsx`: renders with the correct initial icon + label; clicking
  flips `document.documentElement.dataset.theme`; the choice is persisted; the accessible label
  updates to describe the new action.

Run the full suite. The existing 84 tests must stay green.

## Verification

```bash
npm test          # must pass, including the new tests
npm run build     # must pass
npm run lint      # will still fail on the PRE-EXISTING src/utils/analytics.ts:52
                  # no-extra-semi error in an untouched file — leave it, but confirm
                  # you introduced no NEW lint errors
```

**Do not attempt Playwright, `npm run test:e2e:landing`, or `npm run screenshots:journey.`** Chromium
cannot launch inside your sandbox, and that suite additionally fails 24/26 on unmodified HEAD in this
workspace for environmental reasons (the Vite→Ghost proxy never reaches `networkidle`). I will do all
browser verification and screenshots myself. Spending turns fighting it is wasted effort — say so
plainly in your summary instead.

## Acceptance criteria

- [ ] `grep -rnE "rgba\(36, ?26, ?20" src` returns zero hits.
- [ ] Toggling flips the entire UI — including every inline-styled border, dim text, track row, and
      textarea — with nothing left stranded in the other theme's colors.
- [ ] Dark theme visually restores the original pre-inversion look (black page, white ink, light
      input box with near-black text).
- [ ] The choice survives a reload with no flash of the wrong theme.
- [ ] A malformed `catsky_theme` value falls back to light instead of breaking the page.
- [ ] The top bar is present on all 7 routes and overlaps nothing at 1440×900 and 390×844.
- [ ] The sun and moon are legibly Dürer-esque at 28px — faces present, rays alternating
      spike/flame, hatching directional and not mush.
- [ ] Keyboard: the toggle is tabbable, has a visible focus ring, and activates on Enter and Space.
- [ ] `npm test` and `npm run build` pass; no new lint errors.
- [ ] Nothing committed or pushed.

## Documentation (`AGENTS.md` §6)

- `docs/UX_UI_DOCUMENTATION.md` — extend the "Visual theme" section: document both token sets, the
  `data-theme` attribute contract, the `catsky_theme` storage key, and the default.
- `ARCHITECTURE.md` — the "Styling model" section lists the styling approach and the
  `src/components/` primitives; add the theme module, `TopBar`, and `ThemeToggle`.
- `README.md` — it currently describes a single light theme; note that both themes ship with a toggle.
- Only fix statements that are now false. Do not rewrite these docs wholesale.

## Final summary to print

- Files changed and what changed in each.
- Exact test/build commands and their **real** results.
- How you approached the icons and what you cut to keep them legible at 28px.
- Anything you could not complete or that needs my review.
