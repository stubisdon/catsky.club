import { PageContainer, PageTitle, Link } from './components'

export default function Watch() {
  return (
    <PageContainer maxWidth="900px">
      <div style={{ marginBottom: '2rem' }}>
        <PageTitle>watch</PageTitle>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            position: 'relative',
            paddingBottom: '56.25%',
            height: 0,
            overflow: 'hidden',
            maxWidth: '800px',
          }}
        >
          <iframe
            src="https://www.youtube.com/embed/1mEIXt3jYmA"
            title="Music Video Teaser"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        </div>
      </div>

      <div style={{ opacity: 0.9, marginBottom: '2rem' }}>
        <p style={{ marginBottom: '1.5rem' }}>
          get access to the full music video
        </p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <Link href="/connect" variant="button">get access</Link>
      </div>
    </PageContainer>
  )
}
