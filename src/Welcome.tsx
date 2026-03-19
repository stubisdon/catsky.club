import { FormEvent, useMemo, useState } from 'react'
import { Link, PageTitle } from './components'
import { navigateTo } from './router/navigation'

interface MemberProfilePayload {
  firstName: string
  lastName: string
}

export default function Welcome() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => firstName.trim().length > 0 && !isSubmitting, [firstName, isSubmitting])

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const safeFirstName = firstName.trim()
    const safeLastName = lastName.trim()

    if (!safeFirstName) {
      setError('First name is required.')
      return
    }

    setIsSubmitting(true)
    setError('')

    const payload: MemberProfilePayload = {
      firstName: safeFirstName,
      lastName: safeLastName,
    }

    const body = JSON.stringify(payload)
    let requestQueued = false

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        requestQueued = navigator.sendBeacon(
          '/api/member-profile',
          new Blob([body], { type: 'application/json' }),
        )
      } catch {
        requestQueued = false
      }
    }

    if (!requestQueued) {
      void fetch('/api/member-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        keepalive: true,
        body,
      }).catch((err) => {
        console.error('[welcome profile save failed after navigation]', err)
      })
    }

    navigateTo('/listen')
  }

  return (
    <div className="app-container">
      <div className="connect-content">
        <PageTitle>welcome</PageTitle>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>one quick step before you continue.</p>
        <p className="connect-auth-message" style={{ marginBottom: '1rem' }}>
          we&apos;ll save this in the background while you keep browsing.
        </p>

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
          />

          <label htmlFor="lastName" style={{ opacity: 0.9 }}>last name (optional)</label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="connect-auth-input"
            autoComplete="family-name"
          />

          <div className="connect-auth-actions" style={{ marginTop: '0.5rem' }}>
            <button
              type="submit"
              className="connect-portal-btn"
              disabled={!canSubmit}
            >
              continue →
            </button>
          </div>

          {error && <p className="connect-auth-error">{error}</p>}
        </form>

        <Link href="/" variant="subtle" style={{ position: 'fixed', bottom: '1rem', left: '1rem' }}>
          ← home
        </Link>
      </div>
    </div>
  )
}
