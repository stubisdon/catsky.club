import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const analyticsMocks = vi.hoisted(() => ({
  trackEvent: vi.fn(),
}))

vi.mock('./analytics', () => ({
  trackEvent: analyticsMocks.trackEvent,
}))

const STORAGE_KEY = 'catsky_engagement'

function setVisibility(value: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    value,
    configurable: true,
  })
}

function dispatchVisibilityChange() {
  document.dispatchEvent(new Event('visibilitychange'))
}

async function loadEngagement() {
  return import('./engagement')
}

describe('engagement', () => {
  let cleanup: (() => void) | null = null

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    localStorage.clear()
    setVisibility('visible')
    cleanup = null
  })

  afterEach(() => {
    cleanup?.()
    cleanup = null
    vi.useRealTimers()
    setVisibility('visible')
  })

  it('accumulates active time only while visible and focused, and fires at the threshold', async () => {
    vi.useFakeTimers()
    const engagement = await loadEngagement()
    const fired = vi.fn()
    engagement.onEngagementTrigger(fired)
    cleanup = engagement.initEngagementTracking()

    // Go hidden immediately, advance well past the threshold: must not fire.
    setVisibility('hidden')
    dispatchVisibilityChange()
    await vi.advanceTimersByTimeAsync(ACTIVE_TIME_THRESHOLD(engagement) + 60_000)
    expect(fired).not.toHaveBeenCalledWith('active_time')

    // Also blur while visible: must still not accumulate.
    setVisibility('visible')
    dispatchVisibilityChange()
    window.dispatchEvent(new Event('blur'))
    await vi.advanceTimersByTimeAsync(ACTIVE_TIME_THRESHOLD(engagement) + 60_000)
    expect(fired).not.toHaveBeenCalledWith('active_time')

    // Now become visible AND focused: time should accumulate and cross the threshold.
    window.dispatchEvent(new Event('focus'))
    await vi.advanceTimersByTimeAsync(engagement.ACTIVE_TIME_THRESHOLD_MS + 1000)

    expect(fired).toHaveBeenCalledWith('active_time')
    expect(analyticsMocks.trackEvent).toHaveBeenCalledWith('engagement_trigger_fired', { trigger: 'active_time' })
  })

  it('fires active_time exactly once even as time keeps advancing', async () => {
    vi.useFakeTimers()
    const engagement = await loadEngagement()
    const fired = vi.fn()
    engagement.onEngagementTrigger(fired)
    cleanup = engagement.initEngagementTracking()

    await vi.advanceTimersByTimeAsync(engagement.ACTIVE_TIME_THRESHOLD_MS + 1000)
    await vi.advanceTimersByTimeAsync(engagement.ACTIVE_TIME_THRESHOLD_MS * 2)

    const activeTimeCalls = fired.mock.calls.filter((call) => call[0] === 'active_time')
    expect(activeTimeCalls).toHaveLength(1)
    expect(analyticsMocks.trackEvent).toHaveBeenCalledTimes(1)
  })

  it('fires songs_listened once three distinct tracks reach 50%, not for two tracks', async () => {
    const engagement = await loadEngagement()
    const fired = vi.fn()
    engagement.onEngagementTrigger(fired)

    engagement.recordSongProgress('a', 0.5)
    engagement.recordSongProgress('b', 0.5)
    expect(fired).not.toHaveBeenCalledWith('songs_listened')

    engagement.recordSongProgress('c', 0.5)
    expect(fired).toHaveBeenCalledWith('songs_listened')
    expect(analyticsMocks.trackEvent).toHaveBeenCalledWith('engagement_trigger_fired', { trigger: 'songs_listened' })
  })

  it('does not count the same track twice toward songs_listened', async () => {
    const engagement = await loadEngagement()
    const fired = vi.fn()
    engagement.onEngagementTrigger(fired)

    engagement.recordSongProgress('a', 0.5)
    engagement.recordSongProgress('a', 0.6)
    engagement.recordSongProgress('a', 0.9)

    expect(engagement.getEngagementState().songs).toEqual(['a'])
    expect(fired).not.toHaveBeenCalledWith('songs_listened')
  })

  it('treats 49% as not-listened and 50% as listened for song progress', async () => {
    const engagement = await loadEngagement()

    engagement.recordSongProgress('a', 0.49)
    expect(engagement.getEngagementState().songs).toEqual([])

    engagement.recordSongProgress('a', 0.5)
    expect(engagement.getEngagementState().songs).toEqual(['a'])
  })

  it('treats 89% as not-completed and 90% as completed for video progress', async () => {
    const engagement = await loadEngagement()
    const fired = vi.fn()
    engagement.onEngagementTrigger(fired)

    engagement.recordVideoProgress('v1', 0.89)
    expect(fired).not.toHaveBeenCalledWith('video_completed')

    engagement.recordVideoProgress('v1', 0.9)
    expect(fired).toHaveBeenCalledWith('video_completed')
  })

  it('does not re-emit video_completed for a second completed video', async () => {
    const engagement = await loadEngagement()
    const fired = vi.fn()
    engagement.onEngagementTrigger(fired)

    engagement.recordVideoProgress('v1', 0.95)
    engagement.recordVideoProgress('v2', 0.95)

    const videoCompletedCalls = fired.mock.calls.filter((call) => call[0] === 'video_completed')
    expect(videoCompletedCalls).toHaveLength(1)
  })

  it('restores songs, videos and active time from localStorage on reload', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeMs: 12_345, songs: ['x', 'y'], videos: ['z'], fired: [] }),
    )
    const engagement = await loadEngagement()

    expect(engagement.getEngagementState()).toEqual({
      activeMs: 12_345,
      songs: ['x', 'y'],
      videos: ['z'],
    })
  })

  it('does not replay a trigger already present in the persisted fired list', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeMs: 0,
        songs: ['a', 'b', 'c'],
        videos: [],
        fired: ['songs_listened'],
      }),
    )
    const engagement = await loadEngagement()
    const fired = vi.fn()
    engagement.onEngagementTrigger(fired)

    // Re-recording an already-listened track must not replay the already-fired trigger.
    engagement.recordSongProgress('a', 0.6)

    expect(fired).not.toHaveBeenCalled()
    expect(analyticsMocks.trackEvent).not.toHaveBeenCalled()
  })

  it('onEngagementTrigger returns a working unsubscribe function', async () => {
    const engagement = await loadEngagement()
    const fired = vi.fn()
    const unsubscribe = engagement.onEngagementTrigger(fired)

    unsubscribe()
    engagement.recordVideoProgress('v1', 1)

    expect(fired).not.toHaveBeenCalled()
  })

  it('is idempotent: calling initEngagementTracking twice does not double-count active time', async () => {
    vi.useFakeTimers()
    const engagement = await loadEngagement()

    const teardown1 = engagement.initEngagementTracking()
    const teardown2 = engagement.initEngagementTracking()
    cleanup = teardown1

    await vi.advanceTimersByTimeAsync(10_000)

    const { activeMs } = engagement.getEngagementState()
    expect(activeMs).toBeGreaterThanOrEqual(10_000)
    expect(activeMs).toBeLessThan(11_000)

    teardown2()
  })

  it('a throwing subscriber does not prevent other subscribers from being called', async () => {
    const engagement = await loadEngagement()
    const throwing = vi.fn(() => {
      throw new Error('boom')
    })
    const healthy = vi.fn()
    engagement.onEngagementTrigger(throwing)
    engagement.onEngagementTrigger(healthy)

    expect(() => engagement.recordVideoProgress('v1', 1)).not.toThrow()
    expect(throwing).toHaveBeenCalledWith('video_completed')
    expect(healthy).toHaveBeenCalledWith('video_completed')
  })

  it('treats corrupt JSON in localStorage as empty state without throwing', async () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json')
    const engagement = await loadEngagement()

    expect(() => engagement.getEngagementState()).not.toThrow()
    expect(engagement.getEngagementState()).toEqual({ activeMs: 0, songs: [], videos: [] })
  })

  it('sends only the trigger name to analytics, with no track or video ids', async () => {
    const engagement = await loadEngagement()

    engagement.recordSongProgress('secret-track-id', 0.5)
    engagement.recordSongProgress('another-secret', 0.5)
    engagement.recordSongProgress('third-secret', 0.5)
    engagement.recordVideoProgress('secret-video-id', 1)

    for (const call of analyticsMocks.trackEvent.mock.calls) {
      expect(call[0]).toBe('engagement_trigger_fired')
      expect(Object.keys(call[1] as object)).toEqual(['trigger'])
      const serialized = JSON.stringify(call[1])
      expect(serialized).not.toContain('secret-track-id')
      expect(serialized).not.toContain('another-secret')
      expect(serialized).not.toContain('third-secret')
      expect(serialized).not.toContain('secret-video-id')
    }
    expect(analyticsMocks.trackEvent).toHaveBeenCalledTimes(2)
  })
})

