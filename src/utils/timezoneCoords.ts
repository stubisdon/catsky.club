/**
 * IANA timezone → approximate coordinates of the zone's reference city.
 *
 * This is how the site works out where a visitor is without ever prompting for location:
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` is synchronous, permissionless and offline.
 * A timezone pins latitude closely enough that computed sunrise is off by minutes, which is
 * irrelevant for a light/dark switch — and latitude is exactly what matters at high latitudes.
 *
 * Deliberately a hand-written literal covering the most common zones: no generation step, no
 * fetch, no dependency. An unknown zone returns `null` so the caller falls through to the OS
 * preference. Never guess a UTC-offset-based latitude: an equator guess is worse than no guess.
 */

export type Coords = readonly [latitude: number, longitude: number]

export const TIMEZONE_COORDS: Record<string, Coords> = {
  // Africa
  'Africa/Abidjan': [5.36, -4.01],
  'Africa/Accra': [5.6, -0.19],
  'Africa/Addis_Ababa': [9.02, 38.75],
  'Africa/Algiers': [36.75, 3.06],
  'Africa/Cairo': [30.04, 31.24],
  'Africa/Casablanca': [33.57, -7.59],
  'Africa/Johannesburg': [-26.2, 28.05],
  'Africa/Kampala': [0.35, 32.58],
  'Africa/Khartoum': [15.5, 32.56],
  'Africa/Lagos': [6.52, 3.38],
  'Africa/Nairobi': [-1.29, 36.82],
  'Africa/Tunis': [36.81, 10.18],

  // Americas
  'America/Anchorage': [61.22, -149.9],
  'America/Argentina/Buenos_Aires': [-34.6, -58.38],
  'America/Bogota': [4.71, -74.07],
  'America/Caracas': [10.49, -66.88],
  'America/Chicago': [41.88, -87.63],
  'America/Costa_Rica': [9.93, -84.08],
  'America/Denver': [39.74, -104.99],
  'America/Edmonton': [53.55, -113.49],
  'America/Guatemala': [14.63, -90.51],
  'America/Halifax': [44.65, -63.57],
  'America/Havana': [23.11, -82.37],
  'America/Lima': [-12.05, -77.04],
  'America/Los_Angeles': [34.05, -118.24],
  'America/Mexico_City': [19.43, -99.13],
  'America/Montevideo': [-34.9, -56.16],
  'America/New_York': [40.71, -74.01],
  'America/Panama': [8.98, -79.52],
  'America/Phoenix': [33.45, -112.07],
  'America/Puerto_Rico': [18.47, -66.11],
  'America/Santiago': [-33.45, -70.67],
  'America/Sao_Paulo': [-23.55, -46.63],
  'America/St_Johns': [47.56, -52.71],
  'America/Toronto': [43.65, -79.38],
  'America/Vancouver': [49.28, -123.12],
  'America/Winnipeg': [49.9, -97.14],

  // Antarctica
  'Antarctica/McMurdo': [-77.85, 166.67],

  // Asia
  'Asia/Almaty': [43.24, 76.89],
  'Asia/Amman': [31.95, 35.93],
  'Asia/Baghdad': [33.32, 44.36],
  'Asia/Baku': [40.41, 49.87],
  'Asia/Bangkok': [13.76, 100.5],
  'Asia/Beirut': [33.89, 35.5],
  'Asia/Colombo': [6.93, 79.86],
  'Asia/Dhaka': [23.81, 90.41],
  'Asia/Dubai': [25.2, 55.27],
  'Asia/Ho_Chi_Minh': [10.82, 106.63],
  'Asia/Hong_Kong': [22.32, 114.17],
  'Asia/Jakarta': [-6.21, 106.85],
  'Asia/Jerusalem': [31.77, 35.21],
  'Asia/Kabul': [34.56, 69.21],
  'Asia/Karachi': [24.86, 67.01],
  'Asia/Kathmandu': [27.72, 85.32],
  'Asia/Kolkata': [22.57, 88.36],
  'Asia/Kuala_Lumpur': [3.14, 101.69],
  'Asia/Kuwait': [29.38, 47.99],
  'Asia/Manila': [14.6, 120.98],
  'Asia/Qatar': [25.29, 51.53],
  'Asia/Riyadh': [24.71, 46.68],
  'Asia/Seoul': [37.57, 126.98],
  'Asia/Shanghai': [31.23, 121.47],
  'Asia/Singapore': [1.35, 103.82],
  'Asia/Taipei': [25.03, 121.57],
  'Asia/Tashkent': [41.3, 69.24],
  'Asia/Tbilisi': [41.72, 44.79],
  'Asia/Tehran': [35.69, 51.39],
  'Asia/Tokyo': [35.68, 139.65],
  'Asia/Yekaterinburg': [56.84, 60.65],

  // Atlantic
  'Atlantic/Azores': [37.74, -25.68],
  'Atlantic/Canary': [28.46, -16.25],
  'Atlantic/Reykjavik': [64.15, -21.94],

  // Australia / Pacific
  'Australia/Adelaide': [-34.93, 138.6],
  'Australia/Brisbane': [-27.47, 153.03],
  'Australia/Darwin': [-12.46, 130.84],
  'Australia/Hobart': [-42.88, 147.33],
  'Australia/Melbourne': [-37.81, 144.96],
  'Australia/Perth': [-31.95, 115.86],
  'Australia/Sydney': [-33.87, 151.21],
  'Pacific/Auckland': [-36.85, 174.76],
  'Pacific/Fiji': [-18.14, 178.44],
  'Pacific/Guam': [13.44, 144.79],
  'Pacific/Honolulu': [21.31, -157.86],
  'Pacific/Port_Moresby': [-9.44, 147.18],
  'Pacific/Tahiti': [-17.54, -149.57],

  // Europe
  'Arctic/Longyearbyen': [78.22, 15.63],
  'Europe/Amsterdam': [52.37, 4.9],
  'Europe/Athens': [37.98, 23.73],
  'Europe/Belgrade': [44.79, 20.45],
  'Europe/Berlin': [52.52, 13.4],
  'Europe/Brussels': [50.85, 4.35],
  'Europe/Bucharest': [44.43, 26.1],
  'Europe/Budapest': [47.5, 19.04],
  'Europe/Copenhagen': [55.68, 12.57],
  'Europe/Dublin': [53.35, -6.26],
  'Europe/Helsinki': [60.17, 24.94],
  'Europe/Istanbul': [41.01, 28.98],
  'Europe/Kyiv': [50.45, 30.52],
  'Europe/Lisbon': [38.72, -9.14],
  'Europe/London': [51.51, -0.13],
  'Europe/Madrid': [40.42, -3.7],
  'Europe/Minsk': [53.9, 27.57],
  'Europe/Moscow': [55.76, 37.62],
  'Europe/Oslo': [59.91, 10.75],
  'Europe/Paris': [48.86, 2.35],
  'Europe/Prague': [50.08, 14.44],
  'Europe/Riga': [56.95, 24.11],
  'Europe/Rome': [41.9, 12.5],
  'Europe/Sofia': [42.7, 23.32],
  'Europe/Stockholm': [59.33, 18.07],
  'Europe/Tallinn': [59.44, 24.75],
  'Europe/Vienna': [48.21, 16.37],
  'Europe/Vilnius': [54.69, 25.28],
  'Europe/Warsaw': [52.23, 21.01],
  'Europe/Zurich': [47.38, 8.54],

  // Zero-offset zones. UTC has no location, but 0°/0° is the honest reading of it and the only
  // case where an equator guess is not a guess at all.
  UTC: [0, 0],
  'Etc/UTC': [0, 0],
  'Etc/GMT': [0, 0],
  GMT: [0, 0],
}

