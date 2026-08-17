/**
 * Phase 2 fixture. Deleted at the end of Phase 3.
 *
 * Values are copied from a real UAT response so the components are exercised
 * against shapes the API actually produces — including the awkward ones:
 *
 *   NFLX     change exactly 0        (must render "0.00%", not be filtered)
 *   MU       four-digit price        (must group as "1,000.40")
 *   PDD/ARM  very long company names (must truncate, not wrap or overflow)
 *   ROST     largest move is a FALL  (loss colour leads the banner)
 */

import type { Quote, QuotesResponse } from '../types/market'

export const MOCK_TRENDING: Quote[] = [
  { symbol: 'ROST', name: 'Ross Stores Inc', price: 237.78, change: -7.58, changePercent: -3.09, currency: 'USD' },
  { symbol: 'MU', name: 'Micron Technology Inc', price: 1000.4, change: 28.7, changePercent: 2.96, currency: 'USD' },
  { symbol: 'MRVL', name: 'Marvell Technology Inc', price: 227.3, change: 5.3, changePercent: 2.38, currency: 'USD' },
  { symbol: 'INTC', name: 'Intel Corp', price: 104.83, change: 2.33, changePercent: 2.27, currency: 'USD' },
  { symbol: 'PDD', name: 'Pdd Holdings Inc Spon Ads Each Rep 4 Ord Shs', price: 86.58, change: 1.79, changePercent: 2.11, currency: 'USD' },
  { symbol: 'FANG', name: 'Diamondback Energy Inc', price: 206.57, change: 4.1, changePercent: 2.03, currency: 'USD' },
  { symbol: 'ARM', name: 'Arm Holdings Plc Spon Ads Each Rep 1 Ord Shs', price: 285, change: 6, changePercent: 1.99, currency: 'USD' },
  { symbol: 'TTD', name: 'The Trade Desk Inc', price: 13.86, change: -0.28, changePercent: -1.98, currency: 'USD' },
]

export const MOCK_POPULAR: Quote[] = [
  { symbol: 'AAPL', name: 'Apple', price: 307.14, change: 1.21, changePercent: 0.39, currency: 'USD' },
  { symbol: 'MSFT', name: 'Microsoft', price: 491.81, change: -3.59, changePercent: -0.72, currency: 'USD' },
  { symbol: 'NVDA', name: 'NVIDIA', price: 226.05, change: 0.89, changePercent: 0.4, currency: 'USD' },
  { symbol: 'GOOGL', name: 'Alphabet', price: 348.09, change: 2.19, changePercent: 0.63, currency: 'USD' },
  { symbol: 'AMZN', name: 'Amazon', price: 265.88, change: 3.23, changePercent: 1.23, currency: 'USD' },
  { symbol: 'META', name: 'Meta', price: 588.24, change: -1.61, changePercent: -0.27, currency: 'USD' },
  { symbol: 'TSLA', name: 'Tesla', price: 343.19, change: 0.92, changePercent: 0.27, currency: 'USD' },
  { symbol: 'NFLX', name: 'Netflix', price: 78.3, change: 0, changePercent: 0, currency: 'USD' },
]

export const MOCK_RESPONSE: QuotesResponse = {
  trending: MOCK_TRENDING,
  popular: MOCK_POPULAR,
  asOf: '2026-08-17T09:28:48.092Z',
  delayed: true,
}
