# Theme: user preference → system setting → sun

**Date:** 2026-08-18
**Branch:** `stubisdon/sunrise-based-theme` (fast-forwarded to `origin/main` @ `f7ac78f`)

## Goal

The visitor can set a theme preference of **light**, **dark**, or **match system**. That choice
wins. When it is "match system", the OS `prefers-color-scheme` setting decides. When the OS
reports no preference, fall back to **the sun**: light while the sun is above the horizon at the
visitor's location, dark after sunset.

## Precedence (final)

```
1. stored user preference   'light' | 'dark'      → used directly
2. OS prefers-color-scheme                        → when preference is 'system' (the default)
3. sun position                                   → when the OS reports no preference
4. 'light'                                        → DEFAULT_THEME, unchanged
```

**Consequence, stated once and then accepted:** modern browsers essentially always report either
`light` or `dark` for `prefers-color-scheme` — the `no-preference` value was dropped from the
spec. So in practice step 3 will rarely fire, and the sun logic is a genuine fallback rather than
the common path. This ordering is the user's explicit decision, made after the trade-off was
raised. Build it exactly this way.

`getSystemTheme()` must therefore detect no-preference *correctly* rather than assuming it: query
`(prefers-color-scheme: dark)` **and** `(prefers-color-scheme: light)`, and only return `null`
when neither matches. Guessing `light` when neither matches would make step 3 dead code outright.

## Starting state

Two layers already exist and must be reused, not rebuilt:

