export interface ArticleFaq {
  q: string
  /** Plain text — rendered on-page and reused verbatim as FAQPage JSON-LD */
  a: string
}

export interface Article {
  /** URL slug — lives at /articles/<slug> */
  slug: string
  /** Full article title (also the <h1> and SEO title) */
  title: string
  /** Short card tag, e.g. "Taxation" */
  category: string
  /** Topic hubs this article belongs to — an article can sit in several.
   *  Must match ids in ./topics.ts; drives /articles/topic/<id> and related links. */
  topics: string[]
  /** ISO date the article was published */
  date: string
  /** ISO date of the last substantive edit. Drives schema dateModified and
   *  sitemap lastmod; falls back to `date` when absent. */
  updated?: string
  /** Human-readable label, e.g. "June 2026" */
  dateLabel: string
  /** Reading-time label, e.g. "6 min read" */
  readTime: string
  /** 1-2 sentence summary shown on the card */
  excerpt: string
  /** Hero / card image path under public/ */
  logo: string
  /** SEO meta description */
  description: string
  /** Article body as trusted, author-controlled semantic HTML */
  bodyHtml: string
  /** Q&A pairs rendered on-page and emitted as FAQPage JSON-LD */
  faqs?: ArticleFaq[]
  /** Explicit related slugs. When absent, related articles are derived
   *  from the highest `topics` overlap. */
  related?: string[]
  /** When true, the article appears in the Media page's featured grid */
  featured?: boolean
}
