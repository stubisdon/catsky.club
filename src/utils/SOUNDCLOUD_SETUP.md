# SoundCloud Setup Guide

Quick guide to set up SoundCloud secret links for your Player page.

## Step 1: Upload Track to SoundCloud

1. Go to [SoundCloud](https://soundcloud.com) and log in
2. Click **Upload** (top right)
3. Upload your track
4. Set track to **Private** (not Public)
5. Click **Save**

## Step 2: Enable Embedding

1. Go to your track page
2. Click **Edit** (or gear icon)
3. Scroll to **Permissions** section
4. Enable **"Display Embed Code"** ✅
5. Click **Save**

## Step 3: Get Secret Link & Token

1. On your track page, click **Share**
2. Look for **"Secret link"** section
3. Copy the **secret token** (starts with `s-`, e.g., `s-XXXXX`)
4. Note your **track ID** from the URL:
   - URL format: `https://soundcloud.com/your-username/track-name`
   - Or: `https://soundcloud.com/tracks/123456789`
   - The track ID is the number at the end

## Step 4: Get Track ID (if not in URL)

If the track ID isn't in the URL:

1. Go to your track page
2. Right-click → **Inspect** (or F12)
3. Look for the track ID in the page source
4. Or use SoundCloud's API to get it

**Alternative method:**
- The track ID is usually in the embed code:
  ```html
  <iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/123456789&secret_token=s-XXXXX">
  ```
  The number after `/tracks/` is your track ID.

## Step 5: Add to Your Track Data

Update `MOCK_TRACKS` in `src/Player.tsx`:

```typescript
{
  id: '1',
  title: 'My Track Name',
  audioSource: {
    type: 'soundcloud',
    trackId: '123456789',        // Your track ID
    secretToken: 's-XXXXX'       // Your secret token
  },
  version: 'v1.0',
  date: '2024-01-15'
}
```

## Example Track Data

```typescript
const MOCK_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Track 1 - Latest Version',
    audioSource: {
      type: 'soundcloud',
      trackId: '123456789',
      secretToken: 's-abc123xyz'
    },
    version: 'v2.3',
    date: '2024-01-15'
  },
  {
    id: '2',
    title: 'Track 2 - Work in Progress',
    audioSource: {
      type: 'soundcloud',
      trackId: '987654321',
      secretToken: 's-def456uvw'
    },
    version: 'v1.8',
    date: '2024-01-10'
  },
  // ... more tracks
]
```

## Testing

1. Start your dev server: `npm run dev`
2. Go to `/player`
3. Click on a track
4. The SoundCloud widget should appear and play

## Troubleshooting

**Track doesn't play:**
- ✅ Make sure track is set to **Private**
- ✅ Make sure **"Display Embed Code"** is enabled
- ✅ Check that secret token is correct (starts with `s-`)
- ✅ Verify track ID is correct

**Widget doesn't appear:**
- Check browser console for errors
- Verify the embed URL is correct
- Make sure you're logged into SoundCloud (for private tracks)

**"403 Forbidden" error:**
- Secret token might be wrong
- Embedding might not be enabled for the track
- Try regenerating the secret link in SoundCloud

## Notes

- Secret tokens are track-specific (each track has its own)
- Secret links keep tracks private but allow embedding
- Free SoundCloud accounts work fine for this
- You can have up to 3 hours of audio on free tier

## Next Steps

Once you have a few tracks working:
1. Move track data to a backend API (instead of hardcoding)
2. Add track management UI (optional)
3. Consider migrating to cloud storage later if you need more control
