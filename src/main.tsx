import React from 'react'
import ReactDOM from 'react-dom/client'
import { Router } from './router'
import { AppShellRecoveryMarkerCleaner } from './components/AppShellRecoveryMarkerCleaner'
import { initAnalytics } from './utils/analytics'
import './index.css'

interface RouterErrorBoundaryState {
  hasError: boolean
}

class RouterErrorBoundary extends React.Component<React.PropsWithChildren, RouterErrorBoundaryState> {
  state: RouterErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <div className="app-container">something went wrong. <a href="/listen">→ listen</a> / <a href="/">→ home</a></div>
    }
    return this.props.children
  }
}

initAnalytics()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterErrorBoundary>
      <AppShellRecoveryMarkerCleaner />
      <Router />
    </RouterErrorBoundary>
  </React.StrictMode>,
)
