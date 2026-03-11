import React, { useCallback, useEffect, useState } from 'react'
import { PageTitle, Link } from './components'
import {
  clearLocalSessionFlags,
  triggerPortalSignOut,
  isSubscriber,
  getCurrentMember,
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

const MAGIC_LINK_API = '/members/api/send-magic-link/'

export default function Connect() {
  const [portalHashActive, setPortalHashActive] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [authEntryPoint, setAuthEntryPoint] = useState<'signup' | 'signin'>('signup')
  const [authEmail, setAuthEmail] = useState('')
  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const check = () => setPortalHashActive(PORTAL_HASH_REGEX.test(window.location.hash))
    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [])

  const refreshMemberStatus = useCallback(async () => {
    const loggedIn = await isSubscriber()
    setIsLoggedIn(loggedIn)
    return loggedIn
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

  // Magic-link callbacks land on /connect?action=signin&success=true.
  // Re-check the Ghost member session a few times so buttons update reliably.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const isMagicLinkSuccess =
      (params.get('action') === 'signin' || params.get('action') === 'signup') &&
      params.get('success') === 'true'

    if (!isMagicLinkSuccess) return

    let cancelled = false
    const retryDelaysMs = [0, 400, 1200, 2500, 5000, 8000]

    const run = async () => {
      for (const delay of retryDelaysMs) {
        if (cancelled) return
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay))
          if (cancelled) return
        }

        const loggedIn = await refreshMemberStatus()
        if (loggedIn) {
          if (params.get('action') === 'signup') {
            const member = await getCurrentMember()
            const memberId = member?.id || ''
            const memberEmail = member?.email || ''
            const qs = new URLSearchParams()
            if (memberId) qs.set('memberId', memberId)
            if (memberEmail) qs.set('email', memberEmail)
            const target = '/welcome' + (qs.toString() ? `?${qs.toString()}` : '')
            window.history.replaceState({}, '', target)
            window.dispatchEvent(new PopStateEvent('popstate'))
            return
          }
          setShowAuthForm(false)
          return
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [refreshMemberStatus])

  // Refresh auth state when returning to this tab (common after opening email links).
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'hidden') return
      void refreshMemberStatus()
    }

    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refreshMemberStatus])

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

  const openAuthForm = useCallback((entryPoint: 'signup' | 'signin') => {
    setAuthEntryPoint(entryPoint)
    setShowAuthForm(true)
    setAuthStatus('idle')
    setAuthError(null)
  }, [])

  const closeAuthForm = useCallback(() => {
    setShowAuthForm(false)
    setAuthStatus('idle')
    setAuthError(null)
  }, [])

  const handleAuthSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const email = authEmail.trim()
      if (!email || !email.includes('@')) {
        setAuthError('Please enter a valid email.')
        setAuthStatus('error')
        return
      }
      setAuthError(null)
      setAuthStatus('loading')
      try {
        const res = await fetch(MAGIC_LINK_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          setAuthError(data?.error || res.statusText || 'Something went wrong.')
          setAuthStatus('error')
          return
        }
        setAuthStatus('success')
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Network error.')
        setAuthStatus('error')
      }
    },
    [authEmail]
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

        {/* Portal links: set hash so Ghost Portal opens; if it didn’t init, fallback opens Ghost in new tab */}
        <div className="connect-portal-buttons">
          {isLoggedIn !== true && (
            <>
              {!showAuthForm ? (
                <>
                  <button
                    type="button"
                    className="connect-portal-btn"
                    onClick={() => openAuthForm('signup')}
                  >
                    sign up →
                  </button>
                  <button
                    type="button"
                    className="connect-portal-btn"
                    onClick={() => openAuthForm('signin')}
                  >
                    log in →
                  </button>
                </>
              ) : (
                <form className="connect-auth-form" onSubmit={handleAuthSubmit}>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    disabled={authStatus === 'loading'}
                    autoFocus
                    className="connect-auth-input"
                  />
                  <div className="connect-auth-actions">
                    <button type="submit" className="connect-portal-btn" disabled={authStatus === 'loading'}>
                      {authStatus === 'loading' ? 'sending…' : 'send magic link'}
                    </button>
                    <button
                      type="button"
                      className="connect-portal-btn-text"
                      onClick={closeAuthForm}
                    >
                      cancel
                    </button>
                  </div>
                  {authStatus === 'success' && (
                    <p className="connect-auth-message">
                      {authEntryPoint === 'signin'
                        ? 'check your email for the log-in link.'
                        : 'check your email for the sign-up link.'}
                    </p>
                  )}
                  {authStatus === 'error' && authError && (
                    <p className="connect-auth-error">{authError}</p>
                  )}
                </form>
              )}
            </>
          )}
          {isLoggedIn === true && (
            <>
              <a
                href="#/portal/account"
                data-portal="account"
                className="connect-portal-btn"
                onClick={handlePortalClick}
              >
                account
              </a>
              <a
                href="#"
                data-members-signout
                onClick={handleLogout}
                className="connect-portal-btn-text"
              >
                log out
              </a>
            </>
          )}
        </div>

        {portalHashActive && typeof window !== 'undefined' && window.location?.hostname !== 'catsky.club' && (
          <p className="connect-portal-hint" style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.75rem' }}>
            Session is stored on the Ghost domain; use production (catsky.club) to see logged-in state.
          </p>
        )}

        <div style={{ marginBottom: '2rem', opacity: 0.9 }}>
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
