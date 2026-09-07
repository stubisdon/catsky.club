import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, PageTitle } from './components'
import { TurnstileWidget } from './components/TurnstileWidget'
import { getMembershipTier } from './utils/subscription'
import { isValidEmail, requestMagicLink, TURNSTILE_SITE_KEY } from './utils/magicLink'

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

/**
 * Standalone, shareable email-capture landing page (catsky.club/subscribe).
 *
 * Deliberately uses the same `requestMagicLink` helper as /connect and SubscribeDialog, so
 * this entry point gets the server's Turnstile verification instead of becoming a second,
 * weaker signup path. Signup is only completed on /welcome, where the name form runs.
 */
export default function Subscribe() {
  const [alreadySubscribed, setAlreadySubscribed] = useState(false)
  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [error, setError] = useState('')
  const submittingRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    getMembershipTier()
      .then((tier) => {
        if (!cancelled) setAlreadySubscribed(tier !== 'none')
      })
      .catch(() => {
        // Fall back to showing the form; a network blip must not hide the CTA.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const canSubmit = isValidEmail(email) && (!TURNSTILE_SITE_KEY || !!turnstileToken)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (submittingRef.current) return

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

    submittingRef.current = true
    setError('')
    setStatus('submitting')

    const result = await requestMagicLink({
      email,
      turnstileToken: turnstileToken ?? undefined,
      emailType: 'signup',
      labels: ['subscribe-page'],
    })

    if (!result.ok) {
      setError(result.message.toLowerCase())
      setStatus('error')
      // Turnstile tokens are single-use; a retry needs a fresh challenge.
      setTurnstileToken(null)
      setResetSignal((n) => n + 1)
      submittingRef.current = false
      return
    }

    setStatus('success')
    submittingRef.current = false
  }

  return (
    <div className="app-container">
      <div className="connect-content">
        <PageTitle>subscribe</PageTitle>

        {alreadySubscribed ? (
          <>
            <p className="subscribe-body">you&apos;re already on the list.</p>
            <div className="connect-auth-actions">
              <Link href="/listen" variant="button">
                continue →
              </Link>
            </div>
          </>
        ) : status === 'success' ? (
          <p className="subscribe-confirmation" role="status" aria-live="polite">
            check your email and click the link to finish signing up. you&apos;re not subscribed yet
            until you do.
          </p>
        ) : (
          <>
            <p className="subscribe-body">
              new music first — unreleased tracks and updates, straight to your inbox.
            </p>

            <form className="connect-auth-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="subscribe-email" className="connect-auth-message">
                email
              </label>
              <input
                id="subscribe-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'submitting'}
                autoComplete="email"
                className="connect-auth-input"
                required
              />

              <TurnstileWidget
                onToken={setTurnstileToken}
                resetSignal={resetSignal}
                className="subscribe-turnstile"
              />

              <div className="connect-auth-actions">
                <button
                  type="submit"
                  className="connect-portal-btn"
                  disabled={!canSubmit || status === 'submitting'}
                >
                  {status === 'submitting' ? 'sending…' : 'subscribe →'}
                </button>
              </div>

              {status === 'error' && error && (
                <p className="connect-auth-error" role="alert">
                  {error}
                </p>
              )}
            </form>
          </>
        )}

        <Link href="/" variant="subtle" style={{ position: 'fixed', bottom: '1rem', left: '1rem' }}>
          ← home
        </Link>
      </div>
    </div>
  )
}
