import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Router from './Router'

vi.mock('../App', () => ({ default: () => <div>home view</div> }))
vi.mock('../Watch', () => ({ default: () => <div>watch view</div> }))
vi.mock('../Connect', () => ({ default: () => <div>connect view</div> }))
vi.mock('../Mission', () => ({ default: () => <div>mission view</div> }))
vi.mock('../Listen', () => ({ default: () => <div>listen view</div> }))
vi.mock('../Welcome', () => ({ default: () => <div>welcome view</div> }))

describe('Router signup callback normalization', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/connect')
  })

  it('renders welcome immediately for signup callbacks and normalizes the URL', async () => {
    window.history.replaceState({}, '', '/connect?action=signup&success=true')

    render(<Router />)

    expect(screen.getByText('welcome view')).toBeInTheDocument()
    await waitFor(() => {
      expect(window.location.pathname).toBe('/welcome')
      expect(window.location.search).toBe('')
    })
  })
})
