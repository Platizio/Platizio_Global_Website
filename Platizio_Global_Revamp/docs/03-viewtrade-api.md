# ViewTrade API — Integration Reference

**Source:** `C:\Users\pc\Desktop\Global_API` (outside this repo, keep it there)
**Catalogue extracted:** 2026-08-14 from ViewTrade's live developer portal
**Environment:** UAT / staging only
**Reviewed for this revamp:** 2026-08-17

> ✅ **Verified against live UAT on 2026-08-17.** The catalogue was documentation
> only; the Phase 0 spike ran real calls. All five gates passed. Sections below
> marked **VERIFIED** reflect observed responses, not documentation.

---

## What does NOT exist

The single most important finding. All 14 catalogue files were searched for
`snapshot`, `gainer`, `loser`, `mover`, `trending`, `popular`, `screener`,
`ranking`, `most-active` and `top`.

**There is no market-wide movers, gainers/losers, screener or ranking endpoint.**

The Polygon passthrough exposes only:

```
/mdp/api/v1/polygon/indicators/ema/{ticker}
/mdp/api/v1/polygon/indicators/sma/{ticker}
/mdp/api/v1/polygon/indicators/rsi/{ticker}
/mdp/api/v1/polygon/stocks/short-interest
/mdp/api/v1/polygon/stocks/short-volume
```

Polygon's own snapshot gainers/losers endpoint is **not** proxied.

**Consequence:** "top movers in the overall market" is not achievable. We rank a
curated Nasdaq-100 universe ourselves and label the section honestly as
*"Top movers — Nasdaq-100"*.

**Worth raising with ViewTrade:** they already proxy Polygon, so exposing the
snapshot endpoint is plausibly a small change on their side. If they add it, the
trending section can switch to true market-wide movers behind the same interface.

---

## Auth

Every market-data endpoint requires authentication. `Symbol Details` is
`authType: "uma"` and needs `Authorization: Bearer <user_access_token>`.

**An anonymous homepage visitor has no such token.** This is why the browser
cannot call ViewTrade directly, and why the serverless proxy exists.

### Machine-to-machine login — **VERIFIED**

```http
POST {uma}/uma/api/v1/auth/b2b/login/api-keys
Content-Type: application/json

{ "api_key": "…", "api_secret": "…" }
```

`authType: none` — the API key itself is the credential. Returns **201** (not
200) on success. The token arrives at the documented path
`api_keys_login.tokens.access_token`, and `access_expires_at` is a **unix
seconds** integer — multiply by 1000 before comparing to `Date.now()`.

Response:

```jsonc
{
  "status": 201,
  "api_keys_login": {
    "tokens": {
      "access_token":      "<jwt>",
      "refresh_token":     "<jwt>",
      "pair_id":           "<id>",
      "access_expires_at":  1234567890,   // unix seconds
      "refresh_expires_at": 1234567890
    }
  }
}
```

Cache the access token in serverless module scope and refresh on
`access_expires_at`. **Never** return it to the browser or write it to a log.

A second option exists — `GET /api/auth/c2c/token` ("Generate API Token") — not
used; the B2B api-keys flow is better documented.

---

## Quotes — the endpoint we use

```http
GET {uma}/aes/api/quotes/equity?symbols=AAPL,MSFT,NVDA
Authorization: Bearer <access_token>
```

`authType: uma`. Returns an **array**.

### Batching — **VERIFIED**

Confirmed working. A single call with 25 comma-separated symbols returned all
25 quotes in **39ms**. The parameter is `symbols` (plural), despite the
catalogue's parameter table saying `symbol`.

```
GET /aes/api/quotes/equity?symbols=AAPL,MSFT,NVDA,…   → 200, array of 25
```

At this speed the full Nasdaq-100 is 4 parallel calls, comfortably inside a
serverless invocation.

---

## ⚠️ `changePercent` is a FRACTION, not a percentage — **VERIFIED**

**The single most important finding of the spike.** Rendering this value
directly as a percentage understates every move by 100×.

Observed for AAPL:

```jsonc
{
  "lastPrice":      307.217,
  "change":           1.2875,
  "yesterdayClose": 305.93,
  "changePercent":    0.00420848   // ← 0.42%, NOT 0.0042%
}
```

`changePercent === change / yesterdayClose` held **exactly** across 14 of 15
sampled symbols. The fifteenth was NFLX with `change: 0`, where the identity is
0/0 — consistent, not an exception.

**Rule: always `changePercent * 100` for display.** A card reading `+0.004%`
instead of `+0.42%` on a regulated broker's homepage is a factual misstatement,
not a formatting nit.

Ranking is unaffected — sorting by `Math.abs(changePercent)` gives the same order
either way.

### Field precision — **VERIFIED**

`lastPrice` is **not** pre-rounded: observed `307.217`, `226.021`, `1001.33`,
`338`. The payload carries a `precision` field (2 for US equities) — use it, and
format to a fixed 2 decimals. Never render `lastPrice` raw.

### Fields we consume — **VERIFIED**

92 fields are returned. We use these ten and discard the rest:

