import { Link, Navigate, useParams } from 'react-router-dom'
import SEO, { breadcrumbSchema, faqSchema, itemListSchema } from '../components/SEO'
import { articlesByTopic } from '../articles/registry'
import { getTopic } from '../articles/topics'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

export default function TopicHub() {
  const { topic: topicId } = useParams<{ topic: string }>()
  const topic = topicId ? getTopic(topicId) : undefined

  if (!topic) return <Navigate to="/articles" replace />

  const articles = articlesByTopic(topic.id)
  const path = `/articles/topic/${topic.id}`

  return (
    <>
      <SEO
        title={topic.seoTitle}
        description={topic.description}
        canonical={path}
        jsonLd={[
          breadcrumbSchema([
            ['Home', '/'],
            ['Articles', '/articles'],
            [topic.title, path],
          ]),
          itemListSchema(
            articles.map((a) => ({ name: a.title, path: `/articles/${a.slug}` }))
          ),
          faqSchema(topic.faqs),
        ]}
      />

      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link><span>/</span>
            <Link to="/articles">Articles</Link><span>/</span>
            <span>{topic.title}</span>
          </div>
          <h1>{topic.title}</h1>
          <p>{topic.blurb}</p>
        </div>
      </section>

      {/* ===== INTRO ===== */}
      <section className="section">
        <div className="container">
          <div
            className="article-body topic-intro"
            dangerouslySetInnerHTML={{ __html: topic.introHtml }}
          />
        </div>
      </section>

      {/* ===== ARTICLES IN THIS TOPIC ===== */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <h2 className="section-title">
            {articles.length} {articles.length === 1 ? 'article' : 'articles'} in this topic
          </h2>
          <div className="card-grid-3">
            {articles.map((article) => (
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

      {/* ===== TOPIC FAQ ===== */}
      <section className="section">
        <div className="container container-narrow">
          <h2 className="section-title">Common questions</h2>
          <div className="topic-faq">
            {topic.faqs.map((faq) => (
              <div className="topic-faq-item" key={faq.q}>
                <h3>{faq.q}</h3>
                <p>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BACK TO ALL ARTICLES ===== */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <Link className="btn btn-ghost" to="/articles">
            Browse all articles
          </Link>
        </div>
      </section>
    </>
  )
}
