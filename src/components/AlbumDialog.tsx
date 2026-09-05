import { useCallback, useState } from 'react'
import Dialog from './Dialog'
import { PlatformGlyph, type PlatformId } from './graphics'
import { getAlbumTracks, type Album } from '../config/albums'
import { type Track } from '../config/tracks'
import { getSoundCloudEmbedUrl } from '../utils'
import { trackEvent } from '../utils/analytics'

interface AlbumDialogProps {
  album: Album
  open: boolean
  onClose: () => void
}

const LINK_LABELS: { key: 'spotify' | 'appleMusic' | 'more'; label: string; glyph: PlatformId }[] = [
  { key: 'spotify', label: 'spotify', glyph: 'spotify' },
  { key: 'appleMusic', label: 'apple music', glyph: 'appleMusic' },
  { key: 'more', label: 'more platforms', glyph: 'more' },
]

/**
 * The released album's tracklist.
 *
 * One track expands at a time: opening a second collapses the first, so only a single
 * SoundCloud iframe is ever mounted. Mounting five widgets at once would pull five copies of
 * the SoundCloud player on open and let two tracks play over each other.
 */
/**
 * SoundCloud takes a literal hex, so the theme's ink colour has to be resolved to a value the
 * iframe URL can carry. Read once per open rather than subscribed to: the widget cannot be
 * recoloured after mount anyway.
 */
function resolvePlayerColor(): string {
  if (typeof document === 'undefined') return '#241A14'
  const theme = document.documentElement.getAttribute('data-theme')
  return theme === 'dark' ? '#F5F0E6' : '#241A14'
}

export default function AlbumDialog({ album, open, onClose }: AlbumDialogProps) {
  const [openTrackId, setOpenTrackId] = useState<string | null>(null)
  const tracks = getAlbumTracks(album)
  const playerColor = resolvePlayerColor()

  const handleToggle = useCallback(
    (track: Track) => {
      setOpenTrackId((current) => {
        const next = current === track.id ? null : track.id
        if (next) {
          trackEvent('album_track_opened', { album_id: album.id, track_id: track.id })
        }
        return next
      })
    },
    [album.id]
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      label={`${album.title} tracklist`}
      maxWidth="46rem"
      data-testid="album-dialog"
    >
      <header className="album-dialog-head">
        <p className="t-eyebrow">{album.caption}</p>
        <h2 className="t-display album-dialog-title">{album.title}</h2>
        <p className="album-dialog-note">{album.note}</p>
      </header>

      <ol className="album-tracklist" data-testid="album-tracklist">
        {tracks.map((track, index) => {
          const isOpen = openTrackId === track.id
          const links = LINK_LABELS.filter(({ key }) => Boolean(track.listenLinks?.[key]))

          return (
            <li key={track.id} className={`album-track${isOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="album-track-head"
                onClick={() => handleToggle(track)}
                aria-expanded={isOpen}
                data-testid={`album-track-${track.id}`}
              >
                <span className="album-track-index t-meta">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="album-track-title">{track.title}</span>
                <span className="album-track-action t-meta" aria-hidden="true">
                  {isOpen ? 'close' : 'play'}
                </span>
              </button>

              {isOpen && (
                <div className="album-track-body">
                  {track.audioSource.type === 'soundcloud' && (
                    <iframe
                      className="album-track-player"
                      width="100%"
                      height="140"
                      scrolling="no"
                      frameBorder="no"
                      allow="autoplay"
                      src={getSoundCloudEmbedUrl(
                        track.audioSource.trackId,
                        track.audioSource.trackUrl,
                        track.audioSource.setId,
                        track.audioSource.secretToken,
                        // Autoplay: the click that opened the row already meant "play".
                        // The widget colour follows the page ink so it does not import a
                        // purple accent into the engraved palette.
                        { autoPlay: true, color: playerColor }
                      )}
                      title={`${track.title} player`}
                    />
                  )}

                  {links.length > 0 && (
                    <div className="album-track-links">
                      {links.map(({ key, label, glyph }) => (
                        <a
                          key={key}
                          className="album-track-link"
                          href={track.listenLinks?.[key]}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            trackEvent('listen_link_clicked', {
                              album_id: album.id,
                              track_id: track.id,
                              destination: key,
                            })
                          }
                        >
                          <PlatformGlyph platform={glyph} size={18} />
                          <span>{label}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </Dialog>
  )
}
