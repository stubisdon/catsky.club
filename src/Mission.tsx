import './index.css'

// Internal navigation helper - ensures all navigation stays within the app
const navigateTo = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Mission() {
  return (
    <div className="app-container">
      <div style={{ 
        maxWidth: '800px', 
        padding: '2rem',
        textAlign: 'left',
        lineHeight: '1.8',
        letterSpacing: '0.05em',
        maxHeight: '100vh',
        overflowY: 'auto',
        userSelect: 'text',
        WebkitUserSelect: 'text',
        MozUserSelect: 'text',
        msUserSelect: 'text',
      }}>
        <div style={{ 
          marginBottom: '3rem',
          fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
          lineHeight: '1.9'
        }}>
          <p style={{ marginBottom: '1.5rem' }}>
            this is for the ones who feel slightly out of sync with the world.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            not broken. not lost. just not fully aligned with the noise around them.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            catsky is the artist.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            catsky.club is the place to connect.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            it exists for people who sense more than they can easily explain. not broken. not lost. just not fully aligned with the noise around them.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            this is not about fixing yourself.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            it's about finding similar souls.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            we believe depth still matters. slowness still matters. honesty still matters. even when everything else is optimized, accelerated, and flattened into metrics.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            catsky.club is a place to breathe without performing. to feel without packaging the feeling. to stay with an emotion long enough for it to reveal something true.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            there is beauty in uncertainty. strength in sensitivity. clarity that comes only after you stop rushing toward answers.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            this space is intentionally small. intentionally imperfect. intentionally human.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            here, music is not content. it is a companion. a mirror. sometimes a question without a solution.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            this is for nights when you are awake longer than planned. for walks without destinations. for moments when you realize you've changed but can't pinpoint when.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            catsky.club does not promise transformation.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            it offers presence.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            if you are here, you are allowed to slow down.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            you are allowed to feel deeply.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            you are allowed to not know what comes next.
          </p>
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
            transition: 'color 0.3s ease'
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
