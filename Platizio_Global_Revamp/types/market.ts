/**
 * Shapes shared between the serverless proxy (api/) and the Home components.
 *
 * The proxy is the only place that talks to ViewTrade, so it owns every
 * normalisation decision. By the time a Quote reaches a component it is ready
 * to render: no unit conversion, no rounding, no null handling.
 */

/** One quote, normalised for display. */
export interface Quote {
  symbol: string
  /** Title case. ViewTrade returns SHOUTING CASE ("APPLE INC"). */
  name: string
  /** Rounded to the instrument's precision (2dp for US equities). */
  price: number
  /** Absolute move against yesterday's close. May legitimately be 0. */
  change: number
  /**
   * Percentage POINTS — 0.42 means +0.42%.
   *
   * ViewTrade returns a fraction (0.00420848). The proxy multiplies by 100
   * exactly once, here, so no component can get this wrong. Rendering the raw
   * API value would understate every move by 100x.
   */
  changePercent: number
  currency: string
}

/** Response body of GET /api/quotes. */
export interface QuotesResponse {
  /** Top 8 of the universe by absolute change, descending. */
  trending: Quote[]
  /** The eight POPULAR_8 symbols, in their configured order. */
  popular: Quote[]
  /**
   * ISO timestamp of the STALEST quote in the payload, so the "last updated"
   * line is never newer than the oldest thing on screen.
   */
  asOf: string
  /** True when the upstream marks the data delayed. Drives the notice. */
  delayed: boolean
}
