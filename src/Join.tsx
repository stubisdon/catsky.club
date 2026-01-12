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

async function waitForPortal(maxWait = 5000): Promise<boolean> {
  const start = Date.now()
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
    
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // Debug: log what's actually available
  console.log('Portal check failed. Available:', {
    Portal: (window as any).Portal,
    portal: (window as any).portal,
    windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('portal'))
  })
  
  return false
}

function openPortalPaid(): boolean {
  const portal: any = (window as any).Portal
  const portalFunc: any = (window as any).portal
  
  try {
    // Try Portal as function
    if (typeof portal === 'function') {
      portal('open')
      return true
    }
    
    // Try portal (lowercase) as function
    if (typeof portalFunc === 'function') {
      portalFunc('open')
      return true
    }
    
    // Try Portal.open method
    if (portal && typeof portal.open === 'function') {
      portal.open()
      return true
    }
    
    // Try portal.open method (lowercase)
    if (portalFunc && typeof portalFunc.open === 'function') {
      portalFunc.open()
      return true
    }
  } catch (err) {
    console.error('Portal open error:', err)
  }
  return false
}

export default function Join() {
  const [activated, setActivated] = useState<boolean>(() => isActivated())
  const [isMember, setIsMember] = useState<boolean | null>(null)
  const [portalMissing, setPortalMissing] = useState(false)

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
          join
        </h1>

        {!activated ? (
          <div style={{ opacity: 0.9, marginBottom: '2rem' }}>
            <p style={{ marginBottom: '1rem' }}>
              this page unlocks after you finish the experience.
            </p>
            <a
              href="/intro"
              onClick={(e) => {
                e.preventDefault()
                navigateTo('/intro')
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
              enter →
            </a>
          </div>
        ) : isMember === false ? (
          <div style={{ opacity: 0.9, marginBottom: '2rem' }}>
            <p style={{ marginBottom: '1rem' }}>
              one more step: follow first (free). then you can decide if paid proximity is for you.
            </p>
            <a
              href="/follow"
              onClick={(e) => {
                e.preventDefault()
                navigateTo('/follow')
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
              follow →
            </a>
          </div>
        ) : (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ opacity: 0.9, marginBottom: '1rem' }}>
              paid is for superfans who want proximity, not output.
            </div>
            <div style={{ opacity: 0.7, marginBottom: '1.5rem' }}>
              price is shown inside checkout. no discounts. no urgency.
            </div>

            <button
              type="button"
              disabled={!canJoin}
              onClick={async () => {
                setPortalMissing(false)
                const portalReady = await waitForPortal(3000)
                if (!portalReady) {
                  setPortalMissing(true)
                  return
                }
                const opened = openPortalPaid()
                if (!opened) setPortalMissing(true)
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
            >
              {canJoin ? 'open checkout' : 'checking…'}
            </button>

            {portalMissing && (
              <div style={{ marginTop: '1rem', opacity: 0.7, fontSize: '0.9rem' }}>
                portal is not available. check browser console for details. make sure Ghost Portal is enabled in Ghost admin and the script is loading.
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