| Field | Type | Use |
|-------|------|-----|
| `symbol` | string | Ticker |
| `companyName` | string | Card title |
| `lastPrice` | number | Displayed price |
| `changePercent` | number | Ranking + coloured change |
| `change` | number | Absolute change |
| `currency` | string | Price formatting |
| `delayed` | boolean | Drives the "Prices delayed" notice |
| `notPermissioned` | boolean | **Filter out when true** |
| `notFound` | boolean | **Filter out when true** |
| `updateTime` | string | Source of `asOf` |
| `yesterdayClose` | number | Denominator behind `changePercent` |
| `precision` | number | Decimal places for price formatting (2 for US equities) |

Observed values, all confirmed present and correctly typed:
`symbol: "AAPL"`, `companyName: "APPLE INC"`, `currency: "USD"`,
`delayed: true`, `notPermissioned: false`, `notFound: false`,
`updateTime: "2026-08-17T05:19:10.234-0400"`.

**`companyName` is uppercase** (`"APPLE INC"`, `"ALPHABET INC"`). Either apply
CSS `text-transform` or keep display names in `POPULAR_8` rather than using the
API's casing directly.

**`updateTime` is US Eastern** (`-0400`). The delayed-prices line renders IST, so
convert — do not assume the offset.

### Edge cases — **VERIFIED**

| Case | Observed | Handling |
|------|----------|----------|
| Zero-change symbol | NFLX: `change: 0, changePercent: 0` | Valid data, not missing. Must not be filtered or treated as falsy. |
| Null price / percent | None in 25 symbols | Still guard — UAT is not production. |
| Mixed currencies | All `USD` | Guard anyway; the field exists for a reason. |
| `notPermissioned` / `notFound` | None across 25 | Filter path is unproven — keep it, and log if it ever fires. |

⚠️ `change: 0` is a real trap: `if (!quote.changePercent)` would discard NFLX.
Use explicit `!= null` checks, never truthiness.

### Delayed data — **VERIFIED**

All 25 quotes returned `delayed: true`. This is delayed market data and must be
labelled as such — see the compliance section of [`01-spec.md`](01-spec.md).

### Note on UAT values

Staging prices are not real market data (MU at $1001, NVDA at $226). Fine for
integration work, but **do not use UAT output to sanity-check whether the numbers
look right** — only whether the plumbing works.

---

## Other endpoints (not used, noted for later)

| Endpoint | Auth | Possible future use |
|----------|------|---------------------|
| `GET /aes/api/quotes/search?criteria=` | uma | Symbol search |
| `GET /aes/api/quotes/equity/historical` | uma | Sparklines |
| `GET /aes/api/quotes/equity/intraday` | uma | Intraday charts |
| `GET /mdp/api/v1/aggregation/fundamentals/{ticker}` | uma | Stock detail pages |
| `GET /api/v1/insight/v1/quotes/equity` | middleware | ETF quotes — documents `symbols` batching explicitly |
| `POST /api/v1/insight/v1/tipranks/analyst-consensus` | middleware | Analyst ratings |

---

## Service base URLs

The catalogue uses `*.example.com` placeholders. Real hosts are in
`Global_API/credentials/client-url-config.json`.

| Key | UAT host | Used for |
|-----|----------|----------|
| `uma` | `https://user-auth-gateway-staging.viewtrade.in` | Auth + quotes — **the only one this revamp needs** |
| `mdp` | same host as `uma` | Aggregation / Polygon passthrough |
| `middleware` | `https://middleware-staging.viewtrade.in` | Insight, ETF, analyst data |

Both auth and quotes are on the `uma` host, so **one base-URL env var covers
everything this revamp does**.

Configured as **one environment variable** for the `uma` base URL. Nothing else
is needed.

---

## Environment variables

Set in Vercel project settings. Never in the repo.

| Variable | Purpose |
|----------|---------|
| `VIEWTRADE_BASE_URL` | `uma` service base URL |
| `VIEWTRADE_API_KEY` | B2B api-keys login credential |

For local development use a `.env.local` file — already covered by `.gitignore`.

---

## Security

From ViewTrade's own extraction notes:

> "The 'Credentials (UAT)' sheet and credentials/ folder contain live UAT API
> keys and the C2C signing key. Keep this folder out of shared drives and
> version control. Rotate if leaked."

Rules for this project:

1. `Global_API/` is **never** copied into this repo.
2. No key in any source file, doc, commit message, or test fixture.
3. The proxy reads credentials from environment variables only.
4. The B2B token stays in serverless memory — never sent to the browser.
5. `git diff` is reviewed for credentials before every commit.

---

## Caveats from the extraction notes

1. Nothing is response-verified against UAT.
2. `sftpAdmin` service key is unresolved in the URL config — irrelevant here.
3. 19 doc-page endpoints hardcode the production host; UAT was substituted.
4. "Same Route As" is not a duplicate flag — the same route is documented
   several times for different use cases.
5. The bundled fallback catalogue inside ViewTrade's JS is stale; the live
   catalogue is authoritative. This document is based on the live one.
