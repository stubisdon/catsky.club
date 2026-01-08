# Ghost Headless Frontend - Immersive Black Screen Experience

An immersive, minimalistic black screen frontend for Ghost CMS built with React, Vite, and TypeScript.

## Features

- ✅ **Immersive Black Screen Design** - Black background with white monospace font
- ✅ **Interactive Experience Format** - JSON-based timeline with text, input, and choice events
- ✅ **Audio-Synced Timeline** - Text and interactions synced to audio playback
- ✅ **Timeline Debugging Tools** - Visual timeline with markers and seek functionality
- ✅ **Mobile Optimized** - Touch-friendly interactions
- ✅ **TypeScript** - Type-safe development
- ✅ **React + Vite** - Fast development and build

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Experience

Edit the experience data in `src/App.tsx` or create a JSON file following the format in `experience-example.json`.

### 3. Add Media Files

```bash
# Add your audio file
cp /path/to/your/audio.mp3 public/audio/knock-knock.mp3
```

The experience is configured in `src/App.tsx` with the `EXPERIENCE_DATA` constant. You can also use `experience-example.json` as a template.

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your site.

## User Experience Flow

1. **Play Button**: Black screen with centered play button
2. **Audio Experience**: Audio plays with text events appearing at specific timestamps
3. **Interactive Inputs**: User can enter text when prompted
4. **Choice Selections**: User can choose from options when presented
5. **Ending**: Experience concludes with an ending screen based on user choices

## Project Structure

```
catsky.club/
├── src/
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # React entry point
│   ├── index.css        # Global styles (black screen design)
│   └── types/
│       └── experience.ts # Experience format type definitions
├── public/
│   ├── audio/           # Audio files directory
│   └── docs/            # Documentation files
├── experience-example.json # Example experience configuration
├── experience-schema.json  # JSON schema for experience format
├── server.js            # Express server for API endpoints
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies
```

## Customization

### Experience Configuration

Edit the `EXPERIENCE_DATA` constant in `src/App.tsx` or load from a JSON file. See `experience-example.json` for the format.

### Colors & Typography

Edit `src/index.css`:
```css
:root {
  --color-bg: #000000;      /* Background color */
  --color-text: #ffffff;    /* Text color */
  --font-mono: 'Consolas', 'Menlo', 'Monaco', 'Courier New', monospace;
}
```

## Documentation

All documentation is available in the `public/docs/` folder, organized into `biz/` (business) and `tech/` (technical) subdirectories.

### Documentation Files

**Business Documentation:**
- [Business Strategy](./public/docs/biz/strategy.md) - Business strategy and phase model
- [Brand Guidelines](./public/docs/biz/branding.md) - Brand colors and design system
- [Mission](./public/docs/biz/mission.md) - Mission statement
- [Todo](./public/docs/biz/todo.md) - Todo list

**Technical Documentation:**
- [Continue Development](./public/docs/tech/CONTINUE_DEVELOPMENT.md) - How to resume development
- [Deployment](./public/docs/tech/DEPLOYMENT.md) - Deployment instructions
- [Experience Format](./public/docs/tech/EXPERIENCE_FORMAT.md) - Experience configuration format
- [Quick Start](./public/docs/tech/QUICK_START.md) - Quick start guide
- [React Documentation](./public/docs/tech/README_REACT.md) - React-specific details
- [Setup Media](./public/docs/tech/SETUP_MEDIA.md) - Media setup instructions
- [UX/UI Documentation](./public/docs/tech/UX_UI_DOCUMENTATION.md) - UX/UI guidelines

## Deployment

See [DEPLOYMENT.md](./public/docs/tech/DEPLOYMENT.md) for complete deployment instructions to DigitalOcean.

## API Endpoints

- `POST /api/submit` - Submit form data (configured in `server.js`)

## Troubleshooting

### Audio not playing?
- Some browsers block autoplay. User may need to interact first.
- Check browser console for errors.
- Verify file path: `/audio/knock-knock.mp3`

### Timeline not working?
- Check browser console for errors.
- Verify audio file is loading correctly.
- Ensure timeline events have correct timestamps.
- Check that `EXPERIENCE_DATA` in `src/App.tsx` is properly formatted.

## License

MIT

## Support

For issues or questions:
1. Check the [Deployment guide](./public/docs/tech/DEPLOYMENT.md)
2. Review the [Experience Format](./public/docs/tech/EXPERIENCE_FORMAT.md) for experience configuration
3. Check [React Documentation](./public/docs/tech/README_REACT.md) for React-specific details
