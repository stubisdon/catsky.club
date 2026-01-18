import { useCallback } from 'react'
import './index.css'

// Internal navigation helper - ensures all navigation stays within the app
const navigateTo = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function App() {
  const handleListenClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    navigateTo('/listen')
  }, [])

  const handleWatchClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    navigateTo('/watch')
  }, [])

  const handleConnectClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    navigateTo('/connect')
  }, [])

  return (
    <div className="app-container">
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          padding: '2rem',
          textAlign: 'left',
          letterSpacing: '0.05em',
          lineHeight: 1.8,
          maxHeight: '100vh',
          overflowY: 'auto',
          userSelect: 'text',
          WebkitUserSelect: 'text',
          MozUserSelect: 'text',
          msUserSelect: 'text',
        }}
      >
        <div style={{ marginBottom: '2.5rem' }}>
          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              marginBottom: '1rem',
              letterSpacing: '0.1em',
              textTransform: 'lowercase',
            }}
          >
            catsky.club
          </h1>
          <div style={{ opacity: 0.9, fontSize: 'clamp(1rem, 2vw, 1.25rem)', lineHeight: '1.8' }}>
            <div>in the world of data</div>
            <div>scattered everywhere</div>
            <div>here to find a meaning</div>
            <div>for the ones who care</div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          <a
            href="/listen"
            onClick={handleListenClick}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-text)'
              e.currentTarget.style.color = 'var(--color-bg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--color-text)'
            }}
          >
            listen
          </a>

          <a
            href="/watch"
            onClick={handleWatchClick}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-text)'
              e.currentTarget.style.color = 'var(--color-bg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--color-text)'
            }}
          >
            watch
          </a>

          <a
            href="/connect"
            onClick={handleConnectClick}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-text)'
              e.currentTarget.style.color = 'var(--color-bg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--color-text)'
            }}
          >
            connect
          </a>
        </div>
      </div>
    </div>
  )
}
