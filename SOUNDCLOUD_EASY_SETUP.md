# SoundCloud Easy Setup 🎵

The easiest way to add tracks from your SoundCloud sets!

## Quick Method: Use Private Share Links

SoundCloud private share links already include everything you need!

### Step 1: Get Private Share Link

1. Go to your track on SoundCloud
2. Click **Share**
3. Copy the **private share link**
4. It looks like: `https://soundcloud.com/catsky_club/vision-v1/s-L5q3Tw7Jyvp?in=...`

### Step 2: Use Just the Base URL

Copy only the part before the `?`:

```
https://soundcloud.com/catsky_club/vision-v1/s-L5q3Tw7Jyvp
```

The secret token (`s-L5q3Tw7Jyvp`) is already in the URL!

### Step 3: Add to Player.tsx

Open `src/Player.tsx` and add:

```typescript
{
  id: '1',
  title: 'Vision v1',
  audioSource: {
    type: 'soundcloud',
    trackUrl: 'https://soundcloud.com/catsky_club/vision-v1/s-L5q3Tw7Jyvp'
  },
  version: 'v1.0',
  date: '2024-01-15'
}
```

That's it! No need to extract track IDs or secret tokens separately.

## Example: Your Track

I've already added your first track as an example:

```typescript
{
  id: '1',
  title: 'Vision v1',
  audioSource: {
    type: 'soundcloud',
    trackUrl: 'https://soundcloud.com/catsky_club/vision-v1/s-L5q3Tw7Jyvp'
  },
  version: 'v1.0',
  date: '2024-01-15'
}
```

## Adding More Tracks

For each track in your sets:

1. Get the private share link
2. Copy the URL (before the `?`)
3. Add to `MOCK_TRACKS` array

```typescript
const MOCK_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Vision v1',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/vision-v1/s-L5q3Tw7Jyvp'
    },
    version: 'v1.0',
    date: '2024-01-15'
  },
  {
    id: '2',
    title: 'Your Next Track',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/next-track/s-XXXXX'
    },
    version: 'v1.0',
    date: '2024-01-10'
  },
  // ... more tracks
]
```

## Test It

1. Run `npm run dev`
2. Go to `http://localhost:5173/player`
3. Click "Vision v1"
4. Should play! 🎉

## Your Sets

- **Soft and Sound**: `https://soundcloud.com/catsky_club/sets/soft-and-sound`
- (Your other set)

Just get private share links for each track in these sets and add them!
