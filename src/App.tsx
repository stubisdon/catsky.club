import { AlbumShelf, Link, SectionRule, SocialFeed, VideoFeature } from './components'
import { LISTEN_PROFILES } from './config/socials'
import { PlatformGlyph } from './components/graphics'
import { trackEvent } from './utils/analytics'

const POEM = ['in the world of data', 'scattered everywhere', 'here to find a meaning', 'for the ones who care']

/**
 * Landing page.
 *
 * Reads top to bottom as one printed sheet: masthead, the release shelf, the music video, then
 * where to follow. The shelf leads because both calls to action live there — the released
 * cover opens the music, the upcoming cover asks for an email.
 */
export default function App() {
  return (
    <div className="app-container home-shell">
      <div className="home-scroll">
        <main className="home-page">
          <header className="home-masthead">
            <h1 className="t-display home-wordmark">catsky.club</h1>
            <div className="home-poem">
              {POEM.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </header>

          <section className="home-section" aria-labelledby="releases-heading">
            <SectionRule label="releases" />
            <h2 id="releases-heading" className="visually-hidden">
              releases
            </h2>
            <AlbumShelf />
          </section>

          <section className="home-section" aria-labelledby="video-heading">
            <SectionRule label="music video" />
            <h2 id="video-heading" className="visually-hidden">
              music video
            </h2>
            <VideoFeature />
          </section>

          <section className="home-section" aria-labelledby="follow-heading">
            <SectionRule label="latest" />
            <h2 id="follow-heading" className="visually-hidden">
              latest posts
            </h2>
            <SocialFeed />
          </section>

          <footer className="home-footer">
            <SectionRule label="listen everywhere" />
            <div className="listen-row">
              {LISTEN_PROFILES.map((profile) => (
                <a
                  key={profile.label}
                  className="listen-link"
                  href={profile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('listen_profile_clicked', { destination: profile.label })}
                >
                  <PlatformGlyph platform={profile.glyph} size={19} />
                  <span>{profile.label}</span>
                </a>
              ))}
            </div>

            <div className="home-footer-links">
              <Link href="/listen" variant="subtle">
                the full catalogue
              </Link>
              <Link href="/connect" variant="subtle">
                connect
              </Link>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
