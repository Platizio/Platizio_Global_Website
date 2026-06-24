import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { TRADING_PLATFORM_URL } from '../constants'
import SEO from './SEO'
import NotFound from '../pages/NotFound'
import { getArticle } from '../articles/registry'

const BASE_URL = 'https://platizioglobal.com'

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const article = slug ? getArticle(slug) : undefined

  if (!article) return <NotFound />

  const url = `${BASE_URL}/articles/${article.slug}`
  const image = article.logo.startsWith('http') ? article.logo : `${BASE_URL}${article.logo}`

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    image,
    datePublished: article.date,
    dateModified: article.date,
    author: { '@type': 'Organization', name: 'Platizio Global', url: BASE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Platizio Global',
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png` },
    },
    mainEntityOfPage: url,
  }

  return (
    <>
      <SEO
        title={article.title}
        description={article.description}
        canonical={`/articles/${article.slug}`}
        ogImage={image}
        ogType="article"
        article={{ publishedTime: `${article.date}T00:00:00Z`, author: 'Platizio Global' }}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>

      <article className="article">
        <div className="breadcrumb" style={{ color: 'var(--gray-500)', marginBottom: '1rem' }}>
          <Link to="/" style={{ color: 'var(--gold-deep)' }}>Home</Link><span>/</span>
          <Link to="/media" style={{ color: 'var(--gold-deep)' }}>Media</Link><span>/</span>
          <Link to="/articles" style={{ color: 'var(--gold-deep)' }}>Articles</Link><span>/</span>
          <span>{article.category}</span>
        </div>

        <p className="article-meta">{article.category} · {article.dateLabel} · {article.readTime}</p>
        <h1>{article.title}</h1>

        <div className="article-hero-img">
          <img src={article.logo} alt={article.title} />
        </div>

        <div className="article-body" dangerouslySetInnerHTML={{ __html: article.bodyHtml }} />

        <div className="article-body" style={{ marginTop: '2rem' }}>
          <a className="btn btn-gold btn-lg" href={TRADING_PLATFORM_URL} target="_blank" rel="noopener noreferrer">
            Start Investing on Platizio Global
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </article>
    </>
  )
}
