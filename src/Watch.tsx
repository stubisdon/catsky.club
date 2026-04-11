import { useEffect, useMemo, useState } from 'react'
import { PageContainer, PageTitle, Link } from './components'
import { getMembershipTier, getPaidPlanOptions, type MembershipTier, type PaidPlanOption } from './utils'

const UNRELEASED_VIDEO_POST = '/members/unreleased-video/'

export default function Watch() {
  const [tier, setTier] = useState<MembershipTier>('none')
  const [paidPlans, setPaidPlans] = useState<PaidPlanOption[]>([])

  useEffect(() => {
    let cancelled = false
    getMembershipTier().then((value) => {
      if (!cancelled) setTier(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    getPaidPlanOptions().then((plans) => {
      if (!cancelled) setPaidPlans(plans)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const isPaid = useMemo(() => tier === 'paid_5' || tier === 'paid_20', [tier])
  const planPerkSummary = useMemo(() => {
    if (paidPlans.length === 0) {
      return 'Supporter + Backstage plans include unfinished demos and unreleased music videos.'
    }
    return paidPlans
      .map((plan) => {
        if (plan.perks.length === 0) return plan.name
        return `${plan.name}: ${plan.perks.join(', ')}`
      })
      .join(' • ')
  }, [paidPlans])

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

      {!isPaid ? (
        <>
          <div style={{ opacity: 0.9, marginBottom: '2rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              unlock the unreleased music video with a paid plan.
            </p>
            <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', opacity: 0.85 }}>
              {planPerkSummary}
            </p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <Link href="/connect" variant="button">view plans + upgrade</Link>
          </div>
        </>
      ) : (
        <>
          <div style={{ opacity: 0.9, marginBottom: '2rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              your paid membership includes the unreleased video.
            </p>
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <a href={UNRELEASED_VIDEO_POST} className="connect-portal-btn">open unreleased video post</a>
          </div>
        </>
      )}
    </PageContainer>
  )
}
