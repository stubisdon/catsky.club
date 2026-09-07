import { useEffect, useRef, type JSX } from 'react'
import { TURNSTILE_SITE_KEY } from '../utils/magicLink'

// Re-exported so callers can keep importing the key alongside the widget.
// eslint-disable-next-line react-refresh/only-export-components -- config constant re-export, not a component
export { TURNSTILE_SITE_KEY }

export interface TurnstileWidgetProps {
  onToken: (token: string | null) => void
  className?: string
  // Bump this number to reset the widget (e.g. after a failed submit — Turnstile tokens are
  // single-use). Changing the value triggers a reset and emits onToken(null).
  resetSignal?: number
  theme?: 'dark' | 'light'
}

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id?: string) => void
  remove: (id?: string) => void
}

type TurnstileWindow = Window & { turnstile?: TurnstileApi }

let turnstileScriptPromise: Promise<void> | null = null
function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if ((window as TurnstileWindow).turnstile) return Promise.resolve()
  if (turnstileScriptPromise) return turnstileScriptPromise
  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Turnstile'))
    document.head.appendChild(script)
  })
  return turnstileScriptPromise
}

function getTurnstile(): TurnstileApi | null {
  return (window as TurnstileWindow).turnstile ?? null
}

export function TurnstileWidget({
  onToken,
  className,
  resetSignal,
  theme = 'dark',
}: TurnstileWidgetProps): JSX.Element | null {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  // Render (or tear down) the widget while this component is mounted.
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    let cancelled = false
    loadTurnstileScript()
      .then(() => {
        if (cancelled) return
        const turnstile = getTurnstile()
        const container = containerRef.current
        if (!turnstile || !container || widgetIdRef.current) return
        try {
          widgetIdRef.current = turnstile.render(container, {
            sitekey: TURNSTILE_SITE_KEY,
            theme,
            callback: (token: string) => onTokenRef.current(token),
            'expired-callback': () => onTokenRef.current(null),
            'error-callback': () => onTokenRef.current(null),
          })
        } catch {
          // Turnstile must never throw into React.
        }
      })
      .catch(() => {
        // Widget failed to load; server-side siteverify still enforces if configured.
      })

    return () => {
      cancelled = true
      const turnstile = getTurnstile()
      if (turnstile && widgetIdRef.current) {
        try {
          turnstile.remove(widgetIdRef.current)
        } catch {
          // ignore
        }
        widgetIdRef.current = null
      }
    }
  }, [theme])

  // Reset the widget (and its token) whenever the caller bumps resetSignal, e.g. after a
  // failed submit. Skip the initial mount — that isn't a "change".
  const isFirstResetRef = useRef(true)
  useEffect(() => {
    if (resetSignal === undefined) return
    if (isFirstResetRef.current) {
      isFirstResetRef.current = false
      return
    }
    const turnstile = getTurnstile()
    if (turnstile && widgetIdRef.current) {
      try {
        turnstile.reset(widgetIdRef.current)
      } catch {
        // ignore
      }
    }
    onTokenRef.current(null)
  }, [resetSignal])

  if (!TURNSTILE_SITE_KEY) return null

  return <div ref={containerRef} className={className ?? 'catsky-turnstile'} />
}
