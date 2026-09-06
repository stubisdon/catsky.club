import { useCallback, useEffect, useRef, useState } from 'react'
import { PageContainer, Link } from './components'
import {
  fetchPostBySlug,
  formatPublishedDate,
  requiredLevelLabel,
  type GhostPostDetail,
} from './utils/ghostContent'
import { trackEvent } from './utils/analytics'

interface ReadPostProps {
  slug: string
}

type PostStatus = 'loading' | 'ready' | 'notFound' | 'error'

export default function ReadPost({ slug }: ReadPostProps) {
  const [post, setPost] = useState<GhostPostDetail | null>(null)
  const [status, setStatus] = useState<PostStatus>('loading')
  const [reloadToken, setReloadToken] = useState(0)
  const trackedSlug = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setPost(null)

    fetchPostBySlug(slug)
      .then((nextPost) => {
        if (cancelled) return
        if (!nextPost) {
          setStatus('notFound')
          return
        }
        setPost(nextPost)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [slug, reloadToken])

  useEffect(() => {
    if (status !== 'ready' || !post) return
    if (trackedSlug.current === slug) return
    trackedSlug.current = slug
    trackEvent('read_post_opened', {
      slug,
      visibility: post.visibility,
      locked: !post.access,
    })
  }, [status, post, slug])

  useEffect(() => {
    if (status !== 'ready' || !post) return
    const previousTitle = document.title
    document.title = `${post.title} — catsky.club`
    return () => {
      document.title = previousTitle
    }
  }, [status, post, slug])

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  const publishedDate = post ? formatPublishedDate(post.publishedAt) : ''

  return (
    <PageContainer maxWidth="900px" className="read-page">
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/read" variant="subtle">← read</Link>
      </div>

      {status === 'loading' && (
        <div className="read-state" data-testid="read-loading">
          loading post…
        </div>
      )}

      {status === 'error' && (
        <div className="read-state" data-testid="read-error">
          <p style={{ marginBottom: '1.5rem' }}>could not load this post right now.</p>
          <button type="button" className="connect-portal-btn" onClick={retry}>
            retry
          </button>
        </div>
      )}

      {status === 'notFound' && (
        <div className="read-state" data-testid="read-not-found">
          <p style={{ marginBottom: '1.5rem' }}>this post does not exist.</p>
          <Link href="/read" variant="button">back to read</Link>
        </div>
      )}

      {status === 'ready' && post && (
        <>
          <h1 className="read-article-title">{post.title}</h1>

          <div className="read-article-meta">
            {publishedDate && <span>{publishedDate}</span>}
            {typeof post.readingTime === 'number' && post.readingTime >= 1 && (
              <span>· {post.readingTime} min read</span>
            )}
          </div>

          {/*
            Ghost posts are first-party content: we author them in our own Ghost admin
            and fetch them from our own Content API over the same origin. Running the
            HTML through a sanitizer would strip Ghost's own cards and embeds
            (galleries, iframes, bookmark cards), so the body is injected as-is.
          */}
          <div
            className="read-article"
            data-testid="read-article"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />

          {!post.access && (
            <div className="read-locked-cta" data-testid="read-locked-cta">
              <p style={{ marginBottom: '1.5rem' }}>
                {post.html.trim()
                  ? `the rest of this post is for ${requiredLevelLabel(post.visibility)}.`
                  : `this post is for ${requiredLevelLabel(post.visibility)}.`}
              </p>
              <Link href="/connect" variant="button">connect</Link>
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}
