import type { SVGProps } from 'react'

type ThemeIconProps = SVGProps<SVGSVGElement>

const iconProps = {
  viewBox: '0 0 32 32',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.1,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

export function SunIcon(props: ThemeIconProps) {
  return (
    <svg {...iconProps} data-icon="sun" {...props}>
      {/* Six measured spears alternate exactly with six S-shaped flames. */}
      <path d="M16 7.8V3.4M23.1 11.9l3.8-2.2M23.1 20.1l3.8 2.2M16 24.2v4.4M8.9 20.1l-3.8 2.2M8.9 11.9 5.1 9.7" />
      <path d="M20.1 8.9C21.9 8.4 20.2 6.1 22 5.6M24.2 16c1.3 1.3 2.5-1.3 3.8 0M20.1 23.1c-.5 1.8 2.4 1.5 1.9 3.3M11.9 23.1c-1.8.5-.1 2.8-1.9 3.3M7.8 16c-1.3-1.3-2.5 1.3-3.8 0M11.9 8.9c.5-1.8-2.4-1.5-1.9-3.3" />
      <circle cx="16" cy="16" r="7" />
      <path d="M11.8 14.2q1.2 1 2.4 0M17.8 14.2q1.2 1 2.4 0M16 14.8v2.8M13 19.5q2.3 1.1 4.6 0" />
      <path d="M20.1 19.4q-.5.8-1.2 1.1M20.8 20.6q-.6.7-1.3 1M18.1 22.4q-.7.5-1.4.6" />
    </svg>
  )
}

export function SystemIcon(props: ThemeIconProps) {
  return (
    <svg {...iconProps} data-icon="system" {...props}>
      {/*
        One disc lit on one limb and inked solid on the other. The lit half keeps the sun's own
        spears, flames and carved face; the night half is a single block cut, which is the only
        treatment that survives the 24px button - hatching and thin fills turn to mud there.
      */}
      {/* Spears lean off the terminator so the disc never reads as sliced by a vertical rule. */}
      <path d="M13.9 8.4 12.6 4.1M8.9 11.9 5.1 9.7M8.9 20.1l-3.8 2.2M13.9 23.6l-1.3 4.3" />
      <path d="M11.9 8.9c.5-1.8-2.4-1.5-1.9-3.3M7.8 16c-1.3-1.3-2.5 1.3-3.8 0M11.9 23.1c-1.8.5-.1 2.8-1.9 3.3" />
      <circle cx="16" cy="16" r="7" />
      <path fill="currentColor" stroke="none" d="M16.5 9.02a7 7 0 0 1 0 13.96Z" />
      <path d="M11.8 14.2q1.2 1 2.4 0M13 19.5q1.6.8 3 .2" />
    </svg>
  )
}

export function MoonIcon(props: ThemeIconProps) {
  return (
    <svg {...iconProps} data-icon="moon" {...props}>
      {/* The inner limb doubles as a left-facing, carved profile. */}
      <path d="M21 4.7C12 5.5 7.2 12.1 8.5 19.2 9.8 26 15.3 29 21.8 27c-3.8-3.3-4.3-5.4-3.8-7.7l-1.6-.6 1.4-1.1-3.3-.8 1.9-1.3c-.5-3.4.7-7.1 4.7-9.8Z" />
      <path d="M15.8 13.4q1.2.9 2.4 0" />
      <path d="M9.2 18q1.5.3 2.6 1.3M9.8 20.1q1.5.3 2.5 1.3M10.9 22.2q1.4.3 2.4 1.2" />
      <path strokeWidth={0.8} d="M25.5 5.2v4.4M23.3 7.4h4.4M23.9 5.8l3.2 3.2M27.1 5.8l-3.2 3.2" />
    </svg>
  )
}
