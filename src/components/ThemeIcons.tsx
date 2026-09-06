import type { SVGProps } from 'react'

type ThemeIconProps = SVGProps<SVGSVGElement>

/**
 * The three theme glyphs, drawn as printing plates.
 *
 * The conceit: the icon *is* the plate the page is printed from. Light is an unprinted plate
 * holding a sun, auto is a plate inked on one half, dark is a fully inked plate with the moon
 * knocked out of it. So the glyph previews the theme by being the theme, rather than describing
 * it with detail - which is also why the set survives the 34px button, where the previous
 * engraved sun and moon turned to mud.
 *
 * Because each glyph carries its own plate edge, `.theme-toggle` deliberately draws no border of
 * its own; two frames read as a picture in a frame.
 */
const plateProps = {
  viewBox: '0 0 32 32',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

/** Light: an unprinted plate, the sun struck into it as line work. */
export function SunIcon(props: ThemeIconProps) {
  return (
    <svg {...plateProps} data-icon="sun" {...props}>
      <path d="M3 3h26v26H3Z" />
      <circle cx="16" cy="16" r="4" />
      <path
        strokeWidth={1.4}
        d="M21.8 16h2M20.1 11.9l1.42-1.42M16 10.2V8.2M11.9 11.9l-1.42-1.42M10.2 16h-2M11.9 20.1l-1.42 1.42M16 21.8v2M20.1 20.1l1.42 1.42"
      />
    </svg>
  )
}

/**
 * Auto: the plate caught mid-inking, one half printed and one half still bare, with the disc
 * reversing across the same seam. Even-odd fill is what knocks the disc's right half back out
 * of the inked half.
 */
export function SystemIcon(props: ThemeIconProps) {
  return (
    <svg {...plateProps} data-icon="system" {...props}>
      <path
        fill="currentColor"
        stroke="none"
        fillRule="evenodd"
        d="M16 3h13v26H16Z M16 8.6A7.4 7.4 0 0 1 16 23.4Z"
      />
      <path d="M16 3H3v26h13" />
      <path d="M16 8.6A7.4 7.4 0 0 0 16 23.4" />
    </svg>
  )
}

/** Dark: the plate fully inked, the moon left unprinted inside it. */
export function MoonIcon(props: ThemeIconProps) {
  return (
    <svg {...plateProps} data-icon="moon" {...props}>
      <path
        fill="currentColor"
        stroke="none"
        fillRule="evenodd"
        d="M3 3h26v26H3Z M12.67 9.39A7.4 7.4 0 1 0 21.41 21.05 8 8 0 0 1 12.67 9.39Z"
      />
    </svg>
  )
}
