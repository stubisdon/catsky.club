import { useState, useEffect, useRef } from 'react'
import App from '../App'
import Watch from '../Watch'
import Connect from '../Connect'
import Mission from '../Mission'
import Listen from '../Listen'
import Welcome from '../Welcome'
import Video from '../Video'
import Subscribe from '../Subscribe'
import { EmailCaptureModal } from '../components/EmailCaptureModal'
import { trackPageView } from '../utils/analytics'
import { clearAuthCallback, readAuthCallback, type AuthCallback } from '../utils/authCallback'
import { resolveView, type View } from './resolveView'

export default function Router() {
  const [view, setView] = useState<View>(() => resolveView(
    window.location.pathname,
    window.location.search,
    readAuthCallback(window.location.search),
  ).view)
  const lastTrackedUrl = useRef<string | null>(null)

  useEffect(() => {
    const handleLocationChange = () => {
      const callback: AuthCallback | null = readAuthCallback(window.location.search)
      const { view: nextView, normalizedPath } = resolveView(
        window.location.pathname,
        window.location.search,
        callback,
      )
      let normalized = false
      if (normalizedPath) {
        const currentPath = `${window.location.pathname}${window.location.search}`
        if (normalizedPath !== currentPath) {
          window.history.replaceState({}, '', `${normalizedPath}${window.location.hash}`)
          normalized = true
        }
      }
      if (callback?.action === 'signup' || (callback?.action === 'signin' && nextView !== 'connect')) {
        clearAuthCallback()
      }
      setView(nextView)

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
    
    window.addEventListener('popstate', handleLocationChange)
    handleLocationChange()
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [])

  const page = renderView(view)

  // The capture modal is mounted once, here, so it survives every in-app navigation and can
  // watch engagement across views. It is pointless (and pushy) on the views that already ask
  // for an email or are mid-signup, so those render the page alone.
  if (VIEWS_WITHOUT_EMAIL_CAPTURE.has(view)) return page

  return (
    <>
      {page}
      <EmailCaptureModal />
    </>
  )
}

const VIEWS_WITHOUT_EMAIL_CAPTURE = new Set<View>(['subscribe', 'welcome', 'connect'])

function renderView(view: View) {
  switch (view) {
    case 'home':
      return <App />
    case 'watch':
      return <Watch />
    case 'video':
      return <Video />
    case 'connect':
      return <Connect />
    case 'listen':
      return <Listen />
    case 'mission':
      return <Mission />
    case 'welcome':
      return <Welcome />
    case 'subscribe':
      return <Subscribe />
    default:
      return <App />
  }
}
