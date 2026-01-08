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

  return (
    <div className="app-container">
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ 
          fontSize: 'clamp(2rem, 5vw, 4rem)', 
          marginBottom: '2rem',
          letterSpacing: '0.1em'
        }}>
          Catsky
        </h1>
        <a 
          href="/intro" 
          onClick={handleIntroClick}
          style={{ 
            color: 'var(--color-text)', 
            textDecoration: 'none',
            fontSize: 'clamp(1rem, 2vw, 1.5rem)',
            letterSpacing: '0.1em',
            border: '2px solid var(--color-text)',
            padding: '1rem 2rem',
            display: 'inline-block',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
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
      </div>
    </div>
  )
}
