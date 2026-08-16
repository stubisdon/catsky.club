import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { PageTitle, Link } from './components'
import {
  clearLocalSessionFlags,
  getCurrentMember,
  getMembershipTier,
  getPaidPlanOptions,
  openPortalAccount,
  openPortalAccountPlans,
  type MembershipTier,
  type PaidPlanOption,
  triggerPortalSignOut,
  setDevMemberOverride,
} from './utils'
import { identifyMember, resetAnalyticsIdentity, trackEvent } from './utils/analytics'
import { type AuthCallback } from './utils/authCallback'

const CONNECT_BODY_CLASS = 'route-connect'

const MAGIC_LINK_API = '/members/api/send-magic-link/'

// Cloudflare Turnstile site key (public). Set VITE_TURNSTILE_SITE_KEY at build time to enable
// the anti-bot challenge on signup/login. When unset, the form behaves exactly as before.
const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || ''

let turnstileScriptPromise: Promise<void> | null = null
function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if ((window as unknown as { turnstile?: unknown }).turnstile) return Promise.resolve()
  if (turnstileScriptPromise) return turnstileScriptPromise
  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Turnstile'))
    document.head.appendChild(script)
  })
  return turnstileScriptPromise
}

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id?: string) => void
  remove: (id?: string) => void
}
function getTurnstile(): TurnstileApi | null {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile ?? null
}

interface ConnectProps {
  failedAuthCallback?: AuthCallback | null
}

