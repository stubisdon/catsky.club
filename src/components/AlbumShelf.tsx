import { useCallback, useState } from 'react'
import AlbumDialog from './AlbumDialog'
import SubscribeDialog from './SubscribeDialog'
import { AlbumArtPlate } from './graphics'
import { ALBUMS, type Album } from '../config/albums'
import { trackEvent } from '../utils/analytics'

/**
 * The two covers, and the two different promises behind them.
 *
 * A released plate opens its tracklist; an upcoming plate is held back in tone and opens the
 * email prompt. The visual difference is doing the explaining, so the covers carry only a
 * short caption rather than instructions.
 */
export default function AlbumShelf() {
  const [openAlbum, setOpenAlbum] = useState<Album | null>(null)
  const [subscribeAlbum, setSubscribeAlbum] = useState<Album | null>(null)

  const handleSelect = useCallback((album: Album) => {
    trackEvent('album_cover_clicked', { album_id: album.id, album_state: album.state })
    if (album.state === 'released') setOpenAlbum(album)
    else setSubscribeAlbum(album)
  }, [])

  return (
    <>
      <div className="album-shelf" data-testid="album-shelf">
        {ALBUMS.map((album) => (
          <button
            key={album.id}
            type="button"
            className={`album-cover album-cover-${album.state}`}
            onClick={() => handleSelect(album)}
            data-testid={`album-cover-${album.id}`}
            aria-label={
              album.state === 'released'
                ? `${album.title} — open tracklist`
                : `${album.title} — subscribe for release updates`
            }
          >
            <span className="album-cover-art">
              <AlbumArtPlate
                seed={album.id}
                title={album.title}
                caption={album.caption}
                state={album.state}
              />
            </span>
            <span className="album-cover-meta">
              <span className="album-cover-note">{album.note}</span>
              <span className="album-cover-cta t-eyebrow">
                {album.state === 'released' ? 'open tracklist' : 'get notified'}
              </span>
            </span>
          </button>
        ))}
      </div>

      {openAlbum && (
        <AlbumDialog album={openAlbum} open onClose={() => setOpenAlbum(null)} />
      )}

      {subscribeAlbum && (
        <SubscribeDialog
          open
          onClose={() => setSubscribeAlbum(null)}
          eyebrow={subscribeAlbum.title}
          source="album_cover"
        />
      )}
    </>
  )
}
