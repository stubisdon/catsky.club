/**
 * Third-party player API loaders (YouTube IFrame API + SoundCloud Widget API).
 *
 * These exist purely so engagement tracking can observe playback progress. They are
 * analytics-adjacent: nothing here may ever break the product. Every loader resolves to
 * `null` instead of rejecting when a script is blocked (ad blocker), fails, or never
 * becomes ready, and every observer degrades to a no-op teardown in that case.
 *
 * Module scope must stay import-safe: `window`/`document` are only touched inside functions.
 */

const YOUTUBE_API_SRC = 'https://www.youtube.com/iframe_api'
const SOUNDCLOUD_API_SRC = 'https://w.soundcloud.com/player/api.js'
const SCRIPT_READY_TIMEOUT_MS = 10_000
const DEFAULT_POLL_INTERVAL_MS = 1000

/* ------------------------------------------------------------------ YouTube */

export interface YouTubePlayerStateEvent {
  data: number
}

export interface YouTubePlayer {
  getCurrentTime: () => number
  getDuration: () => number
  destroy: () => void
}

export interface YouTubePlayerOptions {
  events?: {
    onReady?: (event: { target: YouTubePlayer }) => void
    onStateChange?: (event: YouTubePlayerStateEvent) => void
  }
}

export interface YouTubeApi {
  Player: new (element: HTMLElement | string, options: YouTubePlayerOptions) => YouTubePlayer
  PlayerState: {
    ENDED: number
    PLAYING: number
    PAUSED: number
    BUFFERING: number
    CUED: number
  }
}

interface YouTubeWindow {
  YT?: Partial<YouTubeApi>
  onYouTubeIframeAPIReady?: () => void
}

function getYouTubeApi(): YouTubeApi | null {
  if (typeof window === 'undefined') return null
  const yt = (window as unknown as YouTubeWindow).YT
  if (!yt || typeof yt.Player !== 'function' || !yt.PlayerState) return null
  return yt as YouTubeApi
}

let youTubeApiPromise: Promise<YouTubeApi | null> | null = null

/**
 * Loads the YouTube IFrame API exactly once per page.
 *
 * Readiness is signalled by the global `window.onYouTubeIframeAPIReady` callback rather than
 * a script load event, so we chain onto any handler that was already installed.
 */
export function loadYouTubeApi(): Promise<YouTubeApi | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null)
  }
  if (youTubeApiPromise) return youTubeApiPromise

  youTubeApiPromise = new Promise<YouTubeApi | null>((resolve) => {
    const alreadyLoaded = getYouTubeApi()
    if (alreadyLoaded) {
      resolve(alreadyLoaded)
      return
    }

    let settled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const settle = (api: YouTubeApi | null) => {
      if (settled) return
      settled = true
      if (timeoutId !== null) clearTimeout(timeoutId)
      resolve(api)
    }

    const w = window as unknown as YouTubeWindow
    const previousReadyHandler = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => {
      if (typeof previousReadyHandler === 'function') {
        try {
          previousReadyHandler()
        } catch {
          // a foreign handler must not block our readiness
        }
      }
      settle(getYouTubeApi())
    }

    timeoutId = setTimeout(() => settle(null), SCRIPT_READY_TIMEOUT_MS)

    try {
      const script = document.createElement('script')
      script.src = YOUTUBE_API_SRC
      script.async = true
      script.onerror = () => settle(null)
      document.head.appendChild(script)
    } catch {
      settle(null)
    }
  })

  return youTubeApiPromise
}

/**
 * The extra query params the IFrame API needs, as a suffix to append to an embed URL that
 * already has a query string. Lets callers that build their own URL (different host, extra
 * params) opt into progress tracking without giving up control of the rest of the URL.
 */
export function youTubeJsApiParams(): string {
  const base = '&enablejsapi=1'
  if (typeof window === 'undefined' || !window.location?.origin) return base
  return `${base}&origin=${encodeURIComponent(window.location.origin)}`
}