/**
 * Deprecated aliases browsers may still report, mapped onto their canonical zone.
 */
const TIMEZONE_ALIASES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Rangoon': 'Asia/Bangkok',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'Europe/Kiev': 'Europe/Kyiv',
  'Europe/Nicosia': 'Asia/Beirut',
  'Australia/Canberra': 'Australia/Sydney',
  'Australia/ACT': 'Australia/Sydney',
  'Australia/NSW': 'Australia/Sydney',
  'US/Pacific': 'America/Los_Angeles',
  'US/Eastern': 'America/New_York',
  'US/Central': 'America/Chicago',
  'US/Mountain': 'America/Denver',
  'US/Hawaii': 'Pacific/Honolulu',
  'Canada/Eastern': 'America/Toronto',
  'Canada/Pacific': 'America/Vancouver',
  'Europe/Kaliningrad': 'Europe/Warsaw',
  Universal: 'UTC',
  Zulu: 'UTC',
}

/**
 * Coordinates for an IANA timezone id, or `null` when the zone is not in the table.
 */
export function coordsForTimezone(timezone: string | undefined | null): Coords | null {
  if (!timezone) return null

  const direct = TIMEZONE_COORDS[timezone]
  if (direct) return direct

  const alias = TIMEZONE_ALIASES[timezone]
  if (alias) return TIMEZONE_COORDS[alias] ?? null

  return null
}
