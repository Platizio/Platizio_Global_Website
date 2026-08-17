/**
 * GET /api/quotes — the homepage's only route to market data.
 *
 * Exists because every ViewTrade market endpoint requires a bearer token that
 * an anonymous visitor cannot have. Credentials stay server-side; the browser
 * receives ~8KB of render-ready JSON.
 *
 * Caching is what makes this cheap: with s-maxage=60, one upstream fetch serves
 * every visitor for a minute regardless of traffic.
 */

import { fetchQuotes } from './_lib/viewtrade'
import { buildPayload } from './_lib/buildPayload'
import { ALL_SYMBOLS, MIN_USABLE_QUOTES } from '../Platizio_Global_Revamp/data/marketUniverse'

/**
 * 60s fresh, then up to 5 minutes of stale-while-revalidate. During a ViewTrade
 * outage the CDN keeps serving the last good payload instead of failing — the
 * homepage shows slightly old prices rather than losing both sections.
 */
const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300'

function json(body: unknown, status: number, cache: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cache,
    },
  })
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, 'no-store')
  }

  try {
    const raws = await fetchQuotes(ALL_SYMBOLS)
    const payload = buildPayload(raws)

    // Too little data to render either section honestly. Fail rather than
    // serve a thin payload the client would have to reject anyway — and do not
    // cache the failure for long.
    if (payload.trending.length < MIN_USABLE_QUOTES) {
      return json({ error: 'Insufficient market data' }, 503, 'no-store')
    }

    return json(payload, 200, CACHE_CONTROL)
  } catch (err) {
    // Message only — never the stack or the upstream body, either of which can
    // carry request detail. The client treats any non-200 the same way.
    console.error('[api/quotes]', (err as Error).message)
    return json({ error: 'Market data unavailable' }, 503, 'no-store')
  }
}
