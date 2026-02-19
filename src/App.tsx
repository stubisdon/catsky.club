import { Link } from './components'

export default function App() {
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
          <Link href="/listen" variant="button">listen</Link>
          <Link href="/watch" variant="button">watch</Link>
          <Link href="/connect" variant="button">connect</Link>
        </div>
      </div>
    </div>
  )
}
