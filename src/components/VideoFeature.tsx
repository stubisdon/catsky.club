import { useState } from 'react'
import { FEATURED_MUSIC_VIDEO } from '../config/media'
import { trackEvent } from '../utils/analytics'

/**
 * Format a date-only ISO string as "august 2026".
 *
 * Formatted in UTC on purpose. `new Date('2026-08-01')` is parsed as UTC midnight, so
 * rendering it in a negative-offset timezone lands on July 31 and prints the wrong month.
 */
function formatReleaseDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .toLowerCase()
}

/**
 * The released music video.
 *
 * Renders YouTube's poster frame until the visitor asks to play, then swaps in the iframe.
 * A cold embed pulls several hundred kilobytes of YouTube player before anyone has decided to
 * watch anything; the facade keeps that off the landing page's initial load.
 */
export default function VideoFeature() {
  const [playing, setPlaying] = useState(false)
  const video = FEATURED_MUSIC_VIDEO

  return (
    <figure className="video-feature" data-testid="video-feature">
      <div className="video-frame">
        {playing ? (
          <iframe
            className="video-embed"
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={`${video.title} — official music video`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="video-poster"
            onClick={() => {
              trackEvent('music_video_played', { video_id: video.youtubeId })
              setPlaying(true)
            }}
            aria-label={`play ${video.title} music video`}
            data-testid="video-play"
          >
            <img
              className="video-poster-image"
              src={`https://i.ytimg.com/vi/${video.youtubeId}/maxresdefault.jpg`}
              alt=""
              loading="lazy"
              // maxres does not exist for every upload; hqdefault always does.
              onError={(event) => {
                const img = event.currentTarget
                if (img.dataset.fallbackApplied) return
                img.dataset.fallbackApplied = 'true'
                img.src = `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`
              }}
            />
            <span className="video-play-mark" aria-hidden="true">
              <svg viewBox="0 0 64 64" width="64" height="64">
                <circle
                  cx="32"
                  cy="32"
                  r="30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.75"
                  opacity="0.6"
                />
                <path d="M26 21.5 44 32 26 42.5Z" fill="currentColor" />
              </svg>
            </span>
          </button>
        )}
      </div>

      <figcaption className="video-caption">
        <span className="video-title t-display">{video.title}</span>
        <span className="t-meta">
          official music video · {formatReleaseDate(video.releasedOn)}
        </span>
      </figcaption>
    </figure>
  )
}
