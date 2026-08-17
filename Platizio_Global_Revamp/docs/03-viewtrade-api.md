# ViewTrade API — Integration Reference

**Source:** `C:\Users\pc\Desktop\Global_API` (outside this repo, keep it there)
**Catalogue extracted:** 2026-08-14 from ViewTrade's live developer portal
**Environment:** UAT / staging only
**Reviewed for this revamp:** 2026-08-17

> ⚠️ **Nothing here is response-verified.** ViewTrade's own extraction notes
> state: *"No API calls were made. Nothing is response-verified against UAT."*
> Every field below comes from their documentation. Phase 0 of the plan exists
> to confirm it.

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

### Machine-to-machine login — the path we use

```http
POST {uma}/uma/api/v1/auth/b2b/login/api-keys
Content-Type: application/json
```

`authType: none` — the API key itself is the credential.

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

### Batching

Documented as `symbol` (singular) in the parameter table but
`"symbols": "AAPL"` in the example, with an array response. The parallel ETF
endpoint documents `symbols` explicitly as *"Comma-separated symbols"*.

**Batching is therefore near-certain but unproven — Phase 0 step 4 confirms it.**
The plan batches 25 symbols per call.

### Fields we consume

The payload has ~60 fields. We use these and discard the rest:

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

### Delayed data

The sample response carries `"delayed": true, "source": "Delay"`. This is
delayed market data and must be labelled as such — see the compliance section of
[`01-spec.md`](01-spec.md).

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

The catalogue uses `*.example.com` placeholders. Real UAT hosts are in
`Global_API/credentials/client-url-config.json`.

| Key | Used for |
|-----|----------|
| `uma` | Auth + quotes — **the only one this revamp needs** |
| `mdp` | Market data aggregation / Polygon passthrough |
| `middleware` | Insight, ETF, analyst data |

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
