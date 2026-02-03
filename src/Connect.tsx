import { useCallback, useEffect, useRef } from 'react'
import './index.css'
import { clearLocalSessionFlags } from './utils/memberSession.ts'

// Internal navigation helper - ensures all navigation stays within the app
const navigateTo = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Connect() {
  const portalSlotRef = useRef<HTMLDivElement | null>(null)

  const handleLogout = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    clearLocalSessionFlags()
  }, [])

  useEffect(() => {
    const stash = document.getElementById('ghost-portal-trigger-stash')
    const signup = document.getElementById('ghost-portal-trigger-signup')
    const signin = document.getElementById('ghost-portal-trigger-signin')

    if (!portalSlotRef.current || !stash || !signup || !signin) return

    // Style + label the real Portal triggers (Portal already attached handlers).
    signup.textContent = 'sign up →'
    signin.textContent = 'log in →'
    signup.classList.add('catsky-portal-trigger-btn')
    signin.classList.add('catsky-portal-trigger-btn')
    signin.classList.add('catsky-portal-trigger-btn-secondary')

    // Move into this page.
    portalSlotRef.current.appendChild(signup)
    portalSlotRef.current.appendChild(signin)

    return () => {
      // Move back to stash so other pages can reuse.
      if (signup.parentElement !== stash) stash.appendChild(signup)
      if (signin.parentElement !== stash) stash.appendChild(signin)
    }
  }, [])

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

        <div style={{ marginBottom: '2rem', opacity: 0.9 }}>
          <p style={{ marginBottom: '1.5rem' }}>
            sign up / log in via ghost portal.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <div ref={portalSlotRef} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }} />

            <a
              href="#"
              data-members-signout
              onClick={handleLogout}
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                textDecoration: 'none',
                fontSize: '0.95rem',
                letterSpacing: '0.05em',
                borderBottom: '1px solid rgba(255, 255, 255, 0.25)',
                paddingBottom: '0.1rem',
                cursor: 'pointer',
                textTransform: 'lowercase',
              }}
            >
              log out
            </a>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <a
              href="/listen"
              onClick={(e) => {
                e.preventDefault()
                navigateTo('/listen')
              }}
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                textDecoration: 'none',
                fontSize: '0.95rem',
                letterSpacing: '0.05em',
                borderBottom: '1px solid rgba(255, 255, 255, 0.25)',
                paddingBottom: '0.1rem',
                cursor: 'pointer',
                textTransform: 'lowercase',
              }}
            >
              continue →
            </a>
          </div>
        </div>

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
