import './index.css'

// Internal navigation helper - ensures all navigation stays within the app
const navigateTo = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function UnpublishedExperience() {
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
          maxHeight: '100vh',
          overflowY: 'auto',
          userSelect: 'text',
          WebkitUserSelect: 'text',
          MozUserSelect: 'text',
          msUserSelect: 'text',
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
          experience (shelved)
        </h1>

        <div style={{ opacity: 0.9, marginBottom: '2rem' }}>
          <p style={{ marginBottom: '1rem' }}>
            the original interactive experience (intro song + story) is intentionally shelved for now.
          </p>
          <p style={{ marginBottom: 0, fontSize: '0.95rem', opacity: 0.85 }}>
            when we bring it back, we can either restore it here under <code>/unpublished</code> or promote it to the public site.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <a
            href="/listen"
            onClick={(e) => {
              e.preventDefault()
              navigateTo('/listen')
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-text)'
              e.currentTarget.style.color = 'var(--color-bg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--color-text)'
            }}
          >
            open listen →
          </a>

          <a
            href="/unpublished"
            onClick={(e) => {
              e.preventDefault()
              navigateTo('/unpublished')
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-text)'
              e.currentTarget.style.color = 'var(--color-bg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--color-text)'
            }}
          >
            back →
          </a>
        </div>

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

