/**
 * Meta (Facebook) Pixel — page-scoped to /sugar-daddy only. Nothing else in the app should
 * import this module. Installs the standard fbq snippet, disables its automatic SPA PageView
 * tracking (this app owns pageview timing), then explicitly inits the pixel.
 *
 * Never pass email addresses or other PII into trackPixel — same privacy boundary as
 * src/utils/analytics.ts.
 */

export type FbqFunction = {
  (...args: unknown[]): void
  callMethod?: (...args: unknown[]) => void
  queue: unknown[][]
  push: FbqFunction
  loaded: boolean
  version: string
  disablePushState?: boolean
  allowDuplicatePageViews?: boolean
}

declare global {
  interface Window {
    fbq?: FbqFunction
    _fbq?: FbqFunction
  }
}

export const META_PIXEL_ID = '2002922203259027'

const PIXEL_SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js'

let installed = false

function createFbqStub(): FbqFunction {
  const stub: FbqFunction = ((...args: unknown[]) => {
    if (stub.callMethod) {
      stub.callMethod(...args)
    } else {
      stub.queue.push(args)
    }
  }) as FbqFunction
  stub.queue = []
  stub.loaded = true
  stub.version = '2.0'
  stub.push = stub
  return stub
}

function injectPixelScript(): void {
  const script = document.createElement('script')
  script.async = true
  script.src = PIXEL_SCRIPT_SRC
  const firstScript = document.getElementsByTagName('script')[0]
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript)
  } else {
    document.head.appendChild(script)
  }
}

/**
 * Installs the Meta Pixel stub + loader script and initializes it. Idempotent: safe to call
 * multiple times (e.g. React StrictMode double-invoked effects); only the first call has any
 * effect for the lifetime of the page.
 */
export function loadMetaPixel(): void {
  if (typeof window === 'undefined' || installed) return
  installed = true

  if (!window.fbq) {
    const fbq = createFbqStub()
    window.fbq = fbq
    window._fbq = fbq
    injectPixelScript()
  }

  const fbq = window.fbq
  if (!fbq) return

  // Must be set before init/track calls so the pixel does not auto-fire PageViews on SPA
  // (pushState-based) route changes — this app fires PageView explicitly per page mount.
  fbq.disablePushState = true
  fbq.allowDuplicatePageViews = true

  fbq('set', 'autoConfig', false, META_PIXEL_ID)
  fbq('init', META_PIXEL_ID)
}

/** Fires a Meta Pixel event. Never throws; no-op if the pixel hasn't been loaded. Never pass PII. */
export function trackPixel(event: string, params?: Record<string, unknown>): void {
  try {
    window.fbq?.('track', event, params)
  } catch {
    // pixel must never break the product
  }
}

/** Test-only: undoes loadMetaPixel() so each test starts from a clean slate. */
export function resetMetaPixelForTests(): void {
  installed = false
  if (typeof window === 'undefined') return
  delete window.fbq
  delete window._fbq
  document.querySelectorAll(`script[src="${PIXEL_SCRIPT_SRC}"]`).forEach((node) => node.remove())
}
