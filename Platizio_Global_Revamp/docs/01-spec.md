# Spec — Home Page Revamp

**Branch:** `Platizio_Global_Revamp`
**Date:** 2026-08-17
**Status:** Approved

## Goal

Rebuild the Home/index page around a new section order, and introduce live US
market data (trending movers and popular stocks) sourced from the ViewTrade
broker API.

## Page structure

Strict replacement. The page is these nine sections in this order, and nothing
else.

| # | Section | Origin |
|---|---------|--------|
| 1 | Header | Unchanged — `src/components/Header.tsx` |
| 2 | Hero | Kept as-is — globe, CTAs, meta strip |
| 3 | Trending stocks banner | **New** — live, horizontally scrolling |
| 4 | Popular stocks | **New** — 4×2 grid, live quotes |
| 5 | Why invest globally | Existing content, `id="why"` preserved |
| 6 | How to invest globally | Existing 3-step block, retitled |
| 7 | Fees | **New** — condensed table linking to `/pricing` |
| 8 | Regulations | **New** — trust badges, disclaimer, closing CTA |
| 9 | Footer | Unchanged — `src/components/Footer.tsx` |

### Removed from Home

- Promo video (`global_promo_good_voice.mp4`)
- YouTube / latest-video block
- "Start here" guides (three article cards)
- Standalone closing CTA band

The assets and article routes all remain; only their placement on Home is gone.

### Two consequences, accepted

1. **Conversion.** Removing the closing CTA band leaves the page with no
   below-the-fold conversion point, so the **Regulations section must end with
   the "Start Investing" button**. This is why section 8 owns the CTA.
2. **SEO.** The guides block was Home's only direct link to the individual
   article pages. The footer still links `/media#articles`, so articles stay
   crawlable from Home, but the three high-value guide links are lost. Accepted
   as a known, modest cost.

### Must not break

- `id="why"` on section 5 — the footer links to `/#why`.
- Every route must still render `<SEO/>`; the prerender script throws on any
  page that produces no `<title>`.

## Section detail

### 3. Trending stocks banner

A horizontally scrolling strip of the day's biggest movers.

- **Universe:** Nasdaq-100 constituents.
- **Ranking:** absolute % change today, descending. Top 8 shown.
- **Per item:** ticker, last price, change % with direction colour and arrow.
- **Labelling:** must read **"Top movers — Nasdaq-100"**, never "market" or
  "all stocks". ViewTrade cannot rank the whole market (see
  [`03-viewtrade-api.md`](03-viewtrade-api.md)) and the label must not overstate
  what the data is.
- **Motion:** CSS marquee, paused on hover and under
  `prefers-reduced-motion: reduce`.

### 4. Popular stocks

A 4×2 grid of eight fixed mega-caps. The lineup never changes; only the prices
are live.

`AAPL · MSFT · NVDA · GOOGL · AMZN · META · TSLA · NFLX`

Per card: logo, company name, ticker, last price, change % coloured by
direction. Whole card links to the trading platform.

### 7. Fees

One condensed table, ~5 rows, leading with the wins:

| Charge | Amount |
|--------|--------|
| Account opening | $0 |
| KYC / profile verification | $0 |
| Price tracking & TradingView charting | Free |
| Brokerage | 0.29% per transaction (min USD 1) |
| Regulatory fees (FINRA, SEC, IFSCA) | At cost |

Ends with "See full pricing →" to `/pricing`. `/pricing` stays the single source
of truth; Home shows highlights only, so the numbers are never maintained twice.

### 8. Regulations

A compact row of trust markers, each one short line of plain English:

- IFSCA regulated
- GIFT City IFSC
- RBI Liberalised Remittance Scheme
- US custody

Followed by the risk disclaimer, a link to `/disclaimer`, and the closing
**Start Investing** CTA.

## Data architecture

```
Browser
  └─ GET /api/quotes                        (Vercel serverless, CDN-cached 60s)
       ├─ token cache (in-memory, refreshed on expiry)
       │    └─ POST /uma/api/v1/auth/b2b/login/api-keys
       └─ GET /aes/api/quotes/equity?symbols=…   (batched, 25 symbols per call)
  ← { trending: Quote[8], popular: Quote[8], asOf: string, delayed: boolean }
```

### Caching

`Cache-Control: s-maxage=60, stale-while-revalidate=300`

One upstream fetch serves every visitor for 60 seconds. During a ViewTrade
outage the CDN keeps serving the last good payload for another 5 minutes rather
than showing an empty page.

### Hydration safety

The prerender uses `renderToString`, and `scripts/prerender.mjs` documents that
anything rendered after effects run causes a hydration mismatch.

Therefore both market sections **must render a fixed-height skeleton on the
server and on the client's first paint**, and fill in only from `useEffect`.
Server and client initial markup must be byte-identical.

Consequences, both accepted:

- Prices are **not** in the prerendered HTML and carry **no SEO value**. This is
  inherent to fetching through a proxy at runtime.
- Skeletons must reserve the final height exactly, so filling in causes **no
  layout shift**.

### Failure behaviour

| Condition | Behaviour |
|-----------|-----------|
| Proxy returns non-200 | Section unmounts. No error UI on the homepage. |
| Fewer than 4 usable quotes | Section unmounts — a half-empty grid looks broken. |
| Quote has `notPermissioned` or `notFound` | That symbol is filtered out before ranking. |
| Upstream slow | Skeleton persists; no spinner, no timeout message. |

A market data problem must never produce a visibly broken homepage.

## Compliance

The quote payload is explicitly `delayed: true, source: "Delay"`, and this is a
regulated intermediary's homepage. Both market sections carry, in small print
directly beneath them:

- **"Prices delayed. Last updated HH:MM IST"** — driven by the real `asOf` value
  from the response, never a hardcoded or client-clock string.
- **"For information only. Not investment advice or a recommendation to buy or
  sell."** — linking to the existing `/disclaimer` page.

Symbols returning `notPermissioned` or `notFound` are never rendered as blank or
zero-valued cards.

## Security

- The ViewTrade API key lives **only** in a Vercel environment variable.
- No credential may appear in any source file, doc, or commit.
- `Global_API/` and common credential filenames are added to `.gitignore`
  defensively, even though that folder sits outside the repo.
- The B2B token is held in serverless memory only — never returned to the
  browser, never logged.

## Non-goals

Explicitly out of scope. Each is a clean follow-up.

- WebSocket streaming or auto-refresh — data is fetched once per page load
- Sparklines, charts, or any historical data on Home
- Per-stock detail pages
- A dedicated `/regulations` page
- Refactoring `css/styles.css` (3,969 lines) — new styles go in their own file
- Changing Header or Footer

## Acceptance criteria

1. Home renders the nine sections in the specified order, and nothing else.
2. `npm run build` completes; all 49 pages prerender without error.
3. No React hydration warning in the browser console on `/`.
4. Trending and Popular reserve their final height — no layout shift on fill.
5. With the proxy forced to fail, Home renders correctly with both market
   sections absent, and no console error.
6. Delayed-price notice and the not-advice disclaimer are present under both
   market sections.
7. `/#why` from the footer still scrolls to the "Why invest globally" section.
8. No credential appears anywhere in `git diff`.
9. Page is correct at 360px, 768px and 1280px.
