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

  it.each([
    ['signup', 'true', undefined, { action: 'signup', success: true }],
    ['signin', 'true', undefined, { action: 'signin', success: true }],
    ['signup', 'false', 'INVALID_TOKEN', { action: 'signup', success: false, errorCode: 'INVALID_TOKEN' }],
    ['signin', 'false', 'EXPIRED', { action: 'signin', success: false, errorCode: 'EXPIRED' }],
  ] as const)('parses %s callbacks with success=%s', (action, success, errorCode, expected) => {
    window.__catskyAuthCallback = { action: 'signin', success: true }
    const errorParam = errorCode ? `&errorCode=${errorCode}` : ''
    expect(getAuthCallback(`?action=${action}&success=${success}${errorParam}`)).toEqual(expected)
  })

  it('rejects incomplete or unrelated callbacks', () => {
    expect(getAuthCallback('?action=signup')).toBeNull()
    expect(getAuthCallback('?action=other&success=true')).toBeNull()
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
    expect(stripAuthCallbackParams('/welcome', '?stripe=success&action=signup&success=true&errorCode=INVALID_TOKEN&source=email')).toBe(
      '/welcome?stripe=success&source=email',
    )
  })
})
