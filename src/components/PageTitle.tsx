import { type CSSProperties } from 'react'

interface PageTitleProps {
  children: string
  style?: CSSProperties
}

const titleStyle: CSSProperties = {
  // Display serif, matching the landing masthead. The wide tracking the mono title needed is
  // dropped: at this size the serif's own proportions do that work, and 0.1em on a serif
  // reads as a stretched logo rather than a title.
  fontFamily: 'var(--font-display)',
  fontWeight: 400,
  fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
  marginBottom: '1.25rem',
  letterSpacing: '-0.01em',
  lineHeight: 1.05,
  textTransform: 'lowercase',
}

export default function PageTitle({ children, style }: PageTitleProps) {
  return (
    <h1 style={{ ...titleStyle, ...style }}>
      {children}
    </h1>
  )
}
