import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUTO_CACHE_MAX_AGE_MS,
  cacheAutoTheme,
  DEFAULT_MODE,
  DEFAULT_THEME,
  getSolarTheme,
  getStoredMode,
  getStoredTheme,
  getSystemTheme,
  getTimezone,
  isCacheableSource,
  readCachedAutoTheme,
  resolveAutoTheme,
  resolveInitialTheme,
  storeMode,
  storeTheme,
} from './theme'
import {
  stubMissingMatchMedia,
  stubPrefersColorScheme,
  stubTimezone,
} from '../test/themeTestEnv'

// Resolution is automatic now, so every test needs a known world. The default here is the
// least opinionated one: unknown timezone, no OS preference — which lands on DEFAULT_THEME.
beforeEach(() => {
  stubTimezone(undefined)
  stubPrefersColorScheme(null)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('theme storage', () => {
  beforeEach(() => window.localStorage.clear())

  it('uses the light default when storage is empty', () => {
    expect(resolveInitialTheme()).toBe(DEFAULT_THEME)
  })

  it('round-trips a stored theme', () => {
    storeTheme('dark')
    expect(getStoredTheme()).toBe('dark')
    expect(resolveInitialTheme()).toBe('dark')
  })

  it.each(['purple', '', 'null'])('falls back to light for malformed value %j', (value) => {
    window.localStorage.setItem('catsky_theme', value)
    expect(getStoredTheme()).toBeNull()
    expect(resolveInitialTheme()).toBe('light')
  })

  it('does not throw when localStorage is unavailable', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })

    expect(getStoredTheme()).toBeNull()
    expect(getStoredMode()).toBe(DEFAULT_MODE)
    expect(() => storeTheme('dark')).not.toThrow()
    expect(() => storeMode('system')).not.toThrow()

    getItem.mockRestore()
    setItem.mockRestore()
  })
})

describe('theme mode storage', () => {
  beforeEach(() => window.localStorage.clear())

  it('defaults to matching the system when nothing is stored', () => {
    expect(DEFAULT_MODE).toBe('system')
    expect(getStoredMode()).toBe('system')
  })

  it.each(['light', 'dark', 'system'] as const)('round-trips the %s mode', (mode) => {
    storeMode(mode)
    expect(getStoredMode()).toBe(mode)
    expect(window.localStorage.getItem('catsky_theme')).toBe(mode)
  })

  it.each(['purple', '', 'null'])('falls back to system for malformed value %j', (value) => {
    window.localStorage.setItem('catsky_theme', value)
    expect(getStoredMode()).toBe('system')
  })

  // Values written before the mode existed are already valid modes, so no migration is needed.
  it.each(['light', 'dark'] as const)('reads a pre-mode %s value as that mode', (legacy) => {
    window.localStorage.setItem('catsky_theme', legacy)

    expect(getStoredMode()).toBe(legacy)
    expect(getStoredTheme()).toBe(legacy)
  })

  it('reports no pinned theme while the mode is system', () => {
    storeMode('system')
    expect(getStoredTheme()).toBeNull()
  })
})

describe('getTimezone', () => {
  it('reads the IANA zone from Intl', () => {
    stubTimezone('Europe/London')
    expect(getTimezone()).toBe('Europe/London')
  })

  it('returns null when Intl reports nothing usable', () => {
    stubTimezone(undefined)
    expect(getTimezone()).toBeNull()
  })

  it('returns null instead of throwing when Intl throws', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(getTimezone()).toBeNull()
  })
})

describe('getSystemTheme', () => {
  it.each(['dark', 'light'] as const)('reports the OS preference %s', (preference) => {
    stubPrefersColorScheme(preference)
    expect(getSystemTheme()).toBe(preference)
  })

  it('returns null when no preference is expressed', () => {
    stubPrefersColorScheme(null)
    expect(getSystemTheme()).toBeNull()
  })

  it('does not throw when matchMedia is missing', () => {
    stubMissingMatchMedia()
    expect(() => getSystemTheme()).not.toThrow()
    expect(getSystemTheme()).toBeNull()
  })

  it('does not throw when matchMedia throws', () => {
    vi.stubGlobal('matchMedia', () => {
      throw new Error('blocked')
    })
    expect(() => getSystemTheme()).not.toThrow()
    expect(getSystemTheme()).toBeNull()
  })
})

