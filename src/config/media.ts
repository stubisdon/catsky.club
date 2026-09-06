export interface MusicVideo {
  youtubeId: string
  title: string
  /** Release date, ISO. Rendered as the plate's dateline. */
  releasedOn: string
  watchUrl: string
}

/**
 * The released music video featured on the landing page.
 *
 * Confirmed against the channel's public upload feed
 * (youtube.com/feeds/videos.xml?channel_id=UCaDbdaRYUr6-5aExHdnwa7Q), where it is the most
 * recent upload and is public, not unlisted.
 */
export const FEATURED_MUSIC_VIDEO: MusicVideo = {
  youtubeId: 'xRxUcF_wFSQ',
  title: 'sugar daddy',
  releasedOn: '2026-08-01',
  watchUrl: 'https://www.youtube.com/watch?v=xRxUcF_wFSQ',
}
