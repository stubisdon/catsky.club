import { useEffect, useState } from 'react'
import { applyTheme, resolveInitialTheme, storeTheme, type Theme } from '../utils/theme'
import { MoonIcon, SunIcon } from './ThemeIcons'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => resolveInitialTheme())
  const nextTheme: Theme = theme === 'light' ? 'dark' : 'light'

  useEffect(() => {
    applyTheme(theme)
    storeTheme(theme)
  }, [theme])

  const label = `switch to ${nextTheme} theme`

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={label}
      title={label}
      onClick={() => setTheme(nextTheme)}
    >
      {nextTheme === 'dark' ? <MoonIcon /> : <SunIcon />}
    </button>
  )
}