**Already on `origin/main` (PR #125, merged 2026-08-17):**
- `src/utils/theme.ts` — `Theme`, `getStoredTheme`, `resolveInitialTheme`, `applyTheme`, `storeTheme`.
- `src/components/ThemeToggle.tsx` (two-state button), `src/components/ThemeIcons.tsx`
  (hand-drawn Dürer-style `SunIcon` / `MoonIcon`), `src/components/TopBar.tsx`
  (mounted globally at `src/router/Router.tsx:135`).
- `src/index.css` — full token set, `html[data-theme="light"]` = `#F5F0E6`/`#241A14`,
  `html[data-theme="dark"]` = `#000`/`#fff`. `.top-bar` / `.theme-toggle` styles.
- `index.html` — pre-paint inline script, themed critical CSS, `<meta name="theme-color">`.

**Already in the working tree (uncommitted, from the previous pass — keep):**
- `src/utils/solar.ts` — NOAA sunrise/sunset: `sunTimesUTC`, `isDaylight`, `nextSolarTransition`.
- `src/utils/timezoneCoords.ts` — IANA zone → `[lat, lng]`, `coordsForTimezone`.
- `src/utils/solar.test.ts`, `src/utils/timezoneCoords.test.ts`, `src/test/themeTestEnv.ts`,
  `e2e/theme.spec.ts`, and the `test:e2e:theme` script in `package.json`.
- Reworked `src/utils/theme.ts` / `ThemeToggle.tsx` / `index.html` — these implemented the
  **old** precedence (sun above system, two-state toggle) and must be adapted, see below.

### Bug already fixed in the working tree — keep it fixed

`ThemeToggle.tsx` on main calls `storeTheme()` from a mount effect, so it pins a theme in
`localStorage` on first render that the visitor never chose. `storeTheme` must only ever be
called from the click handler. Keep the regression test asserting mount does not write.

## Changes from the previous pass

### 1. `src/utils/theme.ts` — preference becomes three-state

- Add `export type ThemeMode = 'light' | 'dark' | 'system'`. `Theme` stays `'light' | 'dark'`
  (the *resolved* value that reaches `data-theme`); do not conflate the two.
- `export const DEFAULT_MODE: ThemeMode = 'system'`.
- `getStoredMode(): ThemeMode` — reads `catsky_theme`, returns `DEFAULT_MODE` when absent or
  malformed. Existing stored `'light'`/`'dark'` values are already valid modes, so **no migration
  is needed**; do not write one.
- `storeMode(mode: ThemeMode)` — the only writer of `catsky_theme`.
- Keep `getStoredTheme` / `storeTheme` exported as thin wrappers if the existing tests depend on
  them, but the component must use the mode API.
- Replace the resolver chain so the mode gates it:
  - mode `'light'` → `{ theme: 'light', source: 'preference' }`
  - mode `'dark'` → `{ theme: 'dark', source: 'preference' }`
  - mode `'system'` → `getSystemTheme()` → else `getSolarTheme()` → else `DEFAULT_THEME`,
    with `source` of `'system'` / `'solar'` / `'default'`.
- Keep `nextTransition` on the result and keep it populated only for the `'solar'` source.
- Keep `cacheAutoTheme` / `readCachedAutoTheme` on the separate `catsky_theme_auto` key. Cache
  only when the source is `'solar'` or `'system'` — never when it came from an explicit preference.

### 2. `src/components/ThemeToggle.tsx` — three-state cycle

- Click cycles `light → dark → system → light`, writing `storeMode` on every click.
- **The icon now shows the current mode, not the next one.** With two states "next" was
  legible; with three it is not. `SunIcon` for light, `MoonIcon` for dark, the new `SystemIcon`
  for system. This is a deliberate change to existing behavior — update `ThemeToggle.test.tsx`
  accordingly.
- `aria-label` / `title` must name the current mode and the next, e.g.
  `theme: system — switch to light`. Keep the button a single `<button>`; do not introduce a
  dropdown, it does not fit the site's minimalism.
- Keep following the world only while mode is `'system'`: solar timer (each tick clamped to ≤ 6h
  so a slept-through sunset still corrects), `matchMedia('(prefers-color-scheme: dark)')` `change`,
  `visibilitychange`, `focus`. Tear all of it down on unmount and whenever mode leaves `'system'`.

### 3. `src/components/ThemeIcons.tsx` — add `SystemIcon`

A third glyph in the same hand-drawn woodcut style as the existing two: `viewBox="0 0 32 32"`,
`fill="none"`, `stroke="currentColor"`, `strokeWidth={1.1}`, round caps/joins, `aria-hidden`.
Suggested motif: a single disc split down the middle — spear-rayed sun on one half, carved
crescent on the other — so it reads as "both / automatic" next to the existing pair. Match the
existing line weight and the slight irregularity of the hand-drawn paths; do not drop in a
generic monitor or half-filled-circle icon, it will look pasted in from another set.

### 4. `index.html` — pre-paint script follows the same order

Read `catsky_theme` as a mode: `'light'`/`'dark'` → use directly; `'system'` or absent →
`matchMedia` dark, then `matchMedia` light, then the cached `catsky_theme_auto` value if still
inside its validity window, then `'light'`. Keep it small and dependency-free; do not inline the
solar math. **Do not touch or reorder the Ghost Portal patch block below it** (`AGENTS.md` §4).

### 5. Tests

- `src/utils/theme.test.ts` — rework the precedence matrix for the new order: preference beats
  system; system beats sun; sun only when `getSystemTheme()` returns `null` (simulate by making
  both media queries report `matches: false`); default when all fail. Keep the existing storage
  round-trip and throwing-`localStorage` tests passing.
- `src/components/ThemeToggle.test.tsx` — the three-state cycle and its icon/label at each step;
  mount does not write `catsky_theme`; a click does; while mode is `'system'` an OS change flips
  the theme; after choosing `'light'` or `'dark'`, neither an OS change nor a solar transition
  changes anything.
- `src/utils/solar.test.ts`, `src/utils/timezoneCoords.test.ts` — unchanged, keep passing.
- `e2e/theme.spec.ts` — update for the new precedence: `colorScheme: 'dark'` with the sun up now
  yields **dark** (system wins), which is the inverse of the previous assertion. Add: cycling to
  an explicit mode pins across reload; `data-theme` is already set at `domcontentloaded`.

### 6. Docs & evidence (`AGENTS.md` §6/§7/§9)

- `ARCHITECTURE.md` — document the three-state preference and the resolution chain.
- `AGENTS.md` §4 — add the `index.html` pre-paint theme script to the high-risk list.
- `npm run screenshots:journey` covering all three modes.

## Risks

- **Ghost Portal keeps its own colors** — the sign-in modal will not follow the theme. Out of
  scope; note it in the PR.
- **Stale pinned preference from the mount bug.** Anyone who loaded the site while PR #125 was
  live already has `catsky_theme` written. They will land on that pinned value and must click
  through to "system" once to get automatic behavior. Worth calling out when testing manually —
  clear `localStorage` before evaluating.
- **Regression surface** — run `npm run test:e2e:matrix`, not just the landing spec.
