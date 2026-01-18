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

async function waitForPortal(maxWait = 10000): Promise<boolean> {
  const start = Date.now()
  
  // First, wait for the script to load
  const scriptLoaded = await new Promise<boolean>((resolve) => {
    const checkScript = () => {
      const scripts = Array.from(document.querySelectorAll('script[src*="portal"]'))
      if (scripts.length > 0) {
        const script = scripts[0] as HTMLScriptElement
        // Check if script is loaded using type-safe methods
        const scriptAny = script as any
        if (scriptAny.complete || scriptAny.readyState === 'complete' || scriptAny.readyState === 'loaded') {
          resolve(true)
          return
        }
      }
      // Check if script is in DOM (might still be loading)
      if (scripts.length > 0) {
        resolve(true)
        return
      }
      setTimeout(checkScript, 100)
    }
    checkScript()
    
    // Timeout after 3 seconds
    setTimeout(() => resolve(true), 3000)
  })
  
  if (!scriptLoaded) {
    console.log('Portal script not found in DOM')
    return false
  }
  
  // Now wait for Portal API to be available
  while (Date.now() - start < maxWait) {
    // Check multiple possible Portal API formats
    const portal: any = (window as any).Portal
    const portalFunc: any = (window as any).portal
    
    if (portal) {
      if (typeof portal === 'function' || (portal && typeof portal.open === 'function')) {
        return true
      }
    }
    
    if (portalFunc && typeof portalFunc === 'function') {
      return true
    }
    
    // Also check for Portal.init or Portal.ready
    if (portal && typeof portal.init === 'function') {
      return true
    }
    
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  // Debug: log what's actually available
  console.log('Portal check failed. Available:', {
    Portal: (window as any).Portal,
    portal: (window as any).portal,
    windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('portal')),
    scripts: Array.from(document.querySelectorAll('script[src*="portal"]')).map(s => (s as HTMLScriptElement).src)
  })
  
  return false
}

function openPortalSignup(): boolean {
  const portal: any = (window as any).Portal
  const portalFunc: any = (window as any).portal
  
  try {
    // Try Portal as function
    if (typeof portal === 'function') {
      portal('open', { page: 'signup' })
      return true
    }
    
    // Try portal (lowercase) as function
    if (typeof portalFunc === 'function') {
      portalFunc('open', { page: 'signup' })
      return true
    }
    
    // Try Portal.open method
    if (portal && typeof portal.open === 'function') {
      portal.open({ page: 'signup' })
      return true
    }
    
    // Try portal.open method (lowercase)
    if (portalFunc && typeof portalFunc.open === 'function') {
      portalFunc.open({ page: 'signup' })
      return true
    }
  } catch (err) {
    console.error('Portal open error:', err)
  }
  return false
}

export default function Connect() {
  const [memberState, setMemberState] = useState<MemberCheckState>('unknown')
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

  // Automatically open Portal when component mounts (for non-members)
  useEffect(() => {
    if (memberState === 'not_member') {
      const openPortal = async () => {
        setChecking(true)
        setPortalMissing(false)
        
        // Wait longer for Portal to load (script has defer attribute)
        const portalReady = await waitForPortal(10000)
        
        if (portalReady) {
          const opened = openPortalSignup()
          setChecking(false)
          
          if (!opened) {
            setPortalMissing(true)
          } else {
            // Poll to detect successful signup/login
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
          }
        } else {
          setChecking(false)
          setPortalMissing(true)
        }
      }
      // Longer delay to ensure Portal script has loaded (it has defer attribute)
      const timer = setTimeout(openPortal, 1000)
      return () => clearTimeout(timer)
    }
  }, [memberState])

  const nextLink = useMemo(() => {
    const activated = isActivated()
    if (!activated) return { href: '/watch', label: 'complete the experience →' }
    return { href: '/listen', label: 'continue →' }
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
          connect
        </h1>

        <div style={{ opacity: 0.9, marginBottom: '2rem', lineHeight: 1.6 }}>
          <p style={{ marginBottom: '0.3rem' }}>
            get closer if you like
          </p>
          <p style={{ marginBottom: '0.3rem' }}>
            be involved if it feels right
          </p>
          <p style={{ marginBottom: '0.3rem' }}>
            this is just a welcome
          </p>
          <p style={{ marginBottom: 0 }}>
            nothing is required
          </p>
        </div>

        {memberState === 'member' ? (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1rem', opacity: 0.95 }}>you're in.</div>
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
            {checking && (
              <div style={{ marginTop: '1rem', opacity: 0.7 }}>
                loading…
              </div>
            )}

            {portalMissing && (
              <div style={{ marginTop: '1rem', opacity: 0.7, fontSize: '0.9rem' }}>
                <p style={{ marginBottom: '0.5rem' }}>
                  portal is not available in development.
                </p>
                <p style={{ marginBottom: 0, fontSize: '0.85rem' }}>
                  in production, this will show the Ghost Portal signup form. for local dev, set VITE_GHOST_URL and VITE_GHOST_CONTENT_API_KEY environment variables.
                </p>
              </div>
            )}
          </div>
        )}

        <a
          href="/listen"
          onClick={(e) => {
            e.preventDefault()
            navigateTo('/listen')
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
          ← listen
        </a>
      </div>
    </div>
  )
}
