import { useState, useEffect, useRef } from 'react'
import App from '../App'
import Watch from '../Watch'
import Connect from '../Connect'
import Mission from '../Mission'
import Listen from '../Listen'
import Welcome from '../Welcome'
import Video from '../Video'
import TopBar from '../components/TopBar'
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

  let page
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
      page = <Connect />
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
    default:
      page = <App />
  }

  return <><TopBar />{page}</>
}
