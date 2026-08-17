/**
 * Cost and tax arithmetic. Pure — no React, no I/O — so the spec's worked
 * examples are testable directly.
 */

import { RATES } from '../data/pricingRates'

/**
 * Round half-up at `decimals` places.
 *
 * `toFixed` is not sufficient. 0.595 is stored fractionally BELOW its decimal
 * value in binary floating point, so `(0.595).toFixed(2)` returns "0.59" —
 * and 0.595 is a real figure on this page (the effective rate on a $200
 * trade). The same flaw hits 1.005 -> "1.00" and 2.675 -> "2.67".
 *
 * Financial figures round half-up by convention, and a pricing page that
 * rounds a customer's cost DOWN by a cent is the wrong error to make.
 */
export function roundHalfUp(value: number, decimals = 2): number {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export type TradeSide = 'buy' | 'sell'

export interface TradeCost {
  brokerage: number
  igst: number
  ifsca: number
  sec: number
  /** Sum of the UNROUNDED components — never of the displayed ones. */
  total: number
  /** Percentage points: 0.35 means 0.35%. */
  effectivePct: number
  /** True when the $1 floor beat the percentage — the thing tables can't show. */
  minimumApplied: boolean
}

/**
 * Full transaction cost for a trade of `valueUsd`.
 *
 * FINRA is deliberately absent: it is charged per share, not per dollar, so
 * trade value alone cannot compute it. It is disclosed beneath the breakdown
 * instead. Excluded and disclosed beats included and wrong.
 */
export function calculateTradeCost(valueUsd: number, side: TradeSide): TradeCost | null {
  if (!Number.isFinite(valueUsd) || valueUsd <= 0) return null

  const percentageBrokerage = valueUsd * RATES.brokeragePct
  const brokerage = Math.max(percentageBrokerage, RATES.brokerageMinUsd)
  const igst = brokerage * RATES.igstPct
  const ifsca = valueUsd * RATES.ifscaTurnoverPerUsd
  const sec = side === 'sell' ? valueUsd * RATES.secFeePerUsd : 0

  const total = brokerage + igst + ifsca + sec

  return {
    brokerage,
    igst,
    ifsca,
    sec,
    total,
    effectivePct: (total / valueUsd) * 100,
    minimumApplied: percentageBrokerage < RATES.brokerageMinUsd,
  }
}

export interface GainsComparison {
  shortTermTax: number
  longTermTax: number
  /** What holding past 24 months saves. */
  difference: number
}

/**
 * Both outcomes side by side. The holding period is the point of the tool, so
 * it is a comparison rather than an input.
 *
 * Short-term uses RATES.stcgAssumedSlabPct — an ASSUMPTION, stated inline in
 * the UI next to the number. Surcharge and cess are excluded, which understates
 * short-term tax; also stated inline. Neither belongs in a footnote.
 */
export function compareGainsTax(gainInr: number): GainsComparison | null {
  if (!Number.isFinite(gainInr) || gainInr <= 0) return null

  const shortTermTax = gainInr * RATES.stcgAssumedSlabPct
  const longTermTax = gainInr * RATES.ltcgPct

  return {
    shortTermTax,
    longTermTax,
    difference: shortTermTax - longTermTax,
  }
}

/* ------------------------------------------------------------- formatting */

/**
 * "1234.5" -> "1,234.50". Deterministic on purpose.
 *
 * Intl.NumberFormat is avoided throughout: the prerender runs in Node and
 * hydration in the browser, and any locale difference between them is a
 * hydration mismatch.
 */
export function formatUsd(value: number, decimals = 2): string {
  const rounded = roundHalfUp(Math.abs(value), decimals).toFixed(decimals)
  const [whole, frac] = rounded.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${value < 0 ? '-' : ''}${grouped}${frac ? '.' + frac : ''}`
}

/**
 * Indian digit grouping: 100000 -> "1,00,000", not "100,000".
 *
 * The last three digits group normally, then every two above that. Writing
 * ₹1,00,000 as ₹100,000 to an Indian reader looks like a foreign site.
 */
export function formatInr(value: number): string {
  const rounded = Math.round(Math.abs(value))
  const digits = String(rounded)
  if (digits.length <= 3) return `${value < 0 ? '-' : ''}${digits}`

  const last3 = digits.slice(-3)
  const rest = digits.slice(0, -3)
  const groupedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${value < 0 ? '-' : ''}${groupedRest},${last3}`
}

/** 0.35 -> "0.35%". */
export function formatPct(value: number, decimals = 2): string {
  return `${roundHalfUp(value, decimals).toFixed(decimals)}%`
}
