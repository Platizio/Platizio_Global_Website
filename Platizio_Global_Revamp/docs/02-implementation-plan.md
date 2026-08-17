# Implementation Plan — Home Page Revamp

**Branch:** `Platizio_Global_Revamp`
**Date:** 2026-08-17
**Status:** Phases 0–2 complete, and Phase 4 folded into Phase 2 (2026-08-17) —
Phase 3 (wire real data) is next

> **Scope change, 2026-08-17.** Mid-Phase 2 the brief moved from "add sections in
> the existing style" to a new design language across the site. See
> [D11](04-decisions.md#d11--a-new-design-language-applied-site-wide).
> Phase 4 (assembling Home) was pulled forward into Phase 2, because a new look
> cannot be judged section by section — the page had to be seen whole.

Six phases. Each has a verification gate that must pass before the next begins.
Phases 2 and 4 touch no network, so they cannot be blocked by API problems.

---

## Phase 0 — API spike ✅ COMPLETE (2026-08-17)

**All five gates passed.** Run against live UAT; spike code was throwaway and
lived in the scratchpad, never in the repo.

| Gate | Result |
|------|--------|
| 1 · B2B api-key login returns usable token | **PASS** — HTTP 201, token at the documented path |
| 2 · Single-symbol quote returns 200 + array | **PASS** |
| 3 · 25-symbol batch in one call | **PASS** — 25/25 in 39ms |
| 4 · Required fields present | **PASS** — all 10, of 92 returned |
| 5 · Values sane | **PASS** |

### What the spike changed

1. **`changePercent` is a fraction, not a percentage.** Must be `×100` for
   display. Verified exactly across 14/15 symbols. See
   [`03-viewtrade-api.md`](03-viewtrade-api.md).
2. **`change: 0` is real data** (NFLX). Truthiness checks would silently discard
   it — use `!= null`.
3. **`lastPrice` is not pre-rounded** (`307.217`, `1001.33`). Format to the
   payload's `precision` field.
4. **`companyName` is uppercase** and **`updateTime` is US Eastern**, not IST.
5. Login returns **201**, and `access_expires_at` is **unix seconds** — ×1000
   before comparing to `Date.now()`.
6. Auth and quotes share the `uma` host — one base-URL env var suffices.

Batching at 39ms for 25 symbols means the full Nasdaq-100 is 4 parallel calls,
comfortably inside one serverless invocation.

---

<details>
<summary>Original Phase 0 definition (kept for reference)</summary>

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

</details>

---

## Phase 1 — Serverless proxy ✅ COMPLETE (2026-08-17)

**All 13 gates pass**, verified by invoking the real bundled handler against
live UAT — not a reimplementation.

| Gate | Result |
|------|--------|
| 200 with 8 trending + 8 popular | **PASS** |
| Cache headers correct | **PASS** |
| Payload under 8KB | **PASS** — 1.8KB |
| `changePercent` in percentage points | **PASS** |
| Prices rounded to 2dp | **PASS** |
| Configured display names applied | **PASS** |
| `asOf` not poisoned by a stale ticker | **PASS** — 40 min old |
| Trending sorted by `|changePercent|` | **PASS** |
| Zero-change symbol retained | **PASS** — NFLX survives |
| Quote trimmed 92 → 6 fields | **PASS** |
| No credential in response | **PASS** |
| Token reused on second call | **PASS** — 803ms → 76ms |
| Non-GET rejected | **PASS** — 405 |
| Bad credentials → clean 503, `no-store` | **PASS** |
| Missing env vars → clean 503 | **PASS** |

### What Phase 1 corrected

1. **`precision` must not drive display formatting.** The spec said to format to
   the payload's `precision` field. Verification showed it varies per symbol
   (0, 1, 2, 3) — MU renders `$1000`, ARM `$285.5`, FANG `$206.574`. Now always
   2dp.
2. **`asOf` must be scoped to displayed quotes.** Taking the oldest across the
   whole universe gave a 13-day-old timestamp because one dormant ticker dragged
   the minimum back, while every shown symbol was current.
3. **Three env vars, not two** — login needs `api_secret` as well as `api_key`.
4. `@types/node` added as a devDependency; `api` added to `tsconfig` include so
   the function is type-checked rather than silently unchecked.

Full site build still passes: 49 pages, no errors.

<details>
<summary>Original Phase 1 definition (kept for reference)</summary>

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

</details>

---

## Phase 2 — Components + new design language ✅ COMPLETE (2026-08-17)

Built against the fixture, verified in a real browser. Home is assembled and
renders the nine sections; only the data source is still mock.

### Measured gates

| Gate | Result |
|------|--------|
| Layout shift, popular grid | **0px** (was 31px) |
| Layout shift, popular card | **0px** (was 15.6px) |
| Layout shift, ticker band | **0px** (was 6px) |
| Marquee loop seam | **0px** (was 16px) |
| Contrast, 17 text/background pairs | **17 pass** |
| Horizontal overflow at 375 / 1265 | **none** |
| Grid collapse 4 → 2 → 1 | **correct** |
| Console errors | **none** |
| Full build | **49 pages, no errors** |
| Old sections removed from HTML | **confirmed** — promo video, YouTube, guides, CTA band all absent |

### Three bugs the browser caught that review would not have

1. **Layout shift of 31px.** Skeletons were fixed-pixel bars sized by hand to
   match the type. Hand-computed heights cannot track a fluid `clamp()` scale.
   Fixed by making the skeleton *the same elements* with the same typography,
   wearing a shimmer — geometry is then identical by construction.
2. **Marquee seam of 16px, exactly half the gap.** Flex `gap` puts N-1 gaps
   between N items, but a -50% loop needs N to tile. The ticker jumped once per
   46-second cycle. Fixed by moving inter-item spacing to `padding-right`.
3. **`--gray-500` at 4.49:1 — AA is 4.5.** One token, one hundredth of a point,
   five failing places: company names, section intros, regs body, disclaimer,
   footnote. Also `--gray-400` at ~2.9:1 was being used for the currency code.

Two further "failures" were bugs in the contrast checker itself — translucent
and gradient backgrounds read as opaque. Worth remembering that a measurement
tool needs verifying before its output is trusted.

<details>
<summary>Original Phase 2 definition (kept for reference)</summary>

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

</details>

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
| ~~API shape differs from docs~~ | ~~High~~ | — | **Retired** — verified in Phase 0 |
| ~~Batching unsupported~~ | ~~Medium~~ | — | **Retired** — 25/25 in one call, 39ms |
| `changePercent` rendered unscaled | **High** if unguarded | **High** — 100× understatement | Convert once in the proxy, never in components. Unit-test the formatter. |
| Truthiness check drops `change: 0` | Medium | Medium | `!= null` checks only; NFLX is the regression case |
| Hydration mismatch | Medium | Medium | Skeleton-first; Phase 3 gate |
| UAT-only credentials | **Certain** | High | Build and demo on UAT; production keys needed to launch |
| ViewTrade rate limits | Unknown | Medium | 60s CDN cache means one upstream call per minute total |
| Credential leak into git | Low | **Severe** | Env vars only; `.gitignore`; diff review at Phase 5 |

### Known blocker for launch

The credentials in `Global_API/` are **UAT/staging only**. This can be built,
demoed and reviewed end to end on UAT, but **production ViewTrade credentials
are required before the revamped Home can go live.** Worth requesting now so it
does not gate the release later.
