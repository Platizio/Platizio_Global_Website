import { Link } from 'react-router-dom'
import { Globe } from '../components/Globe'
import { useAppContext } from '../context/AppContext'
import { TRADING_PLATFORM_URL, YOUTUBE_CHANNEL_URL } from '../constants'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
)

export default function Home() {
  const { openContact } = useAppContext()

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-text">
            <span className="eyebrow on-dark">Global investing, simplified</span>
            <h1>Invest Globally with <span>Platizio</span></h1>
            <p>
              Explore US Stocks and ETFs through Platizio Global and build international exposure
              from India — with education, support, and a simple onboarding flow.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-gold btn-lg" href={TRADING_PLATFORM_URL} target="_blank" rel="noopener noreferrer">
                Start Investing <ArrowIcon />
              </a>
              <Link className="btn btn-light btn-lg" to="/products">Explore Products</Link>
            </div>
            <div className="hero-meta">
              <div><strong>US Stocks</strong><span>Apple, Microsoft, NVIDIA &amp; more</span></div>
              <div><strong>US ETFs</strong><span>S&amp;P 500, Nasdaq-100, themes</span></div>
              <div><strong>USD Exposure</strong><span>Diversify beyond INR</span></div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="orbit" aria-hidden="true" />
            <Globe />
            <div className="hero-badge top" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />
              </svg>
              US Market access
            </div>
            <div className="hero-badge bottom" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              Simple onboarding
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRODUCT STRIP ===== */}
      <div className="product-strip">
        <div className="container">
          <Link to="/products#us-stocks" className="product-card">
            <div className="product-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 6-6" />
              </svg>
            </div>
            <div className="product-card-body">
              <h3>US Stocks</h3>
              <p>Invest in leading US-listed companies — Explore US Stocks</p>
            </div>
            <span className="arrow"><ArrowIcon /></span>
          </Link>
          <Link to="/products#us-etfs" className="product-card">
            <div className="product-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" />
              </svg>
            </div>
            <div className="product-card-body">
              <h3>US ETFs</h3>
              <p>Diversified baskets across indices, sectors &amp; themes</p>
            </div>
            <span className="arrow"><ArrowIcon /></span>
          </Link>
        </div>
      </div>

      {/* ===== WHY INVEST GLOBALLY ===== */}
      <section className="section" id="why">
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">Why invest globally?</span>
            <h2>Reasons Indian investors are looking abroad</h2>
            <p>
              International investing helps you reduce single-market dependence and participate in
              some of the world's largest companies and innovation themes.
            </p>
          </div>

          <div className="feature-grid">
            {[
              {
                icon: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
                title: 'Global Diversification',
                body: 'Reduce dependence on one country or market by adding exposure across regions and economies.',
              },
              {
                icon: <><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21V12h6v9"/></>,
                title: 'US Market Exposure',
                body: 'Invest in some of the world\'s largest listed companies across technology, healthcare and beyond.',
              },
              {
                icon: <><path d="M21 12a9 9 0 1 1-9-9"/><path d="M12 3v9l6-3"/></>,
                title: 'ETF-Based Investing',
                body: 'Use ETFs to invest across indices, sectors and themes — through a single, listed instrument.',
              },
              {
                icon: <><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
                title: 'Currency Exposure',
                body: 'Add USD-linked exposure to your portfolio and balance your overall currency mix.',
              },
              {
                icon: <><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.7.7 1 1.5 1 2.3v1h6v-1c0-.8.3-1.6 1-2.3A7 7 0 0 0 12 2z"/></>,
                title: 'Innovation Themes',
                body: 'Explore AI, technology, semiconductors, healthcare and global consumer brands in one place.',
              },
            ].map(({ icon, title, body }) => (
              <article className="feature-card reveal" key={title}>
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    {icon}
                  </svg>
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== YOUTUBE VIDEOS ===== */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">Recent on YouTube</span>
            <h2>Learn global investing in minutes</h2>
            <p>Bite-sized videos from the Platizio Global YouTube channel — covering markets, products and investing concepts.</p>
          </div>

          <div className="card-grid-3">
            {[
              { thumb: 't-1', tag: 'Getting Started', title: 'How to Start Investing in US Stocks from India', body: 'A quick walkthrough of the onboarding flow, funding the account and placing your first US-stock order.' },
              { thumb: 't-2', tag: 'ETFs', title: 'US ETFs Explained: SPY, QQQ, VOO & More', body: 'Understand the most-watched US ETFs, what they hold and how they differ from picking single stocks.' },
              { thumb: 't-3', tag: 'Risk & Compliance', title: 'Currency Risk in Global Investing', body: 'How USD-INR movement affects returns for Indian investors holding US assets — explained simply.' },
            ].map(({ thumb, tag, title, body }) => (
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

      {/* ===== CLOSING CTA ===== */}
      <section className="section" style={{ paddingTop: '2rem' }}>
        <div className="container">
          <div className="cta-band reveal">
            <h2>Ready to Begin Your Global Investing Journey?</h2>
            <p>Open Platizio Global, explore US Stocks and ETFs, and place your first international order.</p>
            <a className="btn btn-gold btn-lg" href={TRADING_PLATFORM_URL} target="_blank" rel="noopener noreferrer">
              Start Investing on Platizio Global <ArrowIcon />
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
