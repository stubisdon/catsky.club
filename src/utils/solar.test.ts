import { describe, expect, it } from 'vitest'
import { isDaylight, nextSolarTransition, solarAltitude, sunTimesUTC } from './solar'

const LONDON = [51.51, -0.13] as const
const NEW_YORK = [40.71, -74.01] as const
const SYDNEY = [-33.87, 151.21] as const
const REYKJAVIK = [64.15, -21.94] as const
const LONGYEARBYEN = [78.22, 15.63] as const

const TWO_MINUTES_MS = 2 * 60 * 1000

function expectWithinTwoMinutes(actual: Date | null, expectedIso: string) {
  expect(actual).not.toBeNull()
  const drift = Math.abs((actual as Date).getTime() - new Date(expectedIso).getTime())
  expect(drift, `${actual?.toISOString()} vs ${expectedIso}`).toBeLessThanOrEqual(TWO_MINUTES_MS)
}

describe('sunTimesUTC', () => {
  // Published times, converted to UTC. Local equivalents in the comments.
  it('matches London on the June solstice', () => {
    const { sunrise, sunset } = sunTimesUTC(new Date('2026-06-21T12:00:00Z'), ...LONDON)

    expectWithinTwoMinutes(sunrise, '2026-06-21T03:43:00Z') // 04:43 BST
    expectWithinTwoMinutes(sunset, '2026-06-21T20:21:00Z') // 21:21 BST
  })

  it('matches New York on the December solstice', () => {
    const { sunrise, sunset } = sunTimesUTC(new Date('2026-12-21T12:00:00Z'), ...NEW_YORK)

    expectWithinTwoMinutes(sunrise, '2026-12-21T12:16:00Z') // 07:16 EST
    expectWithinTwoMinutes(sunset, '2026-12-21T21:32:00Z') // 16:32 EST
  })

  it('matches Sydney on the March equinox', () => {
    const { sunrise, sunset } = sunTimesUTC(new Date('2026-03-20T02:00:00Z'), ...SYDNEY)

    expectWithinTwoMinutes(sunrise, '2026-03-19T19:58:00Z') // 06:58 AEDT on 20 March
    expectWithinTwoMinutes(sunset, '2026-03-20T08:07:00Z') // 19:07 AEDT
  })

  it('handles Reykjavík near the midnight sun, where sunset falls on the next UTC day', () => {
    const { sunrise, sunset } = sunTimesUTC(new Date('2026-06-21T12:00:00Z'), ...REYKJAVIK)

    expectWithinTwoMinutes(sunrise, '2026-06-21T02:55:00Z')
    expectWithinTwoMinutes(sunset, '2026-06-22T00:04:00Z')
    expect((sunset as Date).getTime() - (sunrise as Date).getTime()).toBeGreaterThan(
      20 * 60 * 60 * 1000,
    )
  })

  it('returns null under polar night at Longyearbyen', () => {
    expect(sunTimesUTC(new Date('2026-01-15T12:00:00Z'), ...LONGYEARBYEN)).toEqual({
      sunrise: null,
      sunset: null,
    })
  })

  it('returns null under polar day at Longyearbyen', () => {
    expect(sunTimesUTC(new Date('2026-06-21T12:00:00Z'), ...LONGYEARBYEN)).toEqual({
      sunrise: null,
      sunset: null,
    })
  })
})

describe('solarAltitude', () => {
  it('peaks at 90° minus the axial tilt over the equator at a solstice', () => {
    const altitude = solarAltitude(new Date('2026-06-21T12:01:49Z'), 0, 0)
    expect(altitude).toBeGreaterThan(66.3)
    expect(altitude).toBeLessThan(66.8)
  })
})

describe('isDaylight', () => {
  it('is light at London midday and dark at London midnight', () => {
    expect(isDaylight(new Date('2026-06-21T12:00:00Z'), ...LONDON)).toBe(true)
    expect(isDaylight(new Date('2026-06-21T23:00:00Z'), ...LONDON)).toBe(false)
  })

  it('resolves polar night to dark and polar day to light', () => {
    expect(isDaylight(new Date('2026-01-15T12:00:00Z'), ...LONGYEARBYEN)).toBe(false)
    expect(isDaylight(new Date('2026-06-21T02:00:00Z'), ...LONGYEARBYEN)).toBe(true)
  })

  it('flips exactly across sunset', () => {
    const { sunset } = sunTimesUTC(new Date('2026-06-21T12:00:00Z'), ...LONDON)
    const at = (offsetMs: number) => new Date((sunset as Date).getTime() + offsetMs)

    expect(isDaylight(at(-60_000), ...LONDON)).toBe(true)
    expect(isDaylight(at(60_000), ...LONDON)).toBe(false)
  })
})

describe('nextSolarTransition', () => {
  it('finds the coming sunset from London midday', () => {
    const transition = nextSolarTransition(new Date('2026-06-21T12:00:00Z'), ...LONDON)
    expectWithinTwoMinutes(transition, '2026-06-21T20:21:00Z')
  })

  it('finds the coming sunrise from London midnight', () => {
    const transition = nextSolarTransition(new Date('2026-06-21T23:00:00Z'), ...LONDON)
    expectWithinTwoMinutes(transition, '2026-06-22T03:44:00Z')
  })

  it('always returns an instant strictly in the future', () => {
    const now = new Date('2026-12-21T12:00:00Z')
    const transition = nextSolarTransition(now, ...NEW_YORK)

    expect(transition).not.toBeNull()
    expect((transition as Date).getTime()).toBeGreaterThan(now.getTime())
  })

  it('returns null during polar night, where nothing changes within 48 hours', () => {
    expect(nextSolarTransition(new Date('2026-01-15T12:00:00Z'), ...LONGYEARBYEN)).toBeNull()
  })
})
