# Setting Up Your Media Files

## Quick Setup

1. **Add your audio file:**
   ```bash
   cp /path/to/your/audio.mp3 public/audio/knock-knock.mp3
   ```

2. **Configure your experience:** Edit `src/App.tsx` to set up your timeline events and audio file path.

That's it! The audio file will be automatically loaded when the site runs.

## File Requirements

### Audio File (`knock-knock.mp3`)
- **Location:** `public/audio/knock-knock.mp3`
- **Format:** MP3 (recommended) or any browser-supported audio format
- **Size:** Keep under 5MB for fast loading
- **Behavior:** Plays automatically when the site loads (may require user interaction on some browsers due to autoplay policies)

### Experience Configuration
- **Location:** `src/App.tsx` - Edit the `EXPERIENCE_DATA` constant
- **Audio File:** Set in `metadata.audioFile` (default: `/audio/knock-knock.mp3`)
- **Timeline:** Configure text, input, and choice events in the `timeline` array

## Testing

After adding your files:

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Visit:** `http://localhost:3000`

3. **You should:**
   - See a "play" button in the center
   - Click play to start the experience
   - Hear audio playing and see text events appear
   - Interact with input fields and choices as they appear

## Troubleshooting

### Audio not playing?
- Some browsers block autoplay. User may need to interact first.
- Check browser console for errors.
- Verify file path: `/audio/knock-knock.mp3`

### Timeline events not appearing?
- Check browser console for errors.
- Verify timeline events have correct timestamps in `src/App.tsx`.
- Ensure audio file is loading correctly.
- Check that experience data is properly formatted.

## File Structure

```
public/
├── audio/
│   └── knock-knock.mp3    ← Your audio file
└── README.md

Note: Video is loaded from YouTube, no local video file needed.
```

