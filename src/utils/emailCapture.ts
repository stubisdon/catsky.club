import { TURNSTILE_SITE_KEY } from './turnstileConfig'
import { trackEvent } from './analytics'

export type EmailCaptureSource = 'subscribe_page' | 'popup' | 'connect'

export interface EmailCaptureResult {
  ok: boolean
  status?: number
  error?: string
}

const MAGIC_LINK_API = '/members/api/send-magic-link/'
const GENERIC_ERROR = 'something went wrong. please try again.'
const NETWORK_ERROR = 'network error. please try again.'

// Pragmatic, non-RFC email check: non-empty local part, exactly one '@', and a dot in the domain.
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim()
  if (!trimmed) return false

  const atIndex = trimmed.indexOf('@')
  if (atIndex <= 0) return false
  if (trimmed.indexOf('@', atIndex + 1) !== -1) return false

  const domain = trimmed.slice(atIndex + 1)
  if (!domain.includes('.')) return false
  if (domain.startsWith('.') || domain.endsWith('.')) return false

  return true
}

export async function requestMagicLink(
  email: string,
  turnstileToken: string | null,
  source: EmailCaptureSource,
): Promise<EmailCaptureResult> {
  // isValidEmail() validates the trimmed form, so send the trimmed form too — otherwise a
  // trailing space rides through to Ghost and can create a second, near-duplicate member.
  const address = email.trim()

  trackEvent('magic_link_requested', { source })

  try {
    const res = await fetch(MAGIC_LINK_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(TURNSTILE_SITE_KEY ? { email: address, turnstileToken } : { email: address }),
    })

    const data = (await res.json().catch(() => ({}))) as { errors?: { message?: string }[] }

    if (!res.ok) {
      const serverMessage = typeof data?.errors?.[0]?.message === 'string' ? data.errors[0].message : ''
      const error = serverMessage ? serverMessage.toLowerCase() : GENERIC_ERROR
      trackEvent('magic_link_request_failed', { source, status: res.status })
      return { ok: false, status: res.status, error }
    }

    trackEvent('magic_link_request_succeeded', { source })
    return { ok: true }
  } catch {
    trackEvent('magic_link_request_failed', { source, reason: 'network' })
    return { ok: false, error: NETWORK_ERROR }
  }
}
