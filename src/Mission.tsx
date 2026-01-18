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
          <div style={{ marginBottom: '1.5rem' }}>
            <p>in a world of whispers</p>
            <p>stories intertwine</p>
            <p>built the space of presence</p>
            <p>where your voice meets mine</p>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p>tapestry of moments</p>
            <p>meeting of the minds</p>
            <p>poetry and purpose</p>
            <p>move in its own time</p>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p>in a world of borders</p>
            <p>in a world of names</p>
            <p>we belong together</p>
            <p>air is still the same</p>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p>planet is not ours</p>
            <p>to conquer or command</p>
            <p>but share it with the feathers,</p>
            <p>fur, and with the land</p>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p>with roots in the dark</p>
            <p>with wings overhead</p>
            <p>with oceans that feel</p>
            <p>with forests that spread</p>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p>listen for the other song</p>
            <p>the non-human call</p>
            <p>see, we've been related</p>
            <p>all along</p>
          </div>
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
