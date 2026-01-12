import { useCallback } from 'react'
import './index.css'

// Internal navigation helper - ensures all navigation stays within the app
const navigateTo = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function App() {
  const handleIntroClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    navigateTo('/intro')
  }, [])

  const handleMissionClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    navigateTo('/mission')
  }, [])

  const handleFollowClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    navigateTo('/follow')
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
            catsky
          </h1>
          <div style={{ opacity: 0.9, fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}>
            catsky.club is a small place to connect — through music, presence, and honesty.
          </div>
        </div>

        <div style={{ marginBottom: '2.5rem', opacity: 0.95 }}>
          <p style={{ marginBottom: '1.25rem' }}>
            this is for the ones who feel slightly out of sync with the world.
          </p>
          <p style={{ marginBottom: '1.25rem' }}>
            not broken. not lost. just not fully aligned with the noise around them.
          </p>
          <p style={{ marginBottom: 0 }}>
            if you are here, you are allowed to slow down.
          </p>
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
            href="/intro"
            onClick={handleIntroClick}
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
            enter
          </a>

          <a
            href="/mission"
            onClick={handleMissionClick}
            style={{
              color: 'rgba(255, 255, 255, 0.75)',
              textDecoration: 'none',
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              letterSpacing: '0.08em',
              border: '2px solid rgba(255, 255, 255, 0.5)',
              padding: '0.9rem 1.5rem',
              display: 'inline-block',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              textTransform: 'lowercase',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 1)'
              e.currentTarget.style.color = 'rgba(255, 255, 255, 1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)'
            }}
          >
            mission
          </a>

          <a
            href="/follow"
            onClick={handleFollowClick}
            style={{
              color: 'rgba(255, 255, 255, 0.75)',
              textDecoration: 'none',
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              letterSpacing: '0.08em',
              border: '2px solid rgba(255, 255, 255, 0.35)',
              padding: '0.9rem 1.5rem',
              display: 'inline-block',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              textTransform: 'lowercase',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 1)'
              e.currentTarget.style.color = 'rgba(255, 255, 255, 1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)'
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)'
            }}
          >
            follow
          </a>
        </div>
      </div>
    </div>
  )
}
