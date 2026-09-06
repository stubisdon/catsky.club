import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, PageTitle, TurnstileWidget, TURNSTILE_SITE_KEY } from './components'
import { navigateTo } from './router/navigation'
import { getCurrentMember } from './utils'
import { identifyMember, trackEvent } from './utils/analytics'

interface MemberProfilePayload {
  memberId?: string
  memberUuid?: string
  email?: string
  firstName: string
  lastName: string
  turnstileToken?: string
}

const WELCOME_MEMBER_STORAGE_KEY = 'catsky_welcome_member'


const fieldLabelStyle: CSSProperties = {
  opacity: 0.9,
  display: 'flex',
  alignItems: 'baseline',
  gap: '0.4rem',
  flexWrap: 'wrap',
}

const fieldLabelNoteStyle: CSSProperties = {
  fontSize: '0.72rem',
  opacity: 0.62,
  letterSpacing: '0.03em',
}

function readWelcomeMemberIdentity() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(WELCOME_MEMBER_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as { memberId?: string; memberUuid?: string; email?: string } | null
    const memberId = typeof parsed?.memberId === 'string' ? parsed.memberId.trim() : ''
    const memberUuid = typeof parsed?.memberUuid === 'string' ? parsed.memberUuid.trim() : ''
    const email = typeof parsed?.email === 'string' ? parsed.email.trim().toLowerCase() : ''

    if ((!memberId && !memberUuid) || !email) return null
    return { memberId, memberUuid, email }
  } catch {
    return null
  }
}

function storeWelcomeMemberIdentity(member: { id?: string; uuid?: string; email?: string } | null) {
  const memberId = typeof member?.id === 'string' ? member.id.trim() : ''
  const memberUuid = typeof member?.uuid === 'string' ? member.uuid.trim() : ''
  const email = typeof member?.email === 'string' ? member.email.trim().toLowerCase() : ''

  if ((!memberId && !memberUuid) || !email) return null

  try {
    window.sessionStorage.setItem(WELCOME_MEMBER_STORAGE_KEY, JSON.stringify({ memberId, memberUuid, email }))
  } catch {
    // ignore storage failures
  }

  return { memberId, memberUuid, email }
}

function clearWelcomeMemberIdentity() {
  try {
    window.sessionStorage.removeItem(WELCOME_MEMBER_STORAGE_KEY)
  } catch {
    // ignore storage failures
  }
}

// Signup is only complete once this call succeeds, so unlike the previous fire-and-forget
// version we wait for the verdict. The server verifies the Turnstile token here and answers
// 403 when it fails — a `keepalive` fetch or a sendBeacon could not surface that, and the
// visitor would be told they had signed up when they had not.
async function saveMemberProfile(payload: MemberProfilePayload): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch('/api/member-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    return { ok: res.ok, status: res.status }
  } catch (error) {
    console.error('[welcome profile save failed]', error)
    return { ok: false, status: 0 }
  }
}

async function resolveIdentity(): Promise<{ memberId: string; memberUuid: string; email: string } | null> {
  const stored = readWelcomeMemberIdentity()
  if (stored) return stored

  try {
    return storeWelcomeMemberIdentity(await getCurrentMember())
  } catch {
    // The server can still resolve the member from the session cookie.
    return null
  }
}

export default function Welcome() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  useEffect(() => {
    void getCurrentMember()
      .then((member) => {
        storeWelcomeMemberIdentity(member)
        identifyMember(member)
      })
      .catch(() => {
        // ignore background identity hydration failures
      })
  }, [])

  // A first name and a passed Turnstile challenge are both required to finish signing up.
  // When no site key is configured the widget renders nothing, so only the name gates.
  const canSubmit = useMemo(
    () => firstName.trim().length > 0 && (!TURNSTILE_SITE_KEY || !!turnstileToken),
    [firstName, turnstileToken],
  )

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (submittingRef.current) return

    const safeFirstName = firstName.trim()
    const safeLastName = lastName.trim()

    if (!safeFirstName) {
      setError('First name is required.')
      trackEvent('welcome_profile_failed', { status: 'validation' })
      return
    }

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Please complete the verification below.')
      trackEvent('welcome_profile_failed', { status: 'turnstile_missing' })
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setError('')

    trackEvent('welcome_profile_submitted', { has_last_name: safeLastName.length > 0 })

    const identity = await resolveIdentity()
    const result = await saveMemberProfile({
      ...(identity ?? {}),
      firstName: safeFirstName,
      lastName: safeLastName,
      ...(turnstileToken ? { turnstileToken } : {}),
    })

    if (!result.ok) {
      setError(
        result.status === 403
          ? 'Verification failed. Please try again.'
          : 'We could not finish your signup. Please try again.',
      )
      trackEvent('welcome_profile_failed', { status: result.status })
      // Turnstile tokens are single-use; the visitor needs a fresh challenge to retry.
      setTurnstileToken(null)
      setResetSignal((n) => n + 1)
      setSubmitting(false)
      submittingRef.current = false
      return
    }

    clearWelcomeMemberIdentity()
    navigateTo('/listen')
  }

  return (
    <div className="app-container">
      <div className="connect-content">
        <PageTitle>welcome</PageTitle>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>one last step to finish signing up.</p>
        <p className="connect-auth-message" style={{ marginBottom: '1rem' }}>
          add your name and confirm you&apos;re human — you&apos;re not signed up until you do.
        </p>

        <form onSubmit={onSubmit} className="connect-auth-form" noValidate>
          <label htmlFor="firstName" style={fieldLabelStyle}>
            <span>first name</span>
            <span style={fieldLabelNoteStyle} aria-hidden="true">*</span>
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="connect-auth-input"
            autoComplete="given-name"
            required
          />

          <label htmlFor="lastName" style={fieldLabelStyle}>
            <span>last name</span>
            <span style={fieldLabelNoteStyle}>(optional)</span>
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="connect-auth-input"
            autoComplete="family-name"
          />

          <TurnstileWidget
            onToken={setTurnstileToken}
            resetSignal={resetSignal}
            className="catsky-turnstile"
          />

          <div className="connect-auth-actions" style={{ marginTop: '0.5rem' }}>
            <button
              type="submit"
              className="connect-portal-btn"
              disabled={!canSubmit || submitting}
            >
              {submitting ? 'signing up…' : 'sign up →'}
            </button>
          </div>

          {error && (
            <p className="connect-auth-error" role="alert">
              {error}
            </p>
          )}
        </form>

        <Link href="/" variant="subtle" style={{ position: 'fixed', bottom: '1rem', left: '1rem' }}>
          ← home
        </Link>
      </div>
    </div>
  )
}
