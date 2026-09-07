import { useEffect, useMemo, useState } from 'react'
import { PageContainer, PageTitle, Link } from './components'
import { getMembershipTier, type MembershipTier } from './utils'
import { buildYouTubeEmbedSrc, observeYouTubeProgress } from './utils/playerApis'
import { recordVideoProgress, setVideoPlaying } from './utils/engagement'

const VIDEO_ID = 'xRxUcF_wFSQ'
const PLAYER_ELEMENT_ID = 'catsky-secrets-player'

export default function Video() {
  const [tier, setTier] = useState<MembershipTier | null>(null)

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

  // Engagement instrumentation only: reports watched fraction, thresholds live in engagement.ts.
  useEffect(() => {
    if (!isPaid) return
    return observeYouTubeProgress({
      elementId: PLAYER_ELEMENT_ID,
      onProgress: (fraction) => recordVideoProgress(VIDEO_ID, fraction),
      onPlayingChange: setVideoPlaying,
    })
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
          border: '1px solid rgba(var(--color-text-rgb), 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}
      >
        {isPaid ? (
          <iframe
            id={PLAYER_ELEMENT_ID}
            src={buildYouTubeEmbedSrc(VIDEO_ID)}
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
