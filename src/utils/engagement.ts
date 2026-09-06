import { trackEvent } from './analytics'

export type EngagementTrigger = 'video_completed' | 'active_time' | 'songs_listened'

export const ACTIVE_TIME_THRESHOLD_MS = 3 * 60_000
export const SONG_PROGRESS_THRESHOLD = 0.5
export const VIDEO_PROGRESS_THRESHOLD = 0.9
export const SONGS_REQUIRED = 3

const STORAGE_KEY = 'catsky_engagement'
const CHECK_INTERVAL_MS = 5000

interface PersistedEngagementState {
  activeMs: number
  songs: string[]
  videos: string[]
  fired: EngagementTrigger[]
}

interface EngagementState {
  activeMs: number
  songs: Set<string>
  videos: Set<string>
  fired: Set<EngagementTrigger>
}

type Subscriber = (trigger: EngagementTrigger) => void

let state: EngagementState | null = null
const subscribers = new Set<Subscriber>()

let trackingInitialized = false
let activeStartedAt: number | null = null
let intervalId: ReturnType<typeof setInterval> | null = null
let visibilityHandler: (() => void) | null = null
let focusHandler: (() => void) | null = null
let blurHandler: (() => void) | null = null
let isVisible = true
let isFocused = true

function isValidTrigger(value: unknown): value is EngagementTrigger {
  return value === 'video_completed' || value === 'active_time' || value === 'songs_listened'
}

function loadState(): EngagementState {
  if (state) return state

  let parsed: Partial<PersistedEngagementState> | null = null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    parsed = raw ? (JSON.parse(raw) as Partial<PersistedEngagementState>) : null
  } catch {
    parsed = null
  }

  state = {
    activeMs: typeof parsed?.activeMs === 'number' && Number.isFinite(parsed.activeMs) ? parsed.activeMs : 0,
    songs: new Set(Array.isArray(parsed?.songs) ? parsed.songs.filter((v) => typeof v === 'string') : []),
    videos: new Set(Array.isArray(parsed?.videos) ? parsed.videos.filter((v) => typeof v === 'string') : []),
    fired: new Set(Array.isArray(parsed?.fired) ? parsed.fired.filter(isValidTrigger) : []),
  }

  return state
}

function persist(): void {
  if (!state) return
  try {
    const payload: PersistedEngagementState = {
      activeMs: state.activeMs,
      songs: Array.from(state.songs),
      videos: Array.from(state.videos),
      fired: Array.from(state.fired),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore persistence failures (e.g. Safari private mode)
  }
}

function emit(trigger: EngagementTrigger): void {
  const s = loadState()
  if (s.fired.has(trigger)) return
  s.fired.add(trigger)
  persist()

  subscribers.forEach((cb) => {
    try {
      cb(trigger)
    } catch {
      // one bad subscriber must not break the others
    }
  })

  try {
    trackEvent('engagement_trigger_fired', { trigger })
  } catch {
    // analytics must never break engagement tracking
  }
}

function checkActiveTimeThreshold(): void {
  const s = loadState()
  if (s.activeMs >= ACTIVE_TIME_THRESHOLD_MS) {
    emit('active_time')
  }
}

/** Adds elapsed active time since the last checkpoint/resume to the accumulator. */
function checkpoint(): void {
  if (activeStartedAt === null) return
  const now = Date.now()
  const s = loadState()
  s.activeMs += now - activeStartedAt
  activeStartedAt = now
  persist()
  checkActiveTimeThreshold()
}

function pauseActiveTimer(): void {
  checkpoint()
  activeStartedAt = null
}

function resumeActiveTimer(): void {
  if (activeStartedAt !== null) return
  if (!isVisible || !isFocused) return
  activeStartedAt = Date.now()
}

function updateActiveTimerState(): void {
  if (isVisible && isFocused) {
    resumeActiveTimer()
  } else {
    pauseActiveTimer()
  }
}

function handleVisibilityChange(): void {
  isVisible = document.visibilityState === 'visible'
  updateActiveTimerState()
}

function handleFocus(): void {
  isFocused = true
  updateActiveTimerState()
}

function handleBlur(): void {
  isFocused = false
  updateActiveTimerState()
}

export function initEngagementTracking(): () => void {
  if (trackingInitialized) {
    return () => {}
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}
  }

  trackingInitialized = true
  loadState()

  isVisible = document.visibilityState === 'visible'
  isFocused = true
  activeStartedAt = null
  updateActiveTimerState()

  visibilityHandler = handleVisibilityChange
  focusHandler = handleFocus
  blurHandler = handleBlur

  document.addEventListener('visibilitychange', visibilityHandler)
  window.addEventListener('focus', focusHandler)
  window.addEventListener('blur', blurHandler)

  intervalId = setInterval(checkpoint, CHECK_INTERVAL_MS)

  return function teardown() {
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
    if (focusHandler) window.removeEventListener('focus', focusHandler)
    if (blurHandler) window.removeEventListener('blur', blurHandler)
    if (intervalId !== null) clearInterval(intervalId)

    checkpoint()

    visibilityHandler = null
    focusHandler = null
    blurHandler = null
    intervalId = null
    activeStartedAt = null
    trackingInitialized = false
  }
}

export function recordSongProgress(trackId: string, fraction: number): void {
  if (fraction < SONG_PROGRESS_THRESHOLD) return
  const s = loadState()
  if (s.songs.has(trackId)) return
  s.songs.add(trackId)
  persist()
  if (s.songs.size >= SONGS_REQUIRED) {
    emit('songs_listened')
  }
}

export function recordVideoProgress(videoId: string, fraction: number): void {
  if (fraction < VIDEO_PROGRESS_THRESHOLD) return
  const s = loadState()
  if (s.videos.has(videoId)) return
  s.videos.add(videoId)
  persist()
  emit('video_completed')
}

export function onEngagementTrigger(cb: Subscriber): () => void {
  subscribers.add(cb)
  return () => {
    subscribers.delete(cb)
  }
}

export function getEngagementState(): { activeMs: number; songs: string[]; videos: string[] } {
  const s = loadState()
  let activeMs = s.activeMs
  if (activeStartedAt !== null) {
    activeMs += Date.now() - activeStartedAt
  }
  return {
    activeMs,
    songs: Array.from(s.songs),
    videos: Array.from(s.videos),
  }
}

export function resetEngagementForTests(): void {
  if (typeof document !== 'undefined' && visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
  }
  if (typeof window !== 'undefined') {
    if (focusHandler) window.removeEventListener('focus', focusHandler)
    if (blurHandler) window.removeEventListener('blur', blurHandler)
  }
  if (intervalId !== null) {
    clearInterval(intervalId)
  }

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore storage cleanup failures
  }

  state = null
  subscribers.clear()
  trackingInitialized = false
  activeStartedAt = null
  intervalId = null
  visibilityHandler = null
  focusHandler = null
  blurHandler = null
  isVisible = true
  isFocused = true
}
