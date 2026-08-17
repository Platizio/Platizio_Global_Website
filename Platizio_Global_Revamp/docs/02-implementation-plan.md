# Implementation Plan — Home Page Revamp

**Branch:** `Platizio_Global_Revamp`
**Date:** 2026-08-17
**Status:** Not started — Phase 0 is next

Six phases. Each has a verification gate that must pass before the next begins.
Phases 2 and 4 touch no network, so they cannot be blocked by API problems.

---

## Phase 0 — API spike ⚠️ GATES EVERYTHING

**Throwaway code. Nothing else starts until this passes.**

`Global_API/READ_ME_FIRST.txt` states plainly:

> "No API calls were made. Nothing is response-verified against UAT — this is
> ViewTrade's own documentation, resolved to your UAT hosts."

Every field in this design comes from documentation, not observed traffic. Ten
minutes here prevents building components against a response shape that does not
exist.

**Steps**

1. Read credentials from `Global_API/credentials/` — **read only, never copy
   into the repo**. Export them as shell environment variables for the spike.
2. `POST /uma/api/v1/auth/b2b/login/api-keys` → confirm a JWT comes back at
   `api_keys_login.tokens.access_token`.
3. `GET /aes/api/quotes/equity?symbols=AAPL` with `Authorization: Bearer <token>`
   → confirm 200 and an array response.
4. Repeat with 25 comma-separated symbols → **confirm batching actually works.**
5. Record the real field names for price and change %.

**Gate — all five must hold:**

- [ ] B2B api-key login returns a usable token
- [ ] A single-symbol quote returns 200
- [ ] A 25-symbol batch returns 25 entries in one call
- [ ] `changePercent` and `lastPrice` exist and carry sane values
- [ ] `delayed` and `notPermissioned` behave as documented

**If batching fails:** 100 symbols becomes 100 calls. Too slow and too rate-limit
prone for a page load. Fall back to a ~25-symbol universe and relabel the section
accordingly. **Stop and raise this** — it changes the spec.

**If B2B login fails:** the whole live-data approach is blocked. Stop and raise
it with ViewTrade before writing any further code.

---

## Phase 1 — Serverless proxy

No UI. Verifiable entirely with `curl`.

**Files**

| File | Purpose |
|------|---------|
| `api/_lib/viewtrade.ts` | Auth + transport only: `login()`, `getQuotes(symbols)`, token cache |
| `api/quotes.ts` | Route handler: fetch, filter, rank, trim, cache headers |
| `Platizio_Global_Revamp/types/market.ts` | `Quote`, `QuotesResponse` — shared by function and components |
| `Platizio_Global_Revamp/data/marketUniverse.ts` | `NASDAQ_100` tickers, `POPULAR_8` with display names |

`api/_lib/` is underscore-prefixed so Vercel does not route it.

**Behaviour**

- Cache the B2B token in module scope; refresh on `access_expires_at`.
- Batch the universe 25 symbols per call, in parallel.
- Drop any quote with `notPermissioned` or `notFound`.
- `trending` = top 8 by `Math.abs(changePercent)`.
- `popular` = the eight `POPULAR_8` symbols from the same payload.
- Trim to only the fields the UI needs — do not forward the full ~60-field object.
- Set `Cache-Control: s-maxage=60, stale-while-revalidate=300`.
- On upstream failure return 503 with an empty body. **Never** return a partial
  or fabricated payload.

**Gate**

- [ ] `curl localhost:3000/api/quotes` returns 8 trending + 8 popular
- [ ] Second call within 60s does not hit ViewTrade (token + CDN cache work)
- [ ] Response is under ~8KB
- [ ] No credential appears in the response body or in any log line
- [ ] Bad credentials produce a clean 503, not a stack trace

---

## Phase 2 — Components against mock data

No network. Build all four sections against a fixture so layout and states are
provable in isolation.

**Files**

