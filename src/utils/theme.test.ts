import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_THEME, getStoredTheme, resolveInitialTheme, storeTheme } from './theme'

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
    expect(() => storeTheme('dark')).not.toThrow()

    getItem.mockRestore()
    setItem.mockRestore()
  })
})
