import { useState, useEffect, useRef } from 'react'
import App from '../App'
import Watch from '../Watch'
import Connect from '../Connect'
import Mission from '../Mission'
import Listen from '../Listen'
import Welcome from '../Welcome'
import Video from '../Video'
import Read from '../Read'
import ReadPost from '../ReadPost'
import { TopNav } from '../components'
import { trackPageView } from '../utils/analytics'
import { clearAuthCallback, readAuthCallback, type AuthCallback } from '../utils/authCallback'
import { resolveView, type View } from './resolveView'
import { getCurrentMember } from '../utils'

const SIGNUP_MEMBER_TIMEOUT_MS = 2500

export default function Router() {
  const initialCallbackRef = useRef<AuthCallback | null | undefined>(undefined)
  if (initialCallbackRef.current === undefined) {
    initialCallbackRef.current = readAuthCallback(window.location.search)
  }
  const initialCallback = initialCallbackRef.current
  const initialResolved =
    initialCallback?.action === 'signup' && initialCallback.success
      ? null
      : resolveView(window.location.pathname, window.location.search, initialCallback)
  const [view, setView] = useState<View | null>(() => initialResolved?.view ?? null)
  const [slug, setSlug] = useState<string | undefined>(() => initialResolved?.slug)
  const [failedAuthCallback, setFailedAuthCallback] = useState<AuthCallback | null>(() =>
    initialCallback?.success === false ? initialCallback : null,
  )
  const lastTrackedUrl = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const applyResolvedView = (
      nextView: View,
      normalizedPath: string | undefined,
      callback: AuthCallback | null,
      nextSlug?: string,
    ) => {
      if (cancelled) return
      let normalized = false
      if (normalizedPath) {
        const currentPath = `${window.location.pathname}${window.location.search}`
        if (normalizedPath !== currentPath) {
          window.history.replaceState({}, '', `${normalizedPath}${window.location.hash}`)
          normalized = true
        }
      }
      if (callback) {
        clearAuthCallback()
      }
      setFailedAuthCallback(callback?.success === false ? callback : null)
      setView(nextView)
      setSlug(nextSlug)

      const path = window.location.pathname
      const search = window.location.search
      const urlKey = `${path}${search}`
      if (lastTrackedUrl.current !== urlKey) {
        lastTrackedUrl.current = urlKey
        trackPageView({
          path,
          search_present: search.length > 0,
          hash_present: window.location.hash.length > 0,
          view: nextView,
          normalized,
        })
      }
    }

    let isInitialLocation = true
    const handleLocationChange = () => {
      const callback = isInitialLocation
        ? initialCallbackRef.current ?? null
        : readAuthCallback(window.location.search)
      isInitialLocation = false
      if (callback?.action === 'signup' && callback.success) {
        setView(null)
        const memberName = awaitMemberNameForSignup()
        void memberName.then((name) => {
          const { view: nextView, normalizedPath, slug: nextSlug } = resolveView(
            window.location.pathname,
            window.location.search,
            callback,
            name,
          )
          applyResolvedView(nextView, normalizedPath, callback, nextSlug)
        })
        return
      }

      const { view: nextView, normalizedPath, slug: nextSlug } = resolveView(
        window.location.pathname,
        window.location.search,
        callback,
      )
      applyResolvedView(nextView, normalizedPath, callback, nextSlug)
    }
    
    window.addEventListener('popstate', handleLocationChange)
    handleLocationChange()

    return () => {
      cancelled = true
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [])

  let page
  if (view === null) {
    page = <div className="app-container" role="status">connecting…</div>
  } else {
    switch (view) {
      case 'home':
        page = <App />
        break
      case 'watch':
        page = <Watch />
        break
      case 'video':
        page = <Video />
        break
      case 'connect':
        page = <Connect failedAuthCallback={failedAuthCallback} />
        break
      case 'listen':
        page = <Listen />
        break
      case 'mission':
        page = <Mission />
        break
      case 'welcome':
        page = <Welcome />
        break
      case 'read':
        page = <Read />
        break
      case 'readPost':
        page = slug ? <ReadPost slug={slug} /> : <Read />
        break
      default:
        page = <App />
    }
  }

  return (
    <>
      <TopNav currentView={view} />
      {page}
      {/* Grain and plate edge, printed over every route. Purely decorative and click-through. */}
      <div className="paper-surface" aria-hidden="true" />
    </>
  )
}

function awaitMemberNameForSignup(): Promise<string | null | undefined> {
  let timeoutId: number | undefined
  const memberRequest = Promise.resolve()
    .then(() => getCurrentMember())
    .then((member) => member?.name)
    .catch(() => undefined)
  const timeout = new Promise<undefined>((resolve) => {
    timeoutId = window.setTimeout(resolve, SIGNUP_MEMBER_TIMEOUT_MS)
  })

  return Promise.race([memberRequest, timeout]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  })
}
