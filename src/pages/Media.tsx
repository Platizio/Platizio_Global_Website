import { Link } from 'react-router-dom'
import { TRADING_PLATFORM_URL, YOUTUBE_CHANNEL_URL } from '../constants'

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

const videos = [
  {
    thumb: 't-4',
    tag: 'Getting Started',
    title: 'How to Start Investing in US Stocks from India',
    body: 'Walkthrough of onboarding, funding the account and your first US-stock order.',
  },
  {
    thumb: 't-5',
    tag: 'ETFs',
    title: 'US ETFs Explained: SPY, QQQ, VOO & More',
    body: 'Understand the most-watched US ETFs and how they differ from picking individual stocks.',
  },
  {
    thumb: 't-6',
    tag: 'Risk & Compliance',
    title: 'Currency Risk in Global Investing',
    body: 'How USD-INR movement affects returns for Indian investors holding US assets.',
  },
]

export default function Media() {
  return (
    <>
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
            <p>Short videos covering the basics — markets, products and what to consider when investing globally.</p>
          </div>
          <div className="card-grid-3">
            {videos.map(({ thumb, tag, title, body }) => (
              <article className="media-card reveal" key={title}>
                <a className={`media-thumb ${thumb}`} href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
                  <h4>{title}</h4>
                  <span className="play-button"><PlayIcon /></span>
                </a>
                <div className="media-body">
                  <span className="media-tag">{tag}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                  <a className="media-link" href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
                    Watch on YouTube <ArrowIcon />
                  </a>
                </div>
              </article>
            ))}
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

          {/* Coming Soon tile */}
          <div className="coming-soon-tile reveal">
            <div className="coming-soon-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <span className="coming-soon-badge">Coming Soon</span>
            <h3>Articles are on their way</h3>
            <p>
              We're working on in-depth articles covering US stocks, ETFs, global investing concepts,
              LRS guidance and more — written specifically for Indian investors.
              Check back soon.
            </p>
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
