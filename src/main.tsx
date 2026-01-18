import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import Watch from './Watch.tsx'
import Connect from './Connect.tsx'
import Mission from './Mission.tsx'
import Player from './Player.tsx'
import Unpublished from './Unpublished.tsx'
import UnpublishedExperience from './UnpublishedExperience.tsx'
import './index.css'

type View =
  | 'home'
  | 'listen'
  | 'watch'
  | 'connect'
  | 'mission'
  | 'unpublished_index'
  | 'unpublished_experience'

function normalizePathname(pathname: string): string {
  // Collapse trailing slashes (except root)
  if (pathname.length > 1) return pathname.replace(/\/+$/, '')
  return pathname
}

function resolveView(pathnameRaw: string): { view: View; normalizedPath?: string } {
  const pathname = normalizePathname(pathnameRaw)

  if (pathname === '/') return { view: 'home' }
  if (pathname === '/watch') return { view: 'watch' }
  if (pathname === '/connect') return { view: 'connect' }
  if (pathname === '/listen') return { view: 'listen' }
  // Back-compat: /player now points to /listen
  if (pathname === '/player') return { view: 'listen', normalizedPath: '/listen' }

  // Hidden (but still reachable)
  if (pathname === '/mission') return { view: 'mission' }

  // "Unpublished pages" area
  if (pathname === '/unpublished') return { view: 'unpublished_index' }
  if (pathname === '/unpublished/experience') return { view: 'unpublished_experience' }

  // Default: normalize everything else to landing page
  return { view: 'home', normalizedPath: '/' }
}

// Simple routing based on pathname
function Router() {
  const [view, setView] = React.useState<View>(() => resolveView(window.location.pathname).view)

  React.useEffect(() => {
    const handleLocationChange = () => {
      const { view: nextView, normalizedPath } = resolveView(window.location.pathname)
      if (normalizedPath && normalizedPath !== window.location.pathname) {
        window.history.replaceState({}, '', normalizedPath)
      }
      setView(nextView)
    }
    
    window.addEventListener('popstate', handleLocationChange)
    // Normalize the initial URL on mount as well
    handleLocationChange()
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [])

  if (view === 'home') return <App />
  if (view === 'watch') return <Watch />
  if (view === 'connect') return <Connect />
  if (view === 'listen') return <Player />
  if (view === 'mission') return <Mission />
  if (view === 'unpublished_index') return <Unpublished />
  if (view === 'unpublished_experience') return <UnpublishedExperience />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
)

