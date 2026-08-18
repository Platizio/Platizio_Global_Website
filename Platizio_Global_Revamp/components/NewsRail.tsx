import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { NEWS, type NewsItem } from '../data/mediaNews'
import { sortNews, formatNewsDate } from '../lib/mediaSelect'

interface RailItem {
  kind: string
  headline: string
  date: string
  href: string
  external?: boolean
}

/** Curated list, newest first. The initial render on both server and client. */
const SEED: RailItem[] = sortNews(NEWS).slice(0, 8).map((n: NewsItem) => ({ ...n }))

/**
 * The scrolling news rail, directly under the header.
 *
 * Renders the curated list immediately — server and client produce identical
 * markup, so there is no skeleton and nothing to mismatch — then swaps in live
 * US-market headlines once /api/news answers. If that request fails, or the
 * news quota is exhausted, the curated items simply stay. The rail is never
 * empty and never shifts height, because every card is clamped to two lines.
 *
 * Live items open in a new tab; curated ones are internal routes.
 */
export default function NewsRail() {
  const [items, setItems] = useState<RailItem[]>(SEED)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/news', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((payload: { items?: RailItem[] }) => {
        if (Array.isArray(payload?.items) && payload.items.length >= 4) {
          setItems(payload.items)
        }
      })
      .catch((err: Error) => {
        // An abort is this component unmounting, not a failure — and either
        // way the curated seed is already on screen, so there is nothing to
        // recover and nothing to tell the reader.
        if (err.name !== 'AbortError') return
      })

    return () => controller.abort()
  }, [])

  if (!items.length) return null

  return (
    <section className="news-band" aria-label="Latest US market news">
      <div className="container news-band-inner">
        {/* A label for the rail, not a document heading. As an <h2> it sat
            above the page <h1> and inverted the outline; aria-label on the
            section carries the same meaning without entering it. */}
        <p className="news-band-label">
          Markets
          <span className="news-band-hint" aria-hidden="true">scroll →</span>
        </p>

        <ul className="news-rail">
          {items.map((item) => {
            const inner = (
              <>
                <span className="news-kind">{item.kind}</span>
                <span className="news-headline">{item.headline}</span>
                <time className="news-date" dateTime={item.date}>{formatNewsDate(item.date)}</time>
              </>
            )
            return (
              <li className="news-item" key={item.href}>
                {item.external ? (
                  <a className="news-card" href={item.href} target="_blank" rel="noopener noreferrer">
                    {inner}
                  </a>
                ) : (
                  <Link className="news-card" to={item.href}>{inner}</Link>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
