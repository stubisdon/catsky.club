import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SoundCloudProgressEvent, YouTubePlayerOptions, YouTubePlayerStateEvent } from './playerApis'

const YOUTUBE_SRC = 'https://www.youtube.com/iframe_api'
const SOUNDCLOUD_SRC = 'https://w.soundcloud.com/player/api.js'

interface TestWindow {
  YT?: unknown
  SC?: unknown
  onYouTubeIframeAPIReady?: () => void
}

const testWindow = window as unknown as TestWindow

let appended: HTMLScriptElement[] = []

function scriptsFor(src: string): HTMLScriptElement[] {
  return appended.filter((el) => el.src === src)
}

async function loadModule() {
  return import('./playerApis')
}

/** Minimal stand-in for the YT global, shaped like the bits playerApis touches. */
function stubYouTubeGlobal(options: {
  onCreate?: (element: HTMLElement | string, opts: YouTubePlayerOptions) => void
  currentTime?: number
  duration?: number
  destroy?: () => void
} = {}) {
  class FakePlayer {
    constructor(element: HTMLElement | string, opts: YouTubePlayerOptions) {
      options.onCreate?.(element, opts)
    }
    getCurrentTime() {
      return options.currentTime ?? 0
    }
    getDuration() {
      return options.duration ?? 0
    }
    destroy() {
      options.destroy?.()
    }
  }

  const api = {
    Player: FakePlayer,
    PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
  }
  testWindow.YT = api
  return api
}

