import { type SocialPlatform } from './socials'

export interface PinnedPost {
  platform: SocialPlatform
  /** The post's own permalink. */
  url: string
  /** Short line the owner writes for this post. This is what a visitor reads on the card. */
  caption: string
  /**
   * Explicit thumbnail override. When set, the runtime oEmbed lookup in
   * server/socialOembed.mjs is skipped entirely for this post. Use it for Instagram, whose
   * oEmbed endpoint requires a Facebook app token this project does not have, or for any post
   * whose platform oEmbed happens to be down or gated.
   */
  thumbnailUrl?: string
}

/**
 * Hand-picked posts for the landing page's social section.
 *
 * The live feed at src/utils/socialPosts.ts pulls automatically from Instagram, TikTok and
 * YouTube; this list replaces it for now. A post stays on the page exactly as entered here
 * until someone edits this file — there is no expiry, and nothing pulls new posts in on its
 * own. The array's order is the order the posts render, so reordering picks is a matter of
 * moving entries around.
 *
 * Each entry needs a `platform`, the post's own `url`, and a `caption` written by hand — the
 * caption is what a visitor actually reads, so it carries the section's voice rather than
 * repeating whatever the original post said. A thumbnail is normally resolved at runtime from
 * the url's oEmbed endpoint and cached for a day, so nothing here needs to know about images
 * unless the `thumbnailUrl` override is used; see that field's doc comment above for when to
 * reach for it.
 *
 * The list starts empty. The commented-out entries below are worked examples, one per
 * platform, so filling this in is a matter of uncommenting and swapping in the real URL and
 * caption.
 */
export const PINNED_POSTS: PinnedPost[] = [
  // {
  //   platform: 'instagram',
  //   url: 'https://www.instagram.com/p/XXXXXXXXXXX/',
  //   caption: 'new merch just dropped',
  //   thumbnailUrl: 'https://example.com/manually-saved-thumbnail.jpg',
  // },
  // {
  //   platform: 'tiktok',
  //   url: 'https://www.tiktok.com/@catsky.club/video/1234567890123456789',
  //   caption: 'behind the scenes at the shoot',
  // },
  // {
  //   platform: 'youtube',
  //   url: 'https://www.youtube.com/watch?v=xxxxxxxxxxx',
  //   caption: 'the full video is finally up',
  // },
]

/** This platform's pinned posts, in declared order. */
export function getPinnedPosts(platform: SocialPlatform): PinnedPost[] {
  return PINNED_POSTS.filter((post) => post.platform === platform)
}

/** Whether the owner has pinned anything yet. */
export function hasPinnedPosts(): boolean {
  return PINNED_POSTS.length > 0
}
