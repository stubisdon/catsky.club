export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'catsky_theme'
export const DEFAULT_THEME: Theme = 'light'

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null

  try {
    const theme = window.localStorage.getItem(STORAGE_KEY)
    return theme === 'light' || theme === 'dark' ? theme : null
  } catch {
    return null
  }
}

export function resolveInitialTheme(): Theme {
  return getStoredTheme() ?? DEFAULT_THEME
}

export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return

  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    theme === 'dark' ? '#000000' : '#F5F0E6',
  )
}

export function storeTheme(theme: Theme): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage may be unavailable in private browsing and embedded webviews.
  }
}
