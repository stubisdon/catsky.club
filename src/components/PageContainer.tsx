import { type ReactNode, type CSSProperties } from 'react'
import Link from './Link'

interface PageContainerProps {
  children: ReactNode
  showHomeLink?: boolean
  maxWidth?: string
  className?: string
  style?: CSSProperties
}

const containerStyle: CSSProperties = {
  width: '100%',
  padding: '2rem',
  textAlign: 'left',
  letterSpacing: '0.05em',
  lineHeight: 1.8,
  maxHeight: '100vh',
  overflowY: 'auto',
  userSelect: 'text',
  WebkitUserSelect: 'text',
}

const homeLinkStyle: CSSProperties = {
  position: 'fixed',
  bottom: '1rem',
  left: '1rem',
}

export default function PageContainer({
  children,
  showHomeLink = true,
  maxWidth = '800px',
  className,
  style,
}: PageContainerProps) {
  return (
    <div className="app-container">
      <div
        className={className}
        style={{
          ...containerStyle,
          maxWidth,
          ...style,
        }}
      >
        {children}
      </div>
      
      {showHomeLink && (
        <Link
          href="/"
          variant="subtle"
          style={homeLinkStyle}
        >
          ← home
        </Link>
      )}
    </div>
  )
}
