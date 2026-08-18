# Spec — Media Page Revamp

**Branch:** `Platizio_Global_Revamp`
**Date:** 2026-08-17
**Status:** Implemented and verified

Layout agreed from an interactive wireframe before any code was written; the
50/50 video split was set there.

## Page structure

| # | Section | Notes |
|---|---------|-------|
| 1 | News rail | Live US-market headlines, horizontally scrollable, above the hero |
| 2 | Page hero | |
| 3 | Video | Feature left, three-item list right, **Watch more** under the list. **50/50** |
| 4 | Blog + Articles | Blog coming-soon left; five articles + View all right |
| 5 | Newsletter | Email capture |
| 6 | Footer | Existing |

---

## News rail

### Source

NewsAPI.ai (Event Registry). **Finite quota: 2000 searches in total, not per
month.** ViewTrade has no news endpoint — all 14 catalogue files were searched.

`/api/news` caches **12 hours** (`s-maxage=43200`), so the worst case is two
upstream calls a day and the pool lasts years. **Shortening that cache is the
fastest way to burn the quota.**

### Query, and why it looks like this

Two spikes were spent tuning it, because each test costs a search:

**Spike 1** used broad keywords and `sourceLocationUri: United_States`. That
filters by where the *publisher* is, not what the story is about, so it returned
"FTSE 100 Live: UK blue-chips" and a retirement survey from The Good Men
Project. It also returned obvious duplicates.

**Spike 2** added `keywordLoc: 'title'`, `dataType: ['news']` and
`isDuplicateFilter`. Precision improved sharply and the payload fell from
40.9 KB to 3.2 KB once `body` was dropped.

**Verification of the built endpoint** exposed the last problem: Sensex and
Nifty stories were still arriving, because the API tokenises multi-word keywords
and `"US markets"` was matching a bare *markets*. Fixed by removing the loose
terms and adding `keywordSearchMode: 'phrase'`.

Final keyword set — unambiguous US proper nouns only:

```
S&P 500 · Nasdaq · Dow Jones · Wall Street · Federal Reserve · NYSE
```

### Server-side filtering

The query alone is not enough. `/api/news` over-fetches 30 and filters to 8:

| Filter | Why |
|--------|-----|
| `isDuplicate` + normalised-title dedupe | Syndicated copies escape the API's own flag |
| `OTHER_MARKET` regex | Sensex, Nifty, FTSE, Nikkei, Hang Seng, DAX and friends — not US news however they matched |
| `LOW_VALUE_TITLE` regex | Wire roundups ("Dow Jones Top Company Headlines at 1 AM ET") and earnings-call filler |
| `SOURCE_CAP = 2` | One spike returned three consecutive Morningstar roundups; without a cap one publisher takes 3 of 8 slots |
| `cleanSource()` | Some feeds set `source.title` to a bare URL, rendering "https://www.outloo" as the card label |

### Fallback

On any failure — upstream error, timeout, quota exhausted, key missing — the
endpoint returns **200 with the curated list** from
[`data/mediaNews.ts`](../data/mediaNews.ts). The rail is never empty and never
shows an error.

⚠️ Curated entries must be **real, checkable items with real dates and working
links**. The seeds are Platizio's own published explainers for exactly that
reason. On a regulated intermediary's site, an invented market headline with a
plausible source is not a placeholder — it is a false statement of fact.

### Rendering

The curated list is the **initial render on both server and client**, so the
markup is identical and there is no skeleton and nothing to mismatch. Live items
swap in after the effect resolves. Headlines are clamped to two lines, so the
rail's height is the same either way — **measured 153px before and after the
swap**.

---

## Video

Feature is `VIDEOS[0]`; the list is `VIDEOS[1..3]`. The array is already
newest-first.

Cards **link out to YouTube rather than embedding an iframe.** An embed loads
Google's player and its cookies for every visitor on page load, whether or not
they press play. A linked thumbnail avoids that and keeps the page light.

`hqdefault.jpg` is 4:3 with letterbox bars; the thumbnails are `object-fit:
cover` and scaled 1.34× to crop them off.

---

## Blog + Articles

**Blog** ships empty with a coming-soon state that points at the articles beside
it. An empty state should say what is coming and offer somewhere to go, not
shrug.

**Articles** shows five: `featured: true` first, then newest to fill. Only three
articles carry the flag, so featured-only would render short — and this keeps
the flag meaningful as editorial promotion rather than a chore to maintain at
exactly five.

---

## Newsletter

Posts to `/api/subscribe`, which forwards to whatever
`NEWSLETTER_WEBHOOK_URL` is set — Buttondown, Mailchimp via Zapier, an internal
CRM. Nothing is tied to a vendor.

**No provider is configured, so the endpoint returns 503 and the form says so,
offering an email address instead.** It deliberately does not show a success
message it cannot honour: a form that says "Subscribed!" while storing nothing
sends the visitor away believing they will hear from you.

Email validation is deliberately permissive. Strict regexes reject valid
addresses — plus-addressing, new TLDs, unicode domains. This catches typos; the
provider does real validation and a confirmation email is what actually proves
an address works.

---

## Verification

| Check | Result |
|-------|--------|
| Build, 49 pages prerender | **PASS** |
| No hydration warning on `/media` | **PASS** — console clean |
| Section order | **PASS** — rail → hero → video → panels → newsletter |
| Video split at desktop | **PASS** — 564/564, exactly 50/50 |
| Watch more sits below the list | **PASS** |
| Feature and side columns balance | **PASS** — 485px each |
| News rail scrollable | **PASS** |
| Live swap, no layout shift | **PASS** — rail 153px before and after |
| Live items open in a new tab safely | **PASS** — `target=_blank` + `rel=noopener` |
| Fallback when key absent | **PASS** — 200, curated, internal links |
| `/api/subscribe` with no provider | **PASS** — 503, never claims success |
| Endpoint checks | **23/23 pass** |
| Contrast | **22 pairs, all pass** after one fix |
| No horizontal scroll at 375 / 768 / 1280 | **PASS** |

### One bug found in verification

`.article-idx` used `--gray-400` at **2.71:1**. That is the same token misused
for the currency code on Home. `--gray-400` is fine for borders and icons and
never for text — decorative numbering is still visible text. Now `--gray-500`.

## Non-goals

- No YouTube Data API; titles and dates come from `src/videos.ts`
- No embedded player
- No blog CMS — the panel is a placeholder
- No news images; the rail is text, which keeps it fast and avoids hotlinking
  publisher assets
