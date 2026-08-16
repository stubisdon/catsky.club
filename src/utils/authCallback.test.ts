import { afterEach, describe, expect, it } from 'vitest'
import {
  clearAuthCallback,
  getAuthCallback,
  readAuthCallback,
  stripAuthCallbackParams,
} from './authCallback'

describe('auth callback handoff', () => {
  afterEach(() => {
    clearAuthCallback()
  })

  it('parses only an explicit callback from getAuthCallback', () => {
    window.__catskyAuthCallback = { action: 'signin', success: true }

    expect(getAuthCallback('?action=signup&success=true')).toEqual({ action: 'signup', success: true })
    expect(getAuthCallback('?action=signup&success=false')).toBeNull()
    expect(getAuthCallback('')).toBeNull()
  })

  it('uses the captured callback only when the URL has no callback, with URL params taking precedence', () => {
    window.__catskyAuthCallback = { action: 'signin', success: true }

    expect(readAuthCallback('')).toEqual({ action: 'signin', success: true })
    expect(readAuthCallback('?action=signup&success=true')).toEqual({ action: 'signup', success: true })
  })

  it('falls back to the URL when no captured callback exists', () => {
    expect(readAuthCallback('?action=signin&success=true')).toEqual({ action: 'signin', success: true })
  })

  it('removes only auth callback params', () => {
    expect(stripAuthCallbackParams('/welcome', '?stripe=success&action=signup&success=true&source=email')).toBe(
      '/welcome?stripe=success&source=email',
    )
  })
})
