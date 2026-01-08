import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import Intro from './Intro.tsx'
import './index.css'

// Simple routing based on pathname
function Router() {
  const [view, setView] = React.useState<'home' | 'intro'>(() => {
    // Check pathname
    const pathname = window.location.pathname
    if (pathname === '/intro') {
      return 'intro'
    }
    // Default to home
    return 'home'
  })

  React.useEffect(() => {
    const handleLocationChange = () => {
      const pathname = window.location.pathname
      if (pathname === '/intro') {
        setView('intro')
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
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
)

