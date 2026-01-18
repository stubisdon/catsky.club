import { useCallback, useEffect, useState } from 'react'
import './index.css'

// Internal navigation helper - ensures all navigation stays within the app
const navigateTo = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function isActivated(): boolean {
  return window.localStorage.getItem('catsky_activated') === '1'
}

async function checkGhostMember(): Promise<boolean> {
  const res = await fetch('/members/api/member/', { credentials: 'include' })
  if (!res.ok) return false
  const data = (await res.json()) as unknown
  if (typeof data === 'object' && data !== null && 'member' in data) {
    const member = (data as any).member
    return Boolean(member)
  }
  return false
}

function openPortalPaid(): void {
  // Ghost Portal uses hash navigation to open the account/subscription page
  // This will trigger Portal to open if the script is loaded
  window.location.hash = '#/portal/account'
}

export default function Join() {
  const [activated, setActivated] = useState<boolean>(() => isActivated())
  const [isMember, setIsMember] = useState<boolean | null>(null)

  const refresh = useCallback(async () => {
    setActivated(isActivated())
    try {
      const member = await checkGhostMember()
      setIsMember(member)
    } catch {
      setIsMember(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const canJoin = activated && isMember === true

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
          join close
        </h1>

        {!activated ? (
          <div style={{ opacity: 0.9, marginBottom: '2rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              access to unreleased songs, music videos, and drafts.
            </p>
            <button
              type="button"
              onClick={() => {
                openPortalPaid()
              }}
              style={{
                background: 'transparent',
                border: '2px solid var(--color-text)',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                padding: '0.9rem 1.5rem',
                cursor: 'pointer',
                letterSpacing: '0.1em',
                transition: 'all 0.3s ease',
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
              enter →
            </button>
          </div>
        ) : isMember === false ? (
          <div style={{ opacity: 0.9, marginBottom: '2rem' }}>
            <p style={{ marginBottom: '1rem' }}>
              one more step: sign up for letters (free). then you can decide if close is for you.
            </p>
            <a
              href="/connect"
              onClick={(e) => {
                e.preventDefault()
                navigateTo('/connect')
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
            >
              connect →
            </a>
          </div>
        ) : (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ opacity: 0.9, marginBottom: '2rem' }}>
              <p style={{ marginBottom: '1.5rem' }}>
                access to unreleased songs, music videos, and drafts.
              </p>
            </div>

            <button
              type="button"
              disabled={!canJoin}
              onClick={() => {
                if (canJoin) {
                  openPortalPaid()
                }
              }}
              style={{
                background: 'transparent',
                border: '2px solid var(--color-text)',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                padding: '0.9rem 1.5rem',
                cursor: canJoin ? 'pointer' : 'not-allowed',
                letterSpacing: '0.1em',
                transition: 'all 0.3s ease',
                textTransform: 'lowercase',
                opacity: canJoin ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                if (canJoin) {
                  e.currentTarget.style.background = 'var(--color-text)'
                  e.currentTarget.style.color = 'var(--color-bg)'
                }
              }}
              onMouseLeave={(e) => {
                if (canJoin) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--color-text)'
                }
              }}
            >
              {canJoin ? 'enter credit card information' : 'checking…'}
            </button>

          </div>
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

