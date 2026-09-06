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
import { trackPageView } from '../utils/analytics'
import { clearAuthCallback, readAuthCallback, type AuthCallback } from '../utils/authCallback'
import { resolveView, type View } from './resolveView'

interface Route {
  view: View
  slug?: string
}

export default function Router() {
  const [route, setRoute] = useState<Route>(() => {
    const resolved = resolveView(
      window.location.pathname,
      window.location.search,
      readAuthCallback(window.location.search),
    )
    return { view: resolved.view, slug: resolved.slug }
  })
  const lastTrackedUrl = useRef<string | null>(null)

  useEffect(() => {
    const handleLocationChange = () => {
      const callback: AuthCallback | null = readAuthCallback(window.location.search)
      const { view: nextView, normalizedPath, slug: nextSlug } = resolveView(
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
      setRoute({ view: nextView, slug: nextSlug })

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

  switch (route.view) {
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
    case 'read':
      return <Read />
    case 'readPost':
      return route.slug ? <ReadPost slug={route.slug} /> : <Read />
    default:
      return <App />
  }
}
