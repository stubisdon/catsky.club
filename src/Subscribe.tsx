import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, PageTitle, TurnstileWidget, TURNSTILE_SITE_KEY } from './components'
import { getMembershipTier } from './utils/subscription'
import { isValidEmail, requestMagicLink } from './utils/emailCapture'

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

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
        if (cancelled) return
        setAlreadySubscribed(tier !== 'none')
      })
      .catch(() => {
        // fall back to showing the form
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

    const result = await requestMagicLink(email.trim(), turnstileToken, 'subscribe_page')

    if (!result.ok) {
      setError(result.error || 'something went wrong. please try again.')
      setStatus('error')
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
      <div className="subscribe-page">
        <PageTitle>subscribe</PageTitle>

        {alreadySubscribed ? (
          <>
            <p className="subscribe-message">you&apos;re already on the list.</p>
            <div className="subscribe-actions">
              <Link href="/listen" variant="button">
                continue →
              </Link>
            </div>
          </>
        ) : status === 'success' ? (
          <p className="subscribe-success" role="status" aria-live="polite">
            check your email and click the link to finish signing up. you&apos;re not subscribed yet
            until you do.
          </p>
        ) : (
          <>
            <p className="subscribe-message">
              new music first — unreleased tracks and updates, straight to your inbox.
            </p>

            <form className="subscribe-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="subscribe-email" className="subscribe-message">
                email
              </label>
              <input
                id="subscribe-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'submitting'}
                autoComplete="email"
                className="subscribe-input"
                required
              />

              <TurnstileWidget
                onToken={setTurnstileToken}
                resetSignal={resetSignal}
                className="catsky-turnstile"
              />

              <div className="subscribe-actions">
                <button
                  type="submit"
                  className="connect-portal-btn"
                  disabled={!canSubmit || status === 'submitting'}
                >
                  {status === 'submitting' ? 'sending…' : 'subscribe →'}
                </button>
              </div>

              {status === 'error' && error && (
                <p className="subscribe-error" role="alert">
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
