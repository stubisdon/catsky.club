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
  const [showSigninForm, setShowSigninForm] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const [signinEmail, setSigninEmail] = useState('')
  const [signupStatus, setSignupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [signinStatus, setSigninStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [signupError, setSignupError] = useState<string | null>(null)
  const [signinError, setSigninError] = useState<string | null>(null)

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

  const handleLogout = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
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

  const handleSigninSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const email = signinEmail.trim()
      if (!email || !email.includes('@')) {
        setSigninError('please enter a valid email.')
        setSigninStatus('error')
        return
      }
      setSigninError(null)
      setSigninStatus('loading')
      try {
        const res = await fetch(MAGIC_LINK_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          setSigninError(data?.error || res.statusText || 'something went wrong.')
          setSigninStatus('error')
          return
        }
        setSigninStatus('success')
      } catch (err) {
        setSigninError(err instanceof Error ? err.message : 'network error.')
        setSigninStatus('error')
      }
    },
    [signinEmail]
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

        <div className="connect-portal-buttons">
          {isLoggedIn !== true && (
            <>
              {!showSignupForm ? (
                <button
                  type="button"
                  className="connect-portal-btn"
                  onClick={() => { setShowSignupForm(true); setShowSigninForm(false); }}
                >
                  sign up →
                </button>
              ) : (
                <form onSubmit={handleSignupSubmit} className="connect-auth-form">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    disabled={signupStatus === 'loading'}
                    autoFocus
                    className="connect-auth-input"
                  />
                  <div className="connect-auth-actions">
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
                    <p className="connect-auth-message">check your email for the sign-in link.</p>
                  )}
                  {signupStatus === 'error' && signupError && (
                    <p className="connect-auth-message connect-auth-error">{signupError}</p>
                  )}
                </form>
              )}
              {!showSigninForm ? (
                <button
                  type="button"
                  className="connect-portal-btn"
                  onClick={() => { setShowSigninForm(true); setShowSignupForm(false); }}
                >
                  log in →
                </button>
              ) : (
                <form onSubmit={handleSigninSubmit} className="connect-auth-form">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={signinEmail}
                    onChange={(e) => setSigninEmail(e.target.value)}
                    disabled={signinStatus === 'loading'}
                    autoFocus
                    className="connect-auth-input"
                  />
                  <div className="connect-auth-actions">
                    <button type="submit" className="connect-portal-btn" disabled={signinStatus === 'loading'}>
                      {signinStatus === 'loading' ? 'sending…' : 'send magic link'}
                    </button>
                    <button
                      type="button"
                      className="connect-portal-btn connect-portal-btn-text"
                      onClick={() => { setShowSigninForm(false); setSigninStatus('idle'); setSigninError(null); }}
                    >
                      cancel
                    </button>
                  </div>
                  {signinStatus === 'success' && (
                    <p className="connect-auth-message">check your email for the sign-in link.</p>
                  )}
                  {signinStatus === 'error' && signinError && (
                    <p className="connect-auth-message connect-auth-error">{signinError}</p>
                  )}
                </form>
              )}
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
            <Link
              href="/listen"
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.95rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.25)',
                paddingBottom: '0.1rem',
              }}
            >
              continue →
            </Link>
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
