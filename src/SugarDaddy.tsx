import { useEffect, useRef, useState } from 'react'
import { Link, SectionRule, SubscribeForm } from './components'
import { PlatformGlyph, type PlatformId } from './components/graphics'
import { FEATURED_MUSIC_VIDEO } from './config/media'
import { getSocialProfile } from './config/socials'
import { POEM } from './config/poem'
import { getMembershipTier, type MembershipTier } from './utils'
import { loadMetaPixel, trackPixel } from './utils/metaPixel'

const PIXEL_CONTENT_NAME = 'catsky-sugar-daddy'

const COVER_ART_URL = 'https://i.scdn.co/image/ab67616d0000b273b03a55e382bf286ab375339d'
const SPOTIFY_URL = 'https://open.spotify.com/track/4HRAM5R5U0lV9tpUmfMrqa'
const APPLE_MUSIC_URL = 'https://music.apple.com/us/song/sugar-daddy/6811689213'
// Catsky's X handle isn't in src/config/socials.ts (that file only covers
// instagram/tiktok/youtube), so it stays local to this page.
const X_URL = 'https://twitter.com/catsky_club'

type PixelContentType = 'spotify' | 'apple_music' | 'youtube'

const PLATFORMS: Array<{ label: string; href: string; glyph: PlatformId; contentType: PixelContentType }> = [
  { label: 'spotify', href: SPOTIFY_URL, glyph: 'spotify', contentType: 'spotify' },
  { label: 'apple music', href: APPLE_MUSIC_URL, glyph: 'appleMusic', contentType: 'apple_music' },
  { label: 'youtube', href: FEATURED_MUSIC_VIDEO.watchUrl, glyph: 'youtube', contentType: 'youtube' },
]

const instagramProfile = getSocialProfile('instagram')

/**
 * Smart-link landing page for the "Sugar Daddy" single, built for Meta ad traffic.
 *
 * Reads top to bottom: cover art + title, the streaming links an ad click is meant to reach,
 * a short invitation to explore the rest of the site, an inline email signup, and small follow
 * links. The Meta Pixel is scoped to this one route (src/utils/metaPixel.ts) — nothing else in
 * the app should import it.
 */
export default function SugarDaddy() {
  const pixelFiredRef = useRef(false)
  useEffect(() => {
    // Guards against React StrictMode's double-invoked mount effect firing PageView twice.
    if (pixelFiredRef.current) return
    pixelFiredRef.current = true
    loadMetaPixel()
    trackPixel('PageView')
  }, [])

  const [memberTier, setMemberTier] = useState<MembershipTier | null>(null)
  useEffect(() => {
    let cancelled = false
    getMembershipTier()
      .then((tier) => {
        if (!cancelled) setMemberTier(tier)
      })
      .catch(() => {
        if (!cancelled) setMemberTier('none')
      })
    return () => {
      cancelled = true
    }
  }, [])
  const isMember = memberTier !== null && memberTier !== 'none'

  return (
    <div className="app-container home-shell">
      <div className="home-scroll">
        <main className="home-page sugar-daddy-page">
          <header className="home-masthead sugar-daddy-masthead">
            <p className="t-eyebrow">catsky</p>
            <img
              src={COVER_ART_URL}
              alt="catsky — sugar daddy cover art"
              className="sugar-daddy-cover"
            />
            <h1 className="t-display sugar-daddy-title">sugar daddy</h1>
          </header>

          <section className="home-section" aria-labelledby="sugar-daddy-play-heading">
            <SectionRule label="play on" />
            <h2 id="sugar-daddy-play-heading" className="visually-hidden">
              play on
            </h2>
            <div className="listen-row">
              {PLATFORMS.map((platform) => (
                <a
                  key={platform.label}
                  className="listen-link"
                  href={platform.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackPixel('ViewContent', {
                      content_name: PIXEL_CONTENT_NAME,
                      content_type: platform.contentType,
                    })
                  }
                >
                  <PlatformGlyph platform={platform.glyph} size={19} />
                  <span>{platform.label}</span>
                </a>
              ))}
            </div>
          </section>

          <section className="home-section" aria-labelledby="sugar-daddy-explore-heading">
            <SectionRule label="explore" />
            <h2 id="sugar-daddy-explore-heading" className="visually-hidden">
              explore catsky.club
            </h2>
            <div className="home-poem">
              {POEM.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <p className="sugar-daddy-body">
              sugar daddy is out. more is waiting inside — demos, videos, songs not released yet.
            </p>
            <div className="sugar-daddy-explore-links">
              <Link href="/" variant="subtle">
                the site
              </Link>
              <Link href="/listen" variant="subtle">
                the full catalogue — unreleased demos
              </Link>
              <Link href="/news" variant="subtle">
                news
              </Link>
              <Link href="/mission" variant="subtle">
                mission
              </Link>
            </div>
          </section>

          <section className="home-section" aria-labelledby="sugar-daddy-email-heading">
            <SectionRule label="email" />
            <h2 id="sugar-daddy-email-heading" className="t-display sugar-daddy-email-heading">
              hear the next one first
            </h2>
            <div className="sugar-daddy-signup">
              {isMember ? (
                <p className="sugar-daddy-member-line">
                  you're in — <Link href="/listen">go to the full catalogue</Link>
                </p>
              ) : (
                <SubscribeForm
                  source="sugar_daddy"
                  labels={['sugar-daddy']}
                  body="one email when something new lands. nothing else."
                  submitLabel="notify me"
                  onSuccess={() => trackPixel('Lead', { content_name: PIXEL_CONTENT_NAME })}
                />
              )}
            </div>
          </section>

          <footer className="home-footer sugar-daddy-footer">
            <SectionRule label="follow" />
            <div className="listen-row">
              {instagramProfile && (
                <a
                  className="listen-link"
                  href={instagramProfile.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <PlatformGlyph platform={instagramProfile.glyph} size={19} />
                  <span>instagram</span>
                </a>
              )}
              <a className="listen-link" href={X_URL} target="_blank" rel="noopener noreferrer">
                <span>x</span>
              </a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
