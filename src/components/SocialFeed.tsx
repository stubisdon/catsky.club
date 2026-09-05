import { useEffect, useState } from 'react'
import { PlatformGlyph } from './graphics'
import { SOCIAL_PROFILES } from '../config/socials'
import { fetchSocialPosts, formatRelativeDate, type SocialPostsResponse } from '../utils/socialPosts'
import { trackEvent } from '../utils/analytics'

const POSTS_PER_PLATFORM = 3

/**
 * The three most recent posts from each social account.
 *
 * Posts come from /api/social-posts, which holds the credentials server-side. A platform that
 * has no token yet, or whose token has expired, simply renders its profile link with no cards
 * underneath — the column never shows an error to a visitor, because a broken integration is
 * the site owner's problem, not something a listener can act on.
 */
export default function SocialFeed() {
  const [data, setData] = useState<SocialPostsResponse | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    void fetchSocialPosts(POSTS_PER_PLATFORM, controller.signal).then((response) => {
      if (controller.signal.aborted) return
      setData(response)
      setLoaded(true)
    })

    return () => controller.abort()
  }, [])

  return (
    <div className="social-feed" data-testid="social-feed">
      {SOCIAL_PROFILES.map((profile) => {
        const posts = data?.posts?.[profile.platform] ?? []

        return (
          <section className="social-column" key={profile.platform}>
            <a
              className="social-profile"
              href={profile.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('social_profile_clicked', { platform: profile.platform })}
              data-testid={`social-profile-${profile.platform}`}
            >
              <PlatformGlyph platform={profile.glyph} size={20} />
              <span className="social-handle">{profile.handle}</span>
            </a>

            <ul className="social-posts">
              {posts.map((post) => (
                <li key={post.id}>
                  <a
                    className="social-post"
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackEvent('social_post_clicked', {
                        platform: profile.platform,
                        post_id: post.id,
                      })
                    }
                  >
                    {post.thumbnailUrl && (
                      <img
                        className="social-post-thumb"
                        src={post.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span className="social-post-text">
                      <span className="social-post-caption">{post.caption || 'view post'}</span>
                      <span className="t-meta">{formatRelativeDate(post.publishedAt)}</span>
                    </span>
                  </a>
                </li>
              ))}

              {/* Placeholders hold the column's height while the request is in flight, so the
                  page below does not jump when three cards arrive at once. */}
              {!loaded &&
                Array.from({ length: POSTS_PER_PLATFORM }, (_, index) => (
                  <li key={`skeleton-${index}`} aria-hidden="true">
                    <span className="social-post social-post-skeleton" />
                  </li>
                ))}

              {/*
                Loaded but empty: the platform has no token configured yet, or its token
                expired. A bare underline reads as a broken page, so the column falls back to
                an invitation to follow — which is what the section is for anyway.
              */}
              {loaded && posts.length === 0 && (
                <li>
                  <a
                    className="social-empty"
                    href={profile.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackEvent('social_profile_clicked', {
                        platform: profile.platform,
                        placement: 'empty_state',
                      })
                    }
                  >
                    see the latest on {profile.platform} →
                  </a>
                </li>
              )}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
