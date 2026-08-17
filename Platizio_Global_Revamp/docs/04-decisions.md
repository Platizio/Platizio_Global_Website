# Decision Log — Home Page Revamp

Every significant choice made during design, with what was rejected and why.
Written so a future reader can tell which decisions were forced by constraints
and which were preferences — the forced ones are expensive to revisit, the
preferences are cheap.

---

## D1 — Stock data comes from a Vercel serverless proxy

**Status:** Decided · **Type:** Forced by constraint

Every ViewTrade market endpoint requires auth. `Symbol Details` is
`authType: uma`, needing `Authorization: Bearer <user_access_token>`. An
anonymous homepage visitor has no token, so the browser cannot call ViewTrade at
all. A server-side component is not a preference — it is the only way this works.

**Rejected**

- *Client-side fetch* — impossible without exposing a credential, and the token
  is user-scoped anyway.
- *Build-time bake* — viable and cheaper, but prices freeze at deploy and need a
  cron rebuild to stay fresh.
- *Hybrid bake + refresh* — best UX, but implements both mechanisms.

**Cost:** Prices are not in the prerendered HTML, so they carry no SEO value, and
there is a brief skeleton before data arrives.

---

## D2 — Strict replacement of Home's sections

**Status:** Decided · **Type:** Preference

Home becomes exactly the nine specified sections. Promo video, YouTube block,
guides and the standalone CTA band come off.

**Consequences, both accepted**

- The guides block was Home's only direct link to individual articles. The
  footer still links `/media#articles`, so articles remain crawlable, but three
  high-value internal links are lost.
- Removing the CTA band leaves no below-the-fold conversion point, so the
  **Regulations section absorbs the "Start Investing" CTA**.

**Reversible:** yes, cheaply — the removed sections stay in git history.

---

## D3 — "Trending" means top movers within Nasdaq-100

**Status:** Decided · **Type:** Forced by constraint

The request was "top movers in the overall market". All 14 catalogue files were
searched: **ViewTrade has no market-wide movers, gainers/losers, screener or
snapshot endpoint.** Their Polygon passthrough exposes only EMA/SMA/RSI and short
interest — not Polygon's gainers/losers snapshot.

So we batch-quote the Nasdaq-100 and rank by absolute % change ourselves.

**Rejected**

- *Second vendor (Polygon/Finnhub) for the ranking* — gives literal all-market
  movers, but adds a paid key, a second vendor, and two feeds that can disagree.
- *Wait for ViewTrade to expose it* — correct long-term, blocks the section now.
- *Curated static strip* — then "trending" is just a label.

**Requirement:** the section must be labelled **"Top movers — Nasdaq-100"**.
Labelling it "market" would overstate what the data is — unacceptable on a
regulated intermediary's site.

**Revisit when:** ViewTrade exposes a snapshot endpoint. Worth asking them — they
already proxy Polygon, so it may be a small change on their side.

---

## D4 — Popular is eight fixed mega-caps

**Status:** Decided · **Type:** Preference

`AAPL · MSFT · NVDA · GOOGL · AMZN · META · TSLA · NFLX`. The lineup is stable;
only prices are live. Instantly recognisable, and the section never surprises you
with an odd name.

**Rejected**

- *Fixed 8 + sparkline* — richer, but ~8 extra historical calls per refresh.
  Good follow-up.
- *Most-held by Platizio users* — genuinely unique, but needs an internal data
  source that is not in the market API, and showing customer holdings carries its
  own compliance question.
- *Mix of stocks and ETFs* — ties to what you actually push. Worth reconsidering.

---

## D5 — Fees table is condensed, `/pricing` stays authoritative

**Status:** Decided · **Type:** Preference

~5 highlight rows leading with $0 account opening, then "See full pricing →".

**Rejected**

- *Full replica of both tables* — 9 rows of fine print mid-homepage, and
  duplicate content across two URLs can split SEO signals.
