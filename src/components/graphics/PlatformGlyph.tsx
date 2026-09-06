export type PlatformId =
  | 'spotify'
  | 'appleMusic'
  | 'soundcloud'
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'more'

interface PlatformGlyphProps {
  platform: PlatformId
  size?: number
  className?: string
}

/**
 * Monoline platform marks.
 *
 * Drawn as uniform-weight line art in `currentColor` rather than dropped in as the vendors'
 * full-colour logos: a row of brand colours would break the single-ink rule that the whole
 * page is built on. Each glyph keeps the silhouette that makes its platform recognisable at a
 * glance while reading as part of the engraved set.
 */
export default function PlatformGlyph({ platform, size = 20, className }: PlatformGlyphProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
    focusable: false,
  }

  switch (platform) {
    case 'spotify':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9.2" />
          <path d="M7.1 9.1c3.3-.9 6.7-.5 9.6 1.1" />
          <path d="M7.7 12.2c2.7-.7 5.5-.4 7.9.9" />
          <path d="M8.4 15.2c2.1-.5 4.3-.3 6.2.7" />
        </svg>
      )

    case 'appleMusic':
      return (
        <svg {...common}>
          <rect x="2.8" y="2.8" width="18.4" height="18.4" rx="5" />
          <path d="M10.2 15.4V8.6l5-1.1v6.6" />
          <circle cx="8.7" cy="15.5" r="1.6" />
          <circle cx="13.7" cy="14.1" r="1.6" />
        </svg>
      )

    case 'soundcloud':
      return (
        <svg {...common}>
          <path d="M3.4 15.6v-3.4" />
          <path d="M6.1 16.4V10.6" />
          <path d="M8.8 16.4V9.1" />
          <path d="M11.5 16.4V7.9" />
          <path d="M14.2 16.4h4.4a2.9 2.9 0 0 0 0-5.8 4.4 4.4 0 0 0-4.4-3.9v9.7Z" />
        </svg>
      )

    case 'youtube':
      return (
        <svg {...common}>
          <rect x="2.4" y="5.4" width="19.2" height="13.2" rx="4" />
          <path d="M10.3 9.4 15 12l-4.7 2.6V9.4Z" />
        </svg>
      )

    case 'instagram':
      return (
        <svg {...common}>
          <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      )

    case 'tiktok':
      return (
        <svg {...common}>
          <path d="M14.2 3.2v10.9a3.9 3.9 0 1 1-3.9-3.9" />
          <path d="M14.2 3.2a5 5 0 0 0 5 5" />
        </svg>
      )

    case 'more':
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9.2" />
          <circle cx="8.2" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="15.8" cy="12" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
  }
}
