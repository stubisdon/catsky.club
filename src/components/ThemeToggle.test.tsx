import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import ThemeToggle from './ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.dataset.theme = 'light'
  })

  it('renders the dark-theme action and moon icon from the light default', () => {
    render(<ThemeToggle />)

    expect(screen.getByRole('button', { name: 'switch to dark theme' })).toContainHTML('<svg')
  })

  it('applies and persists the selected theme', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'switch to dark theme' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('catsky_theme')).toBe('dark')
    expect(screen.getByRole('button', { name: 'switch to light theme' })).toBeInTheDocument()
  })
})