/** Builds an embed URL with the params the IFrame API needs to talk to the player. */
export function buildYouTubeEmbedSrc(videoId: string): string {
  const base = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`
  if (typeof window === 'undefined' || !window.location?.origin) return base
  return `${base}&origin=${encodeURIComponent(window.location.origin)}`
}

export interface YouTubeProgressOptions {
  /** `id` of the already-rendered iframe element to attach to. */
  elementId: string
  /** Called with the true 0..1 fraction watched. Thresholds live in engagement.ts. */
  onProgress: (fraction: number) => void
  /**
   * Called whenever playback starts or stops. Lets callers hold back anything that would
   * cover the video (a prompt, an overlay) until the visitor is no longer watching.
   */
  onPlayingChange?: (playing: boolean) => void
  pollIntervalMs?: number
}

/**
 * Attaches a YouTube player to an existing iframe and reports watch progress.
 *
 * Polls only while the video is actually playing. Returns a teardown that is safe to call
 * before the API has finished loading, which is what keeps React 18 StrictMode's
 * double-invoked effects from creating two players on one iframe.
 */
export function observeYouTubeProgress(options: YouTubeProgressOptions): () => void {
  const { elementId, onProgress, onPlayingChange, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS } = options

  const reportPlaying = (playing: boolean) => {
    try {
      onPlayingChange?.(playing)
    } catch {
      // a caller's bookkeeping must never break playback observation
    }
  }

  let cancelled = false
  let player: YouTubePlayer | null = null
  let pollId: ReturnType<typeof setInterval> | null = null

  const stopPolling = () => {
    if (pollId !== null) {
      clearInterval(pollId)
      pollId = null
    }
  }

  const report = () => {
    if (!player) return
    try {
      const duration = player.getDuration()
      const currentTime = player.getCurrentTime()
      if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) return
      if (typeof currentTime !== 'number' || !Number.isFinite(currentTime)) return
      onProgress(currentTime / duration)
    } catch {
      // player not ready yet, or already destroyed
    }
  }

  loadYouTubeApi()
    .then((api) => {
      if (cancelled || !api) return
      const element = document.getElementById(elementId)
      if (!element) return

      try {
        player = new api.Player(element, {
          events: {
            onStateChange: (event) => {
              stopPolling()
              if (event.data === api.PlayerState.PLAYING) {
                reportPlaying(true)
                report()
                pollId = setInterval(report, pollIntervalMs)
              } else if (event.data === api.PlayerState.ENDED) {
                // Report progress before clearing the playing flag, so the completion this
                // records is delivered immediately rather than held back.
                onProgress(1)
                reportPlaying(false)
              } else {
                report()
                reportPlaying(false)
              }
            },
          },
        })
      } catch {
        player = null
      }
    })
    .catch(() => {
      // loadYouTubeApi never rejects; this is belt-and-braces only
    })

  return () => {
    cancelled = true
    stopPolling()
    reportPlaying(false)
    if (player) {
      try {
        player.destroy()
      } catch {
        // destroying a player whose iframe React already removed is expected
      }
      player = null
    }
  }
}

/* --------------------------------------------------------------- SoundCloud */

export interface SoundCloudProgressEvent {
  /** 0..1 fraction of the track played. */
  relativePosition: number
  currentPosition?: number
}

export interface SoundCloudWidget {
  bind: (eventName: string, listener: (event: SoundCloudProgressEvent) => void) => void
  unbind: (eventName: string) => void
}

export interface SoundCloudWidgetFactory {
  (iframe: HTMLIFrameElement | string): SoundCloudWidget
  Events: {
    PLAY_PROGRESS: string
    FINISH: string
  }
}

export interface SoundCloudApi {
  Widget: SoundCloudWidgetFactory
}

interface SoundCloudWindow {
  SC?: Partial<SoundCloudApi>
}

function getSoundCloudApi(): SoundCloudApi | null {
  if (typeof window === 'undefined') return null
  const sc = (window as unknown as SoundCloudWindow).SC
  if (!sc || typeof sc.Widget !== 'function' || !sc.Widget.Events) return null
  return sc as SoundCloudApi
}

let soundCloudApiPromise: Promise<SoundCloudApi | null> | null = null

/** Loads the SoundCloud Widget API exactly once per page. */
export function loadSoundCloudApi(): Promise<SoundCloudApi | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null)
  }
  if (soundCloudApiPromise) return soundCloudApiPromise

  soundCloudApiPromise = new Promise<SoundCloudApi | null>((resolve) => {
    const alreadyLoaded = getSoundCloudApi()
    if (alreadyLoaded) {
      resolve(alreadyLoaded)
      return
    }

    let settled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const settle = (api: SoundCloudApi | null) => {
      if (settled) return
      settled = true
      if (timeoutId !== null) clearTimeout(timeoutId)
      resolve(api)
    }

    timeoutId = setTimeout(() => settle(null), SCRIPT_READY_TIMEOUT_MS)

    try {
      const script = document.createElement('script')
      script.src = SOUNDCLOUD_API_SRC
      script.async = true
      script.onload = () => settle(getSoundCloudApi())
      script.onerror = () => settle(null)
      document.head.appendChild(script)
    } catch {
      settle(null)
    }
  })

  return soundCloudApiPromise
}

export interface SoundCloudProgressOptions {
  iframe: HTMLIFrameElement
  /** Called with the true 0..1 fraction played. Thresholds live in engagement.ts. */
  onProgress: (fraction: number) => void
}

/**
 * Binds PLAY_PROGRESS/FINISH on the SoundCloud widget inside `iframe`.
 * Returns a teardown that unbinds both events (and cancels an in-flight load).
 */
export function observeSoundCloudProgress(options: SoundCloudProgressOptions): () => void {
  const { iframe, onProgress } = options

  let cancelled = false
  let unbind: (() => void) | null = null

  loadSoundCloudApi()
    .then((api) => {
      if (cancelled || !api) return

      try {
        const widget = api.Widget(iframe)
        const events = api.Widget.Events

        widget.bind(events.PLAY_PROGRESS, (event) => {
          const fraction = event?.relativePosition
          if (typeof fraction !== 'number' || !Number.isFinite(fraction)) return
          onProgress(fraction)
        })
        widget.bind(events.FINISH, () => onProgress(1))

        unbind = () => {
          widget.unbind(events.PLAY_PROGRESS)
          widget.unbind(events.FINISH)
        }
      } catch {
        unbind = null
      }
    })
    .catch(() => {
      // loadSoundCloudApi never rejects; this is belt-and-braces only
    })

  return () => {
    cancelled = true
    if (unbind) {
      try {
        unbind()
      } catch {
        // widget already gone with its iframe
      }
      unbind = null
    }
  }
}
