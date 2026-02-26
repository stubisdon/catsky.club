import React, { useCallback, useEffect, useState } from 'react'
import { PageTitle, Link } from './components'
import {
  clearLocalSessionFlags,
  triggerPortalSignOut,
  isSubscriber,
  setDevMemberOverride,
} from './utils'

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

const MAGIC_LINK_API = '/members/api/send-magic-link/'

export default function Connect() {
  const [portalHashActive, setPortalHashActive] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [showSignupForm, setShowSignupForm] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const [signupStatus, setSignupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [signupError, setSignupError] = useState<string | null>(null)

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

  const wasPortalActive = React.useRef(false)
  useEffect(() => {
    if (portalHashActive) {
      wasPortalActive.current = true
    } else if (wasPortalActive.current) {
      wasPortalActive.current = false
      const t = setTimeout(refreshMemberStatus, 300)
      return () => clearTimeout(t)
    }
  }, [portalHashActive, refreshMemberStatus])

  const handleLogout = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    triggerPortalSignOut()
    clearLocalSessionFlags()
    setDevMemberOverride(false)
    setIsLoggedIn(false)
    setTimeout(refreshMemberStatus, 500)
  }, [refreshMemberStatus])

  const handleSignupSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const email = signupEmail.trim()
      if (!email || !email.includes('@')) {
        setSignupError('please enter a valid email.')
        setSignupStatus('error')
        return
      }
      setSignupError(null)
      setSignupStatus('loading')
      try {
        const res = await fetch(MAGIC_LINK_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          setSignupError(data?.error || res.statusText || 'something went wrong.')
          setSignupStatus('error')
          return
        }
        setSignupStatus('success')
      } catch (err) {
        setSignupError(err instanceof Error ? err.message : 'network error.')
        setSignupStatus('error')
      }
    },
    [signupEmail]
  )

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
        <PageTitle>connect</PageTitle>

        {/* Sign up / Log in flow - only shown when not logged in */}
        {isLoggedIn !== true && (
          <div className="connect-portal-buttons">
            {!showSignupForm ? (
              <button
                type="button"
                className="connect-portal-btn"
                onClick={() => setShowSignupForm(true)}
              >
                sign up →
              </button>
            ) : (
              <form onSubmit={handleSignupSubmit} className="connect-signup-form">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  disabled={signupStatus === 'loading'}
                  autoFocus
                  className="connect-signup-input"
                />
                <div className="connect-signup-actions">
                  <button type="submit" className="connect-portal-btn" disabled={signupStatus === 'loading'}>
                    {signupStatus === 'loading' ? 'sending…' : 'send magic link'}
                  </button>
                  <button
                    type="button"
                    className="connect-portal-btn connect-portal-btn-text"
                    onClick={() => { setShowSignupForm(false); setSignupStatus('idle'); setSignupError(null); }}
                  >
                    cancel
                  </button>
                </div>
                {signupStatus === 'success' && (
                  <p className="connect-signup-message">check your email for the sign-in link.</p>
                )}
                {signupStatus === 'error' && signupError && (
                  <p className="connect-signup-error">{signupError}</p>
                )}
              </form>
            )}
            <a
              href="#/portal/signin"
              data-portal="signin"
              className="connect-portal-btn"
              onClick={handlePortalClick}
            >
              log in →
            </a>
          </div>
        )}

        {/* Account and log out - only shown when logged in */}
        {isLoggedIn === true && (
          <div className="connect-portal-buttons">
            <a
              href="#/portal/account"
              data-portal="account"
              className="connect-portal-btn"
              onClick={handlePortalClick}
            >
              account
            </a>
            <button
              type="button"
              className="connect-portal-btn connect-portal-btn-text"
              onClick={handleLogout}
            >
              log out
            </button>
          </div>
        )}

        {portalHashActive && typeof window !== 'undefined' && window.location?.hostname !== 'catsky.club' && (
          <p className="connect-portal-hint">
            session is stored on the ghost domain; use production (catsky.club) to see logged-in state.
          </p>
        )}

        <div style={{ marginTop: '2rem' }}>
          <Link href="/listen" variant="subtle">
            continue →
          </Link>
        </div>

        {typeof import.meta !== 'undefined' && import.meta.env?.DEV && (
          <div className="connect-dev-controls">
            <span>dev:</span>
            <button
              type="button"
              onClick={() => {
                setDevMemberOverride(true)
                refreshMemberStatus()
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
            >
              simulate logged out
            </button>
          </div>
        )}

        <Link
          href="/"
          variant="subtle"
          style={{ position: 'fixed', bottom: '1rem', left: '1rem' }}
        >
          ← home
        </Link>
      </div>
    </div>
  )
}
