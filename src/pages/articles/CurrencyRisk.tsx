import { Link } from 'react-router-dom'
import { TRADING_PLATFORM_URL } from '../../constants'

export default function CurrencyRisk() {
  return (
    <article className="article">
      <div className="breadcrumb" style={{ color: 'var(--gray-500)', marginBottom: '1rem' }}>
        <Link to="/" style={{ color: 'var(--gold-deep)' }}>Home</Link><span>/</span>
        <Link to="/media" style={{ color: 'var(--gold-deep)' }}>Media</Link><span>/</span>
        <span>Article</span>
      </div>

      <p className="article-meta">Risk &amp; Compliance · 4 min read</p>
      <h1>Currency Risk in Global Investing Explained Simply</h1>

      <div className="article-hero media-thumb t-3" style={{ aspectRatio: 'auto' }}>
        <h4 style={{ fontSize: '1.4rem' }}>How USD-INR movement affects your returns</h4>
      </div>

      <div className="article-body">
        <p>When an Indian investor buys US Stocks or ETFs, they are investing in US dollars. Any movement in the USD-INR exchange rate will affect the rupee value of that investment — even if the stock price in USD stays flat.</p>

        <h2>A simple example</h2>
        <p>Say you invest ₹83,000 when 1 USD = ₹83. You buy $1,000 worth of a US ETF.</p>
        <ul>
          <li>If the ETF stays flat in USD but USD rises to ₹86: your investment is now worth ₹86,000 — a gain from currency alone.</li>
          <li>If the ETF stays flat in USD but USD falls to ₹80: your investment is now worth ₹80,000 — a loss from currency.</li>
        </ul>

        <blockquote>Currency movement can add to or reduce your returns — independently of how the underlying investment performs in USD.</blockquote>

        <h2>Why this works in both directions</h2>
        <p>Over long periods, the Indian rupee has generally depreciated against the US dollar. This has historically acted as a tailwind for Indian investors holding US assets. However, there can be periods where the rupee strengthens — reducing rupee-denominated returns even when USD returns are positive.</p>

        <h2>Does this mean you should avoid global investing?</h2>
        <p>Not necessarily. Currency risk is one of several risks in global investing — alongside market risk and regulatory risk. Many investors view a degree of USD exposure as part of a balanced overall portfolio, not as a standalone risk to avoid.</p>

        <h2>What to keep in mind</h2>
        <ul>
          <li>Always consider your returns in rupees, not just in USD.</li>
          <li>Currency movements are unpredictable in the short term.</li>
          <li>Long-horizon investors tend to be more comfortable with currency fluctuation.</li>
          <li>Consult your financial advisor before making decisions based on currency expectations.</li>
        </ul>

        <p style={{ marginTop: '2rem' }}>
          <a className="btn btn-gold btn-lg" href={TRADING_PLATFORM_URL} target="_blank" rel="noopener noreferrer">
            Start Investing on Platizio Global
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
        </p>
      </div>
    </article>
  )
}