describe('playerApis', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    appended = []
    document.body.innerHTML = ''
    delete testWindow.YT
    delete testWindow.SC
    delete testWindow.onYouTubeIframeAPIReady

    vi.spyOn(document.head, 'appendChild').mockImplementation(<T extends Node>(node: T): T => {
      appended.push(node as unknown as HTMLScriptElement)
      return node
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    delete testWindow.YT
    delete testWindow.SC
    delete testWindow.onYouTubeIframeAPIReady
  })

  describe('loadYouTubeApi', () => {
    it('injects the script exactly once and reuses the same promise', async () => {
      const { loadYouTubeApi } = await loadModule()

      const first = loadYouTubeApi()
      const second = loadYouTubeApi()

      expect(first).toBe(second)
      expect(scriptsFor(YOUTUBE_SRC)).toHaveLength(1)

      stubYouTubeGlobal()
      testWindow.onYouTubeIframeAPIReady?.()

      await expect(first).resolves.toBe(testWindow.YT)
      expect(scriptsFor(YOUTUBE_SRC)).toHaveLength(1)
    })

    it('resolves with the API once onYouTubeIframeAPIReady fires', async () => {
      const { loadYouTubeApi } = await loadModule()

      const promise = loadYouTubeApi()
      const api = stubYouTubeGlobal()
      testWindow.onYouTubeIframeAPIReady?.()

      await expect(promise).resolves.toBe(api)
    })

    it('still calls a pre-existing onYouTubeIframeAPIReady handler', async () => {
      const existing = vi.fn()
      testWindow.onYouTubeIframeAPIReady = existing

      const { loadYouTubeApi } = await loadModule()
      const promise = loadYouTubeApi()

      stubYouTubeGlobal()
      testWindow.onYouTubeIframeAPIReady?.()

      await expect(promise).resolves.not.toBeNull()
      expect(existing).toHaveBeenCalledTimes(1)
    })

    it('resolves null when the script fails to load', async () => {
      const { loadYouTubeApi } = await loadModule()

      const promise = loadYouTubeApi()
      scriptsFor(YOUTUBE_SRC)[0].dispatchEvent(new Event('error'))

      await expect(promise).resolves.toBeNull()
    })

    it('resolves null when the API never becomes ready', async () => {
      vi.useFakeTimers()
      const { loadYouTubeApi } = await loadModule()

      const promise = loadYouTubeApi()
      await vi.advanceTimersByTimeAsync(10_000)

      await expect(promise).resolves.toBeNull()
    })

    it('resolves null when the ready callback fires without a usable YT global', async () => {
      const { loadYouTubeApi } = await loadModule()

      const promise = loadYouTubeApi()
      testWindow.YT = {}
      testWindow.onYouTubeIframeAPIReady?.()

      await expect(promise).resolves.toBeNull()
    })
  })

  describe('loadSoundCloudApi', () => {
    it('injects the script exactly once and reuses the same promise', async () => {
      const { loadSoundCloudApi } = await loadModule()

      const first = loadSoundCloudApi()
      const second = loadSoundCloudApi()

      expect(first).toBe(second)
      expect(scriptsFor(SOUNDCLOUD_SRC)).toHaveLength(1)
    })

    it('resolves with the API after the script loads', async () => {
      const { loadSoundCloudApi } = await loadModule()

      const promise = loadSoundCloudApi()
      const widgetFactory = Object.assign(vi.fn(), { Events: { PLAY_PROGRESS: 'playProgress', FINISH: 'finish' } })
      testWindow.SC = { Widget: widgetFactory }
      scriptsFor(SOUNDCLOUD_SRC)[0].dispatchEvent(new Event('load'))

      await expect(promise).resolves.toBe(testWindow.SC)
    })

    it('resolves null when the script fails to load', async () => {
      const { loadSoundCloudApi } = await loadModule()

      const promise = loadSoundCloudApi()
      scriptsFor(SOUNDCLOUD_SRC)[0].dispatchEvent(new Event('error'))

      await expect(promise).resolves.toBeNull()
    })

    it('resolves null when the API never becomes ready', async () => {
      vi.useFakeTimers()
      const { loadSoundCloudApi } = await loadModule()

      const promise = loadSoundCloudApi()
      await vi.advanceTimersByTimeAsync(10_000)

      await expect(promise).resolves.toBeNull()
    })
  })

  describe('buildYouTubeEmbedSrc', () => {
    it('adds enablejsapi and the current origin', async () => {
      const { buildYouTubeEmbedSrc } = await loadModule()

      const src = buildYouTubeEmbedSrc('abc123')

      expect(src).toContain('https://www.youtube.com/embed/abc123')
      expect(src).toContain('enablejsapi=1')
      expect(src).toContain(`origin=${encodeURIComponent(window.location.origin)}`)
    })
  })

  describe('observeYouTubeProgress', () => {
    it('polls while playing, reports 1 on ENDED, and destroys on teardown', async () => {
      vi.useFakeTimers()
      document.body.innerHTML = '<iframe id="player"></iframe>'

      let stateChange: ((event: YouTubePlayerStateEvent) => void) | undefined
      const destroy = vi.fn()
      stubYouTubeGlobal({
        currentTime: 30,
        duration: 60,
        destroy,
        onCreate: (_element, opts) => {
          stateChange = opts.events?.onStateChange
        },
      })

      const { observeYouTubeProgress } = await loadModule()
      const onProgress = vi.fn()
      const teardown = observeYouTubeProgress({ elementId: 'player', onProgress, pollIntervalMs: 1000 })

      await vi.advanceTimersByTimeAsync(0)
      expect(stateChange).toBeTypeOf('function')

      stateChange?.({ data: 1 }) // PLAYING -> immediate report + polling
      expect(onProgress).toHaveBeenLastCalledWith(0.5)

      await vi.advanceTimersByTimeAsync(2000)
      expect(onProgress).toHaveBeenCalledTimes(3)

      stateChange?.({ data: 0 }) // ENDED -> stops polling and reports completion
      expect(onProgress).toHaveBeenLastCalledWith(1)

      await vi.advanceTimersByTimeAsync(5000)
      expect(onProgress).toHaveBeenCalledTimes(4)

      teardown()
      expect(destroy).toHaveBeenCalledTimes(1)
    })

    it('never reports when duration is zero', async () => {
      vi.useFakeTimers()
      document.body.innerHTML = '<iframe id="player"></iframe>'

      let stateChange: ((event: YouTubePlayerStateEvent) => void) | undefined
      stubYouTubeGlobal({
        currentTime: 10,
        duration: 0,
        onCreate: (_element, opts) => {
          stateChange = opts.events?.onStateChange
        },
      })

      const { observeYouTubeProgress } = await loadModule()
      const onProgress = vi.fn()
      const teardown = observeYouTubeProgress({ elementId: 'player', onProgress })

      await vi.advanceTimersByTimeAsync(0)
      stateChange?.({ data: 1 })
      await vi.advanceTimersByTimeAsync(3000)

      expect(onProgress).not.toHaveBeenCalled()
      teardown()
    })

    it('does not create a player when the API is unavailable', async () => {
      vi.useFakeTimers()
      document.body.innerHTML = '<iframe id="player"></iframe>'

      const { observeYouTubeProgress } = await loadModule()
      const onProgress = vi.fn()
      const teardown = observeYouTubeProgress({ elementId: 'player', onProgress })

      await vi.advanceTimersByTimeAsync(10_000)

      expect(onProgress).not.toHaveBeenCalled()
      expect(() => teardown()).not.toThrow()
    })
  })

  describe('observeSoundCloudProgress', () => {
    it('reports relativePosition on PLAY_PROGRESS, 1 on FINISH, and unbinds on teardown', async () => {
      const listeners = new Map<string, (event: SoundCloudProgressEvent) => void>()
      const bind = vi.fn((name: string, cb: (event: SoundCloudProgressEvent) => void) => {
        listeners.set(name, cb)
      })
      const unbind = vi.fn()
      const widgetFactory = Object.assign(vi.fn(() => ({ bind, unbind })), {
        Events: { PLAY_PROGRESS: 'playProgress', FINISH: 'finish' },
      })
      testWindow.SC = { Widget: widgetFactory }

      const { observeSoundCloudProgress } = await loadModule()
      const iframe = document.createElement('iframe')
      const onProgress = vi.fn()
      const teardown = observeSoundCloudProgress({ iframe, onProgress })

      await Promise.resolve()
      await Promise.resolve()

      expect(widgetFactory).toHaveBeenCalledWith(iframe)

      listeners.get('playProgress')?.({ relativePosition: 0.42 })
      expect(onProgress).toHaveBeenLastCalledWith(0.42)

      listeners.get('finish')?.({ relativePosition: 0 })
      expect(onProgress).toHaveBeenLastCalledWith(1)

      teardown()
      expect(unbind).toHaveBeenCalledTimes(2)
    })

    it('is a safe no-op when the widget API is blocked', async () => {
      vi.useFakeTimers()
      const { observeSoundCloudProgress } = await loadModule()
      const iframe = document.createElement('iframe')
      const onProgress = vi.fn()

      const teardown = observeSoundCloudProgress({ iframe, onProgress })
      await vi.advanceTimersByTimeAsync(10_000)

      expect(onProgress).not.toHaveBeenCalled()
      expect(() => teardown()).not.toThrow()
    })
  })
})

describe('youTubeJsApiParams', () => {
  it('appends enablejsapi and the current origin as query suffix params', async () => {
    const { youTubeJsApiParams } = await import('./playerApis')
    const params = youTubeJsApiParams()
    expect(params.startsWith('&enablejsapi=1')).toBe(true)
    expect(params).toContain('origin=')
  })
})
