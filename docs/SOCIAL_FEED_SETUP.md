# Social feed setup

The landing page shows the three most recent posts from Instagram, TikTok and YouTube. This
doc is how to get each one working.

## How it fits together

```
browser  →  GET /api/social-posts?limit=3        (src/components/SocialFeed.tsx)
             ↓
          server.js route
             ↓
          server/socialFeeds.mjs                 (fetch + normalise + cache)
             ↓
          Instagram Graph API  ·  TikTok Display API  ·  YouTube Data API v3
```

Credentials never reach the browser. The client only ever receives normalised posts:

```json
{ "platform": "youtube", "id": "…", "url": "…", "thumbnailUrl": "…", "caption": "…", "publishedAt": "…" }
```

### Failure behaviour

This is deliberate, and worth knowing before you debug a blank column:

- **Platforms fail independently.** One expired token does not blank the section. The failing
  platform returns `[]` plus an entry in `errors`; the others render normally.
- **The visitor never sees the error.** A column with no posts renders
  "see the latest on instagram →" linking to the profile. Errors are for the server log and
  the JSON payload, not the page.
- **A failed refresh serves the last good data** for up to 7 days (`STALE_MAX_MS`). An
  Instagram token expiring over a weekend degrades to slightly stale posts, not an empty page.
- **Responses are cached in-process for 15 minutes** (`CACHE_TTL_MS`), and concurrent misses
  collapse into one upstream call. Restarting the server clears the cache.

## YouTube — works already, no credentials needed

`YOUTUBE_API_KEY` is optional. With no key, the server reads the channel's public Atom feed
(`youtube.com/feeds/videos.xml`), which has no quota and no auth. This is what the site uses
today.

Set a key only if you want the richer metadata from the Data API:

1. Google Cloud Console → create a project → enable **YouTube Data API v3**.
2. Credentials → Create credentials → **API key**.
3. Restrict it to the YouTube Data API.
4. `YOUTUBE_API_KEY=…` in `.env.server`.

The server lists the channel's uploads playlist (1 quota unit per call) rather than calling
`search.list` (100 units), so the default 10,000-unit daily quota is not a practical concern.

## Instagram — needs a Business or Creator account

The Instagram Basic Display API was shut down in December 2024. The only remaining route is the
Instagram Graph API, which requires:

1. The Instagram account is a **Business** or **Creator** account (not Personal).
2. It is linked to a **Facebook Page**.
3. A Meta app at [developers.facebook.com](https://developers.facebook.com) with the
   **Instagram Graph API** product added.
4. Permissions: `instagram_basic` and `pages_show_list`.
5. Generate a User access token in Graph API Explorer, then exchange it for a long-lived token:

```bash
curl -s "https://graph.facebook.com/v21.0/oauth/access_token\
?grant_type=fb_exchange_token\
&client_id=YOUR_APP_ID\
&client_secret=YOUR_APP_SECRET\
&fb_exchange_token=SHORT_LIVED_TOKEN"
```

6. `INSTAGRAM_ACCESS_TOKEN=…` in `.env.server`, then restart the server.

> **The token expires every 60 days.** There is no way around this on the Graph API. Put a
> recurring reminder in the calendar, or the column quietly falls back to the profile link
> after the 7-day stale window closes.

Verify a token:

```bash
curl -s "https://graph.instagram.com/me/media?fields=id,permalink&limit=3&access_token=$INSTAGRAM_ACCESS_TOKEN"
```

## TikTok — needs developer app approval

1. Register at [developers.tiktok.com](https://developers.tiktok.com) and create an app.
2. Add the **Login Kit** and **Display API** products.
3. Request the `video.list` scope. Approval is a manual review and can take several days.
4. Run the OAuth flow to get a user access token for the `@catsky.club` account.
5. `TIKTOK_ACCESS_TOKEN=…` in `.env.server`.

Verify:

```bash
curl -s -X POST "https://open.tiktokapis.com/v2/video/list/?fields=id,title,share_url" \
  -H "Authorization: Bearer $TIKTOK_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"max_count":3}'
```

## Checking the endpoint

```bash
curl -s http://localhost:3001/api/social-posts?limit=3 | jq
```

`errors` tells you which platforms are unconfigured or failing; `cache` is `miss` on a fresh
fetch, `hit` within the TTL, and `stale` when a refresh failed and the previous response is
being served.

## Adding a platform

1. Add a normaliser and a fetcher in `server/socialFeeds.mjs`, and register the fetcher in
   `loadSocialPosts`.
2. Add the type signature to `server/socialFeeds.d.mts`.
3. Add the credential to `SOCIAL_FEED_CONFIG` in `server.js` and to `ENV_SERVER.example`.
4. Add the platform to `SOCIAL_FEED_PLATFORMS` and `SOCIAL_PROFILES` in `src/config/socials.ts`.
5. Add a glyph case to `src/components/graphics/PlatformGlyph.tsx`.
6. Cover the normaliser in `src/server.social-feeds.test.ts`.