export default function Connect({ failedAuthCallback = null }: ConnectProps) {
  const [portalHashActive, setPortalHashActive] = useState(false)
  const [membershipTier, setMembershipTier] = useState<MembershipTier | null>(null)
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [authEntryPoint, setAuthEntryPoint] = useState<'signup' | 'signin'>('signup')
  const [authEmail, setAuthEmail] = useState('')
  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [authError, setAuthError] = useState<string | null>(null)
  const [resendSeconds, setResendSeconds] = useState(0)
  const [paidPlans, setPaidPlans] = useState<PaidPlanOption[]>([])
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileContainerRef = React.useRef<HTMLDivElement | null>(null)
  const turnstileWidgetIdRef = React.useRef<string | null>(null)
  const confirmationRef = React.useRef<HTMLDivElement | null>(null)
  const resendSecondsRef = React.useRef(0)

  const isLoggedIn = useMemo(() => membershipTier !== null && membershipTier !== 'none', [membershipTier])

  useEffect(() => {
    const check = () => setPortalHashActive(window.location.hash.startsWith('#/portal/'))
    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [])

  const refreshMemberStatus = useCallback(async () => {
    const tier = await getMembershipTier()
    setMembershipTier(tier)
    if (tier === 'none') {
      identifyMember(null, tier)
      return tier
    }

    const member = await getCurrentMember().catch(() => null)
    identifyMember(member, tier)
    return tier
  }, [])

  useEffect(() => {
    let cancelled = false
    refreshMemberStatus().then((tier) => {
      if (!cancelled) setMembershipTier(tier)
    })
    return () => { cancelled = true }
  }, [refreshMemberStatus])

  useEffect(() => {
    let cancelled = false
    getPaidPlanOptions().then((tiers) => {
      if (!cancelled) setPaidPlans(tiers)
    })
    return () => {
      cancelled = true
    }
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

  useEffect(() => {
    if (!failedAuthCallback) return

    setAuthEntryPoint(failedAuthCallback.action)
    setShowAuthForm(true)
    setAuthStatus('error')
    setAuthError('that link has expired or was already used. request a new one.')
  }, [failedAuthCallback])

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
    triggerPortalSignOut()
    resetAnalyticsIdentity()
    clearLocalSessionFlags()
    setDevMemberOverride(false)
    setMembershipTier('none')
    setTimeout(refreshMemberStatus, 500)
  }, [refreshMemberStatus])

  const handlePlanUpgrade = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    openPortalAccountPlans()
  }, [])

  const handleAccountClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    openPortalAccount()
  }, [])

  const openAuthForm = useCallback((entryPoint: 'signup' | 'signin') => {
    setAuthEntryPoint(entryPoint)
    setShowAuthForm(true)
    setAuthStatus('idle')
    setAuthError(null)
    resendSecondsRef.current = 0
    setResendSeconds(0)
    trackEvent('auth_form_opened', { entry_point: entryPoint })
  }, [])

  const closeAuthForm = useCallback(() => {
    setShowAuthForm(false)
    setAuthStatus('idle')
    setAuthError(null)
    resendSecondsRef.current = 0
    setResendSeconds(0)
  }, [])

  const resetTurnstile = useCallback(() => {
    setTurnstileToken('')
    const turnstile = getTurnstile()
    if (turnstile && turnstileWidgetIdRef.current) {
      try {
        turnstile.reset(turnstileWidgetIdRef.current)
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    if (authStatus !== 'success' || resendSecondsRef.current <= 0) return
    const timer = window.setInterval(() => {
      const nextSeconds = Math.max(0, resendSecondsRef.current - 1)
      resendSecondsRef.current = nextSeconds
      setResendSeconds(nextSeconds)
      if (nextSeconds === 0) {
        window.clearInterval(timer)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [authStatus])

  useEffect(() => {
    if (authStatus === 'success') confirmationRef.current?.focus()
  }, [authStatus])

  // Render the Turnstile widget while the auth form is open; tear it down when it closes.
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !showAuthForm) return
    let cancelled = false
    loadTurnstileScript()
      .then(() => {
        if (cancelled) return
        const turnstile = getTurnstile()
        const container = turnstileContainerRef.current
        if (!turnstile || !container || turnstileWidgetIdRef.current) return
        turnstileWidgetIdRef.current = turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          callback: (token: string) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(''),
          'error-callback': () => setTurnstileToken(''),
        })
      })
      .catch(() => {
        // Widget failed to load; server still enforces, so submit will surface the error.
      })
    return () => {
      cancelled = true
      const turnstile = getTurnstile()
      if (turnstile && turnstileWidgetIdRef.current) {
        try {
          turnstile.remove(turnstileWidgetIdRef.current)
        } catch {
          // ignore
        }
        turnstileWidgetIdRef.current = null
      }
      setTurnstileToken('')
    }
  }, [showAuthForm])

  const handleAuthSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (authStatus === 'success') {
        resetTurnstile()
        trackEvent('magic_link_resend_clicked', { entry_point: authEntryPoint })
      }
      const email = authEmail.trim()
      if (!email || !email.includes('@')) {
        setAuthError('Please enter a valid email.')
        setAuthStatus('error')
        trackEvent('magic_link_request_failed', { entry_point: authEntryPoint, status: 'validation' })
        return
      }
      if (TURNSTILE_SITE_KEY && !turnstileToken) {
        setAuthError('Please complete the verification below.')
        setAuthStatus('error')
        return
      }
      setAuthError(null)
      setAuthStatus('loading')
      trackEvent('magic_link_requested', { entry_point: authEntryPoint })
      try {
        const res = await fetch(MAGIC_LINK_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(TURNSTILE_SITE_KEY ? { email, turnstileToken } : { email }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string; errors?: { message?: string }[] }
        if (!res.ok) {
          const message = data?.error || data?.errors?.[0]?.message || res.statusText || 'Something went wrong.'
          setAuthError(message)
          setAuthStatus('error')
          trackEvent('magic_link_request_failed', { entry_point: authEntryPoint, status: res.status })
          resetTurnstile()
          return
        }
        setAuthStatus('success')
        resendSecondsRef.current = 30
        setResendSeconds(30)
        trackEvent('magic_link_request_succeeded', { entry_point: authEntryPoint, status: res.status })
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Network error.')
        setAuthStatus('error')
        trackEvent('magic_link_request_failed', { entry_point: authEntryPoint, status: 'network_error' })
        resetTurnstile()
      }
    },
    [authEmail, authEntryPoint, authStatus, turnstileToken, resetTurnstile]
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

  const defaultPlanOptions: PaidPlanOption[] = [
    { name: 'Supporter', monthlyAmount: 500, perks: ['unfinished demos'] },
    { name: 'Backstage', monthlyAmount: 2000, perks: ['unfinished demos', 'unreleased music videos'] },
  ]
  const planOptions = paidPlans.length > 0 ? paidPlans : defaultPlanOptions
  const videoUnlockPlan =
    planOptions.find((plan) => plan.monthlyAmount === 500) ?? defaultPlanOptions[0]
  const activeTierName = useMemo(() => {
    if (membershipTier === 'paid_5' || membershipTier === 'paid_20') {
      const expectedAmount = membershipTier === 'paid_20' ? 2000 : 500
      const exact = planOptions.find((plan) => plan.monthlyAmount === expectedAmount)
      if (exact) return exact.name
    }
    return null
  }, [membershipTier, planOptions])

  return (
    <div className="app-container">
      <div className="connect-content">
        <PageTitle>connect</PageTitle>

        <div className="connect-portal-buttons">
          {!isLoggedIn && (
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
                    onChange={(e) => {
                      setAuthEmail(e.target.value)
                      if (authStatus === 'success' && resendSeconds === 0) setAuthStatus('idle')
                    }}
                    disabled={authStatus === 'loading'}
                    readOnly={authStatus === 'success' && resendSeconds > 0}
                    autoFocus
                    className="connect-auth-input"
                  />
                  {TURNSTILE_SITE_KEY && (
                    <div
                      ref={turnstileContainerRef}
                      className="connect-turnstile"
                      style={{ marginTop: '0.75rem' }}
                    />
                  )}
                  <div className="connect-auth-actions">
                    <button type="submit" className="connect-portal-btn" disabled={authStatus === 'loading' || (authStatus === 'success' && resendSeconds > 0)}>
                      {authStatus === 'loading'
                        ? 'sending…'
                        : authStatus === 'success' && resendSeconds > 0
                          ? 'link sent'
                          : authStatus === 'success'
                            ? 'send again'
                            : 'send magic link'}
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
                    <div className="connect-auth-confirmation" role="status" aria-live="polite" tabIndex={-1} ref={confirmationRef}>
                      <p>check your inbox — we sent a {authEntryPoint === 'signin' ? 'log-in' : 'sign-up'} link to {authEmail.trim()}</p>
                      <p>it can take a minute. check spam if it isn&apos;t there.</p>
                      {resendSeconds > 0 && <p>you can send another in {resendSeconds}s.</p>}
                    </div>
                  )}
                  {authStatus === 'error' && authError && (
                    <p className="connect-auth-error">{authError}</p>
                  )}
                </form>
              )}
            </>
          )}
          {isLoggedIn && (
            <>
              <a
                href="#/portal/account"
                data-portal="account"
                className="connect-portal-btn"
                onClick={handleAccountClick}
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

        {isLoggedIn && membershipTier === 'free' && (
          <div style={{ marginTop: '1.25rem', opacity: 0.9 }}>
            <p style={{ marginBottom: '0.75rem' }}>your current plan: free member</p>
            <p style={{ marginBottom: '1rem' }}>unlock more with a paid plan:</p>
            <div style={{ marginBottom: '0.75rem' }}>
              <a
                href="#/portal/account/plans"
                onClick={handlePlanUpgrade}
                className="connect-portal-btn"
                data-plan-name={videoUnlockPlan.name}
              >
                upgrade to $5/month to unlock the music video
              </a>
            </div>
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', opacity: 0.85 }}>
              {planOptions
                .map((plan) => {
                  if (plan.perks.length === 0) return plan.name
                  return `${plan.name}: ${plan.perks.join(', ')}`
                })
                .join(' • ')}
            </p>
          </div>
        )}

        {isLoggedIn && (membershipTier === 'paid_5' || membershipTier === 'paid_20') && (
          <div style={{ marginTop: '1.25rem', opacity: 0.9 }}>
            <p>
              paid access active{activeTierName ? ` (${activeTierName})` : ''}
            </p>
          </div>
        )}

        {portalHashActive &&
          typeof window !== 'undefined' &&
          (() => {
            const ghostAttr =
              typeof document !== 'undefined'
                ? document.querySelector('script[data-ghost]')?.getAttribute('data-ghost')
                : null
            const ghostHostname = ghostAttr
              ? (() => {
                  try {
                    return new URL(ghostAttr).hostname
                  } catch {
                    return null
                  }
                })()
              : null
            return !!(ghostHostname && window.location?.hostname !== ghostHostname)
          })() && (
          <p className="connect-portal-hint" style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.75rem' }}>
            Session is stored on the Ghost domain; switch to your production URL to see logged-in state.
          </p>
        )}

        <div style={{ marginBottom: '2rem', opacity: 0.9 }}>
          <div style={{ marginTop: '1.5rem' }}>
            <Link href="/listen" style={{ fontSize: '0.9rem' }}>
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
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <span style={{ letterSpacing: '0.05em' }}>Dev:</span>
            <button
              type="button"
              onClick={() => {
                setDevMemberOverride(true, 'free')
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
              simulate free
            </button>
            <button
              type="button"
              onClick={() => {
                setDevMemberOverride(true, 'paid_5')
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
              simulate paid $5
            </button>
            <button
              type="button"
              onClick={() => {
                setDevMemberOverride(true, 'paid_20')
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
              simulate paid $20
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
