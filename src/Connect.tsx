import { useCallback, useEffect } from 'react'
import './index.css'
import { clearLocalSessionFlags } from './utils/memberSession.ts'

// Internal navigation helper - ensures all navigation stays within the app
const navigateTo = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const CONNECT_BODY_CLASS = 'route-connect'

const PORTAL_FALLBACK_MS = 600

function getPortalFallbackUrl(hash: string): string {
  const url = document.querySelector('script[data-ghost]')?.getAttribute('data-ghost')
  const ghost = (url && url.trim()) || 'https://catsky.club'
  const ghostBase = ghost.replace(/\/+$/, '')
  try {
    const origin = new URL(ghostBase).origin
    return origin + '/connect' + hash
  } catch {
    return ghostBase + hash
  }
}

function handlePortalClick(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  const href = e.currentTarget.getAttribute('href') || '#/portal/signup'
  const hash = href.startsWith('#') ? href : `#${href}`
  window.location.hash = hash
  window.dispatchEvent(new HashChangeEvent('hashchange'))
  setTimeout(() => {
    const root = document.getElementById('ghost-portal-root')
    const hasPortal = root?.querySelector('[class*="popup"], [class*="modal"], iframe') != null
    if (!hasPortal) {
      window.open(getPortalFallbackUrl(hash), '_blank', 'noopener')
    }
  }, PORTAL_FALLBACK_MS)
}

export default function Connect() {
  const handleLogout = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    clearLocalSessionFlags()
  }, [])

  useEffect(() => {
    document.body.classList.add(CONNECT_BODY_CLASS)
    const triggers = document.getElementById('ghost-portal-triggers')
    if (triggers) triggers.setAttribute('aria-hidden', 'false')
    return () => {
      document.body.classList.remove(CONNECT_BODY_CLASS)
      if (triggers) triggers.setAttribute('aria-hidden', 'true')
    }
  }, [])

  return (
    <div className="app-container">
      <div className="connect-content">
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

        {/* Portal links: set hash so Ghost Portal opens; if it didn’t init, fallback opens Ghost in new tab */}
        <div className="connect-portal-buttons">
          <a
            href="#/portal/signup"
            data-portal="signup"
            className="connect-portal-btn"
            onClick={handlePortalClick}
          >
            sign up →
          </a>
          <a
            href="#/portal/signin"
            data-portal="signin"
            className="connect-portal-btn"
            onClick={handlePortalClick}
          >
            log in →
          </a>
          <a
            href="#/portal/account"
            data-portal="account"
            className="connect-portal-btn"
            onClick={handlePortalClick}
          >
            account
          </a>
        </div>

        <div style={{ marginBottom: '2rem', opacity: 0.9 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
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
