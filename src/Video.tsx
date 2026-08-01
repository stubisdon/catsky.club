import { useEffect, useMemo, useState } from 'react'
import { PageContainer, PageTitle, Link } from './components'
import { getMembershipTier, type MembershipTier } from './utils'

export default function Video() {
  const [tier, setTier] = useState<MembershipTier | null>(null)
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [embedError, setEmbedError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getMembershipTier()
      .then((value) => {
        if (!cancelled) setTier(value)
      })
      .catch(() => {
        if (!cancelled) setTier('none')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const isPaid = useMemo(() => tier === 'paid_5' || tier === 'paid_20', [tier])

  useEffect(() => {
    if (!isPaid) {
      setEmbedUrl(null)
      setEmbedError(null)
      return
    }

    let cancelled = false

    fetch('/api/video-embed', {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Video embed request failed with ${response.status}`)
        return response.json() as Promise<{ embedUrl?: string }>
      })
      .then((payload) => {
        if (cancelled) return
        const nextEmbedUrl = typeof payload.embedUrl === 'string' ? payload.embedUrl.trim() : ''
        if (!nextEmbedUrl) throw new Error('Video embed response was empty')
        setEmbedUrl(nextEmbedUrl)
        setEmbedError(null)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Error loading video embed:', error)
        setEmbedUrl(null)
        setEmbedError('video is unavailable right now')
      })

    return () => {
      cancelled = true
    }
  }, [isPaid])

  return (
    <PageContainer maxWidth="900px">
      <div style={{ marginBottom: '2rem' }}>
        <PageTitle>secrets</PageTitle>
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '800px',
          aspectRatio: '16 / 9',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}
      >
        {isPaid && embedUrl ? (
          <iframe
            src={embedUrl}
            title="Catsky unreleased music video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
        ) : isPaid ? (
          <div style={{ textAlign: 'center', padding: '1.25rem', opacity: 0.9 }}>
            <p>{embedError || 'loading video...'}</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.25rem', opacity: 0.9 }}>
            {tier === null && <p>checking access...</p>}
            {tier === 'none' && (
              <>
                <p style={{ marginBottom: '1rem' }}>
                  this page is only for connected cats, go to catsky.club/connect to get connected
                </p>
                <Link href="/connect" variant="button">connect</Link>
              </>
            )}
            {tier === 'free' && (
              <>
                <p style={{ marginBottom: '1rem' }}>upgrade to $5/month to unlock the music video</p>
                <Link href="/connect" variant="button">upgrade</Link>
              </>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
