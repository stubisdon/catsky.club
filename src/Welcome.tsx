import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, PageTitle } from './components'
import { getCurrentMember } from './utils'
import { navigateTo } from './router/navigation'

const RETRY_DELAYS_MS = [0, 400, 1200, 2500, 5000]

interface MemberProfilePayload {
  memberId: string
  email: string
  firstName: string
  lastName: string
}

interface MemberIdentity {
  id: string
  email: string
}

export default function Welcome() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [member, setMember] = useState<MemberIdentity | null>(null)
  const [memberCheckState, setMemberCheckState] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [isRetryingSession, setIsRetryingSession] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      for (const delay of RETRY_DELAYS_MS) {
        if (cancelled) return

        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay))
          if (cancelled) return
        }

        const currentMember = await getCurrentMember()
        if (cancelled) return

        if (currentMember?.id && currentMember?.email) {
          setMember({ id: currentMember.id, email: currentMember.email })
          setMemberCheckState('ready')
          return
        }
      }

      setMemberCheckState('missing')
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const canSubmit = useMemo(() => firstName.trim().length > 0 && status !== 'loading', [firstName, status])

  const retrySessionCheck = async () => {
    setIsRetryingSession(true)
    setMemberCheckState('loading')

    for (const delay of RETRY_DELAYS_MS) {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      const currentMember = await getCurrentMember()
      if (currentMember?.id && currentMember?.email) {
        setMember({ id: currentMember.id, email: currentMember.email })
        setMemberCheckState('ready')
        setIsRetryingSession(false)
        return
      }
    }

    setMemberCheckState('missing')
    setIsRetryingSession(false)
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!member) return

    const safeFirstName = firstName.trim()
    const safeLastName = lastName.trim()

    if (!safeFirstName) {
      setError('First name is required.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError('')

    const payload: MemberProfilePayload = {
      memberId: member.id,
      email: member.email,
      firstName: safeFirstName,
      lastName: safeLastName,
    }

    try {
      const res = await fetch('/api/member-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        setError(data?.error || 'Could not save your profile.')
        setStatus('error')
        return
      }

      navigateTo('/listen')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.')
      setStatus('error')
    }
  }

  return (
    <div className="app-container">
      <div className="connect-content">
        <PageTitle>welcome</PageTitle>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>one quick step before you continue.</p>

        {memberCheckState === 'loading' && (
          <p className="connect-auth-message" style={{ marginBottom: '1rem' }}>
            checking your session…
          </p>
        )}

        <form onSubmit={onSubmit} className="connect-auth-form" noValidate>
          <label htmlFor="firstName" style={{ opacity: 0.9 }}>first name *</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="connect-auth-input"
            autoComplete="given-name"
            required
            disabled={status === 'loading'}
          />

          <label htmlFor="lastName" style={{ opacity: 0.9 }}>last name (optional)</label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="connect-auth-input"
            autoComplete="family-name"
            disabled={status === 'loading'}
          />

          <div className="connect-auth-actions" style={{ marginTop: '0.5rem' }}>
            <button
              type="submit"
              className="connect-portal-btn"
              disabled={!canSubmit || memberCheckState !== 'ready'}
            >
              {status === 'loading' ? 'saving…' : 'continue →'}
            </button>
          </div>

          {memberCheckState === 'missing' && (
            <>
              <p className="connect-auth-error" style={{ marginTop: '0.75rem' }}>
                we couldn&apos;t confirm your session yet. keep this page open and try again.
              </p>
              <div className="connect-auth-actions" style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="connect-portal-btn"
                  onClick={() => { void retrySessionCheck() }}
                  disabled={status === 'loading' || isRetryingSession}
                >
                  {isRetryingSession ? 'checking…' : 'retry session check'}
                </button>
              </div>
            </>
          )}

          {status === 'error' && error && <p className="connect-auth-error">{error}</p>}
        </form>

        <Link href="/" variant="subtle" style={{ position: 'fixed', bottom: '1rem', left: '1rem' }}>
          ← home
        </Link>
      </div>
    </div>
  )
}
