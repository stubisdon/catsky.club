import { type CSSProperties } from 'react'

interface PageTitleProps {
  children: string
  style?: CSSProperties
}

const titleStyle: CSSProperties = {
  fontSize: 'clamp(1.8rem, 4vw, 3rem)',
  marginBottom: '1.25rem',
  letterSpacing: '0.1em',
  textTransform: 'lowercase',
}

export default function PageTitle({ children, style }: PageTitleProps) {
  return (
    <h1 style={{ ...titleStyle, ...style }}>
      {children}
    </h1>
  )
}
