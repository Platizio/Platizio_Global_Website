export interface Article {
  /** URL slug — lives at /articles/<slug> */
  slug: string
  /** Full article title (also the <h1> and SEO title) */
  title: string
  /** Short card tag, e.g. "Taxation" */
  category: string
  /** ISO date the article was published */
  date: string
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
  /** When true, the article appears in the Media page's featured grid */
  featured?: boolean
}
