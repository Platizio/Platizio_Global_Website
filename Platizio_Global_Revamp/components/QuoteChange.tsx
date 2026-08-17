import { direction, formatPercent } from '../lib/format'

interface QuoteChangeProps {
  changePercent: number
  /** `chip` for the grid cards, `inline` for the ticker band. */
  variant?: 'chip' | 'inline'
}

/**
 * A percentage move, coloured and signed.
 *
 * The arrow is not decoration. WCAG 1.4.1 forbids colour as the sole carrier of
 * meaning, and red/green is precisely the pair that deuteranopic viewers cannot
 * separate — so direction is encoded in the glyph and the +/- sign as well as
 * the hue. Never remove the arrow to "clean up" the design.
 */
export default function QuoteChange({ changePercent, variant = 'chip' }: QuoteChangeProps) {
  const dir = direction(changePercent)

  return (
    <span className={`quote-change quote-change--${variant} is-${dir}`}>
      <svg className="quote-arrow" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        {dir === 'up' && <path d="M6 2.5 10 8H2z" fill="currentColor" />}
        {dir === 'down' && <path d="M6 9.5 2 4h8z" fill="currentColor" />}
        {dir === 'flat' && <rect x="2" y="5.25" width="8" height="1.5" fill="currentColor" />}
      </svg>
      {formatPercent(changePercent)}
    </span>
  )
}
