/**
 * Deterministic formatters.
 *
 * Intl.NumberFormat is avoided on purpose: the prerender runs in Node and
 * hydration runs in the browser, and any locale difference between the two
 * produces a hydration mismatch. These are pure string operations, so server
 * and client always agree.
 */

/** 1000.4 -> "1,000.40". Always 2 decimals, always grouped. */
export function formatPrice(value: number): string {
  const fixed = Math.abs(value).toFixed(2)
  const [whole, decimals] = fixed.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${value < 0 ? '-' : ''}${grouped}.${decimals}`
}

/** 0.42 -> "+0.42%"; -3.09 -> "-3.09%"; 0 -> "0.00%". */
export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${Math.abs(value).toFixed(2)}%`
}

/** 1.21 -> "+1.21"; -7.58 -> "-7.58". */
export function formatChange(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${formatPrice(Math.abs(value))}`
}

/** 'up' | 'down' | 'flat' — drives colour AND the directional glyph. */
export type Direction = 'up' | 'down' | 'flat'

export function direction(changePercent: number): Direction {
  if (changePercent > 0) return 'up'
  if (changePercent < 0) return 'down'
  return 'flat'
}

/**
 * ISO timestamp -> "14:32 IST".
 *
 * Safe to use Intl here because this only ever renders after data arrives in
 * an effect — never during SSR — so there is no server/client pair to mismatch.
 * The timeZone is pinned so the string does not follow the visitor's clock.
 */
export function formatAsOf(iso: string): string {
  try {
    const time = new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }).format(new Date(iso))
    return `${time} IST`
  } catch {
    return 'recently'
  }
}
