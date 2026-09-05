import { useId, useMemo } from 'react'
import { buildHatchField, buildRings, createRng, seedFromString } from './engraving'

export type AlbumPlateState = 'released' | 'upcoming'

interface AlbumArtPlateProps {
  /** Stable id; drives the seeded line rhythm so each album gets its own plate. */
  seed: string
  title: string
  /** Small line above the title, e.g. "five tracks" or "coming". */
  caption?: string
  /** `upcoming` renders the same plate held back in tone, as an unexposed proof. */
  state?: AlbumPlateState
  className?: string
}

const VIEWBOX = 600

/*
  Plate composition, in viewBox units. The bands are laid out so nothing overlaps: the
  wordmark sits above the orb, the orb occupies the middle, a thin hatched horizon separates
  it from the lettering, and the title block owns the bottom. Earlier versions centred the orb
  in the whole square, which pushed it through both the hatch fields and the title.
*/
const ORB_CY = 252
const ORB_INNER_R = 24
const ORB_OUTER_R = 158
const HORIZON_TOP = 430
const HORIZON_BOTTOM = 482

/**
 * Procedurally engraved album artwork.
 *
 * Stands in for real cover art: a burin orb over a hatched ground, stipple shading, and the
 * title set in the display serif, all drawn in the single current ink colour. Swapping in a
 * real cover later means replacing this component's output with an <img>, nothing else.
 */
export default function AlbumArtPlate({
  seed,
  title,
  caption,
  state = 'released',
  className,
}: AlbumArtPlateProps) {
  // useId keeps the pattern/mask ids unique when several plates are on the page at once.
  const uid = useId().replace(/:/g, '')
  const stippleId = `stipple-${uid}`
  const orbMaskId = `orbmask-${uid}`

  const { rings, horizon, stippleAngle } = useMemo(() => {
    const rng = createRng(seedFromString(seed))
    const phase = rng() * Math.PI * 2
    return {
      rings: buildRings({
        count: 42,
        innerRadius: ORB_INNER_R,
        outerRadius: ORB_OUTER_R,
        waves: 3 + Math.floor(rng() * 3),
        phase,
        minWidth: 0.6,
        maxWidth: 4.6,
      }),
      // A single hatched band under the orb, reading as a horizon the motif sits on.
      // Line count is capped by legibility, not density: spaced any tighter than roughly
      // three times the heaviest stroke, the lines merge into a solid grey bar.
      horizon: buildHatchField({
        count: 10,
        from: HORIZON_TOP,
        to: HORIZON_BOTTOM,
        minWidth: 0.4,
        maxWidth: 1.6,
        invert: true,
      }),
      stippleAngle: Math.round(rng() * 60 - 30),
    }
  }, [seed])

  const isUpcoming = state === 'upcoming'

  return (
    <svg
      className={className}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      role="img"
      aria-label={`${title} cover artwork`}
      style={{ display: 'block', width: '100%', height: 'auto' }}
    >
      <defs>
        {/* Stipple: the halftone dot field an engraver uses for soft shading. */}
        <pattern
          id={stippleId}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${stippleAngle})`}
        >
          <circle cx="3.5" cy="3.5" r="1.35" fill="currentColor" />
        </pattern>

        {/* Confines the stipple to a crescent, so the orb reads as lit from one side. */}
        <mask id={orbMaskId}>
          <rect width={VIEWBOX} height={VIEWBOX} fill="black" />
          <circle cx="300" cy={ORB_CY} r={ORB_OUTER_R} fill="white" />
          <circle cx="248" cy={ORB_CY - 42} r={ORB_OUTER_R - 16} fill="black" />
        </mask>
      </defs>

      {/* Paper. Explicit rather than transparent so the plate keeps its edge on any surface. */}
      <rect width={VIEWBOX} height={VIEWBOX} fill="var(--color-bg)" />

      <g color="var(--color-text)" opacity={isUpcoming ? 0.4 : 1}>
        {/* The orb: swelling concentric burin lines. */}
        <g stroke="currentColor" fill="none">
          {rings.map((ring, i) => (
            <circle
              key={`r${i}`}
              cx="300"
              cy={ORB_CY}
              r={ring.r}
              strokeWidth={ring.strokeWidth}
              opacity={ring.opacity}
            />
          ))}
        </g>

        {/* Stipple crescent, shading the lower-right of the orb. */}
        <rect
          width={VIEWBOX}
          height={VIEWBOX}
          fill={`url(#${stippleId})`}
          mask={`url(#${orbMaskId})`}
          opacity="0.55"
        />

        {/* Horizon: a hatched band separating the motif from the lettering below. */}
        <g stroke="currentColor" fill="none">
          {horizon.map((line, i) => (
            <line
              key={`h${i}`}
              x1="72"
              x2={VIEWBOX - 72}
              y1={line.y}
              y2={line.y}
              strokeWidth={line.strokeWidth}
              opacity={line.opacity * 0.7}
            />
          ))}
        </g>
      </g>

      {/* Lettering sits at full strength even on the held-back plate, so titles stay readable. */}
      <g color="var(--color-text)" textAnchor="middle">
        <text
          x="300"
          y="66"
          fill="currentColor"
          opacity="0.7"
          fontFamily="var(--font-mono)"
          fontSize="16"
          letterSpacing="7"
        >
          CATSKY
        </text>
        <line
          x1="248"
          x2="352"
          y1="84"
          y2="84"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.35"
        />

        {caption && (
          <text
            x="300"
            y="513"
            fill="currentColor"
            opacity="0.6"
            fontFamily="var(--font-mono)"
            fontSize="14"
            letterSpacing="4.5"
          >
            {caption.toUpperCase()}
          </text>
        )}

        <text
          x="300"
          y="562"
          fill="currentColor"
          fontFamily="var(--font-display)"
          fontSize="52"
          opacity={isUpcoming ? 0.68 : 0.95}
        >
          {title}
        </text>
      </g>
    </svg>
  )
}
