# SoundCloud Sets Quick Start 🎵

You have two SoundCloud sets with secret tracks. Here's how to add them to your Player.

## Your Sets

1. **Soft and Sound**: `https://soundcloud.com/catsky_club/sets/soft-and-sound`
2. (Your other set - add URL here)

## Quick Setup (Recommended: Individual Tracks)

### Step 1: Get Track Info from Your Sets

For each track in your sets:

1. **Open the set** on SoundCloud
2. **Click each track** to open it
3. **Get Track ID:**
   - Look in URL: `soundcloud.com/tracks/123456789`
   - The number is your track ID
4. **Get Secret Token:**
   - Click **Share** on the track
   - Copy the **secret token** (starts with `s-`)

### Step 2: Add to Player.tsx

Open `src/Player.tsx` and update `MOCK_TRACKS`:

```typescript
const MOCK_TRACKS: Track[] = [
  // From "Soft and Sound" set
  {
    id: '1',
    title: 'Track Name from Soft and Sound',
    audioSource: {
      type: 'soundcloud',
      trackId: '123456789',      // ← Track ID from URL
      secretToken: 's-XXXXX'      // ← Secret token from Share
    },
    version: 'v1.0',
    date: '2024-01-15'
  },
  {
    id: '2',
    title: 'Another Track from Soft and Sound',
    audioSource: {
      type: 'soundcloud',
      trackId: '987654321',      // ← Different track ID
      secretToken: 's-YYYYY'     // ← This track's secret token
    },
    version: 'v1.0',
    date: '2024-01-10'
  },
  // Add more tracks from your sets...
]
```

## Alternative: Embed Full Set as Playlist

If you want to embed the entire set as a playlist:

```typescript
{
  id: 'soft-and-sound',
  title: 'Soft and Sound - Full Playlist',
  audioSource: {
    type: 'soundcloud',
    setId: 'catsky_club/sets/soft-and-sound',  // Set URL path
    secretToken: 's-XXXXX'                      // Get from set's Share → Secret link
  }
}
```

**Note:** For the set's secret token:
1. Go to your set page
2. Click **Share**
3. Get secret token from **Secret link** section

## Test It

1. Run `npm run dev`
2. Go to `http://localhost:5173/player`
3. Click a track
4. Should play! 🎉

## Need Help?

- **Individual tracks setup**: See `src/utils/SOUNDCLOUD_SETUP.md`
- **Sets/playlists setup**: See `src/utils/SOUNDCLOUD_SETS_SETUP.md`