describe('getSolarTheme', () => {
  it('is light while the sun is up in the visitor timezone', () => {
    const solar = getSolarTheme(new Date('2026-06-21T12:00:00Z'), 'Europe/London')

    expect(solar?.theme).toBe('light')
    expect(solar?.nextTransition?.getTime()).toBeGreaterThan(
      new Date('2026-06-21T12:00:00Z').getTime(),
    )
  })

  it('is dark after sunset in the visitor timezone', () => {
    expect(getSolarTheme(new Date('2026-06-21T23:00:00Z'), 'Europe/London')?.theme).toBe('dark')
  })

  it('reads longitude, not UTC time: Sydney is light while London is dark', () => {
    const midnightInLondon = new Date('2026-06-21T23:00:00Z')

    expect(getSolarTheme(midnightInLondon, 'Europe/London')?.theme).toBe('dark')
    expect(getSolarTheme(midnightInLondon, 'Australia/Sydney')?.theme).toBe('light')
  })

  it('resolves polar night to dark with no transition to wait for', () => {
    const solar = getSolarTheme(new Date('2026-01-15T12:00:00Z'), 'Arctic/Longyearbyen')

    expect(solar?.theme).toBe('dark')
    expect(solar?.nextTransition).toBeNull()
  })

  it('returns null for an unknown timezone', () => {
    expect(getSolarTheme(new Date('2026-06-21T12:00:00Z'), 'Mars/Olympus_Mons')).toBeNull()
    expect(getSolarTheme(new Date('2026-06-21T12:00:00Z'), null)).toBeNull()
  })

  it('detects the timezone itself when none is passed', () => {
    stubTimezone('Europe/London')
    expect(getSolarTheme(new Date('2026-06-21T12:00:00Z'))?.theme).toBe('light')
  })
})

/**
 * Precedence under test, highest first:
 *   stored preference > OS prefers-color-scheme > sun > light.
 *
 * "The OS expresses no preference" is simulated with `stubPrefersColorScheme(null)`, which makes
 * both the dark and the light media query report `matches: false`. That is the only state in which
 * the solar step is ever reached.
 */
describe('resolveAutoTheme precedence', () => {
  const LONDON_NOON = new Date('2026-06-21T12:00:00Z')
  const LONDON_MIDNIGHT = new Date('2026-06-21T23:00:00Z')

  it('lets a stored preference beat the OS', () => {
    storeMode('dark')
    stubPrefersColorScheme('light')

    expect(resolveAutoTheme(LONDON_NOON, { timezone: 'Europe/London' })).toMatchObject({
      theme: 'dark',
      source: 'preference',
      nextTransition: null,
    })
  })

  it('lets a stored preference beat the sun', () => {
    storeMode('light')
    stubPrefersColorScheme(null)

    expect(resolveAutoTheme(LONDON_MIDNIGHT, { timezone: 'Europe/London' })).toMatchObject({
      theme: 'light',
      source: 'preference',
      nextTransition: null,
    })
  })

  it('consults the world again once the mode goes back to system', () => {
    storeMode('system')
    stubPrefersColorScheme('dark')

    expect(resolveAutoTheme(LONDON_NOON, { timezone: 'Europe/London' })).toMatchObject({
      theme: 'dark',
      source: 'system',
    })
  })

  it('lets the OS beat the sun at midday', () => {
    // Inverted deliberately: the sun is up over London, and the OS still wins.
    stubPrefersColorScheme('dark')

    expect(resolveAutoTheme(LONDON_NOON, { timezone: 'Europe/London' })).toMatchObject({
      theme: 'dark',
      source: 'system',
      nextTransition: null,
    })
  })

  it('lets the OS beat the sun after sunset too', () => {
    stubPrefersColorScheme('light')

    expect(resolveAutoTheme(LONDON_MIDNIGHT, { timezone: 'Europe/London' })).toMatchObject({
      theme: 'light',
      source: 'system',
    })
  })

  it('reaches the sun only when the OS expresses no preference', () => {
    stubPrefersColorScheme(null)

    const noon = resolveAutoTheme(LONDON_NOON, { timezone: 'Europe/London' })
    expect(noon).toMatchObject({ theme: 'light', source: 'solar' })
    expect(noon.nextTransition?.getTime()).toBeGreaterThan(LONDON_NOON.getTime())

    expect(resolveAutoTheme(LONDON_MIDNIGHT, { timezone: 'Europe/London' })).toMatchObject({
      theme: 'dark',
      source: 'solar',
    })
  })

  it('reaches the sun when matchMedia is missing entirely', () => {
    stubMissingMatchMedia()

    expect(resolveAutoTheme(LONDON_MIDNIGHT, { timezone: 'Europe/London' })).toMatchObject({
      theme: 'dark',
      source: 'solar',
    })
  })

  it.each(['dark', 'light'] as const)(
    'uses the OS preference %s even when the timezone is unknown',
    (preference) => {
      stubPrefersColorScheme(preference)

      expect(resolveAutoTheme(LONDON_NOON, { timezone: 'Mars/Olympus_Mons' })).toMatchObject({
        theme: preference,
        source: 'system',
      })
    },
  )

  it('falls back to the light default when nothing is known', () => {
    stubPrefersColorScheme(null)

    expect(resolveAutoTheme(LONDON_NOON, { timezone: null })).toMatchObject({
      theme: DEFAULT_THEME,
      source: 'default',
    })
  })

  it('does not throw when matchMedia is absent and the zone is unknown', () => {
    stubMissingMatchMedia()

    expect(() => resolveAutoTheme(LONDON_NOON, { timezone: null })).not.toThrow()
    expect(resolveAutoTheme(LONDON_NOON, { timezone: null }).theme).toBe(DEFAULT_THEME)
  })

  it('does not throw when storage is unavailable', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    stubPrefersColorScheme('dark')

    expect(() => resolveAutoTheme(LONDON_NOON, { timezone: 'Europe/London' })).not.toThrow()
    expect(resolveAutoTheme(LONDON_NOON, { timezone: 'Europe/London' }).source).toBe('system')

    getItem.mockRestore()
  })

  it('backs resolveInitialTheme with the detected timezone when the OS is silent', () => {
    // Fake timers replace Intl.DateTimeFormat, so they must go in before the timezone stub.
    vi.useFakeTimers()
    stubTimezone('Europe/London')
    stubPrefersColorScheme(null)
    vi.setSystemTime(new Date('2026-06-21T23:00:00Z'))

    expect(resolveInitialTheme()).toBe('dark')

    vi.setSystemTime(new Date('2026-06-21T12:00:00Z'))
    expect(resolveInitialTheme()).toBe('light')

    vi.useRealTimers()
  })

  it('only ever caches an automatic resolution', () => {
    expect(isCacheableSource('system')).toBe(true)
    expect(isCacheableSource('solar')).toBe(true)
    expect(isCacheableSource('preference')).toBe(false)
    expect(isCacheableSource('default')).toBe(false)
  })
})

