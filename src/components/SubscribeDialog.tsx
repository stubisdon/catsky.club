import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import Dialog from './Dialog'
import { isValidEmail, requestMagicLink, TURNSTILE_SITE_KEY } from '../utils/magicLink'
import { trackEvent } from '../utils/analytics'

interface SubscribeDialogProps {
  open: boolean
  onClose: () => void
  /** Printed above the heading, e.g. the album title the prompt was opened from. */
  eyebrow?: string
  heading?: string
  body?: string
  /** Distinguishes this entry point from /connect in analytics. */
  source?: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id?: string) => void
  remove: (id?: string) => void
}

let turnstileScriptPromise: Promise<void> | null = null

/**
 * Load the Turnstile script once per page, no matter how many callers ask for it.
 * Mirrors the loader in Connect.tsx; both resolve against the same cached promise when the
 * script is already present.
 */
function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if ((window as unknown as { turnstile?: unknown }).turnstile) return Promise.resolve()
  if (turnstileScriptPromise) return turnstileScriptPromise
  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Turnstile'))
    document.head.appendChild(script)
  })
  return turnstileScriptPromise
}

/**
 * Email capture prompt behind the upcoming album's cover.
 *
 * Sends the same Ghost magic link the /connect form does, via the shared helper in
 * utils/magicLink, so this entry point gets the server's Turnstile verification rather than a
 * second, weaker signup path.
 */
export default function SubscribeDialog({
  open,
  onClose,
  eyebrow,
  heading = 'subscribe for updates about upcoming releases',
  body = 'one email when something new lands. nothing else.',
  source = 'album_cover',
}: SubscribeDialogProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileHostRef = useRef<HTMLDivElement | null>(null)
  const turnstileWidgetIdRef = useRef<string | null>(null)

  // Reset between openings so a previous success does not greet the next visitor.
  useEffect(() => {
    if (open) return
    setEmail('')
    setStatus('idle')
    setError(null)
    setTurnstileToken('')
  }, [open])

  useEffect(() => {
    if (!open || !TURNSTILE_SITE_KEY) return
    let cancelled = false

    void loadTurnstileScript()
      .then(() => {
        if (cancelled) return
        const turnstile = (window as unknown as { turnstile?: TurnstileApi }).turnstile
        const host = turnstileHostRef.current
        if (!turnstile || !host || turnstileWidgetIdRef.current) return
        turnstileWidgetIdRef.current = turnstile.render(host, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(''),
          'error-callback': () => setTurnstileToken(''),
        })
      })
      .catch(() => {
        // Widget unavailable: the server decides whether to accept the request.
      })

    return () => {
      cancelled = true
      const turnstile = (window as unknown as { turnstile?: TurnstileApi }).turnstile
      if (turnstile && turnstileWidgetIdRef.current) {
        try {
          turnstile.remove(turnstileWidgetIdRef.current)
        } catch {
          // Already torn down.
        }
        turnstileWidgetIdRef.current = null
      }
    }
  }, [open])

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      if (!isValidEmail(email)) {
        setError('please enter a valid email.')
        setStatus('error')
        return
      }
      if (TURNSTILE_SITE_KEY && !turnstileToken) {
        setError('please complete the verification below.')
        setStatus('error')
        return
      }

      setError(null)
      setStatus('loading')
      trackEvent('subscribe_requested', { source })

      const result = await requestMagicLink({ email, turnstileToken, emailType: 'signup' })

      if (!result.ok) {
        setError(result.message)
        setStatus('error')
        trackEvent('subscribe_failed', { source, status: result.status })
        return
      }

      setStatus('success')
      trackEvent('subscribe_succeeded', { source, status: result.status })
    },
    [email, source, turnstileToken]
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      label="subscribe for release updates"
      maxWidth="32rem"
      data-testid="subscribe-dialog"
    >
      <div className="subscribe-dialog">
        {eyebrow && <p className="t-eyebrow">{eyebrow}</p>}
        <h2 className="t-display subscribe-heading">{heading}</h2>

        {status === 'success' ? (
          <p className="subscribe-confirmation" data-testid="subscribe-confirmation">
            check your inbox — there's a link waiting to confirm it's you.
          </p>
        ) : (
          <>
            <p className="subscribe-body">{body}</p>

            <form className="subscribe-form" onSubmit={handleSubmit} noValidate>
              <label className="t-eyebrow" htmlFor="subscribe-email">
                email
              </label>
              <input
                id="subscribe-email"
                className="connect-auth-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                data-testid="subscribe-email"
              />

              {TURNSTILE_SITE_KEY && <div ref={turnstileHostRef} className="subscribe-turnstile" />}

              <button
                type="submit"
                className="connect-portal-btn"
                disabled={status === 'loading'}
                data-testid="subscribe-submit"
              >
                {status === 'loading' ? 'sending…' : 'subscribe'}
              </button>

              {error && (
                <p className="connect-auth-error" role="alert" data-testid="subscribe-error">
                  {error}
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </Dialog>
  )
}
