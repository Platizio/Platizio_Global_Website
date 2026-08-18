# Spec — About Page Revamp

**Branch:** `Platizio_Global_Revamp`
**Date:** 2026-08-17
**Status:** Implemented and verified (2026-08-17)

## Verification

All ten acceptance criteria pass.

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Six sections in order | **PASS** |
| 2 | Build, 49 pages prerender | **PASS** |
| 3 | No hydration warning on /about | **PASS** — console completely clean |
| 4 | Eight members visible simultaneously at 1024px+ | **PASS** — 4x2 grid, no carousel, no setInterval |
| 5 | Every regulatory claim traces to its source | **PASS** — all four verified verbatim before writing |
| 6 | SIPC limitation shares a sentence with the amount | **PASS** |
| 7 | TeamCarousel.tsx deleted, nothing imports it | **PASS** |
| 8 | Failed photo shows initials | **PASS** — error event hides the image, `AB` revealed |
| 9 | No horizontal scroll at 360 / 768 / 1280 | **PASS** |
| 10 | WCAG AA on every text/background pair | **PASS** — 16 pairs |

Prerendered `dist/about/index.html` contains all eight names, the full SIPC
sentence, and no carousel markup. Six routes re-checked for regressions after
the carousel deletion: all render, none scroll horizontally.

### Two measurement artifacts, not defects

The contrast checker reported the hero subtitle at ratio 1. `.page-hero` paints
a gradient, which `backgroundColor` reports as transparent. Measured against the
gradient’s actual stops it is **15.54:1 and 13.21:1**. The same artifact appeared
on Home’s CTA band.

The founder block stayed two-column at a reported 768px despite a 780px
breakpoint — media queries match the full viewport including the scrollbar,
while `clientWidth` excludes it. Measured at that width the text column is
314px and every line still fits, so the layout was left alone rather than
“fixed”.

## Goal

Rebuild `/about` around the two things this page can prove and no competitor can
copy: **the people behind the platform**, and **exactly how the money and shares
are held**.

The current page solves neither. It buries eight named team members in a 3D
autoplay carousel showing roughly one at a time, gives the founder a small card,
and describes regulation as "operating under strict regulatory frameworks" — a
phrase that asserts trustworthiness without evidencing it.

It also duplicates work done elsewhere: Home's Regulations section covers IFSCA,
GIFT City, LRS and custody, and `/products` owns the product list.

## Page structure

| # | Section | Origin |
|---|---------|--------|
| 1 | Page hero | Existing, restyled |
| 2 | Why we exist | **New** — problem, thesis, lineage in one section |
| 3 | Founder | Existing content, editorial treatment |
| 4 | The team | Carousel → **grid, all eight visible** |
| 5 | How we're structured | **Rewritten** — regulation + ViewTrade merged, sourced |
| 6 | Closing CTA | Existing |

**Removed:** "Our Product Offerings" (duplicates `/products`), and the standalone
"Regulatory Compliance" and "Partnership" sections (merged into section 5).

---

## Section 2 — Why we exist

Two short paragraphs and no more.

**The problem, stated specifically.** Not "global investing is hard" but the
friction this audience actually meets: remittance paperwork under the LRS, tax
treatment nobody explains, and no guidance once the account is open.

**The lineage, in one sentence.** Platizio Global is backed by Platizio Services
LLP, a licensed distributor of mutual funds and Specialised Investment Funds in
India. That is a real credibility asset for a new overseas platform — an
established regulated business stands behind it — but it is one sentence of
context, not the opening subject. A visitor who came to buy US stocks should not
open this page and read about Indian mutual funds.

⚠️ **The failure mode here is generic mission copy.** "Democratising global
investing", "empowering every investor", "making markets accessible" are what
every fintech writes; they signal nothing because they are unfalsifiable. Every
sentence must be one a competitor could not honestly copy. If a sentence would
be equally true of any broker, cut it.

---

## Section 3 — Founder

Vividh Chaturvedi, Founder and CEO. MBA, Certified Financial Planner (CFP&reg;).
30+ years across financial services and international business, with a background
in global equities, bonds and commodities.

The registered mark on CFP appears on the current page and must be preserved.

Editorial treatment rather than a card in a row: a large portrait, the
credentials given room, and the experience stated as fact rather than as a
bullet. On a page whose job is "who is behind my money", the person answering
that question should not be a 300px card.

Photo assets already exist: `/sir.png`, `/sir.webp`.

---

## Section 4 — The team (signature)

Eight named people, real photographs, roles stated — a 4x2 grid so the whole
team is visible at once.

Members (from `src/components/TeamCarousel.tsx`, photos in `public/team/`):

| Name | Role |
|------|------|
| Aanyaa Bhardwaj | Social Media Executive |
| Aayush Sharma | Product Software Developer |
| Anuj Pal | Senior Financial Market Analyst |
| Deepika Agarwal | Financial Market Analyst |
| Kartik Vishnani | Financial Market Analyst |
| Kavya Khatri | Social Media Executive |
| Sumit Katyal | Product Software Developer |
| Vinayak Tyagi | Product Software Developer |

