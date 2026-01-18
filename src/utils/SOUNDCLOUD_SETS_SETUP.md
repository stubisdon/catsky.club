# SoundCloud Sets/Playlists Setup Guide

Guide for using SoundCloud sets (playlists) with secret links in your Player page.

## What are SoundCloud Sets?

Sets are playlists on SoundCloud. You can:
- **Embed entire sets** as playlists (users can browse all tracks)
- **Extract individual tracks** from sets to show in your track list

## Option 1: Embed Entire Set as Playlist

This shows the full playlist widget where users can browse and play all tracks.

### Setup Steps:

1. **Create/Edit Set on SoundCloud**
   - Go to your SoundCloud profile
   - Create a new set or edit existing one
   - Add tracks to the set
   - Set the set to **Private**

2. **Enable Embedding**
   - On the set page, click **Share**
   - Enable **"Display Embed Code"** if available
   - Get the **secret token** from Secret link section

3. **Get Set URL or ID**
   - Set URL format: `https://soundcloud.com/catsky_club/sets/soft-and-sound`
   - You can use the full URL or just the path: `catsky_club/sets/soft-and-sound`

4. **Add to Track Data:**

```typescript
{
  id: '1',
  title: 'Soft and Sound - Full Playlist',
  audioSource: {
    type: 'soundcloud',
    setId: 'catsky_club/sets/soft-and-sound',  // Set URL path
    secretToken: 's-XXXXX'                      // Secret token from set
  }
}
```

**Or use full URL:**
```typescript
{
  id: '1',
  title: 'Soft and Sound - Full Playlist',
  audioSource: {
    type: 'soundcloud',
    setId: 'https://soundcloud.com/catsky_club/sets/soft-and-sound',
    secretToken: 's-XXXXX'
  }
}
```

## Option 2: Individual Tracks from Sets

Extract individual tracks from your sets to show them separately in your track list.

### Setup Steps:

1. **Get Individual Track IDs from Set**
   - Go to your set page on SoundCloud
   - Click on each track
   - Get the track ID from the URL: `soundcloud.com/tracks/123456789`
   - Get secret token from each track's Share → Secret link

2. **Add Each Track Separately:**

```typescript
const MOCK_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Track 1 from Soft and Sound',
    audioSource: {
      type: 'soundcloud',
      trackId: '123456789',        // Individual track ID
      secretToken: 's-XXXXX'       // This track's secret token
    },
    version: 'v1.0',
    date: '2024-01-15'
  },
  {
    id: '2',
    title: 'Track 2 from Soft and Sound',
    audioSource: {
      type: 'soundcloud',
      trackId: '987654321',        // Different track ID
      secretToken: 's-YYYYY'       // This track's secret token
    },
    version: 'v1.0',
    date: '2024-01-10'
  },
  // ... more tracks from the set
]
```

## Example: Your Sets

Based on your set `https://soundcloud.com/catsky_club/sets/soft-and-sound`:

### Option A: Embed Full Set

```typescript
{
  id: 'soft-and-sound',
  title: 'Soft and Sound',
  audioSource: {
    type: 'soundcloud',
    setId: 'catsky_club/sets/soft-and-sound',
    secretToken: 's-XXXXX'  // Get from set's Share → Secret link
  }
}
```

### Option B: Individual Tracks

1. Open the set on SoundCloud
2. Click each track to get its ID and secret token
3. Add each as a separate track entry

## Getting Secret Token for Sets

1. Go to your set page on SoundCloud
2. Click **Share** button
3. Look for **"Secret link"** section
4. Copy the secret token (starts with `s-`)

**Note:** Sets have their own secret token, separate from individual track tokens.

## Getting Set URL/ID

From your set URL: `https://soundcloud.com/catsky_club/sets/soft-and-sound`

You can use:
- Full URL: `https://soundcloud.com/catsky_club/sets/soft-and-sound`
- Path only: `catsky_club/sets/soft-and-sound`
- Just the slug: `soft-and-sound` (less reliable, use full path)

## Recommendation

**For your Player page**, I recommend **Option 2 (Individual Tracks)** because:
- ✅ Better control over track metadata (version, date, etc.)
- ✅ Users see individual tracks in your list
- ✅ Can implement voting/feedback per track
- ✅ Better UX for your use case

**Use Option 1 (Full Set)** if:
- You want users to browse the entire playlist
- You have many tracks and don't want to list them all
- You want SoundCloud's native playlist UI

## Example Implementation

```typescript
// In src/Player.tsx
const MOCK_TRACKS: Track[] = [
  // Track from "Soft and Sound" set
  {
    id: '1',
    title: 'Track Name from Soft and Sound',
    audioSource: {
      type: 'soundcloud',
      trackId: '123456789',
      secretToken: 's-XXXXX'
    },
    version: 'v2.3',
    date: '2024-01-15'
  },
  // Another track from the same set
  {
    id: '2',
    title: 'Another Track from Soft and Sound',
    audioSource: {
      type: 'soundcloud',
      trackId: '987654321',
      secretToken: 's-YYYYY'
    },
    version: 'v1.8',
    date: '2024-01-10'
  },
  // Track from your other set
  {
    id: '3',
    title: 'Track from Other Set',
    audioSource: {
      type: 'soundcloud',
      trackId: '555555555',
      secretToken: 's-ZZZZZ'
    },
    version: 'v1.0',
    date: '2024-01-05'
  }
]
```

## Testing

1. Update `MOCK_TRACKS` in `src/Player.tsx`
2. Run `npm run dev`
3. Go to `/player`
4. Click a track - it should play!

## Troubleshooting

**Set doesn't embed:**
- ✅ Make sure set is set to **Private**
- ✅ Check that secret token is correct
- ✅ Verify set URL/path is correct
- ✅ Make sure "Display Embed Code" is enabled (if available)

**Tracks from set don't play:**
- Each track needs its own secret token
- Make sure individual tracks have embedding enabled
- Verify track IDs are correct
