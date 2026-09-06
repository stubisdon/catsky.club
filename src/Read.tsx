import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { PageContainer, PageTitle, Link } from './components'
import {
  fetchPosts,
  formatPublishedDate,
  requiredLevelLabel,
  type GhostPostSummary,
} from './utils/ghostContent'

type FeedStatus = 'loading' | 'ready' | 'error'

const cardLinkStyle: CSSProperties = {
  display: 'block',
  textTransform: 'none',
  letterSpacing: 'normal',
}

export default function Read() {
  const [posts, setPosts] = useState<GhostPostSummary[]>([])
  const [status, setStatus] = useState<FeedStatus>('loading')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    fetchPosts()
      .then((nextPosts) => {
        if (cancelled) return
        setPosts(nextPosts)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  return (
    <PageContainer maxWidth="900px" className="read-page">
      <div style={{ marginBottom: '2rem' }}>
        <PageTitle>read</PageTitle>
      </div>

      {status === 'loading' && (
        <div className="read-state" data-testid="read-loading">
          loading posts…
        </div>
      )}

      {status === 'error' && (
        <div className="read-state" data-testid="read-error">
          <p style={{ marginBottom: '1.5rem' }}>could not load posts right now.</p>
          <button type="button" className="connect-portal-btn" onClick={retry}>
            retry
          </button>
        </div>
      )}

      {status === 'ready' && posts.length === 0 && (
        <div className="read-state" data-testid="read-empty">
          nothing published yet.
        </div>
      )}

      {status === 'ready' && posts.length > 0 && (
        <div className="read-feed" data-testid="read-feed">
          {posts.map((post) => (
            <Link
              key={post.id || post.slug}
              href={`/read/${post.slug}`}
              className="read-card"
              style={cardLinkStyle}
              data-testid="read-post-card"
            >
              {post.featureImage && (
                <img
                  className="read-card-image"
                  src={post.featureImage}
                  alt={post.featureImageAlt ?? ''}
                  loading="lazy"
                />
              )}

              <div className="read-card-meta">
                {post.publishedAt && <span>{formatPublishedDate(post.publishedAt)}</span>}
                {!post.access && (
                  <span className="read-card-lock">{requiredLevelLabel(post.visibility)} only</span>
                )}
              </div>

              <h2 className="read-card-title" data-testid="read-post-title">
                {post.title}
              </h2>

              {post.excerpt && <p className="read-card-excerpt">{post.excerpt}</p>}
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
