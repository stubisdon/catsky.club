# Tracks Configuration

This directory contains the tracks configuration for the Listen page.

## Adding Tracks from SoundCloud

### Method 1: Using Private Share Links (Easiest)

1. Go to your track on SoundCloud
2. Click **Share**
3. Copy the **private share link** (e.g., `https://soundcloud.com/catsky_club/track-name/s-XXXXX?in=...`)
4. Use only the part before the `?`: `https://soundcloud.com/catsky_club/track-name/s-XXXXX`
5. Add to `tracks.ts`:

```typescript
{
  id: '2',
  title: 'Track Name',
  audioSource: {
    type: 'soundcloud',
    trackUrl: 'https://soundcloud.com/catsky_club/track-name/s-XXXXX'
  },
  version: 'v1.0',
  date: '2024-01-15'
}
```

### Method 2: Using Track ID + Secret Token

```typescript
{
  id: '2',
  title: 'Track Name',
  audioSource: {
    type: 'soundcloud',
    trackId: '123456789',
    secretToken: 's-XXXXX'
  },
  version: 'v1.0',
  date: '2024-01-15'
}
```

### Method 3: Using the Helper Utility

You can use the `soundcloudTracks.ts` utility to parse share links:

```typescript
import { parseSoundCloudShareLink, generateTrackId } from '../utils/soundcloudTracks'

const shareLink = 'https://soundcloud.com/catsky_club/track-name/s-XXXXX?in=...'
const info = parseSoundCloudShareLink(shareLink, 'Custom Title')

const track = {
  id: generateTrackId(1, info.title),
  title: info.title,
  audioSource: {
    type: 'soundcloud' as const,
    trackUrl: info.trackUrl
  }
}
```

## Your SoundCloud Sets

- **Soft and Sound**: `https://soundcloud.com/catsky_club/sets/soft-and-sound`

To get tracks from a set:
1. Open the set on SoundCloud
2. Click each track to open it
3. Get the private share link for each track
4. Add each track to `tracks.ts`
