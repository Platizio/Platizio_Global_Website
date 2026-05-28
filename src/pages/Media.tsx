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

const VIDEO_URL = 'https://youtube.com/shorts/_WJBopr3x9I'
const VIDEO_THUMB = 'https://img.youtube.com/vi/_WJBopr3x9I/hqdefault.jpg'

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
            <p>Short videos covering global investing basics — markets, products and what to consider before you invest.</p>
          </div>

          <div className="yt-row reveal">
            {/* Single live video */}
            <article className="media-card yt-video-card">
              <a
                className="media-thumb"
                href={VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Watch on YouTube"
                style={{ backgroundImage: `url(${VIDEO_THUMB})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                <span className="play-button"><PlayIcon /></span>
              </a>
              <div className="media-body">
                <span className="media-tag">Latest</span>
                <h3>Getting Started with Platizio Global</h3>
                <p>A quick introduction to how Platizio Global works — explore US Stocks and ETFs from India with a simple onboarding flow.</p>
                <a className="media-link" href={VIDEO_URL} target="_blank" rel="noopener noreferrer">
                  Watch on YouTube <ArrowIcon />
                </a>
              </div>
            </article>

            {/* Circular channel redirect */}
            <a
              className="yt-channel-circle"
              href={YOUTUBE_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Platizio Global on YouTube"
            >
              <span className="yt-circle-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 12s0-3.6-.5-5.3a2.8 2.8 0 0 0-2-2C18.8 4.2 12 4.2 12 4.2s-6.8 0-8.5.5a2.8 2.8 0 0 0-2 2C1 8.4 1 12 1 12s0 3.6.5 5.3a2.8 2.8 0 0 0 2 2c1.7.5 8.5.5 8.5.5s6.8 0 8.5-.5a2.8 2.8 0 0 0 2-2C23 15.6 23 12 23 12zM9.7 15.3V8.7l5.7 3.3-5.7 3.3z" />
                </svg>
              </span>
              <span className="yt-circle-handle">@platizioglobal</span>
              <span className="yt-circle-label">Visit Channel</span>
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
