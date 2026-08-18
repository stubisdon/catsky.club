import { describe, expect, it } from 'vitest'
import { coordsForTimezone, TIMEZONE_COORDS } from './timezoneCoords'

describe('coordsForTimezone', () => {
  it.each([
    ['Europe/London', 51.51, -0.13],
    ['America/New_York', 40.71, -74.01],
    ['Australia/Sydney', -33.87, 151.21],
    ['Asia/Tokyo', 35.68, 139.65],
    ['Arctic/Longyearbyen', 78.22, 15.63],
  ])('resolves %s', (timezone, latitude, longitude) => {
    expect(coordsForTimezone(timezone)).toEqual([latitude, longitude])
  })

  it('resolves deprecated aliases onto their canonical zone', () => {
    expect(coordsForTimezone('Asia/Calcutta')).toEqual(TIMEZONE_COORDS['Asia/Kolkata'])
    expect(coordsForTimezone('Europe/Kiev')).toEqual(TIMEZONE_COORDS['Europe/Kyiv'])
    expect(coordsForTimezone('US/Pacific')).toEqual(TIMEZONE_COORDS['America/Los_Angeles'])
  })

  it.each([undefined, null, '', 'Mars/Olympus_Mons', 'Not/A_Zone'])(
    'returns null for %j so the caller can fall through to the OS preference',
    (timezone) => {
      expect(coordsForTimezone(timezone)).toBeNull()
    },
  )

  it('covers a broad set of common zones with plausible coordinates', () => {
    const entries = Object.entries(TIMEZONE_COORDS)
    expect(entries.length).toBeGreaterThanOrEqual(100)

    for (const [zone, [latitude, longitude]] of entries) {
      expect(Math.abs(latitude), zone).toBeLessThanOrEqual(90)
      expect(Math.abs(longitude), zone).toBeLessThanOrEqual(180)
    }
  })
})
