import { Link } from 'react-router-dom'
import SEO, { breadcrumbSchema, itemListSchema } from '../components/SEO'
import { ARTICLES, articlesByTopic } from '../articles/registry'
import { TOPICS } from '../articles/topics'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

export default function Articles() {
  return (
    <>
      <SEO
        title="Articles — Global Investing Insights"
        description="Browse every Platizio Global article — education-first reads on US Stocks, ETFs, the LRS, taxation, GIFT City, RSUs, currency risk, and global investing for Indian investors."
        canonical="/articles"
        jsonLd={[
          breadcrumbSchema([['Home', '/'], ['Articles', '/articles']]),
          itemListSchema(
            ARTICLES.map((a) => ({ name: a.title, path: `/articles/${a.slug}` }))
          ),
        ]}
      />

      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link><span>/</span>
            <Link to="/media">Media</Link><span>/</span>
            <span>Articles</span>
          </div>
          <h1>Articles</h1>
          <p>In-depth, education-first reads on US Stocks, ETFs, taxation, GIFT City and global investing — written for Indian investors.</p>
        </div>
      </section>

      {/* ===== BROWSE BY TOPIC ===== */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Browse by topic</h2>
          <div className="topic-grid">
            {TOPICS.map((topic) => {
              const count = articlesByTopic(topic.id).length
              return (
                <Link
                  className="topic-card"
                  to={`/articles/topic/${topic.id}`}
                  key={topic.id}
                >
                  <h3>{topic.title}</h3>
                  <p>{topic.blurb}</p>
                  <span className="topic-count">
                    {count} {count === 1 ? 'article' : 'articles'} <ArrowIcon />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== ALL ARTICLES GRID ===== */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <h2 className="section-title">All articles</h2>
          <div className="card-grid-3">
            {ARTICLES.map((article) => (
              <article className="media-card reveal" key={article.slug}>
                <Link
                  className="media-thumb"
                  to={`/articles/${article.slug}`}
                  aria-label={article.title}
                  style={{ backgroundImage: `url(${article.logo})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
                <div className="media-body">
                  <span className="media-tag">{article.category}</span>
                  <h3>{article.title}</h3>
                  <p>{article.excerpt}</p>
                  <Link className="media-link" to={`/articles/${article.slug}`}>
                    Read Article <ArrowIcon />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
