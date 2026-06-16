import { Link } from 'react-router-dom'
import { Globe } from '../components/Globe'
import { TRADING_PLATFORM_URL, YOUTUBE_CHANNEL_URL } from '../constants'
import SEO from '../components/SEO'

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
  return (
    <>
      <SEO
        title="Invest in US Stocks &amp; ETFs from India"
        description="Platizio Global lets Indian investors invest in US Stocks and ETFs under the RBI's Liberalised Remittance Scheme (LRS). IFSCA-regulated. Open your account today."
        canonical="/"
      />
      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-text">
            <span className="eyebrow on-dark">Fully Guided International Wealth Creation</span>
            <h1>Invest Globally with <span>Platizio</span></h1>
            <p>
              Diversify your portfolio across premier US Stocks and ETFs with Platizio Global. From initial
              onboarding to long-term portfolio creation, we provide end-to-end guidance tailored to your
              specific investment goals.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-gold btn-lg" href={TRADING_PLATFORM_URL} target="_blank" rel="noopener noreferrer">
                Start Investing <ArrowIcon />
              </a>
              <Link className="btn btn-light btn-lg" to="/products">Explore Products</Link>
            </div>
            <div className="hero-meta">
              <div><strong>US Stocks &amp; ETFs</strong><span>Stocks, indices, sectors &amp; themes</span></div>
              <div><strong>IFSCA Regulated</strong><span>Gift City Based</span></div>
              <div><strong>Dedicated Guidance</strong><span>From Onboarding to Execution</span></div>
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
              <p>Invest in US-listed companies</p>
            </div>
            <span className="arrow"><ArrowIcon /></span>
          </Link>
          <Link to="/products#us-etfs" className="product-card">
            <div className="product-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 22h20M6 22V12M10 22V6M14 22V16M18 22V10" />
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

      {/* ===== HOW IT WORKS ===== */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">How It Works</span>
            <h2>Start investing in 3 simple steps</h2>
            <p>
              From account creation to your first international order.
            </p>
          </div>

          <div className="steps-grid">
            {([
              {
                step: '01',
                title: 'Open Your Account',
                body: 'Create your Platizio Global account on the trading platform and complete KYC entirely online.',
                icon: (
                  <>
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="10" />
                  </>
                ),
              },
              {
                step: '02',
                title: 'Fund via LRS',
                body: "Transfer funds from your Indian bank account through India's Liberalised Remittance Scheme. Your money stays under GIFT City's regulatory framework.",
                icon: (
                  <>
                    <line x1="12" y1="2" x2="12" y2="22" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </>
                ),
              },
              {
                step: '03',
                title: 'Invest in US Stocks & ETFs',
                body: 'Browse US-listed stocks and ETFs, place your order and start building your international portfolio.',
                icon: (
                  <>
                    <path d="M3 17l6-6 4 4 8-8" />
                    <path d="M14 7h7v7" />
                  </>
                ),
              },
            ] as const).flatMap(({ step, title, body, icon }, i, arr) => {
              const card = (
                <div className="step-card reveal" key={step}>
                  <div className="step-num">{step}</div>
                  <div className="step-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      {icon}
                    </svg>
                  </div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              )
              if (i < arr.length - 1) {
                return [
                  card,
                  <div className="step-arrow" key={`arrow-${i}`} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </div>,
                ]
              }
              return [card]
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <a className="btn btn-gold btn-lg" href={TRADING_PLATFORM_URL} target="_blank" rel="noopener noreferrer">
              Get Started <ArrowIcon />
            </a>
          </div>
        </div>
      </section>

      {/* ===== WHY INVEST GLOBALLY ===== */}
      <section className="section" id="why">
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">Why invest globally?</span>
            <h2>Reasons Indian investors are looking abroad</h2>
            <p>
              International investing helps you reduce single-market dependence and invest in
              some of the world's largest companies and innovation themes.
            </p>
          </div>

          <div className="feature-grid">
            {[
              {
                icon: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
                title: 'Global Diversification',
                body: 'Reduce dependence on one country or market by adding exposure across regions and economies.',
              },
              {
                icon: <><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21V12h6v9" /></>,
                title: 'US Market Exposure',
                body: 'Invest in some of the world\'s largest listed companies across technology, healthcare and beyond.',
              },
              {
                icon: <><path d="M21 12a9 9 0 1 1-9-9" /><path d="M12 3v9l6-3" /></>,
                title: 'ETF-Based Investing',
                body: 'Use ETFs to invest across indices, sectors and themes — through a single, listed instrument.',
              },
              {
                icon: <><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
                title: 'Currency Exposure',
                body: 'Add USD-linked exposure to your portfolio and balance your overall currency mix.',
              },
              {
                icon: <><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.7.7 1 1.5 1 2.3v1h6v-1c0-.8.3-1.6 1-2.3A7 7 0 0 0 12 2z" /></>,
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

          <div className="yt-row reveal">
            {/* Live video */}
            <article className="media-card yt-video-card">
              <a
                className="media-thumb"
                href="https://youtube.com/shorts/_WJBopr3x9I"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Getting Started with Platizio Global"
                style={{ backgroundImage: 'url(https://img.youtube.com/vi/_WJBopr3x9I/hqdefault.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                <span className="play-button"><PlayIcon /></span>
              </a>
              <div className="media-body">
                <span className="media-tag">Latest</span>
                <h3>Getting Started with Platizio Global</h3>
                <p>A quick introduction to how Platizio Global works — explore US Stocks and ETFs from India with a simple onboarding flow.</p>
                <a className="media-link" href="https://youtube.com/shorts/_WJBopr3x9I" target="_blank" rel="noopener noreferrer">
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
              <img src="/app favicon 1.png" alt="Platizio Global" />
            </a>
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
