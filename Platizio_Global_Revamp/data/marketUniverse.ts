/**
 * The ticker universe behind the two market sections on Home.
 *
 * ViewTrade has no market-wide movers endpoint (see docs/03-viewtrade-api.md),
 * so "trending" is this universe ranked by absolute percentage change on our
 * side. That is why the section must be labelled "Top movers — Nasdaq-100" and
 * never "the market".
 */

/**
 * Nasdaq-100 constituents.
 *
 * The index is reconstituted annually, so this list drifts. Drift is safe: a
 * removed ticker comes back `notFound` and is filtered out before ranking, so
 * a stale entry degrades quietly rather than breaking the section. Worth a
 * review each December.
 */
export const NASDAQ_100: readonly string[] = [
  'AAPL', 'ABNB', 'ADBE', 'ADI', 'ADP', 'ADSK', 'AEP', 'AMAT', 'AMD', 'AMGN',
  'AMZN', 'ANSS', 'APP', 'ARM', 'ASML', 'AVGO', 'AXON', 'AZN', 'BIIB', 'BKNG',
  'BKR', 'CCEP', 'CDNS', 'CDW', 'CEG', 'CHTR', 'CMCSA', 'COST', 'CPRT', 'CRWD',
  'CSCO', 'CSGP', 'CSX', 'CTAS', 'CTSH', 'DASH', 'DDOG', 'DXCM', 'EA', 'EXC',
  'FANG', 'FAST', 'FTNT', 'GEHC', 'GFS', 'GILD', 'GOOG', 'GOOGL', 'HON', 'IDXX',
  'ILMN', 'INTC', 'INTU', 'ISRG', 'KDP', 'KHC', 'KLAC', 'LIN', 'LRCX', 'LULU',
  'MAR', 'MCHP', 'MDB', 'MDLZ', 'MELI', 'META', 'MNST', 'MRVL', 'MSFT', 'MSTR',
  'MU', 'NFLX', 'NVDA', 'NXPI', 'ODFL', 'ON', 'ORLY', 'PANW', 'PAYX', 'PCAR',
  'PDD', 'PEP', 'PLTR', 'PYPL', 'QCOM', 'REGN', 'ROP', 'ROST', 'SBUX', 'SMCI',
  'SNPS', 'TEAM', 'TMUS', 'TSLA', 'TTD', 'TTWO', 'TXN', 'VRSK', 'VRTX', 'WBD',
  'WDAY', 'XEL', 'ZS',
]

/**
 * The fixed 4x2 Popular grid. Order is the render order.
 *
 * Display names are held here rather than taken from the API, which returns
 * uppercase ("ALPHABET INC") and legal-entity names nobody recognises.
 */
export const POPULAR_8: readonly { symbol: string; name: string }[] = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'META', name: 'Meta' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'NFLX', name: 'Netflix' },
]

/** How many movers the trending banner shows. */
export const TRENDING_COUNT = 8

/**
 * Below this many usable quotes a section unmounts rather than render a
 * half-empty grid. A missing section reads as design; a broken one reads as a
 * broken site.
 */
export const MIN_USABLE_QUOTES = 4

/** Every symbol the proxy needs, deduplicated. */
export const ALL_SYMBOLS: readonly string[] = [
  ...new Set([...NASDAQ_100, ...POPULAR_8.map((p) => p.symbol)]),
]
