import { Link } from 'react-router-dom'
import { TRADING_PLATFORM_URL, YOUTUBE_CHANNEL_URL } from '../constants'
import SEO from '../components/SEO'
import ArticlesCarousel from '../components/ArticlesCarousel'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
)

const VIDEOS = [
  { id: '_WJBopr3x9I', title: 'Getting Started with Platizio Global', url: 'https://youtube.com/shorts/_WJBopr3x9I' },
  { id: '71MGWFpYOcI', title: 'Why Indian Investors Need Global Investing', url: 'https://youtu.be/71MGWFpYOcI' },
  { id: 'OGTdv3ZSXoY', title: 'Currency Risk in Global Investing, Explained in a Minute', url: 'https://youtube.com/shorts/OGTdv3ZSXoY' },
  { id: '_xUeqs5hhvg', title: 'Global Diversification Explained Easily', url: 'https://youtube.com/shorts/_xUeqs5hhvg' },
]

export default function Media() {
  return (
    <>
      <SEO
        title="Videos &amp; Articles — Learn Global Investing"
        description="Watch videos and read articles about US Stocks, ETFs, LRS, and global investing for Indian investors. Education-first content from the Platizio Global team."
        canonical="/media"
      />
      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link><span>/</span><span>Media</span>
          </div>
          <h1>Videos &amp; Articles</h1>
          <p>Stay informed on US Stocks, US ETFs and global investing — short videos and in-depth reads from the Platizio Global team.</p>
          <div style={{ marginTop: '1.75rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#videos" className="btn btn-gold">YouTube Videos</a>
            <a href="#articles" className="btn btn-light">Articles</a>
          </div>
        </div>
      </section>

      {/* ===== YOUTUBE VIDEOS ===== */}
      <section className="section" id="videos">
        <div className="container">
          <div className="subsection-header reveal" style={{ textAlign: 'center', margin: '0 auto 3rem' }}>
            <span className="eyebrow">YouTube</span>
            <h2>Watch on the Platizio Global channel</h2>
            <p>Short videos covering global investing basics — markets, products and what to consider before you invest.</p>
          </div>

          <div className="yt-grid reveal">
            {VIDEOS.map((v) => (
              <a
                key={v.id}
                className="yt-card"
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Watch on YouTube: ${v.title}`}
              >
                <span
                  className="yt-card-thumb"
                  style={{ backgroundImage: `url(https://img.youtube.com/vi/${v.id}/hqdefault.jpg)` }}
                >
                  <span className="play-button"><PlayIcon /></span>
                </span>
                <span className="yt-card-title">{v.title}</span>
              </a>
            ))}
          </div>

          <div className="yt-channel-cta reveal">
            <a className="btn btn-primary btn-lg" href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M23 12s0-3.6-.5-5.3a2.8 2.8 0 0 0-2-2C18.8 4.2 12 4.2 12 4.2s-6.8 0-8.5.5a2.8 2.8 0 0 0-2 2C1 8.4 1 12 1 12s0 3.6.5 5.3a2.8 2.8 0 0 0 2 2c1.7.5 8.5.5 8.5.5s6.8 0 8.5-.5a2.8 2.8 0 0 0 2-2C23 15.6 23 12 23 12zM9.7 15.3V8.7l5.7 3.3-5.7 3.3z" />
              </svg>
              Visit our YouTube Channel
            </a>
          </div>
        </div>
      </section>

      {/* ===== ARTICLES ===== */}
      <section className="section" style={{ background: 'var(--gray-50)' }} id="articles">
        <div className="container">
          <div className="subsection-header reveal" style={{ textAlign: 'center', margin: '0 auto 3rem' }}>
            <span className="eyebrow">Articles</span>
            <h2>In-depth reads on global investing</h2>
            <p>Concepts, products and practical insights — written for Indian investors exploring international markets.</p>
          </div>

          <ArticlesCarousel />

          <div className="articles-viewall reveal">
            <Link className="btn btn-primary btn-lg" to="/articles">
              View All Articles <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== CLOSING CTA ===== */}
      <section className="section">
        <div className="container">
          <div className="cta-band reveal">
            <h2>Ready to Begin Your Global Investing Journey?</h2>
            <p>Explore Platizio Global, learn the basics and place your first international order.</p>
            <a className="btn btn-gold btn-lg" href={TRADING_PLATFORM_URL} target="_blank" rel="noopener noreferrer">
              Start Investing on Platizio Global
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
