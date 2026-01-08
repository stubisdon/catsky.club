# Interactive Experience - React + Vite

This is a React application built with Vite, featuring an interactive audio-synced experience.

## Features

- **Play Button Stage**: Black screen with a centered play button
- **Intro Stage**: Audio plays with text appearing synced to timecode
- **Name Input**: User enters their first name
- **Conversational Interaction**: System confirms name ingestion and becomes conversational
- **A-HA Moment**: Interactive moment showing the magic of the experience
- **Contact Collection**: Email or phone number collection at the end

## Setup

1. Install dependencies:
```bash
npm install
```

2. Add your audio file:
   - Place your intro audio file at `public/audio/knock-knock.mp3`
   - Or update the path in `src/App.tsx` to match your audio file

3. Configure text cues:
   - Edit `TEXT_CUES` array in `src/App.tsx` to match your audio timing
   - Each cue has a `time` (in seconds) and `text` property

## Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

For development with API support, run the backend server in a separate terminal:
```bash
npm run server
```

The API server runs on `http://localhost:3001` and Vite will proxy `/api` requests to it.

## Building for Production

Build the app:
```bash
npm run build
```

The built files will be in the `dist` directory.

To preview the production build:
```bash
npm run preview
```

To run the full production setup (build + server):
```bash
npm start
```

## Project Structure

```
├── src/
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # React entry point
│   ├── index.css        # Global styles
│   └── api.ts           # API utility functions
├── public/
│   └── audio/           # Audio files
├── server.js            # Express server for API endpoints
├── vite.config.ts       # Vite configuration
└── package.json         # Dependencies and scripts
```

## Customization

### Audio File
Update the audio source in `src/App.tsx`:
```tsx
<audio
  ref={audioRef}
  src="/audio/your-audio-file.mp3"
  preload="auto"
/>
```

### Text Cues
Modify the `TEXT_CUES` array to match your audio:
```tsx
const TEXT_CUES: TextCue[] = [
  { time: 2, text: 'your first text' },
  { time: 5, text: 'your second text' },
  // Add more cues...
]
```

### Styling
All styles are in `src/index.css`. The app uses a monospace font and black/white color scheme.

## API Endpoint

The `/api/submit` endpoint accepts POST requests with:
```json
{
  "name": "string",
  "contact": "string (optional)"
}
```

Update `server.js` to implement your submission logic (email, database, etc.).