| File | Purpose |
|------|---------|
| `components/TrendingBanner.tsx` | Scrolling movers strip |
| `components/PopularStocks.tsx` | 4×2 grid |
| `components/FeesTable.tsx` | Condensed fees table |
| `components/Regulations.tsx` | Trust badges, disclaimer, closing CTA |
| `styles/home-market.css` | All new styles — imported from `entry-client.tsx` |
| `data/mockQuotes.ts` | Fixture; deleted at the end of Phase 3 |

**Rules**

- Reuse existing design tokens from `css/styles.css`.
- Add **one** new token — a loss/red colour. `--emerald` exists for gains but
  there is no red token in the codebase.
- Every component renders three states: `skeleton`, `ready`, `empty`.
- The skeleton must reserve the exact final height.
- Marquee pauses on hover and under `prefers-reduced-motion: reduce`.

**Gate**

- [ ] All four render correctly from the fixture
- [ ] Skeleton and ready states are the same height — measured, not eyeballed
- [ ] Gain/loss colours meet WCAG AA against their background
- [ ] Correct at 360px, 768px, 1280px

---

## Phase 3 — Wire real data

**Files**

| File | Purpose |
|------|---------|
| `hooks/useMarketData.ts` | Fetch `/api/quotes`, manage state, abort on unmount |

**Rules**

- Fetch in `useEffect` only — never during render.
- Initial state is `skeleton` on both server and client, so SSR and hydration
  markup match exactly.
- Abort the request on unmount.
- Fewer than 4 usable quotes → the section unmounts.
- Format `asOf` into the delayed-prices line in IST.

**Gate**

- [ ] Real prices appear on `/`
- [ ] **Zero hydration warnings in the console** — the primary risk of this phase
- [ ] No layout shift when data fills in
- [ ] Proxy forced to 503 → both sections vanish cleanly, rest of page intact
- [ ] `data/mockQuotes.ts` deleted

---

## Phase 4 — Assemble Home

**Files**

| File | Change |
|------|--------|
| `Platizio_Global_Revamp/Home.tsx` | The revamped page, nine sections in order |
| `src/pages/Home.tsx` | Re-export the above |
| `tsconfig.json` | `include` gains `Platizio_Global_Revamp` — **already applied** |
| `.gitignore` | Defensive credential patterns |

**Rules**

- Carry the Hero, Why and How sections over from the current `Home.tsx` intact.
- **Preserve `id="why"`** — the footer links to `/#why`.
- Keep `<SEO/>` mounted; the prerender throws without a `<title>`.
- Remove promo video, YouTube, guides and the standalone CTA band.

**Gate**

- [ ] `npm run build` completes, all 49 pages prerender
- [ ] Nine sections in the specified order, nothing else
- [ ] `/#why` scrolls correctly from the footer

---

## Phase 5 — Verification

Against the acceptance criteria in [`01-spec.md`](01-spec.md).

- [ ] All nine acceptance criteria pass
- [ ] Console clean on `/` — no warnings, no errors
- [ ] Lighthouse: no CLS regression versus current Home
- [ ] `git diff` reviewed line by line for credentials
- [ ] Keyboard navigation reaches every interactive element
- [ ] Screenshots at all three breakpoints

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API shape differs from docs | **High** — nothing verified | High | Phase 0 gates everything |
| Batching unsupported | Medium | High | Shrink universe, relabel section |
| Hydration mismatch | Medium | Medium | Skeleton-first; Phase 3 gate |
| UAT-only credentials | **Certain** | High | Build and demo on UAT; production keys needed to launch |
| ViewTrade rate limits | Unknown | Medium | 60s CDN cache means one upstream call per minute total |
| Credential leak into git | Low | **Severe** | Env vars only; `.gitignore`; diff review at Phase 5 |

### Known blocker for launch

The credentials in `Global_API/` are **UAT/staging only**. This can be built,
demoed and reviewed end to end on UAT, but **production ViewTrade credentials
are required before the revamped Home can go live.** Worth requesting now so it
does not gate the release later.
