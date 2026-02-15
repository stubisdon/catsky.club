# Listen Page Documentation (formerly Player)

## Overview

The Listen page (`/listen`) is a music player interface for subscribers to listen to latest track versions. It implements subscription-based access control and integrates with SoundCloud for audio hosting. The route `/player` redirects to `/listen`.

## Access Control

### Subscription Levels

1. **Not Subscriber** (`not_subscriber`)
   - Cannot access player
   - Shows message: "this player is for subscribers only"
   - Link to `/connect` to connect

2. **Free Subscriber** (`free_subscriber`)
   - Access to first 3 tracks only
   - Cannot vote or leave feedback
   - Locked tracks show "locked" with upgrade prompt

3. **Paid Subscriber** (`paid_subscriber`)
   - Full access to all tracks
   - Can upvote/downvote tracks
   - Can leave feedback on tracks
   - All features enabled

## Implementation

### Files

- `src/Listen.tsx` - Main component
- `src/utils/subscription.ts` - Subscription status checking
- `src/utils/audioHelpers.ts` - Audio source handling (SoundCloud, direct URLs)

### Route

- Path: `/listen` (canonical). `/player` redirects to `/listen`
- Route handler: `src/main.tsx` (Router component)

## Audio Sources

### SoundCloud (Current Implementation)

Supports two methods:

1. **Full Track URL** (Recommended)
   ```typescript
   {
     type: 'soundcloud',
     trackUrl: 'https://soundcloud.com/user/track-name/s-SECRET_TOKEN'
   }
   ```

2. **Track ID + Secret Token**
   ```typescript
   {
     type: 'soundcloud',
     trackId: '123456789',
     secretToken: 's-XXXXX'
   }
   ```

3. **Set/Playlist** (Full playlist embed)
   ```typescript
   {
     type: 'soundcloud',
     setId: 'user/sets/playlist-name',
     secretToken: 's-XXXXX'
   }
   ```

### Direct URLs (Future)

For cloud storage (Cloudflare R2, Backblaze B2):
```typescript
{
  type: 'direct',
  url: 'https://bucket.r2.cloudflarestorage.com/track.mp3'
}
```

## Track Data Structure

```typescript
interface Track {
  id: string
  title: string
  audioSource: AudioSource
  version?: string
  date?: string
}
```

## Adding Tracks

### Quick Method: SoundCloud Private Share Links

1. Get private share link from SoundCloud
2. Copy URL (before the `?`)
3. Add to `TRACKS` in `src/config/tracks.ts` (or the array used by `src/Listen.tsx`):

```typescript
{
  id: '1',
  title: 'Track Name',
  audioSource: {
    type: 'soundcloud',
    trackUrl: 'https://soundcloud.com/user/track/s-SECRET_TOKEN'
  },
  version: 'v1.0',
  date: '2024-01-15'
}
```

See `SOUNDCLOUD_EASY_SETUP.md` in project root for detailed instructions.

## Features

### Track List
- Displays all accessible tracks
- Shows version and date metadata
- Click to select and play

### Audio Player
- **Direct URLs**: Custom HTML5 player with play/pause and progress bar
- **SoundCloud**: Embedded SoundCloud widget

### Voting (Paid Only)
- Upvote (↑) and downvote (↓) buttons
- Toggle on/off
- Visual feedback when active

### Feedback (Paid Only)
- "feedback" button opens textarea
- Submit feedback per track
- Currently logs to console (backend integration needed)

## Subscription Checking

Uses Ghost Members API:
- Endpoint: `/members/api/member/`
- Checks for active paid subscriptions
- Returns: `not_subscriber`, `free_subscriber`, or `paid_subscriber`

## Access Logic

```typescript
// Free subscribers: first 3 tracks
if (subscriptionStatus === 'free_subscriber') {
  return tracks.slice(0, 3)
}

// Paid subscribers: all tracks
if (subscriptionStatus === 'paid_subscriber') {
  return tracks
}
```

## Future Enhancements

- [ ] Backend API for track data (replace MOCK_TRACKS)
- [ ] Backend endpoints for voting/feedback
- [ ] Track metadata from SoundCloud API
- [ ] Playlist management UI
- [ ] Track search/filter
- [ ] Play history
- [ ] Favorite tracks

## Testing

### Manual Testing

1. **Not Subscriber**
   - Visit `/player` without being logged in
   - Should see subscription gate

2. **Free Subscriber**
   - Log in via `/connect`
   - Visit `/player`
   - Should see first 3 tracks only
   - Locked tracks should show upgrade prompt

3. **Paid Subscriber**
   - Have active paid subscription
   - Visit `/player`
   - Should see all tracks
   - Voting and feedback should work

### Automated Testing

See testing framework documentation (to be created).

## Related Documentation

- `SOUNDCLOUD_EASY_SETUP.md` - Quick setup guide
- `src/utils/SOUNDCLOUD_SETUP.md` - Detailed SoundCloud setup
- `src/utils/AUDIO_SETUP_GUIDE.md` - Audio hosting options
