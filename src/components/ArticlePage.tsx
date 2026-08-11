import { Link, useParams } from 'react-router-dom'
import { TRADING_PLATFORM_URL } from '../constants'
import SEO, { breadcrumbSchema, faqSchema } from './SEO'
import RelatedArticles from './RelatedArticles'
import NotFound from '../pages/NotFound'
import { getArticle } from '../articles/registry'
import { SITE_NAME, SITE_URL, LOGO_URL, absoluteUrl } from '../siteConfig'

/** Rough word count from the article's HTML body, for schema wordCount. */
const countWords = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .split(/\s+/)
    .filter(Boolean).length

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const article = slug ? getArticle(slug) : undefined

  if (!article) return <NotFound />

  const path = `/articles/${article.slug}`
  const url = `${SITE_URL}${path}`
  const image = absoluteUrl(article.logo)
  const modified = article.updated ?? article.date

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image,
    datePublished: article.date,
    dateModified: modified,
    articleSection: article.category,
    wordCount: countWords(article.bodyHtml),
    inLanguage: 'en-IN',
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: LOGO_URL },
    },
    mainEntityOfPage: url,
  }

  return (
    <>
      <SEO
        title={article.title}
        description={article.description}
        canonical={path}
        ogImage={image}
        ogImageAlt={article.title}
        ogType="article"
        article={{
          publishedTime: `${article.date}T00:00:00Z`,
          modifiedTime: `${modified}T00:00:00Z`,
          author: SITE_NAME,
        }}
        jsonLd={[
          articleSchema,
          breadcrumbSchema([
            ['Home', '/'],
            ['Articles', '/articles'],
            [article.title, path],
          ]),
          ...(article.faqs?.length ? [faqSchema(article.faqs)] : []),
        ]}
      />

      <article className="article">
        <div className="breadcrumb" style={{ color: 'var(--gray-500)', marginBottom: '1rem' }}>
          <Link to="/" style={{ color: 'var(--gold-deep)' }}>Home</Link><span>/</span>
          <Link to="/media" style={{ color: 'var(--gold-deep)' }}>Media</Link><span>/</span>
          <Link to="/articles" style={{ color: 'var(--gold-deep)' }}>Articles</Link><span>/</span>
          <span>{article.category}</span>
        </div>

        <p className="article-meta">
          {article.category} · {article.dateLabel} · {article.readTime}
          {article.updated && article.updated !== article.date && (
            <> · Updated {article.updated}</>
          )}
        </p>
        <h1>{article.title}</h1>

        <div className="article-hero-img">
          <img src={article.logo} alt={article.title} width={1200} height={630} />
        </div>

        <div className="article-body" dangerouslySetInnerHTML={{ __html: article.bodyHtml }} />

        {article.faqs?.length ? (
          <section className="article-faq">
            <h2>Frequently asked questions</h2>
            {article.faqs.map((faq) => (
              <div className="article-faq-item" key={faq.q}>
                <h3>{faq.q}</h3>
                <p>{faq.a}</p>
              </div>
            ))}
          </section>
        ) : null}

        <div className="article-body" style={{ marginTop: '2rem' }}>
          <a className="btn btn-gold btn-lg" href={TRADING_PLATFORM_URL} target="_blank" rel="noopener noreferrer">
            Start Investing on Platizio Global
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <RelatedArticles article={article} />
      </article>
    </>
  )
}
