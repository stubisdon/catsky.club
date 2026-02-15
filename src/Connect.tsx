import React, { useCallback, useEffect, useState } from 'react'
import './index.css'
import { clearLocalSessionFlags, triggerPortalSignOut } from './utils/memberSession.ts'
import { isSubscriber, setDevMemberOverride } from './utils/subscription.ts'

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
    const fallbackUrl = getPortalFallbackUrl(hash)
    try {
      const fallback = new URL(fallbackUrl)
      const current = new URL(window.location.href)
      const isLocalhost = current.hostname === 'localhost' || current.hostname === '127.0.0.1'
      const sameOrigin = current.origin === fallback.origin
      const sameSite =
        current.hostname === fallback.hostname ||
        current.hostname === 'www.' + fallback.hostname ||
        fallback.hostname === 'www.' + current.hostname
      const alreadyOnConnect = current.pathname.replace(/\/+$/, '') === '/connect'
      // Never open a new tab on localhost (Portal loads in-page via proxy); same origin/site or already on /connect: stay
      if (isLocalhost || sameOrigin || (sameSite && alreadyOnConnect)) return
      const root = document.getElementById('ghost-portal-root')
      const hasPortal = root?.querySelector('[class*="popup"], [class*="modal"], iframe') != null
      if (hasPortal) return
      window.open(fallbackUrl, '_blank', 'noopener')
    } catch {
      const current = new URL(window.location.href)
      const fallback = new URL(getPortalFallbackUrl(hash))
      const same = current.origin === fallback.origin || current.hostname === fallback.hostname
      if (!same) window.open(getPortalFallbackUrl(hash), '_blank', 'noopener')
    }
  }, PORTAL_FALLBACK_MS)
}

const PORTAL_HASH_REGEX = /^#\/portal\/(signup|signin|account)/

export default function Connect() {
  const [portalHashActive, setPortalHashActive] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => setPortalHashActive(PORTAL_HASH_REGEX.test(window.location.hash))
    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [])

  const refreshMemberStatus = useCallback(() => {
    isSubscriber().then(setIsLoggedIn)
  }, [])

  useEffect(() => {
    let cancelled = false
    isSubscriber().then((loggedIn) => {
      if (!cancelled) setIsLoggedIn(loggedIn)
    })
    return () => { cancelled = true }
  }, [])

  // After closing the Portal (e.g. after sign-in), re-check so we hide sign up / log in
  const wasPortalActive = React.useRef(false)
  useEffect(() => {
    if (portalHashActive) {
      wasPortalActive.current = true
    } else if (wasPortalActive.current) {
      wasPortalActive.current = false
      // Brief delay so cookie from login response is set before we refetch
      const t = setTimeout(refreshMemberStatus, 300)
      return () => clearTimeout(t)
    }
  }, [portalHashActive, refreshMemberStatus])

  const handleLogout = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    // Trigger Ghost Portal sign out first (clears member cookie); hidden trigger is in DOM at load so Portal bound to it
    triggerPortalSignOut()
    clearLocalSessionFlags()
    setDevMemberOverride(false) // clear dev override so localhost stays in sync
    setIsLoggedIn(false)
    // Re-check after Ghost has processed signout so UI stays in sync
    setTimeout(refreshMemberStatus, 500)
  }, [refreshMemberStatus])

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
          {isLoggedIn !== true && (
            <>
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
            </>
          )}
          <a
            href="#/portal/account"
            data-portal="account"
            className="connect-portal-btn"
            onClick={handlePortalClick}
          >
            account
          </a>
        </div>

        {portalHashActive && typeof window !== 'undefined' && window.location?.hostname !== 'catsky.club' && (
          <p className="connect-portal-hint" style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.75rem' }}>
            Session is stored on the Ghost domain; use production (catsky.club) to see logged-in state.
          </p>
        )}

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

        {typeof import.meta !== 'undefined' && import.meta.env?.DEV && (
          <div
            style={{
              position: 'fixed',
              bottom: '1rem',
              right: '1rem',
              fontSize: '0.75rem',
              opacity: 0.7,
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}
          >
            <span style={{ letterSpacing: '0.05em' }}>Dev:</span>
            <button
              type="button"
              onClick={() => {
                setDevMemberOverride(true)
                refreshMemberStatus()
              }}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.4)',
                color: 'rgba(255,255,255,0.9)',
                padding: '0.25rem 0.5rem',
                cursor: 'pointer',
                letterSpacing: '0.05em',
                textTransform: 'lowercase',
              }}
            >
              simulate logged in
            </button>
            <button
              type="button"
              onClick={() => {
                setDevMemberOverride(false)
                refreshMemberStatus()
              }}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.4)',
                color: 'rgba(255,255,255,0.9)',
                padding: '0.25rem 0.5rem',
                cursor: 'pointer',
                letterSpacing: '0.05em',
                textTransform: 'lowercase',
              }}
            >
              simulate logged out
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