// Small helper so the first test can reference the threshold constant
// before it destructures the dynamically-imported module.
function ACTIVE_TIME_THRESHOLD(engagement: { ACTIVE_TIME_THRESHOLD_MS: number }) {
  return engagement.ACTIVE_TIME_THRESHOLD_MS
}

describe('never interrupting a video', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('holds a trigger that fires while a video is playing, and releases it when playback stops', async () => {
    const engagement = await loadEngagement()
    const fired = vi.fn()
    engagement.onEngagementTrigger(fired)

    engagement.setVideoPlaying(true)
    engagement.recordSongProgress('a', 1)
    engagement.recordSongProgress('b', 1)
    engagement.recordSongProgress('c', 1)

    // Threshold crossed, but the visitor is mid-video: nothing may be delivered yet.
    expect(fired).not.toHaveBeenCalled()

    engagement.setVideoPlaying(false)
    expect(fired).toHaveBeenCalledWith('songs_listened')
  })

  it('delivers a video completion immediately rather than holding it', async () => {
    const engagement = await loadEngagement()
    const fired = vi.fn()
    engagement.onEngagementTrigger(fired)

    engagement.setVideoPlaying(true)
    // A player reports the final progress before clearing the playing flag, mirroring
    // observeYouTubeProgress's ENDED branch.
    engagement.recordVideoProgress('v1', 1)
    engagement.setVideoPlaying(false)

    expect(fired).toHaveBeenCalledWith('video_completed')
    expect(fired).toHaveBeenCalledTimes(1)
  })

  it('holds only the first trigger and never replays it twice', async () => {
    const engagement = await loadEngagement()
    const fired = vi.fn()
    engagement.onEngagementTrigger(fired)

    engagement.setVideoPlaying(true)
    engagement.recordSongProgress('a', 1)
    engagement.recordSongProgress('b', 1)
    engagement.recordSongProgress('c', 1)
    engagement.recordVideoProgress('v1', 1)

    engagement.setVideoPlaying(false)
    expect(fired).toHaveBeenCalledTimes(1)

    engagement.setVideoPlaying(true)
    engagement.setVideoPlaying(false)
    expect(fired).toHaveBeenCalledTimes(1)
  })

  it('is unaffected when no video is playing', async () => {
    const engagement = await loadEngagement()
    const fired = vi.fn()
    engagement.onEngagementTrigger(fired)

    engagement.recordVideoProgress('v1', 1)
    expect(fired).toHaveBeenCalledWith('video_completed')
  })
})
