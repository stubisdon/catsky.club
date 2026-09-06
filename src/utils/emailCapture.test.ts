import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { trackEventMock, fetchMock } = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
  fetchMock: vi.fn(),
}))

vi.mock('./analytics', () => ({
  trackEvent: trackEventMock,
}))

async function loadEmailCapture() {
  return import('./emailCapture')
}

describe('isValidEmail', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('accepts a plausible email', async () => {
    const { isValidEmail } = await loadEmailCapture()
    expect(isValidEmail('ada@example.com')).toBe(true)
    expect(isValidEmail('  ada@example.com  ')).toBe(true)
    expect(isValidEmail('ada+cats@sub.example.co')).toBe(true)
  })

  it('rejects empty, missing @, missing dot, or multiple @', async () => {
    const { isValidEmail } = await loadEmailCapture()
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('   ')).toBe(false)
    expect(isValidEmail('adaexample.com')).toBe(false)
    expect(isValidEmail('ada@examplecom')).toBe(false)
    expect(isValidEmail('ada@@example.com')).toBe(false)
    expect(isValidEmail('ada@a@example.com')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
    expect(isValidEmail('ada@.com')).toBe(false)
    expect(isValidEmail('ada@example.')).toBe(false)
  })
})

describe('requestMagicLink', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('posts the right URL/body without a turnstile token when no site key is configured', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })
    const { requestMagicLink } = await loadEmailCapture()

    const result = await requestMagicLink('ada@example.com', null, 'connect')

    expect(fetchMock).toHaveBeenCalledWith('/members/api/send-magic-link/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: 'ada@example.com' }),
    })
    expect(result).toEqual({ ok: true })
  })

  it('posts the turnstile token in the body when a site key is configured', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })
    const { requestMagicLink } = await loadEmailCapture()

    const result = await requestMagicLink('ada@example.com', 'tok-123', 'subscribe_page')

    expect(fetchMock).toHaveBeenCalledWith('/members/api/send-magic-link/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: 'ada@example.com', turnstileToken: 'tok-123' }),
    })
    expect(result).toEqual({ ok: true })
  })

  it('surfaces the server error message on a non-ok response', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ errors: [{ message: 'Rate limit exceeded.' }] }),
    })
    const { requestMagicLink } = await loadEmailCapture()

    const result = await requestMagicLink('ada@example.com', null, 'popup')

    expect(result).toEqual({ ok: false, status: 429, error: 'rate limit exceeded.' })
  })

  it('falls back to a generic message when the server gives no error message', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    })
    const { requestMagicLink } = await loadEmailCapture()

    const result = await requestMagicLink('ada@example.com', null, 'popup')

    expect(result).toEqual({ ok: false, status: 500, error: 'something went wrong. please try again.' })
  })

  it('returns a network error result when fetch throws', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    fetchMock.mockRejectedValue(new Error('boom'))
    const { requestMagicLink } = await loadEmailCapture()

    const result = await requestMagicLink('ada@example.com', null, 'connect')

    expect(result).toEqual({ ok: false, error: 'network error. please try again.' })
  })

  it('never sends the email address (or any part of it) to analytics', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ errors: [{ message: 'bad request' }] }),
    })
    const { requestMagicLink } = await loadEmailCapture()
    const email = 'super-secret-user@example.com'

    await requestMagicLink(email, null, 'connect')

    expect(trackEventMock).toHaveBeenCalled()
    for (const call of trackEventMock.mock.calls) {
      const serialized = JSON.stringify(call)
      expect(serialized).not.toContain(email)
      expect(serialized).not.toContain('super-secret-user')
      expect(serialized.toLowerCase()).not.toContain('@example.com')
    }
  })
})
