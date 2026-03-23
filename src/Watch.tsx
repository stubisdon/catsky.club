import { useCallback, useEffect, useState } from 'react'
import { PageContainer, PageTitle, Link } from './components'
import { getMembershipTier, type MembershipTier, openPortalAccount } from './utils'

const TRAILER_EMBED_URL = 'https://www.youtube.com/embed/1mEIXt3jYmA'

function getMembersVideoUrl(): string {
  if (typeof window === 'undefined') return 'https://catsky.club/music-video-is-done/'
  const currentHost = window.location.hostname
  if (currentHost === 'catsky.club' || currentHost === 'www.catsky.club') {
    return '/music-video-is-done/'
  }
  return 'https://catsky.club/music-video-is-done/'
}

export default function Watch() {
  const [membershipTier, setMembershipTier] = useState<MembershipTier>('none')

  const refreshStatus = useCallback(async () => {
    const tier = await getMembershipTier()
    setMembershipTier(tier)
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const hasPaidAccess = membershipTier === 'paid_5' || membershipTier === 'paid_20'
  const isFreeMember = membershipTier === 'free'

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
            src={TRAILER_EMBED_URL}
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
          trailer is public. the unreleased full video opens for paid members.
        </p>
      </div>

      <div
        style={{
          marginBottom: '2rem',
          border: '1px solid rgba(255,255,255,0.2)',
          padding: '1.25rem',
          display: 'grid',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', textTransform: 'lowercase' }}>
            members screening room
          </h2>
          {hasPaidAccess && (
            <p style={{ margin: 0, opacity: 0.85 }}>
              paid access is active. open the unreleased <em>Sugar Daddy</em> music video inside the members post.
            </p>
          )}
          {isFreeMember && (
            <p style={{ margin: 0, opacity: 0.85 }}>
              free membership gets you finished unreleased songs. upgrade to $5 / month in account to unlock the unreleased video too.
            </p>
          )}
          {!hasPaidAccess && !isFreeMember && (
            <p style={{ margin: 0, opacity: 0.85 }}>
              sign up free for early songs, then upgrade to $5 / month when you want the unreleased video room.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {hasPaidAccess ? (
            <a
              href={getMembersVideoUrl()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.75rem 1.1rem',
                border: '1px solid rgba(255,255,255,0.45)',
                color: 'inherit',
                textDecoration: 'none',
                letterSpacing: '0.05em',
                textTransform: 'lowercase',
              }}
            >
              open unreleased video →
            </a>
          ) : (
            <Link href="/connect" variant="button">get access</Link>
          )}

          {isFreeMember && (
            <a
              href="#/portal/account"
              data-portal="account"
              onClick={(event) => {
                event.preventDefault()
                openPortalAccount()
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.75rem 1.1rem',
                border: '1px solid rgba(255,255,255,0.25)',
                color: 'inherit',
                textDecoration: 'none',
                letterSpacing: '0.05em',
                textTransform: 'lowercase',
              }}
            >
              upgrade to $5 →
            </a>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
