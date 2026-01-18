# Audio Hosting Setup Guide

This guide shows you how to set up audio hosting for the Player page without hosting files on your server.

## Quick Comparison

| Solution | Cost | Setup Time | Control | Best For |
|----------|------|------------|---------|----------|
| **SoundCloud Secret Links** | Free (with account) | 5 min | Medium | Quick start, existing SoundCloud user |
| **Cloudflare R2** | ~$15/TB storage, FREE egress | 15 min | Full | Best value, unlimited bandwidth |
| **Backblaze B2** | ~$6/TB storage, free egress up to 3× storage | 15 min | Full | Cheapest storage, moderate traffic |

---

## Option 1: SoundCloud Secret Links (Easiest)

### Setup Steps:

1. **Upload track to SoundCloud**
   - Go to SoundCloud → Upload
   - Set track to **Private**
   - Enable **"Display Embed Code"** in track settings

2. **Get Secret Link**
   - In track settings → Share → Secret link
   - Copy the secret token (starts with `s-`)

3. **Get Track ID**
   - The track ID is in the URL: `soundcloud.com/tracks/123456789`
   - Or use SoundCloud's API

4. **Add to your track data:**
```typescript
{
  id: '1',
  title: 'My Track',
  audioSource: {
    type: 'soundcloud',
    trackId: '123456789',        // Your SoundCloud track ID
    secretToken: 's-XXXXX'      // Secret token from SoundCloud
  },
  version: 'v1.0',
  date: '2024-01-15'
}
```

### Pros:
- ✅ Zero setup cost
- ✅ No bandwidth charges
- ✅ Built-in player controls
- ✅ Works immediately

### Cons:
- ❌ Less control over player appearance
- ❌ Dependent on SoundCloud service
- ❌ May have usage limits on free tier

---

## Option 2: Cloudflare R2 (Recommended for Scale)

### Setup Steps:

1. **Create Cloudflare R2 Bucket**
   ```bash
   # Install Wrangler CLI
   npm install -g wrangler
   
   # Login to Cloudflare
   wrangler login
   
   # Create bucket
   wrangler r2 bucket create catsky-audio
   ```

2. **Upload MP3 files**
   ```bash
   # Upload a file
   wrangler r2 object put catsky-audio/track1.mp3 --file=./track1.mp3
   ```

3. **Make files public (or use signed URLs)**
   - In Cloudflare dashboard → R2 → Your bucket
   - Set up public access or create signed URLs via API

4. **Get public URL**
   - Public URL format: `https://your-bucket.r2.cloudflarestorage.com/track1.mp3`
   - Or use custom domain: `https://audio.catsky.club/track1.mp3`

5. **Add to your track data:**
```typescript
{
  id: '1',
  title: 'My Track',
  audioSource: {
    type: 'direct',
    url: 'https://your-bucket.r2.cloudflarestorage.com/track1.mp3'
  },
  version: 'v1.0',
  date: '2024-01-15'
}
```

### Pricing Example:
- **10 tracks × 5MB each = 50MB**
- **Storage:** $0.015/GB × 0.05GB = **$0.00075/month** (basically free)
- **Egress:** **FREE** (unlimited!)
- **Total:** ~$0/month for small scale

### Pros:
- ✅ FREE bandwidth (huge!)
- ✅ Very cheap storage
- ✅ Full control over player
- ✅ Fast CDN delivery
- ✅ 10GB free tier

### Cons:
- ❌ Requires Cloudflare account
- ❌ Need to upload files manually (or automate)

---

## Option 3: Backblaze B2 (Cheapest Storage)

### Setup Steps:

1. **Create Backblaze B2 account**
   - Go to backblaze.com
   - Create bucket

2. **Upload files**
   - Use B2 CLI or web interface
   - Make files public

3. **Get public URL**
   - Format: `https://fXXX.backblazeb2.com/file/your-bucket/track1.mp3`

4. **Add to track data:**
```typescript
{
  id: '1',
  title: 'My Track',
  audioSource: {
    type: 'direct',
    url: 'https://fXXX.backblazeb2.com/file/your-bucket/track1.mp3'
  }
}
```

### Pricing Example:
- **10 tracks × 5MB = 50MB**
- **Storage:** $0.006/GB × 0.05GB = **$0.0003/month**
- **Egress:** Free up to 3× storage (150MB), then $0.01/GB
- **Total:** ~$0/month for small scale

### Pros:
- ✅ Cheapest storage ($6/TB)
- ✅ Free egress up to 3× storage
- ✅ Full control

### Cons:
- ❌ Egress costs after free tier
- ❌ Slightly more complex than R2

---

## Recommendation

**Start with SoundCloud** for immediate setup, then **migrate to Cloudflare R2** when you need:
- More control over player
- Better performance
- Custom branding
- Higher traffic

R2's free egress makes it perfect for audio streaming at any scale.

---

## Example Track Data

Here's a complete example with both types:

```typescript
const TRACKS = [
  // SoundCloud track
  {
    id: '1',
    title: 'Track 1 - Latest Version',
    audioSource: {
      type: 'soundcloud',
      trackId: '123456789',
      secretToken: 's-XXXXX'
    },
    version: 'v2.3',
    date: '2024-01-15'
  },
  
  // Direct URL from Cloudflare R2
  {
    id: '2',
    title: 'Track 2 - Work in Progress',
    audioSource: {
      type: 'direct',
      url: 'https://catsky-audio.r2.cloudflarestorage.com/track2.mp3'
    },
    version: 'v1.8',
    date: '2024-01-10'
  },
  
  // Direct URL from Backblaze B2
  {
    id: '3',
    title: 'Track 3 - Early Draft',
    audioSource: {
      type: 'direct',
      url: 'https://fXXX.backblazeb2.com/file/catsky-audio/track3.mp3'
    },
    version: 'v0.5',
    date: '2024-01-05'
  }
]
```

---

## Next Steps

1. Choose your hosting solution
2. Upload your tracks
3. Update `MOCK_TRACKS` in `src/Player.tsx` with your track data
4. Test the player at `/player`

For production, you'll want to:
- Move track data to a backend API
- Add authentication for track URLs (if using signed URLs)
- Implement proper error handling
- Add loading states
