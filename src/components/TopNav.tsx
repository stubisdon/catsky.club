import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from './Link'
import ThemeToggle from './ThemeToggle'
import { getMembershipTier, type MembershipTier } from '../utils'
import type { View } from '../router/resolveView'

interface TopNavProps {
  currentView: View | null
}

export default function TopNav({ currentView }: TopNavProps) {
  const [membershipTier, setMembershipTier] = useState<MembershipTier | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    getMembershipTier()
      .then((tier) => {
        if (!cancelled) setMembershipTier(tier)
      })
      .catch(() => {
        if (!cancelled) setMembershipTier('none')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const isPaid = useMemo(
    () => membershipTier === 'paid_5' || membershipTier === 'paid_20',
    [membershipTier]
  )

  const showWordmark = currentView !== 'home'

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      window.addEventListener('keydown', handleEscape)
      return () => {
        window.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isMenuOpen])

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false)
  }, [])

  const centerLinks = useMemo(() => {
    const links: Array<{ label: string; href: string; testid: string; overlayTestid: string }> = [
      { label: 'listen', href: '/listen', testid: 'top-nav-link-listen', overlayTestid: 'top-nav-overlay-link-listen' },
      { label: 'watch', href: '/watch', testid: 'top-nav-link-watch', overlayTestid: 'top-nav-overlay-link-watch' },
    ]

    if (isPaid) {
      links.push({ label: 'secrets', href: '/video', testid: 'top-nav-link-secrets', overlayTestid: 'top-nav-overlay-link-secrets' })
    }

    return links
  }, [isPaid])

  return (
    <nav className="top-nav" aria-label="main" data-testid="top-nav">
      {/* Desktop Navigation */}
      <div className="top-nav-content">
        {/* Left: Wordmark (hidden on home) or placeholder to maintain grid structure */}
        {showWordmark ? (
          <Link
            href="/"
            className="top-nav-wordmark"
            data-testid="top-nav-wordmark"
          >
            catsky.club
          </Link>
        ) : (
          <div aria-hidden="true" />
        )}

        {/* Center: Main Links (listen, watch, secrets when paid) */}
        <div className="top-nav-links">
          {centerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`top-nav-link ${currentView === link.href.slice(1) ? 'active' : ''}`}
              data-testid={link.testid}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: Connect Link, Theme Toggle, and Mobile Hamburger */}
        <div className="top-nav-right">
          <Link
            href="/connect"
            className={`top-nav-link-right ${currentView === 'connect' ? 'active' : ''}`}
            data-testid="top-nav-link-connect"
          >
            connect
          </Link>

          <ThemeToggle />

          {/* Mobile: Hamburger Menu */}
          <button
            className="top-nav-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
            aria-controls="top-nav-overlay"
            aria-label={isMenuOpen ? 'close menu' : 'menu'}
            data-testid="top-nav-toggle"
          >
            ≡
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          id="top-nav-overlay"
          className="top-nav-overlay"
          data-testid="top-nav-overlay"
        >
          <button
            className="top-nav-overlay-close"
            onClick={handleMenuClose}
            aria-label="close menu"
            data-testid="top-nav-overlay-close"
          >
            ×
          </button>

          <div className="top-nav-overlay-links">
            <Link
              href="/"
              className="top-nav-overlay-link"
              onClick={handleMenuClose}
              data-testid="top-nav-overlay-link-home"
            >
              home
            </Link>

            {centerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`top-nav-overlay-link ${currentView === link.href.slice(1) ? 'active' : ''}`}
                onClick={handleMenuClose}
                data-testid={link.overlayTestid}
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/connect"
              className={`top-nav-overlay-link ${currentView === 'connect' ? 'active' : ''}`}
              onClick={handleMenuClose}
              data-testid="top-nav-overlay-link-connect"
            >
              connect
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
