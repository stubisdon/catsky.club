import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import Watch from './Watch.tsx'
import Connect from './Connect.tsx'
import Mission from './Mission.tsx'
import Listen from './Listen.tsx'
import './index.css'

type View =
  | 'home'
  | 'listen'
  | 'watch'
  | 'connect'
  | 'mission'

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

  // Hidden (but still reachable)
  if (pathname === '/mission') return { view: 'mission' }

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
  if (view === 'listen') return <Listen />
  if (view === 'mission') return <Mission />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
)

