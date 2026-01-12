import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import Intro from './Intro.tsx'
import Mission from './Mission.tsx'
import Follow from './Follow.tsx'
import Join from './Join.tsx'
import './index.css'

// Simple routing based on pathname
function Router() {
  const [view, setView] = React.useState<'home' | 'intro' | 'mission' | 'follow' | 'join'>(() => {
    // Check pathname
    const pathname = window.location.pathname
    if (pathname === '/intro') {
      return 'intro'
    }
    if (pathname === '/mission') {
      return 'mission'
    }
    if (pathname === '/follow') {
      return 'follow'
    }
    if (pathname === '/join') {
      return 'join'
    }
    // Default to home
    return 'home'
  })

  React.useEffect(() => {
    const handleLocationChange = () => {
      const pathname = window.location.pathname
      if (pathname === '/intro') {
        setView('intro')
      } else if (pathname === '/mission') {
        setView('mission')
      } else if (pathname === '/follow') {
        setView('follow')
      } else if (pathname === '/join') {
        setView('join')
      } else {
        setView('home')
      }
    }
    
    window.addEventListener('popstate', handleLocationChange)
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [])

  if (view === 'intro') return <Intro />
  if (view === 'mission') return <Mission />
  if (view === 'follow') return <Follow />
  if (view === 'join') return <Join />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
)