describe('automatic theme cache', () => {
  const now = new Date('2026-06-21T12:00:00Z')

  it('round-trips a cached theme while it is still valid', () => {
    cacheAutoTheme('dark', new Date('2026-06-21T13:00:00Z'), now)

    expect(readCachedAutoTheme(now)).toBe('dark')
  })

  it('expires the cache after its validity window', () => {
    cacheAutoTheme('dark', new Date('2026-06-21T13:00:00Z'), now)

    expect(readCachedAutoTheme(new Date('2026-06-21T13:00:01Z'))).toBeNull()
  })

  it('clamps an open-ended cache to the maximum age', () => {
    cacheAutoTheme('dark', null, now)

    const stored = JSON.parse(window.localStorage.getItem('catsky_theme_auto') as string)
    expect(stored.validUntil).toBe(now.getTime() + AUTO_CACHE_MAX_AGE_MS)
  })

  it('clamps a distant transition to the maximum age', () => {
    cacheAutoTheme('light', new Date('2026-06-30T00:00:00Z'), now)

    const stored = JSON.parse(window.localStorage.getItem('catsky_theme_auto') as string)
    expect(stored.validUntil).toBe(now.getTime() + AUTO_CACHE_MAX_AGE_MS)
  })

  it('never leaks the automatic value into the explicit-choice key', () => {
    cacheAutoTheme('dark', null, now)

    expect(window.localStorage.getItem('catsky_theme')).toBeNull()
    expect(getStoredTheme()).toBeNull()
    expect(window.localStorage.getItem('catsky_theme_auto')).toContain('dark')
    expect(getStoredMode()).toBe(DEFAULT_MODE)
    expect(resolveAutoTheme(now, { timezone: null }).source).not.toBe('preference')
  })

  it.each(['not json', '{}', '{"theme":"purple","validUntil":99999999999999}', 'null'])(
    'ignores malformed cache entry %j',
    (raw) => {
      window.localStorage.setItem('catsky_theme_auto', raw)
      expect(readCachedAutoTheme(now)).toBeNull()
    },
  )

  it('does not throw when storage is unavailable', () => {
    // Blocked storage in private browsing throws on access, not just on write.
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })

    expect(() => cacheAutoTheme('dark', null, now)).not.toThrow()
    expect(readCachedAutoTheme(now)).toBeNull()
    expect(getStoredTheme()).toBeNull()
  })
})
