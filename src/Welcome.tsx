import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, PageTitle } from './components'
import { getCurrentMember } from './utils'
import { navigateTo } from './router/navigation'

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
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const currentMember = await getCurrentMember()
      if (cancelled) return

      if (!currentMember?.id || !currentMember?.email) {
        navigateTo('/connect')
        return
      }

      setMember({ id: currentMember.id, email: currentMember.email })
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const canSubmit = useMemo(() => firstName.trim().length > 0 && status !== 'loading', [firstName, status])

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
            <button type="submit" className="connect-portal-btn" disabled={!canSubmit}>
              {status === 'loading' ? 'saving…' : 'continue →'}
            </button>
          </div>

          {status === 'error' && error && <p className="connect-auth-error">{error}</p>}
        </form>

        <Link href="/" variant="subtle" style={{ position: 'fixed', bottom: '1rem', left: '1rem' }}>
          ← home
        </Link>
      </div>
    </div>
  )
}