### Why the carousel goes

`TeamCarousel` is a 3D autoplay rotation showing about one member at a time. For
a page whose entire job is answering "who is actually behind this", hiding seven
of eight people behind a rotation most visitors will not wait through is the
wrong trade.

A grid also removes the autoplay, the reduced-motion handling and the
`setInterval` — less code, no motion concerns — and reuses the grid pattern
already established by Home's Popular stocks section.

`TeamCarousel.tsx` is imported only by `About.tsx`, so it becomes dead code and
is deleted. The team data moves to `data/team.ts`.

**Photo handling:** `object-fit: cover` on a fixed aspect ratio, so mixed source
dimensions cannot break the grid, and `loading="lazy"` on all eight. The
carousel's initials fallback is preserved for any photo that fails to load — a
broken-image icon where a colleague's face should be is worse than initials.

---

## Section 5 — How we're structured

The section that earns the page. Home states the badges; this answers the
follow-up questions a sceptical investor actually has.

**Every claim below is already published on this site.** Nothing is introduced.

| Claim | Source |
|-------|--------|
| Accounts are opened **in your name** with ViewTrade IFSC at GIFT City, once KYC is approved | `src/pages/FAQs.tsx` |
| Client money and securities are held with ViewTrade IFSC (GIFT City), **DTCC as ultimate custodian**, in your name, and **kept separate from Platizio** | `src/pages/FAQs.tsx` |
| US brokerage accounts are covered by **SIPC up to USD 500,000**, including up to USD 250,000 cash. SIPC protects against **failure of the brokerage firm, not against a fall in market value** | `src/pages/FAQs.tsx` |
| Platizio is **not** a broker, broker-dealer, custodian, investment adviser, portfolio manager, research analyst or authorised dealer. It facilitates access; all brokerage, execution, custody, clearing and settlement are performed by **ViewTrade or its appointed service providers** | `src/pages/Disclaimer.tsx` |
| Investments are routed through the GIFT City framework under IFSCA oversight | `src/pages/About.tsx` (current) |

**The "what Platizio is not" statement is the most valuable sentence on the page
and is currently buried in the Disclaimer.** Stating plainly that Platizio does
not hold your money or execute your trades — that a regulated party does — is
far more reassuring than any amount of "strict regulatory frameworks" language,
because it is specific and checkable.

**The SIPC caveat is not optional.** SIPC covers broker failure, not market
losses. Stating the coverage without the limitation would be misleading on a
regulated intermediary's site, so both halves appear in the same sentence.

ViewTrade belongs here rather than in a separate "Partnership" section: it is
not a marketing partnership, it is who holds the assets and executes the orders.

### A content gap being fixed

The current Partnership section has a card whose entire content is the heading
"Transparent global infrastructure optimized for absolute reliability" — no body
text, and a claim that means nothing on inspection. It is dropped rather than
restyled.

---

## Files

**New**

| File | Purpose |
|------|---------|
| `Platizio_Global_Revamp/pages/About.tsx` | The page |
| `Platizio_Global_Revamp/data/team.ts` | Team members, moved out of the carousel |
| `Platizio_Global_Revamp/components/TeamGrid.tsx` | 4x2 grid with initials fallback |
| `Platizio_Global_Revamp/styles/about.css` | |

**Modified**

| File | Change |
|------|--------|
| `src/pages/About.tsx` | One-line re-export, matching Home and Pricing |
| `src/entry-client.tsx` | Import `about.css` |

**Deleted**

| File | Reason |
|------|--------|
| `src/components/TeamCarousel.tsx` | Only consumer was About; replaced by the grid |

## Rendering

Fully static — no fetch, no state, no hydration risk. The grid is plain markup,
so the prerendered HTML is the finished page. The only client-side behaviour is
the existing `reveal` scroll animation and the photo `onError` fallback.

## Non-goals

- No product list (owned by `/products`)
- No repetition of Home's regulatory badges — this page goes a layer deeper
- No new regulatory or custody claims beyond what the site already publishes
- No team member biographies; name, role and photograph only
- No company timeline or milestones section

## Acceptance criteria

1. `/about` renders the six sections in order.
2. `npm run build` completes; all 49 pages prerender.
3. No hydration warning on `/about`.
4. All eight team members are visible simultaneously at 1024px and above, with
   no carousel, autoplay or `setInterval` on the page.
5. Every regulatory claim in section 5 traces to the source table above.
6. The SIPC limitation ("not against a fall in market value") appears in the
   same sentence as the coverage amount.
7. `TeamCarousel.tsx` is deleted and nothing imports it.
8. A failed team photo shows initials, not a broken-image icon.
9. No horizontal scroll at 360 / 768 / 1280.
10. Every text/background pair meets WCAG AA.
