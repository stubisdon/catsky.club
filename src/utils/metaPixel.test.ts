import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { META_PIXEL_ID, loadMetaPixel, resetMetaPixelForTests, trackPixel } from './metaPixel'

const PIXEL_SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js'

describe('metaPixel', () => {
  beforeEach(() => {
    resetMetaPixelForTests()
  })

  afterEach(() => {
    resetMetaPixelForTests()
  })

  it('injects the pixel script exactly once, even when called repeatedly', () => {
    loadMetaPixel()
    loadMetaPixel()
    loadMetaPixel()

    expect(document.querySelectorAll(`script[src="${PIXEL_SCRIPT_SRC}"]`)).toHaveLength(1)
    expect(window.fbq).toBeDefined()
  })

  it('sets disablePushState and allowDuplicatePageViews so SPA route changes do not auto-fire PageViews', () => {
    loadMetaPixel()

    expect(window.fbq?.disablePushState).toBe(true)
    expect(window.fbq?.allowDuplicatePageViews).toBe(true)
  })

  it('calls set(autoConfig) and init exactly once regardless of repeated calls', () => {
    loadMetaPixel()
    loadMetaPixel()

    const queue = window.fbq?.queue ?? []
    const initCalls = queue.filter((args) => args[0] === 'init')
    const autoConfigCalls = queue.filter((args) => args[0] === 'set' && args[1] === 'autoConfig')

    expect(initCalls).toEqual([['init', META_PIXEL_ID]])
    expect(autoConfigCalls).toEqual([['set', 'autoConfig', false, META_PIXEL_ID]])
  })

  it('trackPixel never throws when the pixel has not loaded', () => {
    expect(() => trackPixel('PageView')).not.toThrow()
  })

  it('trackPixel forwards the event and params to fbq without throwing', () => {
    loadMetaPixel()

    expect(() =>
      trackPixel('ViewContent', { content_name: 'catsky-sugar-daddy', content_type: 'spotify' }),
    ).not.toThrow()

    const queue = window.fbq?.queue ?? []
    expect(queue).toContainEqual([
      'track',
      'ViewContent',
      { content_name: 'catsky-sugar-daddy', content_type: 'spotify' },
    ])
  })
})
