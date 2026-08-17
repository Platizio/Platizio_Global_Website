# Spec — Pricing Page Revamp

**Branch:** `Platizio_Global_Revamp`
**Date:** 2026-08-17
**Status:** Approved — implementation not started

## Goal

Rebuild `/pricing` so a visitor can answer *"what will this actually cost me?"*
without doing arithmetic. The published rates do not change; the presentation
does.

The current page states charges like `SEC Fee — $0.0000206 multiplied by trade
value`. That is accurate and unusable: nobody can turn it into a number for
their own trade. A pricing page exists to answer one question, and this one
makes the reader do the work.

## Page structure

| # | Section | Origin |
|---|---------|--------|
| 1 | Page hero | Existing, restyled to the ink scale |
| 2 | What you pay | **New** — leads with what is free, then the one rate that matters |
| 3 | Trade cost calculator | **New** — the signature |
| 4 | Full charge schedule | Existing two tables, reframed as reference |
| 5 | Tax | TCS explained · capital-gains comparator · dividend withholding |
| 6 | Closing CTA | Existing |

The calculator is the signature for the same reason the ticker is on Home: it
is the one element that responds to the reader. It also exposes something the
tables cannot — see [The $1 minimum](#why-the-1-minimum-matters).

---

## Single source of truth for rates

**All rates move into `data/pricingRates.ts`.** Today they are inline in
`Pricing.tsx`'s JSX, and Home's fees table holds a second copy. Adding a
calculator would make three independent statements of the brokerage rate, and
they will drift.

One module, consumed by the schedule tables, both calculators, and Home's fees
table. Changing 0.29% becomes a one-line edit that cannot leave anything stale.

```ts
export const RATES = {
  brokeragePct: 0.0029,      // 0.29% per transaction
  brokerageMinUsd: 1,        // whichever is greater
  igstPct: 0.18,             // on brokerage value, Indian residents
  ifscaTurnoverPerUsd: 0.00005,
  secFeePerUsd: 0.0000206,   // sell side only
  finraPerShare: 0.000195,   // sell side only, PER SHARE
  ltcgPct: 0.125,            // holding > 24 months
  stcgAssumedSlabPct: 0.30,  // assumption, stated in the UI
  ltcgThresholdMonths: 24,
  dividendWithholdingPct: 0.25,
  tcsPct: 0.20,
  tcsThresholdInr: 1_000_000,
  ratesAsOf: '2026-08-17',
} as const
```

Figures are taken from what the site already publishes (`src/pages/Pricing.tsx`
today). No new rates are introduced.

---

## Section 3 — Trade cost calculator

**Input:** trade value in USD, and side (buy / sell). Default `$1,000`, buy.

**Computation:**

```
brokerage = max(value × 0.0029, 1.00)
igst      = brokerage × 0.18
ifsca     = value × 0.00005
sec       = side === 'sell' ? value × 0.0000206 : 0
total     = brokerage + igst + ifsca + sec
effective = total / value
```

**Output:** an itemised breakdown, the total, and the **effective all-in
percentage** — the number the reader actually wants.

### Rounding rule

Compute at full precision and round **only for display** — 2 decimals for USD,
2 for the effective percentage. The total is the sum of the *unrounded*
components, never of the displayed ones.

**Round half-up, with an epsilon correction. `toFixed` alone is not
sufficient.** This is not pedantry — it changes a figure on this page:

```
$200 buy → effective = 1.19 / 200 = 0.595%
  (0.595).toFixed(2)                              → "0.59"   ✗
  (Math.round((0.595 + Number.EPSILON) * 100) / 100).toFixed(2) → "0.60"  ✓
```

0.595 is stored as fractionally less than 0.595 in binary floating point, so
`toFixed` rounds it down. The same flaw hits `1.005 → "1.00"` and
`2.675 → "2.67"`. Financial figures round half-up by convention, and a pricing
page that rounds a customer's cost *down* by a cent is the wrong error to make.

`lib/pricing.ts` exports one `roundHalfUp(value, decimals)` helper and every
displayed figure goes through it.

Worked examples, to be used as implementation test cases:

| Trade | Brokerage | IGST | IFSCA | SEC | Total | Effective |
|-------|-----------|------|-------|-----|-------|-----------|
| $1,000 buy | $2.90 | $0.52 | $0.05 | — | **$3.47** | **0.35%** |
| $200 buy | $1.00 *(min)* | $0.18 | $0.01 | — | **$1.19** | **0.60%** |
| $5,000 sell | $14.50 | $2.61 | $0.25 | $0.10 | **$17.46** | **0.35%** |

All three were verified arithmetically before being written down. The $200 row
is the one that depends on the half-up rule above — `toFixed` alone renders it
`0.59%`.

### Why the $1 minimum matters

On a $200 trade the brokerage minimum makes the effective brokerage **0.50%**,
not 0.29% — and **0.60% all-in**. The rate table cannot show this; the
calculator makes it obvious. Surfacing it is the point, not a side effect:
a reader who discovers it themselves after their first small trade trusts the
page less.

### FINRA is excluded from the total, deliberately

FINRA's fee is **$0.000195 per share**, not per dollar. Trade value alone
cannot compute it, and every other fee here is value-based.

Rather than force a share-count input to capture fractions of a cent, it
renders as a stated line beneath the breakdown:

> FINRA also charges $0.000195 per share sold — typically under $0.05 on a
> retail order, and not included in the total above.

Excluded and disclosed beats included and wrong.

---

## Section 5 — Tax

### TCS: explained, not calculated

**A TCS calculator was explicitly rejected**, and the reason should survive in
this document: the ₹10 lakh threshold is **cumulative across the financial
year and across all LRS purposes** — travel, education, gifts, not just
investing. A calculator taking only "this remittance" would understate TCS for
anyone who had already remitted, which is precisely the higher-value customer.
A confidently wrong tax number is worse than none.

Presented as content with a worked example:

> TCS applies at 20% on LRS remittances **above ₹10 lakh in a financial year**,
> counted across every LRS purpose — not just investing. Remit ₹15 lakh in a
> year and TCS applies to the ₹5 lakh above the threshold: **₹1,00,000**.
>
> TCS is not a cost. It is a credit against your income tax liability, claimed
> when you file.

That last line is the one readers most often miss.

### Capital gains comparator

**Input:** gain amount in ₹. Default ₹1,00,000.

**Output:** both outcomes side by side — the holding period *is* the point, so
it is a comparison rather than an input.

| | Short-term (≤24 months) | Long-term (>24 months) |
|---|---|---|
| Rate | slab, **assumed 30%** | 12.5% |
| On ₹1,00,000 | ₹30,000 | ₹12,500 |

Plus the difference stated plainly: **₹17,500 saved by holding past 24 months.**

Two assumptions stated inline, not in a footnote:

- 30% is the highest slab, used as the assumption; the reader's own slab may differ.
- **Surcharge and cess are excluded.** The site's own copy says short-term is
  "slab + surcharge & cess", so omitting them understates short-term tax. Saying
  so is required for the figure to be honest.

### Dividend withholding

Content, not a tool: 25% withheld at source in the US, claimable as foreign tax
credit in India. Links to the existing DTAA article.

---

## Rendering and SSR

**No fetch, no skeleton, no hydration risk.** Both calculators are pure
arithmetic over a constant default, so the server renders a complete and
correct breakdown, the client's first render is byte-identical, and the page is
useful before JavaScript loads.

Hard rules:

- Initial state is a **constant** (`$1,000`, buy, `₹1,00,000`). Never
  `Date.now()`, never random, never derived from the environment.
- Formatting uses the deterministic helpers in `lib/format.ts` for USD, and a
  new INR helper following the same rule. **No `Intl` during render** — a
  locale difference between Node and the browser is a hydration mismatch.
- Invalid or empty input renders the breakdown as `—` rather than `NaN`, and
  never unmounts the section.

## Compliance

- Both tools carry **"Illustration only — not tax advice"**, linking
  `/disclaimer`.
- The gains comparator states its 30% assumption and the surcharge/cess
  exclusion **inline**, adjacent to the number.
- A **"Rates as of 2026-08-17"** line sits under the schedule, driven by
  `RATES.ratesAsOf`.
- No figure is introduced that the site does not already publish.

## Files

**New**

| File | Purpose |
|------|---------|
| `Platizio_Global_Revamp/pages/Pricing.tsx` | The page |
| `Platizio_Global_Revamp/data/pricingRates.ts` | Every rate, once |
| `Platizio_Global_Revamp/components/TradeCostCalculator.tsx` | |
| `Platizio_Global_Revamp/components/CapitalGainsCompare.tsx` | |
| `Platizio_Global_Revamp/lib/pricing.ts` | Pure cost/tax maths, unit-testable without React |
| `Platizio_Global_Revamp/styles/pricing.css` | |

**Modified**

| File | Change |
|------|--------|
| `src/pages/Pricing.tsx` | One-line re-export, matching Home |
| `src/entry-client.tsx` | Import `pricing.css` |
| `Platizio_Global_Revamp/components/FeesTable.tsx` | Read from `pricingRates.ts` instead of its own copy |

Keeping the maths in `lib/pricing.ts` rather than inside the components is what
makes the worked examples above testable directly.

## Non-goals

- No TCS calculator (see above)
- No FX conversion — trade costs stay in USD, tax stays in ₹, so no rate is needed
- No slab picker; the comparison is the point
- No surcharge/cess modelling — excluded and disclosed
- No competitor comparison table
- No change to the published rates

## Acceptance criteria

1. `/pricing` renders the six sections in order.
2. `npm run build` completes; all 49 pages prerender.
3. **No hydration warning** on `/pricing`.
4. The three worked examples above compute exactly as tabulated.
5. A $200 trade shows an effective rate above 0.29%, demonstrating the minimum.
6. Empty or invalid input shows `—`, never `NaN`, and never unmounts a section.
7. Both tools show the not-tax-advice line; the comparator states its 30% and
   surcharge/cess assumptions inline.
8. Brokerage rate appears in exactly one source file.
9. No horizontal scroll at 360 / 768 / 1280; tables remain readable on mobile.
10. Every text/background pair meets WCAG AA.
