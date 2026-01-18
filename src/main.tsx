import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import Watch from './Watch.tsx'
import Mission from './Mission.tsx'
import Connect from './Connect.tsx'
import Join from './Join.tsx'
import Listen from './Listen.tsx'
import Player from './Player.tsx'
import './index.css'

// Simple routing based on pathname
function Router() {
  const [view, setView] = React.useState<'home' | 'watch' | 'mission' | 'connect' | 'join' | 'listen' | 'player'>(() => {
    // Check pathname
    const pathname = window.location.pathname
    if (pathname === '/watch') {
      return 'watch'
    }
    if (pathname === '/mission') {
      return 'mission'
    }
    if (pathname === '/connect') {
      return 'connect'
    }
    if (pathname === '/join') {
      return 'join'
    }
    if (pathname === '/listen') {
      return 'listen'
    }
    if (pathname === '/player') {
      return 'player'
    }
    // Default to home
    return 'home'
  })

  React.useEffect(() => {
    const handleLocationChange = () => {
      const pathname = window.location.pathname
      if (pathname === '/watch') {
        setView('watch')
      } else if (pathname === '/mission') {
        setView('mission')
      } else if (pathname === '/connect') {
        setView('connect')
      } else if (pathname === '/join') {
        setView('join')
      } else if (pathname === '/listen') {
        setView('listen')
      } else if (pathname === '/player') {
        setView('player')
      } else {
        setView('home')
      }
    }
    
    window.addEventListener('popstate', handleLocationChange)
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [])

  if (view === 'watch') return <Watch />
  if (view === 'mission') return <Mission />
  if (view === 'connect') return <Connect />
  if (view === 'join') return <Join />
  if (view === 'listen') return <Listen />
  if (view === 'player') return <Player />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
)

