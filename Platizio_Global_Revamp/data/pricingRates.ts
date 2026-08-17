/**
 * Every published rate, stated once.
 *
 * These numbers previously lived inline in src/pages/Pricing.tsx's JSX, and
 * Home's fees table held a second copy. Adding calculators would have made
 * three independent statements of the brokerage rate — and they drift.
 *
 * Everything that shows a rate reads from here: the schedule tables, both
 * calculators, and Home's fees table. Changing 0.29% is a one-line edit that
 * cannot leave anything stale.
 *
 * Figures are exactly what the site already published; none were introduced.
 */

export const RATES = {
  /** 0.29% per transaction, or the minimum below — whichever is greater. */
  brokeragePct: 0.0029,
  brokerageMinUsd: 1,

  /** 18% on the brokerage value, for Indian residents. */
  igstPct: 0.18,

  /** Per USD of trade value, both sides. */
  ifscaTurnoverPerUsd: 0.00005,

  /** Per USD of trade value, sell side only. */
  secFeePerUsd: 0.0000206,

  /**
   * PER SHARE, sell side only — not per dollar.
   *
   * This is why FINRA sits outside the calculator's total: trade value alone
   * cannot compute it. Disclosed as a stated line instead.
   */
  finraPerShare: 0.000195,

  /** Capital gains. Short-term is the reader's slab; 30% is our stated assumption. */
  ltcgPct: 0.125,
  stcgAssumedSlabPct: 0.30,
  ltcgThresholdMonths: 24,

  /** Withheld at source in the US, claimable as foreign tax credit in India. */
  dividendWithholdingPct: 0.25,

  /** LRS. Threshold is cumulative across the financial year and all purposes. */
  tcsPct: 0.20,
  tcsThresholdInr: 1_000_000,

  ratesAsOf: '17 August 2026',
} as const

/** Zero-cost items — the argument the page leads with. */
export const FREE_ITEMS: readonly { label: string; value: string }[] = [
  { label: 'Account opening', value: '$0' },
  { label: 'KYC and profile verification', value: '$0' },
  { label: 'Live price tracking', value: 'Free' },
  { label: 'TradingView charting', value: 'Free' },
]

/**
 * Fraction -> display percentage: 0.0029 -> "0.29%", 0.18 -> "18%".
 *
 * `fraction * 100` is not safe to render directly. Today's rates all multiply
 * cleanly, but the pattern is fragile — a rate of 0.07 renders as
 * "7.000000000000001%". Rounding then stripping trailing zeros via Number()
 * makes that structurally impossible rather than luckily absent.
 */
export function pct(fraction: number, decimals = 2): string {
  return `${Number((fraction * 100).toFixed(decimals))}%`
}

/**
 * The authoritative trading schedule.
 *
 * Every string is derived from the numbers above rather than typed alongside
 * them. Written out by hand, this table would be a second statement of each
 * rate sitting three lines from the first — the easiest possible place for a
 * rate change to go half-applied.
 */
export const TRADING_CHARGES: readonly { head: string; value: string; note?: string }[] = [
  {
    head: 'Brokerage',
    value: `${pct(RATES.brokeragePct)} per transaction`,
    note: `Minimum $${RATES.brokerageMinUsd} per order`,
  },
  { head: 'IGST', value: `${pct(RATES.igstPct)} on brokerage`, note: 'Indian residents' },
  {
    head: 'IFSCA turnover fee',
    value: `$${RATES.ifscaTurnoverPerUsd} per $1 traded`,
    note: 'Both buy and sell',
  },
  {
    head: 'SEC fee',
    value: `$${RATES.secFeePerUsd} per $1 traded`,
    note: 'Sell orders only',
  },
  {
    head: 'FINRA transaction fee',
    value: `$${RATES.finraPerShare} per share`,
    note: 'Sell orders only',
  },
]
