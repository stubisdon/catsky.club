import { useEffect, useState } from 'react'
import {
  applyTheme,
  cacheAutoTheme,
  getStoredMode,
  isCacheableSource,
  resolveAutoTheme,
  storeMode,
  type ResolvedTheme,
  type ThemeMode,
} from '../utils/theme'
import { MoonIcon, SunIcon, SystemIcon } from './ThemeIcons'

/**
 * Never trust a schedule for longer than this. A laptop that slept through sunset wakes up with a
 * stale timer, so every tick is clamped and the theme corrects itself shortly after wake.
 */
const MAX_RECHECK_DELAY_MS = 6 * 60 * 60 * 1000
const MIN_RECHECK_DELAY_MS = 1000

/** One button, three states. A dropdown would not fit the rest of the site. */
const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

const MODE_ICON: Record<ThemeMode, typeof SunIcon> = {
  light: SunIcon,
  dark: MoonIcon,
  system: SystemIcon,
}

function isSameResolution(a: ResolvedTheme, b: ResolvedTheme): boolean {
  return (
    a.theme === b.theme &&
    a.source === b.source &&
    (a.nextTransition?.getTime() ?? null) === (b.nextTransition?.getTime() ?? null)
  )
}

function darkSchemeQuery(): MediaQueryList | null {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
    return window.matchMedia('(prefers-color-scheme: dark)')
  } catch {
    return null
  }
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(getStoredMode)
  const [resolution, setResolution] = useState<ResolvedTheme>(() =>
    resolveAutoTheme(new Date(), { mode: getStoredMode() }),
  )

  const nextMode = NEXT_MODE[mode]
  const Icon = MODE_ICON[mode]

  // Only 'system' keeps following the world; an explicit light/dark preference pins everything.
  const followsWorld = mode === 'system'

  useEffect(() => {
    applyTheme(resolution.theme)
    if (isCacheableSource(resolution.source)) {
      cacheAutoTheme(resolution.theme, resolution.nextTransition)
    }
  }, [resolution])

  useEffect(() => {
    if (!followsWorld) return

    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    const reresolve = (): Date | null => {
      const next = resolveAutoTheme(new Date(), { mode: 'system' })
      setResolution((current) => (isSameResolution(current, next) ? current : next))
      return next.nextTransition
    }

    const arm = (transition: Date | null): void => {
      if (stopped) return
      const untilTransition = transition ? transition.getTime() - Date.now() : MAX_RECHECK_DELAY_MS
      const delay = Math.min(MAX_RECHECK_DELAY_MS, Math.max(MIN_RECHECK_DELAY_MS, untilTransition))
      timer = setTimeout(() => arm(reresolve()), delay)
    }

    const rearm = (): void => {
      if (timer !== undefined) clearTimeout(timer)
      arm(reresolve())
    }

    arm(reresolve())

    const darkScheme = darkSchemeQuery()
    darkScheme?.addEventListener?.('change', rearm)
    document.addEventListener('visibilitychange', rearm)
    window.addEventListener('focus', rearm)

    return () => {
      stopped = true
      if (timer !== undefined) clearTimeout(timer)
      darkScheme?.removeEventListener?.('change', rearm)
      document.removeEventListener('visibilitychange', rearm)
      window.removeEventListener('focus', rearm)
    }
  }, [followsWorld])

  // With three states the "next" glyph stopped being legible, so the icon names the current mode.
  const label = `theme: ${mode} — switch to ${nextMode}`

  const chooseMode = () => {
    // The only place the preference key is ever written.
    storeMode(nextMode)
    setMode(nextMode)
    setResolution(resolveAutoTheme(new Date(), { mode: nextMode }))
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={label}
      title={label}
      onClick={chooseMode}
    >
      <Icon />
    </button>
  )
}
