import { useEffect, useRef, useState, type FormEvent, type JSX } from 'react'
import { initEngagementTracking, onEngagementTrigger, type EngagementTrigger } from '../utils/engagement'
import { getMembershipTier } from '../utils/subscription'
import { isValidEmail, requestMagicLink } from '../utils/emailCapture'
import { trackEvent } from '../utils/analytics'
import { TurnstileWidget, TURNSTILE_SITE_KEY } from './TurnstileWidget'

// Exported so tests (and any future debugging) can assert on the exact persistence contract.
export const EMAIL_CAPTURE_DISMISSED_AT_KEY = 'catsky_email_capture_dismissed_at'
export const EMAIL_CAPTURE_DONE_KEY = 'catsky_email_capture_done'
export const EMAIL_CAPTURE_DISMISS_SUPPRESS_MS = 7 * 24 * 60 * 60 * 1000

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'
type CloseReason = 'button' | 'escape' | 'backdrop' | 'auto'

const AUTO_CLOSE_AFTER_SUCCESS_MS = 6000

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(EMAIL_CAPTURE_DISMISSED_AT_KEY)
    if (!raw) return false
    const timestamp = Number(raw)
    if (!Number.isFinite(timestamp)) return false
    return Date.now() - timestamp < EMAIL_CAPTURE_DISMISS_SUPPRESS_MS
  } catch {
    return false
  }
}

function isPermanentlyDone(): boolean {
  try {
    return localStorage.getItem(EMAIL_CAPTURE_DONE_KEY) === '1'
  } catch {
    return false
  }
}

function markDismissedNow(): void {
  try {
    localStorage.setItem(EMAIL_CAPTURE_DISMISSED_AT_KEY, String(Date.now()))
  } catch {
    // ignore storage failures (e.g. Safari private mode)
  }
}

function markPermanentlyDone(): void {
  try {
    localStorage.setItem(EMAIL_CAPTURE_DONE_KEY, '1')
  } catch {
    // ignore storage failures
  }
}

export function EmailCaptureModal(): JSX.Element | null {
  const [visible, setVisible] = useState(false)
  const [trigger, setTrigger] = useState<EngagementTrigger | null>(null)
  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [error, setError] = useState('')

  const hasShownRef = useRef(false)
  const visibleRef = useRef(false)
  const processingRef = useRef(false)
  const submittingRef = useRef(false)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const emailInputRef = useRef<HTMLInputElement | null>(null)
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTriggerRef = useRef<(t: EngagementTrigger) => void>(() => {})
  handleTriggerRef.current = (t: EngagementTrigger) => {
    if (hasShownRef.current || visibleRef.current || processingRef.current) return
    if (isPermanentlyDone() || isDismissedRecently()) return

    processingRef.current = true
    getMembershipTier()
      .then((tier) => {
        if (tier !== 'none') {
          // Already a member somewhere on this browser — never nag them again.
          markPermanentlyDone()
          hasShownRef.current = true
          return
        }
        if (hasShownRef.current || visibleRef.current) return
        hasShownRef.current = true
        visibleRef.current = true
        setTrigger(t)
        setVisible(true)
        try {
          trackEvent('email_capture_shown', { trigger: t })
        } catch {
          // analytics must never break the modal
        }
      })
      .catch(() => {
        // Fail closed: a network blip must never nag a possible member.
      })
      .finally(() => {
        processingRef.current = false
      })
  }

  // Mount the headless engagement tracker exactly once for the lifetime of this component.
  // Both initEngagementTracking and onEngagementTrigger are safe under StrictMode's
  // mount -> cleanup -> mount double-invoke.
  useEffect(() => {
    const teardownTracking = initEngagementTracking()
    const unsubscribe = onEngagementTrigger((t) => handleTriggerRef.current(t))
    return () => {
      unsubscribe()
      teardownTracking()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current)
    }
  }, [])

  // Move focus into the dialog on open; restore it to whatever had focus before on close.
  useEffect(() => {
    if (!visible) return
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    emailInputRef.current?.focus()
    return () => {
      const prev = previousFocusRef.current
      if (prev && typeof prev.focus === 'function') {
        try {
          prev.focus()
        } catch {
          // ignore focus restoration failures
        }
      }
    }
  }, [visible])

  function handleClose(reason: CloseReason): void {
    void reason
    if (status !== 'success') {
      markDismissedNow()
      try {
        trackEvent('email_capture_dismissed', trigger ? { trigger } : {})
      } catch {
        // analytics must never break the modal
      }
    }
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
    visibleRef.current = false
    setVisible(false)
  }

  // Escape closes; Tab is trapped inside the dialog while it is open.
  useEffect(() => {
    if (!visible) return

    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose('escape')
        return
      }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // No dependency array: this intentionally re-subscribes on every render so onKeyDown's
    // closure over handleClose (which reads current status/trigger) stays fresh. Cheap while
    // the modal is open (rare renders), and skipped entirely while closed.
  })

  const canSubmit = isValidEmail(email) && (!TURNSTILE_SITE_KEY || !!turnstileToken)

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
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

    const result = await requestMagicLink(email.trim(), turnstileToken, 'popup')

    if (!result.ok) {
      setError(result.error || 'something went wrong. please try again.')
      setStatus('error')
      setTurnstileToken(null)
      setResetSignal((n) => n + 1)
      submittingRef.current = false
      return
    }

    markPermanentlyDone()
    setStatus('success')
    submittingRef.current = false
    autoCloseTimerRef.current = setTimeout(() => handleClose('auto'), AUTO_CLOSE_AFTER_SUCCESS_MS)
  }

  if (!visible) return null

  return (
    <div className="email-capture-overlay" onClick={() => handleClose('backdrop')}>
      <div
        ref={dialogRef}
        className="email-capture-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-capture-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="email-capture-close"
          onClick={() => handleClose('button')}
          aria-label="close"
        >
          ×
        </button>

        <h2 id="email-capture-title" className="email-capture-title">
          hear it first
        </h2>

        {status === 'success' ? (
          <p className="email-capture-success" role="status" aria-live="polite">
            check your email and click the link to finish. you&apos;re not subscribed yet until you do.
          </p>
        ) : (
          <>
            <p className="email-capture-body">
              you&apos;ve been listening. leave an email and hear new music before anyone else.
            </p>

            <form className="email-capture-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="email-capture-input" className="email-capture-body">
                email
              </label>
              <input
                id="email-capture-input"
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'submitting'}
                autoComplete="email"
                className="email-capture-input"
                required
              />

              <TurnstileWidget onToken={setTurnstileToken} resetSignal={resetSignal} />

              <div className="email-capture-actions">
                <button
                  type="submit"
                  className="connect-portal-btn"
                  disabled={!canSubmit || status === 'submitting'}
                >
                  {status === 'submitting' ? 'sending…' : 'notify me →'}
                </button>
              </div>

              {status === 'error' && error && (
                <p className="email-capture-error" role="alert">
                  {error}
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default EmailCaptureModal