- *Comparison vs competitors* — more persuasive, but competitor figures need
  sourcing and dating and carry advertising-claim risk under IFSCA.

**Key property:** numbers live in exactly one place. Home shows highlights;
`/pricing` remains the source of truth.

---

## D6 — Regulations is trust badges, not a legal essay

**Status:** Decided · **Type:** Preference

Four short credibility markers — IFSCA regulated, GIFT City IFSC, RBI LRS, US
custody — plus the risk disclaimer, a `/disclaimer` link, and the closing CTA.

**Rejected**

- *Detailed compliance write-up* — strong for SEO but heavy for a homepage tail.
- *Badges + dedicated `/regulations` page* — good idea, but a new page is scope
  beyond a Home revamp. Reasonable follow-up.

---

## D7 — Revamp code lives in `Platizio_Global_Revamp/`, wired into the build

**Status:** Decided · **Type:** Preference, feasibility verified

All revamp code and docs sit in this folder. `src/pages/Home.tsx` re-exports from
it, so the page genuinely renders and `npm run dev` shows the real thing.

**Verified by build spike on 2026-08-17 — not assumed:**

| Check | Result |
|-------|--------|
| `tsc` with the extended `include` | passed |
| Rendered into prerendered HTML (SSR) | marker present in `dist/index.html` |
| Present in client bundle (hydration) | found in `dist/assets/index-*.js` |
| Full build | 49 pages, 3.1s, no errors |
| **Vite alias required?** | **No** |

The original design assumed a Vite alias would be needed. It is not — both the
client build and the SSR prerender use `root: ROOT`, so a plain relative import
from `src/` resolves in both passes. **`vite.config.ts` is untouched**; the only
change outside this folder is one line in `tsconfig.json`.

**Rejected**

- *Staging area, wire up later* — zero build risk, but nothing renders and the
  eventual move is an extra error-prone step.
- *Code in normal `src/` locations* — most idiomatic, but the revamp would be
  scattered rather than reviewable in one folder.

---

## D8 — Skeleton-first rendering

**Status:** Decided · **Type:** Forced by constraint

Both market sections render a fixed-height skeleton on the server **and** on the
client's first paint, filling in only from `useEffect`.

`scripts/prerender.mjs` documents why, in its own header comment: it uses
`renderToString` precisely so the captured DOM is the initial render, because
anything captured after effects have run becomes a hydration mismatch.

**Requirement:** the skeleton must reserve the exact final height, so filling in
causes no layout shift.

---

## D9 — New styles go in their own file

**Status:** Decided · **Type:** Preference

`css/styles.css` is 3,969 lines. Adding ~400 more makes a known problem worse;
refactoring it is out of scope for a Home revamp. New section styles go in
`Platizio_Global_Revamp/styles/home-market.css`, reusing the existing design
tokens.

One new token is required: `--emerald` exists for gains, but **there is no red or
loss colour anywhere in the codebase**.

---

## D10 — Market data failures hide the section

**Status:** Decided · **Type:** Preference

Proxy failure, or fewer than 4 usable quotes, unmounts the section. No error
message, no spinner, no half-empty grid. Individual symbols returning
`notPermissioned` or `notFound` are filtered before ranking.

**Rationale:** a market data problem must never produce a visibly broken
homepage. A missing section reads as a design choice; a grid of empty cards or an
error banner reads as a broken site — worse on a financial platform, where the
homepage is doing trust work.

---

## Open items

| Item | Owner | Blocking |
|------|-------|----------|
| Production ViewTrade credentials — only UAT keys exist today | Platizio | **Yes, for launch** |
| Confirm batching + response shape against live UAT | Phase 0 | **Yes, for build** |
| Ask ViewTrade to expose Polygon snapshot gainers/losers | Platizio | No — would upgrade D3 |
| Decide whether ETFs join the Popular grid | Platizio | No — see D4 |
