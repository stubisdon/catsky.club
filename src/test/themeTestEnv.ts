import { vi } from 'vitest'

/**
 * Helpers for making automatic theme resolution deterministic in unit tests.
 * Without them the resolved theme depends on the machine's timezone and the real time of day.
 */

/** Force `Intl.DateTimeFormat().resolvedOptions().timeZone`. Pass `undefined` for "unknown". */
export function stubTimezone(timeZone: string | undefined): void {
  const formatter = { resolvedOptions: () => ({ timeZone }) } as unknown as Intl.DateTimeFormat

  // Intl.DateTimeFormat is both callable and constructable, so the spy's inferred return type is
  // useless here; only resolvedOptions() is ever touched by the code under test.
  const spy = vi.spyOn(Intl, 'DateTimeFormat') as unknown as {
    mockImplementation: (implementation: () => Intl.DateTimeFormat) => void
  }
  spy.mockImplementation(() => formatter)
}

export type ColorSchemePreference = 'dark' | 'light' | null

export interface ColorSchemeControl {
  /** Change the reported preference and notify every registered `change` listener. */
  set(preference: ColorSchemePreference): void
  listenerCount(): number
}

/** Replace `window.matchMedia` with a controllable `prefers-color-scheme` stub. */
export function stubPrefersColorScheme(preference: ColorSchemePreference): ColorSchemeControl {
  const listeners = new Set<() => void>()
  let current = preference

  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    matches: current !== null && query.includes(`prefers-color-scheme: ${current}`),
    addEventListener: (_type: string, listener: () => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_type: string, listener: () => void) => {
      listeners.delete(listener)
    },
  }))

  return {
    set(next: ColorSchemePreference) {
      current = next
      listeners.forEach((listener) => listener())
    },
    listenerCount: () => listeners.size,
  }
}

/** Remove `window.matchMedia` entirely, as in very old or embedded webviews. */
export function stubMissingMatchMedia(): void {
  vi.stubGlobal('matchMedia', undefined)
}
