import { useCallback, useMemo, useState } from 'react'
import './index.css'

// Internal navigation helper - ensures all navigation stays within the app
const navigateTo = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Connect() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const alreadySignedUp = useMemo(() => {
    try {
      return window.localStorage.getItem('catsky_signed_up') === '1'
    } catch {
      return false
    }
  }, [])

  const submit = useCallback(async () => {
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      setError('name is required')
      return
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('valid email is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, contact: trimmedEmail, digDeeper: '' }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        setError(payload?.error || 'unable to sign up right now')
        setSubmitting(false)
        return
      }

      try {
        window.localStorage.setItem('catsky_signed_up', '1')
      } catch {
        // ignore
      }
      setSubmitted(true)
      setSubmitting(false)
    } catch (e) {
      setError('unable to sign up right now')
      setSubmitting(false)
    }
  }, [email, name])

  return (
    <div className="app-container">
      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          padding: '2rem',
          textAlign: 'left',
          letterSpacing: '0.05em',
          lineHeight: 1.8,
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(1.8rem, 4vw, 3rem)',
            marginBottom: '1.25rem',
            letterSpacing: '0.1em',
            textTransform: 'lowercase',
          }}
        >
          connect
        </h1>

        {alreadySignedUp || submitted ? (
          <div style={{ marginBottom: '2rem', opacity: 0.9 }}>
            <div style={{ marginBottom: '1rem' }}>you’re in.</div>
            <a
              href="/listen"
              onClick={(e) => {
                e.preventDefault()
                navigateTo('/listen')
              }}
              style={{
                color: 'var(--color-text)',
                textDecoration: 'none',
                fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                letterSpacing: '0.1em',
                border: '2px solid var(--color-text)',
                padding: '0.9rem 1.5rem',
                display: 'inline-block',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                textTransform: 'lowercase',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-text)'
                e.currentTarget.style.color = 'var(--color-bg)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--color-text)'
              }}
            >
              continue →
            </a>
          </div>
        ) : (
          <form
            style={{ marginBottom: '2rem' }}
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <div style={{ opacity: 0.85, marginBottom: '1.25rem' }}>
              <div>name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                style={{
                  width: '100%',
                  marginTop: '0.4rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-mono)',
                  padding: '0.6rem 0.7rem',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ opacity: 0.85, marginBottom: '1.25rem' }}>
              <div>email</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                type="email"
                style={{
                  width: '100%',
                  marginTop: '0.4rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-mono)',
                  padding: '0.6rem 0.7rem',
                  fontSize: '1rem',
                }}
              />
            </div>

            {error && (
              <div style={{ opacity: 0.75, marginBottom: '1rem', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                background: 'transparent',
                border: '2px solid var(--color-text)',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                padding: '0.9rem 1.5rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                letterSpacing: '0.1em',
                transition: 'all 0.3s ease',
                textTransform: 'lowercase',
                opacity: submitting ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (submitting) return
                e.currentTarget.style.background = 'var(--color-text)'
                e.currentTarget.style.color = 'var(--color-bg)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--color-text)'
              }}
            >
              {submitting ? 'saving…' : 'sign up →'}
            </button>
          </form>
        )}

        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            navigateTo('/')
          }}
          style={{
            position: 'fixed',
            bottom: '1rem',
            left: '1rem',
            color: 'rgba(255, 255, 255, 0.5)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            letterSpacing: '0.05em',
            transition: 'color 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'
          }}
        >
          ← home
        </a>
      </div>
    </div>
  )
}
