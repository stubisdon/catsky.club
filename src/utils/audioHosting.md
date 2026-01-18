# Audio Hosting Options Guide

This document explains the different ways to host audio files without using your server.

## Option 1: SoundCloud Secret Links (Recommended for Quick Setup)

**Pros:**
- Free (if you have SoundCloud Pro or use free tier)
- No bandwidth costs
- Built-in player controls
- Secret links keep tracks private

**Cons:**
- Requires SoundCloud account
- Less control over player appearance
- Dependent on SoundCloud's service

### Setup:
1. Upload tracks to SoundCloud as private
2. Enable "Display Embed Code" in track settings
3. Get the secret link/token from SoundCloud
4. Use the secret token in the track URL

### Track Data Format:
```typescript
{
  id: '1',
  title: 'Track 1',
  audioSource: {
    type: 'soundcloud',
    trackId: '123456789',
    secretToken: 's-XXXXX' // Optional, for private tracks
  }
}
```

---

## Option 2: Cloud Storage (Cloudflare R2 or Backblaze B2)

**Pros:**
- Very cheap ($6-15/TB/month)
- Full control over player
- Direct MP3 streaming
- No dependency on third-party services

**Cons:**
- Need to set up cloud storage account
- Need to upload files manually
- Slightly more setup

### Cloudflare R2 (Recommended)
- **Storage:** $0.015/GB/month (~$15/TB)
- **Egress:** FREE (huge advantage!)
- **Free tier:** 10 GB storage + 1M writes + 10M reads/month

### Backblaze B2
- **Storage:** $0.006/GB/month (~$6/TB) - cheaper!
- **Egress:** Free up to 3× storage, then $0.01/GB
- **Free tier:** 10 GB storage

### Setup:
1. Create bucket in Cloudflare R2 or Backblaze B2
2. Upload MP3 files
3. Make files public (or use signed URLs for private access)
4. Get public URLs

### Track Data Format:
```typescript
{
  id: '1',
  title: 'Track 1',
  audioSource: {
    type: 'direct',
    url: 'https://your-bucket.r2.cloudflarestorage.com/track1.mp3'
  }
}
```

---

## Option 3: Hybrid Approach

Use SoundCloud for quick setup, migrate to cloud storage later for more control.

---

## Recommendation

For a cheap DigitalOcean server:
1. **Start with SoundCloud** - fastest setup, zero hosting costs
2. **Migrate to Cloudflare R2** if you need more control or hit SoundCloud limits
   - R2's free egress is perfect for audio streaming
   - Very cheap storage
   - Full control over player experience
