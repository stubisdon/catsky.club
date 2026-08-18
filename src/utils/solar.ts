/**
 * Solar position math (NOAA solar calculator equations), implemented locally so the theme can
 * follow the sun without pulling in a dependency. Pure functions, no DOM, no network.
 *
 * Reference: NOAA Global Monitoring Laboratory solar calculation spreadsheet.
 * Accuracy is well inside a minute for the latitudes we care about, which is far more than a
 * light/dark switch needs.
 */

const DEG = Math.PI / 180

/** Zenith angle of the sun's centre at official sunrise/sunset (refraction + solar radius). */
const SUNRISE_ZENITH_DEG = 90.833

/** Altitude of the sun's centre at official sunrise/sunset. */
export const HORIZON_ALTITUDE_DEG = -0.833

const MS_PER_MINUTE = 60_000
const MS_PER_DAY = 86_400_000
const MINUTES_PER_DAY = 1440

export interface SunTimes {
  /** Sunrise instant, or `null` during polar day/night. */
  sunrise: Date | null
  /** Sunset instant, or `null` during polar day/night. */
  sunset: Date | null
}

function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toJulianDay(date: Date): number {
  return date.getTime() / MS_PER_DAY + 2440587.5
}

function julianCentury(julianDay: number): number {
  return (julianDay - 2451545) / 36525
}

interface SolarParams {
  /** Solar declination in degrees. */
  declination: number
  /** Equation of time in minutes. */
  eqTime: number
}

function solarParams(t: number): SolarParams {
  const meanLongitude = mod(280.46646 + t * (36000.76983 + t * 0.0003032), 360)
  const meanAnomaly = 357.52911 + t * (35999.05029 - 0.0001537 * t)
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)

  const centre =
    Math.sin(meanAnomaly * DEG) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * meanAnomaly * DEG) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * meanAnomaly * DEG) * 0.000289

  const trueLongitude = meanLongitude + centre
  const apparentLongitude =
    trueLongitude - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * t) * DEG)

  const meanObliquity = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
  const obliquity = meanObliquity + 0.00256 * Math.cos((125.04 - 1934.136 * t) * DEG)

  const declination =
    Math.asin(clamp(Math.sin(obliquity * DEG) * Math.sin(apparentLongitude * DEG), -1, 1)) / DEG

  const y = Math.tan((obliquity / 2) * DEG) ** 2
  const eqTime =
    (4 *
      (y * Math.sin(2 * meanLongitude * DEG) -
        2 * eccentricity * Math.sin(meanAnomaly * DEG) +
        4 * eccentricity * y * Math.sin(meanAnomaly * DEG) * Math.cos(2 * meanLongitude * DEG) -
        0.5 * y * y * Math.sin(4 * meanLongitude * DEG) -
        1.25 * eccentricity * eccentricity * Math.sin(2 * meanAnomaly * DEG))) /
    DEG

  return { declination, eqTime }
}

/**
 * Hour angle (degrees) between solar noon and sunrise/sunset.
 * `null` when the sun never reaches the horizon on that day (polar day or polar night).
 */
function sunriseHourAngle(latitude: number, declination: number): number | null {
  const cosHourAngle =
    Math.cos(SUNRISE_ZENITH_DEG * DEG) / (Math.cos(latitude * DEG) * Math.cos(declination * DEG)) -
    Math.tan(latitude * DEG) * Math.tan(declination * DEG)

  if (!Number.isFinite(cosHourAngle) || cosHourAngle > 1 || cosHourAngle < -1) return null

  return Math.acos(cosHourAngle) / DEG
}

/** Altitude of the sun's centre above the horizon, in degrees, at an exact instant. */
export function solarAltitude(date: Date, latitude: number, longitude: number): number {
  const julianDay = toJulianDay(date)
  const { declination, eqTime } = solarParams(julianCentury(julianDay))

  const utcMinutes = (julianDay + 0.5 - Math.floor(julianDay + 0.5)) * MINUTES_PER_DAY
  const trueSolarTime = mod(utcMinutes + eqTime + 4 * longitude, MINUTES_PER_DAY)
  const hourAngle = trueSolarTime / 4 - 180

  const cosZenith =
    Math.sin(latitude * DEG) * Math.sin(declination * DEG) +
    Math.cos(latitude * DEG) * Math.cos(declination * DEG) * Math.cos(hourAngle * DEG)

  return 90 - Math.acos(clamp(cosZenith, -1, 1)) / DEG
}

/**
 * Sunrise and sunset for the UTC calendar day of `date`, as UTC instants.
 *
 * Both are `null` under polar day and polar night. Note that far from the prime meridian the
 * returned instants can fall outside the UTC day itself — they are the transitions bracketing that
 * day's local solar noon, which is what callers actually want.
 */
export function sunTimesUTC(date: Date, latitude: number, longitude: number): SunTimes {
  const dayStartMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())

  const paramsAtMinute = (minutes: number): SolarParams =>
    solarParams(julianCentury(toJulianDay(new Date(dayStartMs + minutes * MS_PER_MINUTE))))

  // First pass from solar-noon parameters, then one refinement pass evaluated at the estimated
  // event time. The second pass is what pulls the result inside a few seconds of published tables.
  const estimate = (sign: 1 | -1): Date | null => {
    let params = paramsAtMinute(720)
    let hourAngle = sunriseHourAngle(latitude, params.declination)
    if (hourAngle === null) return null

    let minutes = 720 - 4 * longitude - params.eqTime + sign * 4 * hourAngle

    params = paramsAtMinute(minutes)
    hourAngle = sunriseHourAngle(latitude, params.declination)
    if (hourAngle === null) return null

    minutes = 720 - 4 * longitude - params.eqTime + sign * 4 * hourAngle

    return new Date(dayStartMs + minutes * MS_PER_MINUTE)
  }

  return { sunrise: estimate(-1), sunset: estimate(1) }
}

/**
 * Is the sun above the horizon at this exact instant?
 * Polar day resolves to `true`, polar night to `false`, with no special-casing needed.
 */
export function isDaylight(date: Date, latitude: number, longitude: number): boolean {
  return solarAltitude(date, latitude, longitude) > HORIZON_ALTITUDE_DEG
}

const TRANSITION_SEARCH_STEP_MS = 5 * MS_PER_MINUTE
const TRANSITION_SEARCH_HOURS = 48
const TRANSITION_PRECISION_MS = 30_000

/**
 * The next sunrise or sunset strictly after `date`, searched up to 48 hours ahead.
 * `null` under polar day/night, where nothing changes within that window.
 */
export function nextSolarTransition(
  date: Date,
  latitude: number,
  longitude: number,
): Date | null {
  const startMs = date.getTime()
  const startsInDaylight = isDaylight(date, latitude, longitude)
  const endMs = startMs + TRANSITION_SEARCH_HOURS * 3_600_000

  let previousMs = startMs

  for (let ms = startMs + TRANSITION_SEARCH_STEP_MS; ms <= endMs; ms += TRANSITION_SEARCH_STEP_MS) {
    if (isDaylight(new Date(ms), latitude, longitude) === startsInDaylight) {
      previousMs = ms
      continue
    }

    let low = previousMs
    let high = ms
    while (high - low > TRANSITION_PRECISION_MS) {
      const middle = (low + high) / 2
      if (isDaylight(new Date(middle), latitude, longitude) === startsInDaylight) low = middle
      else high = middle
    }

    return new Date(Math.ceil(high))
  }

  return null
}
