import { type CSSProperties } from 'react'

/**
 * Common inline style definitions for reuse across components.
 * These complement the CSS variables defined in index.css.
 */

export const linkStyles = {
  base: {
    color: 'var(--color-text)',
    textDecoration: 'none',
    cursor: 'pointer',
    textTransform: 'lowercase' as const,
    letterSpacing: '0.1em',
  },
  subtle: {
    color: 'rgba(255, 255, 255, 0.5)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    letterSpacing: '0.05em',
    transition: 'color 0.3s ease',
    cursor: 'pointer',
    textTransform: 'lowercase' as const,
  },
  underlined: {
    color: 'rgba(255, 255, 255, 0.7)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    letterSpacing: '0.05em',
    borderBottom: '1px solid rgba(255, 255, 255, 0.25)',
    paddingBottom: '0.1rem',
    cursor: 'pointer',
    textTransform: 'lowercase' as const,
  },
} as const satisfies Record<string, CSSProperties>

export const buttonStyles = {
  base: {
    background: 'transparent',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'clamp(1rem, 2vw, 1.2rem)',
    padding: '0.9rem 1.5rem',
    cursor: 'pointer',
    letterSpacing: '0.1em',
    transition: 'all 0.3s ease',
    textTransform: 'lowercase' as const,
    display: 'inline-block',
  },
  small: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    textTransform: 'lowercase' as const,
  },
} as const satisfies Record<string, CSSProperties>

export const containerStyles = {
  page: {
    width: '100%',
    padding: '2rem',
    boxSizing: 'border-box' as const,
    textAlign: 'left' as const,
    letterSpacing: '0.05em',
    lineHeight: 1.8,
    maxHeight: '100vh',
    overflowY: 'auto' as const,
    userSelect: 'text' as const,
    WebkitUserSelect: 'text' as const,
  },
  flex: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '1rem',
    alignItems: 'center',
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
} as const satisfies Record<string, CSSProperties>

export const fixedPositions = {
  bottomLeft: {
    position: 'fixed' as const,
    bottom: '1rem',
    left: '1rem',
  },
  bottomRight: {
    position: 'fixed' as const,
    bottom: '1rem',
    right: '1rem',
  },
} as const satisfies Record<string, CSSProperties>
