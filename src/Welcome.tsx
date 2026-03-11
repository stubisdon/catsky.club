import { FormEvent, useMemo, useState } from 'react'
import { Link, PageTitle } from './components'

export default function Welcome() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const initialMemberId = params.get('memberId') || ''
  const initialEmail = params.get('email') || ''

  const [memberId] = useState(initialMemberId)
  const [email] = useState(initialEmail)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  const canSubmit = firstName.trim().length > 0 && status !== 'loading'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const safeFirst = firstName.trim()
    if (!safeFirst) {
      setError('First name is required.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError('')

    const payload = {
      memberId,
      email,
      first_name: safeFirst,
      last_name: lastName.trim(),
    }

    try {
      const res = await fetch('/api/member-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error || 'Could not save profile.')
      }

      window.location.href = '/listen'
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Could not save profile.')
    }
  }

  return (
    <div className="app-container">
      <div className="connect-content">
        <PageTitle>welcome</PageTitle>
        <p style={{ opacity: 0.8, marginBottom: '1rem' }}>One quick step before you continue.</p>
        <form className="connect-auth-form" onSubmit={onSubmit}>
          <input
            className="connect-auth-input"
            type="text"
            autoFocus
            required
            placeholder="first name *"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={status === 'loading'}
          />
          <input
            className="connect-auth-input"
            type="text"
            placeholder="last name (optional)"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={status === 'loading'}
          />
          <div className="connect-auth-actions">
            <button type="submit" className="connect-portal-btn" disabled={!canSubmit}>
              {status === 'loading' ? 'saving…' : 'continue →'}
            </button>
          </div>
          {error && <p className="connect-auth-error">{error}</p>}
        </form>

        <Link href="/connect" variant="subtle" style={{ position: 'fixed', bottom: '1rem', left: '1rem' }}>
          ← back
        </Link>
      </div>
    </div>
  )
}
