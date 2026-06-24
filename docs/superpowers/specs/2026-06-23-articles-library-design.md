# Articles Library — Design & Plan

**Date:** 2026-06-23
**Goal:** Convert the site's ad-hoc article pages into a data-driven article library: a `/articles` listing page (responsive 3×n grid of all articles) plus a 3×1 featured grid on the Media page with a "View All Articles" button. Add the 6 new articles from `all articles.pdf`.

## Approved decisions

1. **Library scope:** Keep all **9** articles — the 3 existing live articles + the 6 new ones from the PDF.
2. **Featured on Media page:** Keep the present **3** featured (Why International Investing 2026, LRS Explained, Currency Risk Explained). The rest live behind **View All**.
3. **Architecture:** **Data-driven registry** — migrate the 3 existing per-component article pages into the same system.

## The 9 articles

Existing (keep slugs — already indexed):
1. `why-international-investing-matters-2026` — *Why International Investing Will Matter More Than Ever by 2026* — logo `/article-1-logo.webp`
2. `lrs-explained` — *LRS Explained: How Indian Residents Can Invest Overseas* — `/article-2-logo.jpg`
3. `currency-risk-explained` — *Currency Risk Explained: Why the Rupee-Dollar Movement Matters* — `/article-3-logo.jpg`

New (from `all articles.pdf`, logos → `public/articles/<slug>.jpg`):
4. `global-taxes` — *Global Taxes: What Indian Investors Need To Know*
5. `rsu-taxation` — *RSU Taxation Explained for Indian Employees Holding US Shares*
6. `feeder-vs-combo-funds` — *Global Investing Made Simple: International Mutual Funds — Feeder vs Combo*
7. `gift-city` — *GIFT City: India's Gateway to Global Investing*
8. `global-investment-allocation` — *Global Investment Allocation: A Guide for ₹5K to ₹5L Monthly Investors*
9. `routes-for-international-investing` — *Routes for International Investing: Intl MFs, ETFs, Stocks & GIFT City*

## Architecture

- **Article shape** (`src/articles/types.ts`): `{ slug, title, category, date, readTime, excerpt, logo, bodyHtml }`. `bodyHtml` is trusted, author-controlled semantic HTML (no user input → `dangerouslySetInnerHTML` is safe), styled by the existing `.article-body` CSS.
- **Content files** (`src/articles/content/<slug>.ts`): each exports the article body HTML string. Keeps the registry small and each article focused.
- **Registry** (`src/articles/registry.ts`): `ARTICLES: Article[]` = metadata + imported `bodyHtml`. Order = display order (existing 3 first → featured). Helpers: `getArticle(slug)`, `featuredArticles` (first 3).
- **Generic page** (`src/components/ArticlePage.tsx`): renders SEO + Article JSON-LD + breadcrumb + hero `<img>` + `.article-body` (via `dangerouslySetInnerHTML`) + closing CTA. One template for all 9.
- **Listing page** (`src/pages/Articles.tsx`, route `/articles`): page hero + responsive `.card-grid-3` of every article (3×n).
- **Routing** (`src/App.tsx`): `/articles` → `Articles`; `/articles/:slug` → `ArticlePage` (looks up registry; unknown slug → NotFound). Removes the 3 explicit per-article routes/imports.
- **Media page** (`src/pages/Media.tsx`): featured 3 cards from `featuredArticles` + a "View All Articles" button → `/articles`.

## File plan

- Create: `src/articles/types.ts`, `src/articles/registry.ts`, `src/articles/content/*.ts` (9), `src/components/ArticlePage.tsx`, `src/pages/Articles.tsx`
- Modify: `src/App.tsx` (routes), `src/pages/Media.tsx` (featured + View All), `css/styles.css` (listing-page + button polish; table/ol already styled), `public/sitemap.xml` (+/articles, +6 article URLs)
- Delete: `src/pages/articles/WhyInternationalInvesting2026.tsx`, `LRSExplained.tsx`, `CurrencyRiskExplained.tsx` (content migrated into registry)
- Assets: copy 6 extracted logos → `public/articles/<slug>.jpg`

## Content extraction

The 6 new articles are graphical (no text layer). Transcribed via a background workflow: per-article reader agent → adversarial verifier (re-reads source pages, corrects, finalizes) → returns `{category, readTime, excerpt, bodyHtml}`.

## Verification

- `npm run build` clean (tsc + vite).
- Preview: `/articles` shows 9 cards (3×n); Media shows 3 featured + working View All; each `/articles/:slug` renders hero + body; the migrated 3 keep their URLs; the currency-risk table renders.
- Final code-review pass.
