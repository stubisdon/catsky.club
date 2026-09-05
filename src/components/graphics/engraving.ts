/**
 * Shared maths for the engraved-plate graphics.
 *
 * The reference aesthetic (single ink on paper, burin line work, stipple/halftone shading) is
 * produced here procedurally rather than shipped as bitmaps, for three reasons:
 *   1. It recolours itself from --color-text, so light and dark themes both work with no assets.
 *   2. It stays crisp at any size, which matters because the album plates scale from a 96px
 *      thumbnail to a near-full-width hero.
 *   3. Placeholder artwork can be regenerated per album from a seed instead of hand-drawn.
 *
 * Everything is deterministic: the same seed always renders the same plate, so a cover does not
 * reshuffle between renders or between server and client.
 */

/**
 * Small deterministic PRNG (mulberry32). Seeded from an album id so each plate gets its own
 * line rhythm while staying stable across reloads.
 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Turn an arbitrary id string into a stable 32-bit seed. */
export function seedFromString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export interface EngravedRing {
  r: number
  strokeWidth: number
  opacity: number
}

/**
 * Concentric rings whose stroke weight swells and thins along a sine wave.
 *
 * This is the single most important primitive here: varying line weight across a circular
 * field is what makes engraved plates read as tonal shading rather than as a set of circles.
 * The beat between `waves` and `count` is what produces the moire that gives the orb depth.
 */
export function buildRings({
  count,
  innerRadius,
  outerRadius,
  waves,
  phase,
  minWidth,
  maxWidth,
}: {
  count: number
  innerRadius: number
  outerRadius: number
  waves: number
  phase: number
  minWidth: number
  maxWidth: number
}): EngravedRing[] {
  const rings: EngravedRing[] = []
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1)
    const r = innerRadius + (outerRadius - innerRadius) * t
    const swell = (Math.sin(t * Math.PI * 2 * waves + phase) + 1) / 2
    rings.push({
      r,
      strokeWidth: minWidth + (maxWidth - minWidth) * swell,
      // Fade the outermost rings so the motif dissolves into the paper instead of stopping dead.
      opacity: 0.2 + 0.62 * swell * (1 - t * 0.45),
    })
  }
  return rings
}

export interface EngravedHatchLine {
  y: number
  strokeWidth: number
  opacity: number
}

/**
 * A field of horizontal hairlines that thickens towards one edge, the engraver's way of
 * shading a flat area. Used for the tonal bands at the top and bottom of a plate.
 */
export function buildHatchField({
  count,
  from,
  to,
  minWidth,
  maxWidth,
  invert = false,
}: {
  count: number
  from: number
  to: number
  minWidth: number
  maxWidth: number
  invert?: boolean
}): EngravedHatchLine[] {
  const lines: EngravedHatchLine[] = []
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1)
    // Squared falloff reads as a smoother tonal ramp than a linear one.
    const density = invert ? (1 - t) ** 2 : t ** 2
    lines.push({
      y: from + (to - from) * t,
      strokeWidth: minWidth + (maxWidth - minWidth) * density,
      opacity: 0.12 + 0.5 * density,
    })
  }
  return lines
}
