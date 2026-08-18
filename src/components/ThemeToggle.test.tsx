import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  stubPrefersColorScheme,
  stubTimezone,
  type ColorSchemeControl,
} from '../test/themeTestEnv'
import ThemeToggle from './ThemeToggle'

// The label names the current mode first, then the one a click moves to.
const SYSTEM = 'theme: system — switch to light'
const LIGHT = 'theme: light — switch to dark'
const DARK = 'theme: dark — switch to system'

function toggle(name: string) {
  return screen.getByRole('button', { name })
}

function renderedIcon(): string | null {
  return screen.getByRole('button').querySelector('svg')?.getAttribute('data-icon') ?? null
}

// Unknown timezone + no OS preference keeps the component on DEFAULT_THEME, so the tests below
// describe the toggle rather than whatever the sun happens to be doing on the machine running them.
beforeEach(() => {
  stubTimezone(undefined)
  stubPrefersColorScheme(null)
  window.localStorage.clear()
  document.documentElement.dataset.theme = 'light'
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('ThemeToggle - three-state cycle', () => {
  it('starts in system mode and shows the system glyph', () => {
    render(<ThemeToggle />)

    expect(toggle(SYSTEM)).toContainHTML('<svg')
    expect(renderedIcon()).toBe('system')
  })

  it('cycles system → light → dark → system, icon and label following the current mode', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    expect(renderedIcon()).toBe('system')

    await user.click(toggle(SYSTEM))
    expect(toggle(LIGHT)).toBeInTheDocument()
    expect(renderedIcon()).toBe('sun')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem('catsky_theme')).toBe('light')

    await user.click(toggle(LIGHT))
    expect(toggle(DARK)).toBeInTheDocument()
    expect(renderedIcon()).toBe('moon')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('catsky_theme')).toBe('dark')

    await user.click(toggle(DARK))
    expect(toggle(SYSTEM)).toBeInTheDocument()
    expect(renderedIcon()).toBe('system')
    expect(window.localStorage.getItem('catsky_theme')).toBe('system')
  })

  it('resumes from the stored mode on the next mount', () => {
    window.localStorage.setItem('catsky_theme', 'dark')

    render(<ThemeToggle />)

    expect(toggle(DARK)).toBeInTheDocument()
    expect(renderedIcon()).toBe('moon')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('resolves the world again as soon as the cycle returns to system', async () => {
    const user = userEvent.setup()
    const colorScheme = stubPrefersColorScheme('dark')
    window.localStorage.setItem('catsky_theme', 'dark')

    render(<ThemeToggle />)
    await user.click(toggle(DARK))

    expect(toggle(SYSTEM)).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('dark')

    act(() => colorScheme.set('light'))

    expect(document.documentElement.dataset.theme).toBe('light')
  })
})

describe('ThemeToggle - explicit choice is never implied', () => {
  // Regression: the mount effect used to call storeTheme(), which pinned `catsky_theme` on the
  // very first render and made every later automatic resolution impossible.
  it('does not write the preference key on mount', () => {
    render(<ThemeToggle />)

    expect(window.localStorage.getItem('catsky_theme')).toBeNull()
  })

  it('does not write the preference key on mount when the OS decides either', () => {
    stubPrefersColorScheme('dark')

    render(<ThemeToggle />)

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('catsky_theme')).toBeNull()
  })

  it('caches the automatic resolution under its own key on mount', () => {
    stubPrefersColorScheme('dark')

    render(<ThemeToggle />)

    expect(window.localStorage.getItem('catsky_theme')).toBeNull()
    expect(window.localStorage.getItem('catsky_theme_auto')).toContain('dark')
  })

  it('never caches an explicitly chosen theme', async () => {
    const user = userEvent.setup()
    stubPrefersColorScheme('dark')
    render(<ThemeToggle />)

    await user.click(toggle(SYSTEM))

    expect(window.localStorage.getItem('catsky_theme')).toBe('light')
    // Still the automatic dark from before the click; the choice did not overwrite the cache.
    expect(window.localStorage.getItem('catsky_theme_auto')).toContain('dark')
  })

  it('writes the preference key only once the visitor clicks', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    expect(window.localStorage.getItem('catsky_theme')).toBeNull()

    await user.click(toggle(SYSTEM))

    expect(window.localStorage.getItem('catsky_theme')).toBe('light')
  })
})

describe('ThemeToggle - following the world while the mode is system', () => {
  it('flips at sunset when the OS expresses no preference', () => {
    // Fake timers replace Intl.DateTimeFormat, so they must go in before the timezone stub.
    vi.useFakeTimers()
    stubTimezone('Europe/London')
    stubPrefersColorScheme(null)
    // London sunset on 2026-06-21 is 20:21:34Z.
    vi.setSystemTime(new Date('2026-06-21T20:20:00Z'))

    render(<ThemeToggle />)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(toggle(SYSTEM)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000)
    })

    expect(document.documentElement.dataset.theme).toBe('dark')
    // The glyph names the mode, so it stays on "system" across an automatic switch.
    expect(toggle(SYSTEM)).toBeInTheDocument()
    expect(renderedIcon()).toBe('system')
    expect(window.localStorage.getItem('catsky_theme')).toBeNull()
  })

  it('follows an OS change', () => {
    const colorScheme = stubPrefersColorScheme('light')
    render(<ThemeToggle />)

    expect(document.documentElement.dataset.theme).toBe('light')

    act(() => colorScheme.set('dark'))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('catsky_theme')).toBeNull()
  })

  it('ignores a solar transition once the visitor has chosen', () => {
    vi.useFakeTimers()
    stubTimezone('Europe/London')
    stubPrefersColorScheme(null)
    vi.setSystemTime(new Date('2026-06-21T20:20:00Z'))

    render(<ThemeToggle />)
    fireEvent.click(toggle(SYSTEM))
    fireEvent.click(toggle(LIGHT))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('catsky_theme')).toBe('dark')

    // Past the next sunrise, where the sun would otherwise ask for light.
    act(() => {
      vi.advanceTimersByTime(9 * 60 * 60 * 1000)
    })

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(toggle(DARK)).toBeInTheDocument()
  })

  it('ignores an OS change once the visitor has chosen', () => {
    const colorScheme: ColorSchemeControl = stubPrefersColorScheme('dark')
    render(<ThemeToggle />)

    expect(document.documentElement.dataset.theme).toBe('dark')

    fireEvent.click(toggle(SYSTEM))
    expect(window.localStorage.getItem('catsky_theme')).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')

    act(() => colorScheme.set('dark'))

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(colorScheme.listenerCount()).toBe(0)
  })

  it('stops listening when unmounted', () => {
    const colorScheme = stubPrefersColorScheme('light')
    const { unmount } = render(<ThemeToggle />)

    expect(colorScheme.listenerCount()).toBe(1)

    unmount()

    expect(colorScheme.listenerCount()).toBe(0)
  })
})
