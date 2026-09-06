/**
 * Magic-link request, shared by the /connect form and the landing page subscribe prompt.
 *
 * Both entry points must hit the same endpoint with the same body shape, because server.js
 * verifies a Turnstile token on POST /members/api/send-magic-link/ before forwarding to Ghost.
 * Keeping one implementation is what stops the newer caller drifting away from the bot
 * protection the older one relies on.
 */

export const MAGIC_LINK_API = '/members/api/send-magic-link/'

/**
 * Cloudflare Turnstile site key (public). Set VITE_TURNSTILE_SITE_KEY at build time to enable
 * the anti-bot challenge. When unset, callers skip the widget entirely.
 */
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || ''

export interface MagicLinkRequest {
  email: string
  turnstileToken?: string
  /** Passed through to Ghost; `signup` creates the member, `signin` only mails a link. */
  emailType?: 'signup' | 'signin'
  /** Ghost stores this on the member, useful for telling signup sources apart. */
  labels?: string[]
}

export type MagicLinkResult = { ok: true; status: number } | { ok: false; status: number; message: string }

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  // Deliberately loose: the authoritative check is Ghost's. This only catches obvious typos
  // before spending a network round trip on them.
  return trimmed.length > 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

export async function requestMagicLink({
  email,
  turnstileToken,
  emailType,
  labels,
}: MagicLinkRequest): Promise<MagicLinkResult> {
  const body: Record<string, unknown> = { email: email.trim() }
  if (TURNSTILE_SITE_KEY && turnstileToken) body.turnstileToken = turnstileToken
  if (emailType) body.emailType = emailType
  if (labels && labels.length > 0) body.labels = labels

  try {
    const res = await fetch(MAGIC_LINK_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        errors?: { message?: string }[]
      }
      const message = data?.error || data?.errors?.[0]?.message || res.statusText || 'Something went wrong.'
      return { ok: false, status: res.status, message }
    }

    return { ok: true, status: res.status }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: error instanceof Error ? error.message : 'Network error.',
    }
  }
}
