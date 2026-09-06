interface SectionRuleProps {
  /** Optional label printed in the gap, e.g. the section eyebrow. */
  label?: string
  className?: string
}

/**
 * Section divider in the engraved idiom: a hairline broken by a small lozenge, the way a
 * printed plate separates blocks. Replaces plain `border-top` dividers so section breaks
 * carry the same drawn quality as the rest of the page.
 */
export default function SectionRule({ label, className }: SectionRuleProps) {
  return (
    <div className={`section-rule${className ? ` ${className}` : ''}`}>
      <span className="section-rule-line" aria-hidden="true" />
      {label ? (
        <span className="section-rule-label t-eyebrow">{label}</span>
      ) : (
        <svg
          className="section-rule-mark"
          width="11"
          height="11"
          viewBox="0 0 11 11"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M5.5 0.6 10.4 5.5 5.5 10.4 0.6 5.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
      )}
      <span className="section-rule-line" aria-hidden="true" />
    </div>
  )
}
