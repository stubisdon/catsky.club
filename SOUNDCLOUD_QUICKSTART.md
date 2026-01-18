# SoundCloud Quick Start 🎵

Get your Player page working with SoundCloud in 5 minutes.

## Quick Steps

1. **Upload track to SoundCloud** (set to Private)
2. **Enable embedding** in track settings
3. **Get secret token** from Share → Secret link
4. **Get track ID** from URL or embed code
5. **Add to `src/Player.tsx`** in `MOCK_TRACKS` array

## Example

After uploading a track to SoundCloud:

```typescript
{
  id: '1',
  title: 'My Awesome Track',
  audioSource: {
    type: 'soundcloud',
    trackId: '123456789',      // ← Your track ID
    secretToken: 's-abc123'    // ← Your secret token
  },
  version: 'v1.0',
  date: '2024-01-15'
}
```

## Where to Find Track ID & Secret Token

**Track ID:**
- Look in the track URL: `soundcloud.com/tracks/123456789`
- Or in embed code: `api.soundcloud.com/tracks/123456789`

**Secret Token:**
- Track page → Share button → Secret link section
- Starts with `s-` (e.g., `s-abc123xyz`)

## Test It

1. Run `npm run dev`
2. Go to `http://localhost:5173/player`
3. Click a track
4. SoundCloud widget should appear and play! 🎉

## Need Help?

See `src/utils/SOUNDCLOUD_SETUP.md` for detailed instructions.
