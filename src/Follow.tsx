import { useCallback, useEffect, useMemo, useState } from 'react'
import './index.css'

// Internal navigation helper - ensures all navigation stays within the app
const navigateTo = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

type MemberCheckState = 'unknown' | 'not_member' | 'member'

function isActivated(): boolean {
  return window.localStorage.getItem('catsky_activated') === '1'
}

async function checkGhostMember(): Promise<boolean> {
  // Ghost Members session endpoint (works on the same domain when Ghost is hosting members)
  // If Ghost is not available in local dev, this will fail gracefully.
  const res = await fetch('/members/api/member/', { credentials: 'include' })
  if (!res.ok) return false
  const data = (await res.json()) as unknown
  // Ghost returns { member: {...} } when logged in, or { member: null } otherwise
  if (typeof data === 'object' && data !== null && 'member' in data) {
    const member = (data as any).member
    return Boolean(member)
  }
  return false
}

async function waitForPortal(maxWait = 5000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    const portal: any = (window as any).Portal
    if (portal) {
      if (typeof portal === 'function' || (portal && typeof portal.open === 'function')) {
        return true
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return false
}

function openPortalSignup(): boolean {
  const portal: any = (window as any).Portal
  try {
    if (typeof portal === 'function') {
      // Different Ghost versions accept different option shapes; try the most common ones.
      portal('open', { page: 'signup' })
      return true
    }
    if (portal && typeof portal.open === 'function') {
      portal.open({ page: 'signup' })
      return true
    }
  } catch {
    // ignore
  }
  return false
}

export default function Follow() {
  const [memberState, setMemberState] = useState<MemberCheckState>('unknown')
  const [portalOpened, setPortalOpened] = useState(false)
  const [portalMissing, setPortalMissing] = useState(false)
  const [checking, setChecking] = useState(false)

  const refreshMemberState = useCallback(async () => {
    try {
      const isMember = await checkGhostMember()
      setMemberState(isMember ? 'member' : 'not_member')
    } catch {
      setMemberState('not_member')
    }
  }, [])

  useEffect(() => {
    refreshMemberState()
  }, [refreshMemberState])

  const handleFollow = useCallback(async () => {
    setPortalMissing(false)
    setChecking(true)
    
    // Wait for Portal to load (it might still be loading)
    const portalReady = await waitForPortal(3000)
    if (!portalReady) {
      setChecking(false)
      setPortalMissing(true)
      return
    }
    
    const opened = openPortalSignup()
    setPortalOpened(opened)
    setChecking(false)
    if (!opened) {
      setPortalMissing(true)
      return
    }

    // Poll briefly to detect successful signup/login in Ghost session.
    setChecking(true)
    const startedAt = Date.now()
    const poll = async () => {
      try {
        const isMember = await checkGhostMember()
        setMemberState(isMember ? 'member' : 'not_member')
        if (isMember) {
          setChecking(false)
          return
        }
      } catch {
        setMemberState('not_member')
      }

      const now = Date.now()
      if (now - startedAt > 20000) {
        setChecking(false)
        return
      }
      setTimeout(poll, 1200)
    }
    setTimeout(poll, 1200)
  }, [])

  const nextLink = useMemo(() => {
    const activated = isActivated()
    if (!activated) return { href: '/intro', label: 'complete the experience →' }
    return { href: '/join', label: 'continue →' }
  }, [memberState])

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
          follow
        </h1>

        <div style={{ opacity: 0.9, marginBottom: '2rem' }}>
          <p style={{ marginBottom: '1rem' }}>
            if you want, you can follow quietly. no pressure.
          </p>
          <p style={{ marginBottom: 0 }}>
            this is the free tier — just a way to stay connected.
          </p>
        </div>

        {memberState === 'member' ? (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1rem', opacity: 0.95 }}>you’re in.</div>
            <a
              href={nextLink.href}
              onClick={(e) => {
                e.preventDefault()
                navigateTo(nextLink.href)
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
              {nextLink.label}
            </a>
          </div>
        ) : (
          <div style={{ marginBottom: '2rem' }}>
            <button
              type="button"
              onClick={handleFollow}
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
              follow (free)
            </button>

            {checking && (
              <div style={{ marginTop: '1rem', opacity: 0.7 }}>
                waiting for confirmation…
              </div>
            )}

            {portalOpened && !checking && (
              <div style={{ marginTop: '1rem', opacity: 0.7 }}>
                if you finished signup, refresh this page or click follow again.
              </div>
            )}

            {portalMissing && (
              <div style={{ marginTop: '1rem', opacity: 0.7 }}>
                portal is not available yet. make sure Ghost Portal is enabled and the embed key is set.
              </div>
            )}
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

