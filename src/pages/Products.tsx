import { Link } from 'react-router-dom'
import { TRADING_PLATFORM_URL } from '../constants'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

const stockFeatures = [
  { icon: <><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21V12h6v9" /></>, title: 'Global Companies', body: "Many of the world's largest companies — across software, hardware, healthcare and consumer brands — are listed in the US." },
  { icon: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>, title: 'Sector Depth', body: 'Strong exposure to technology, AI, semiconductors, biotech and global consumer brands you cannot easily access at home.' },
  { icon: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10" /></>, title: 'Portfolio Diversification', body: 'Adds international market exposure that helps reduce concentration risk in a single economy.' },
  { icon: <><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>, title: 'USD Exposure', body: 'Provides dollar-linked investment exposure as part of an overall currency-aware portfolio.' },
  { icon: <><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></>, title: 'Long-Term Themes', body: 'Useful for investors looking at global innovation themes such as AI, cloud, semiconductors and clean energy.' },
]

const etfFeatures = [
  { icon: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 3v18" /></>, title: 'Diversified Exposure', body: 'Invest in a basket of securities through one instrument — multiple companies in a single trade.' },
  { icon: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>, title: 'Simple for Beginners', body: 'Easier than selecting multiple individual stocks — start with a broad index ETF and build from there.' },
  { icon: <><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" /><path d="M3 12h18" /></>, title: 'Index Exposure', body: 'Invest in broad US market indices like the S&P 500 or Nasdaq-100 with a single ticker.' },
  { icon: <><path d="M2 22h20" /><path d="M5 22V10" /><path d="M11 22V4" /><path d="M17 22v-9" /></>, title: 'Sector Exposure', body: 'Explore sectors like technology, healthcare, energy and financials through sector-specific ETFs.' },
  { icon: <><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.7.7 1 1.5 1 2.3v1h6v-1c0-.8.3-1.6 1-2.3A7 7 0 0 0 12 2z" /></>, title: 'Thematic Exposure', body: 'Explore themes like AI, semiconductors, clean energy and dividend investing through theme-based ETFs.' },
]

const trendingStocks = [
  { ticker: 'AAPL', name: 'Apple', sector: 'Technology', desc: 'Consumer devices and services.' },
  { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', desc: 'Cloud, software and AI.' },
  { ticker: 'NVDA', name: 'NVIDIA', sector: 'Semiconductors', desc: 'AI chips and data centre demand.' },
  { ticker: 'TSLA', name: 'Tesla', sector: 'Electric Vehicles', desc: 'EVs, batteries and clean mobility.' },
  { ticker: 'AMZN', name: 'Amazon', sector: 'Consumer / Cloud', desc: 'E-commerce and cloud infrastructure.' },
]

const trendingEtfs = [
  { ticker: 'SPY', name: 'SPDR S&P 500', category: 'S&P 500 ETF', desc: 'Broad exposure to large US companies.' },
  { ticker: 'QQQ', name: 'Invesco QQQ', category: 'Nasdaq-100 ETF', desc: 'Technology-heavy US index exposure.' },
  { ticker: 'VOO', name: 'Vanguard S&P 500', category: 'S&P 500 ETF', desc: 'Low-cost broad US equity exposure.' },
  { ticker: 'SOXX', name: 'iShares Semiconductor', category: 'Semiconductor ETF', desc: 'Exposure to semiconductor companies.' },
  { ticker: 'XLK', name: 'Technology Select', category: 'Technology ETF', desc: 'Exposure to the US technology sector.' },
]

export default function Products() {
  return (
    <>
      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link><span>/</span><span>Products</span>
          </div>
          <h1>US Stocks &amp; ETFs on Platizio Global</h1>
          <p>Two simple ways to build international exposure — invest in leading US-listed companies, or in diversified ETF baskets across indices, sectors and themes.</p>
          <div style={{ marginTop: '1.75rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#us-stocks" className="btn btn-gold">Jump to US Stocks</a>
            <a href="#us-etfs" className="btn btn-light">Jump to US ETFs</a>
          </div>
        </div>
      </section>

      {/* ===== WHAT ARE US STOCKS ===== */}
      <section className="subsection" id="us-stocks">
        <div className="container">
          <div className="subsection-header reveal">
            <span className="eyebrow">US Stocks</span>
            <h2>What are US Stocks?</h2>
            <p>US Stocks allow investors to participate in companies listed on US exchanges. These may include businesses from technology, AI, semiconductors, healthcare, consumer, financial services and other global sectors.</p>
          </div>
        </div>
      </section>

      {/* ===== WHY US STOCKS ===== */}
      <section className="subsection bg-alt">
        <div className="container">
          <div className="subsection-header reveal" style={{ textAlign: 'center', margin: '0 auto 3rem' }}>
            <span className="eyebrow">Why US Stocks?</span>
            <h2>Five reasons to invest in US-listed equities</h2>
            <p>Five reasons US-listed equities deserve a place in an Indian investor's portfolio.</p>
          </div>
          <div className="feature-grid">
            {stockFeatures.map(({ icon, title, body }) => (
              <article className="feature-card reveal" key={title}>
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRENDING STOCKS ===== */}
      <section className="subsection">
        <div className="container">
          <div className="subsection-header reveal">
            <span className="eyebrow">Popular US Stocks</span>
            <h2>Widely-followed US-listed companies</h2>
            <p>A snapshot of widely-followed US-listed companies. This is not a recommendation or investment advice.</p>
          </div>
          <div className="trending-list reveal">
            <div className="trending-head">
              <span>Ticker</span><span>Company</span><span>Sector</span><span>Offerings</span>
            </div>
            {trendingStocks.map(({ ticker, name, sector, desc }) => (
              <div className="trending-row" key={ticker}>
                <span className="ticker-badge">{ticker}</span>
                <strong>{name}</strong>
                <span className="sector-chip">{sector}</span>
                <p>{desc}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <a className="btn btn-primary btn-lg" href={TRADING_PLATFORM_URL} target="_blank" rel="noopener noreferrer">
              Start Investing in US Stocks <ArrowIcon />
            </a>
          </div>
        </div>
      </section>

      {/* ===== WHAT ARE US ETFs ===== */}
      <section className="subsection bg-alt" id="us-etfs">
        <div className="container">
          <div className="subsection-header reveal">
            <span className="eyebrow">US ETFs</span>
            <h2>What are US ETFs?</h2>
            <p>US ETFs help investors gain exposure to a basket of stocks, sectors, indices or themes through a single listed instrument. They are useful for investors who want diversified exposure instead of selecting only individual stocks.</p>
          </div>
        </div>
      </section>

      {/* ===== WHY US ETFs ===== */}
      <section className="subsection">
        <div className="container">
          <div className="subsection-header reveal" style={{ textAlign: 'center', margin: '0 auto 3rem' }}>
            <span className="eyebrow">Why US ETFs?</span>
            <h2>Five reasons ETFs are a popular starting point</h2>
            <p>Five reasons ETFs are a popular starting point for global investing.</p>
          </div>
          <div className="feature-grid">
            {etfFeatures.map(({ icon, title, body }) => (
              <article className="feature-card reveal" key={title}>
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRENDING ETFs ===== */}
      <section className="subsection bg-alt">
        <div className="container">
          <div className="subsection-header reveal">
            <span className="eyebrow">Popular US ETFs</span>
            <h2>Widely-followed US ETFs</h2>
            <p>A snapshot of widely-followed US ETFs. This is not a recommendation or investment advice.</p>
          </div>
          <div className="trending-list reveal">
            <div className="trending-head">
              <span>Ticker</span><span>ETF</span><span>Category</span><span>Offerings</span>
            </div>
            {trendingEtfs.map(({ ticker, name, category, desc }) => (
              <div className="trending-row" key={ticker}>
                <span className="ticker-badge">{ticker}</span>
                <strong>{name}</strong>
                <span className="sector-chip">{category}</span>
                <p>{desc}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <a className="btn btn-primary btn-lg" href={TRADING_PLATFORM_URL} target="_blank" rel="noopener noreferrer">
              Start Investing in US ETFs <ArrowIcon />
            </a>
          </div>
        </div>
      </section>

      {/* ===== CLOSING CTA ===== */}
      <section className="section">
        <div className="container">
          <div className="cta-band reveal">
            <h2>Start Investing in US Stocks and ETFs</h2>
            <p>Explore global investing opportunities through Platizio Global.</p>
            <a className="btn btn-gold btn-lg" href={TRADING_PLATFORM_URL} target="_blank" rel="noopener noreferrer">
              Start Investing <ArrowIcon />
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
