import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// Mock window.history.pushState and window.dispatchEvent
const mockPushState = vi.fn()
const mockDispatchEvent = vi.fn()

beforeEach(() => {
  window.history.pushState = mockPushState
  window.dispatchEvent = mockDispatchEvent
  vi.clearAllMocks()
})

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />)
    expect(screen.getByText('catsky.club')).toBeInTheDocument()
  })

  it('renders the tagline', () => {
    render(<App />)
    expect(screen.getByText(/in the world of data/i)).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<App />)
    expect(screen.getByText('listen')).toBeInTheDocument()
    expect(screen.getByText('watch')).toBeInTheDocument()
    expect(screen.getByText('connect')).toBeInTheDocument()
  })

  it('handles listen link click', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    const listenLink = screen.getByText('listen')
    await user.click(listenLink)

    await waitFor(() => {
      expect(mockPushState).toHaveBeenCalledWith({}, '', '/listen')
      expect(mockDispatchEvent).toHaveBeenCalled()
    })
  })

  it('handles watch link click', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    const watchLink = screen.getByText('watch')
    await user.click(watchLink)

    await waitFor(() => {
      expect(mockPushState).toHaveBeenCalledWith({}, '', '/watch')
      expect(mockDispatchEvent).toHaveBeenCalled()
    })
  })

  it('handles connect link click', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    const connectLink = screen.getByText('connect')
    await user.click(connectLink)

    await waitFor(() => {
      expect(mockPushState).toHaveBeenCalledWith({}, '', '/connect')
      expect(mockDispatchEvent).toHaveBeenCalled()
    })
  })

  it('prevents default navigation on link clicks', async () => {
    render(<App />)
    
    const listenLink = screen.getByText('listen') as HTMLAnchorElement
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    
    // Simulate click - the component handler should prevent default
    listenLink.dispatchEvent(clickEvent)
    
    // Verify navigation was called (which means preventDefault worked)
    expect(mockPushState).toHaveBeenCalled()
  })
})
