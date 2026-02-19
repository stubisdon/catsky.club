import { useCallback, type MouseEvent, type ReactNode, type CSSProperties } from 'react'
import { navigateTo } from '../router'

interface LinkProps {
  href: string
  children: ReactNode
  className?: string
  style?: CSSProperties
  variant?: 'default' | 'button' | 'subtle'
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
}

const baseStyle: CSSProperties = {
  color: 'var(--color-text)',
  textDecoration: 'none',
  cursor: 'pointer',
  textTransform: 'lowercase',
  letterSpacing: '0.1em',
}

const buttonStyle: CSSProperties = {
  ...baseStyle,
  fontSize: 'clamp(1rem, 2vw, 1.2rem)',
  border: '2px solid rgba(255, 255, 255, 0.3)',
  padding: '0.9rem 1.5rem',
  display: 'inline-block',
  transition: 'all 0.3s ease',
}

const subtleStyle: CSSProperties = {
  ...baseStyle,
  color: 'rgba(255, 255, 255, 0.5)',
  fontSize: '0.9rem',
  letterSpacing: '0.05em',
  transition: 'color 0.3s ease',
}

export default function Link({
  href,
  children,
  className,
  style,
  variant = 'default',
  onClick,
}: LinkProps) {
  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (onClick) {
        onClick(e)
        if (e.defaultPrevented) return
      }
      
      if (href.startsWith('/') && !href.startsWith('//')) {
        e.preventDefault()
        navigateTo(href)
      }
    },
    [href, onClick]
  )

  const handleMouseEnter = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    if (variant === 'button') {
      e.currentTarget.style.background = 'var(--color-text)'
      e.currentTarget.style.color = 'var(--color-bg)'
    } else if (variant === 'subtle') {
      e.currentTarget.style.color = 'rgba(255, 255, 255, 1)'
    }
  }, [variant])

  const handleMouseLeave = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    if (variant === 'button') {
      e.currentTarget.style.background = 'transparent'
      e.currentTarget.style.color = 'var(--color-text)'
    } else if (variant === 'subtle') {
      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'
    }
  }, [variant])

  const variantStyle = variant === 'button' 
    ? buttonStyle 
    : variant === 'subtle' 
    ? subtleStyle 
    : baseStyle

  return (
    <a
      href={href}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ ...variantStyle, ...style }}
    >
      {children}
    </a>
  )
}
