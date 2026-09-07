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

export default function News() {
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
    <PageContainer maxWidth="900px" className="news-page">
      <div style={{ marginBottom: '2rem' }}>
        <PageTitle>news</PageTitle>
      </div>

      {status === 'loading' && (
        <div className="news-state" data-testid="news-loading">
          loading posts…
        </div>
      )}

      {status === 'error' && (
        <div className="news-state" data-testid="news-error">
          <p style={{ marginBottom: '1.5rem' }}>could not load posts right now.</p>
          <button type="button" className="connect-portal-btn" onClick={retry}>
            retry
          </button>
        </div>
      )}

      {status === 'ready' && posts.length === 0 && (
        <div className="news-state" data-testid="news-empty">
          nothing published yet.
        </div>
      )}

      {status === 'ready' && posts.length > 0 && (
        <div className="news-feed" data-testid="news-feed">
          {posts.map((post) => (
            <Link
              key={post.id || post.slug}
              href={`/news/${post.slug}`}
              className="news-card"
              style={cardLinkStyle}
              data-testid="news-post-card"
            >
              {post.featureImage && (
                <img
                  className="news-card-image"
                  src={post.featureImage}
                  alt={post.featureImageAlt ?? ''}
                  loading="lazy"
                />
              )}

              <div className="news-card-meta">
                {post.publishedAt && <span>{formatPublishedDate(post.publishedAt)}</span>}
                {!post.access && (
                  <span className="news-card-lock">{requiredLevelLabel(post.visibility)} only</span>
                )}
              </div>

              <h2 className="news-card-title" data-testid="news-post-title">
                {post.title}
              </h2>

              {post.excerpt && <p className="news-card-excerpt">{post.excerpt}</p>}
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
