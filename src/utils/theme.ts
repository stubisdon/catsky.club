import { isDaylight, nextSolarTransition } from './solar'
import { coordsForTimezone } from './timezoneCoords'

/** The *resolved* value that reaches `<html data-theme>`. Never stores 'system'. */
export type Theme = 'light' | 'dark'

/** The visitor's *preference*. 'system' hands the decision to the OS, then to the sun. */
export type ThemeMode = 'light' | 'dark' | 'system'

/** Which step of the resolution chain produced the active theme. */
export type ThemeSource = 'preference' | 'system' | 'solar' | 'default'

export interface ResolvedTheme {
  theme: Theme
  source: ThemeSource
  /** When the sun next crosses the horizon, so callers can re-resolve then. Solar source only. */
  nextTransition: Date | null
}

export interface ResolveOptions {
  /** Override the stored preference. Only used by tests and the toggle's own click handler. */
  mode?: ThemeMode
  /** Override the detected IANA timezone. Only used by tests; production detects it. */
  timezone?: string | null
}

const STORAGE_KEY = 'catsky_theme'

/**
 * Cache of the *automatically* resolved theme, deliberately under its own key so a value the
 * visitor never chose can never be mistaken for an explicit choice. `catsky_theme` is only ever
 * written by a click on the toggle.
 */
const AUTO_CACHE_KEY = 'catsky_theme_auto'

/** A cached auto theme is never trusted longer than this, so a sleeping machine still corrects. */
export const AUTO_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000

export const DEFAULT_THEME: Theme = 'light'

/** Absent or malformed preference means "match system", not "light". */
export const DEFAULT_MODE: ThemeMode = 'system'

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

function isMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

/**
 * The stored preference. `'light'` / `'dark'` values written before the mode existed are already
 * valid modes, so no migration is needed or wanted.
 */
export function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return DEFAULT_MODE

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isMode(stored) ? stored : DEFAULT_MODE
  } catch {
    return DEFAULT_MODE
  }
}

/** The only writer of `catsky_theme`. Must only ever be reached from a click on the toggle. */
export function storeMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Storage may be unavailable in private browsing and embedded webviews.
  }
}

/** Thin wrapper over `getStoredMode`: the pinned theme, or `null` when the mode is 'system'. */
export function getStoredTheme(): Theme | null {
  const mode = getStoredMode()
  return isTheme(mode) ? mode : null
}

/** Thin wrapper over `storeMode` for callers that only ever pin a concrete theme. */
export function storeTheme(theme: Theme): void {
  storeMode(theme)
}

export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return

  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    theme === 'dark' ? '#000000' : '#F5F0E6',
  )
}

/**
 * The visitor's IANA timezone, or `null` when it cannot be read.
 * Never `navigator.geolocation`: an immersive landing page must not raise a permission prompt.
 */
export function getTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

/**
 * The OS `prefers-color-scheme` setting, or `null` when it is absent or set to no-preference.
 *
 * Both queries are asked on purpose. Assuming `light` when the dark query misses would make the
 * solar step below it dead code, because it would never be reached.
 */
export function getSystemTheme(): Theme | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null

  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
    return null
  } catch {
    return null
  }
}

/**
 * Light while the sun is above the horizon at the visitor's timezone, dark after sunset.
 * `null` when the timezone is unknown, so the caller can fall through to the default.
 */
export function getSolarTheme(
  now: Date = new Date(),
  timezone: string | null = getTimezone(),
): { theme: Theme; nextTransition: Date | null } | null {
  const coords = coordsForTimezone(timezone)
  if (!coords) return null

  const [latitude, longitude] = coords

  return {
    theme: isDaylight(now, latitude, longitude) ? 'light' : 'dark',
    nextTransition: nextSolarTransition(now, latitude, longitude),
  }
}

/**
 * Precedence, highest first:
 *
 *   1. stored preference       (`catsky_theme` = 'light' | 'dark', only ever written by a click)
 *   2. OS prefers-color-scheme (when the preference is 'system', the default)
 *   3. sun position            (IANA timezone → coordinates → solar altitude)
 *   4. DEFAULT_THEME
 *
 * Modern browsers essentially always report light or dark for `prefers-color-scheme`, so step 3
 * is a genuine fallback rather than the common path. That ordering is deliberate.
 */
export function resolveAutoTheme(
  now: Date = new Date(),
  options: ResolveOptions = {},
): ResolvedTheme {
  const mode = options.mode ?? getStoredMode()

  if (mode === 'light' || mode === 'dark') {
    return { theme: mode, source: 'preference', nextTransition: null }
  }

  const system = getSystemTheme()
  if (system) return { theme: system, source: 'system', nextTransition: null }

  const solar = getSolarTheme(
    now,
    options.timezone === undefined ? getTimezone() : options.timezone,
  )
  if (solar) return { theme: solar.theme, source: 'solar', nextTransition: solar.nextTransition }

  return { theme: DEFAULT_THEME, source: 'default', nextTransition: null }
}

export function resolveInitialTheme(): Theme {
  return resolveAutoTheme().theme
}

/** Only an automatic resolution may be cached; an explicit preference never is. */
export function isCacheableSource(source: ThemeSource): boolean {
  return source === 'system' || source === 'solar'
}

/**
 * Remember an automatically resolved theme so the pre-paint script in `index.html` can reuse it
 * without running solar math in a render-blocking script. Never written to `catsky_theme`.
 */
export function cacheAutoTheme(theme: Theme, validUntil: Date | null, now: Date = new Date()): void {
  if (typeof window === 'undefined') return

  const ceiling = now.getTime() + AUTO_CACHE_MAX_AGE_MS
  const expiry = validUntil ? Math.min(validUntil.getTime(), ceiling) : ceiling

  try {
    window.localStorage.setItem(AUTO_CACHE_KEY, JSON.stringify({ theme, validUntil: expiry }))
  } catch {
    // Storage may be unavailable in private browsing and embedded webviews.
  }
}

/** The cached auto theme, or `null` when it is missing, malformed, or past its validity window. */
export function readCachedAutoTheme(now: Date = new Date()): Theme | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(AUTO_CACHE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    const { theme, validUntil } = parsed as { theme?: unknown; validUntil?: unknown }
    if (!isTheme(theme)) return null
    if (typeof validUntil !== 'number' || validUntil <= now.getTime()) return null

    return theme
  } catch {
    return null
  }
}
