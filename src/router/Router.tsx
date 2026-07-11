import { useState, useEffect, useRef } from 'react'
import App from '../App'
import Watch from '../Watch'
import Connect from '../Connect'
import Mission from '../Mission'
import Listen from '../Listen'
import Welcome from '../Welcome'
import Video from '../Video'
import { trackPageView } from '../utils/analytics'

export type View = 'home' | 'listen' | 'watch' | 'video' | 'connect' | 'welcome' | 'mission'

interface ResolvedView {
  view: View
  normalizedPath?: string
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1) return pathname.replace(/\/+$/, '')
  return pathname
}

function resolveView(pathnameRaw: string, search = ''): ResolvedView {
  const pathname = normalizePathname(pathnameRaw)
  const params = new URLSearchParams(search)

  if (pathname === '/connect' && params.get('action') === 'signup' && params.get('success') === 'true') {
    return { view: 'welcome', normalizedPath: '/welcome' }
  }

  if (pathname === '/') return { view: 'home' }
  if (pathname === '/watch') return { view: 'watch' }
  if (pathname === '/video') return { view: 'video' }
  if (pathname === '/connect') return { view: 'connect' }
  if (pathname === '/listen') return { view: 'listen' }
  if (pathname === '/mission') return { view: 'mission' }
  if (pathname === '/welcome') return { view: 'welcome' }

  return { view: 'home', normalizedPath: '/' }
}

export default function Router() {
  const [view, setView] = useState<View>(() => resolveView(window.location.pathname, window.location.search).view)
  const lastTrackedUrl = useRef<string | null>(null)

  useEffect(() => {
    const handleLocationChange = () => {
      const { view: nextView, normalizedPath } = resolveView(window.location.pathname, window.location.search)
      let normalized = false
      if (normalizedPath) {
        const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
        if (normalizedPath !== currentPath) {
          window.history.replaceState({}, '', normalizedPath)
          normalized = true
        }
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
    default:
      return <App />
  }
}
