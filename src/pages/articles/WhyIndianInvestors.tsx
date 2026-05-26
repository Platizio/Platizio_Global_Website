import { Link } from 'react-router-dom'
import { TRADING_PLATFORM_URL } from '../../constants'

export default function WhyIndianInvestors() {
  return (
    <article className="article">
      <div className="breadcrumb" style={{ color: 'var(--gray-500)', marginBottom: '1rem' }}>
        <Link to="/" style={{ color: 'var(--gold-deep)' }}>Home</Link><span>/</span>
        <Link to="/media" style={{ color: 'var(--gold-deep)' }}>Media</Link><span>/</span>
        <span>Article</span>
      </div>

      <p className="article-meta">Strategy · 6 min read</p>
      <h1>Why Indian Investors Should Consider Global Investing</h1>

      <div className="article-hero media-thumb t-1" style={{ aspectRatio: 'auto' }}>
        <h4 style={{ fontSize: '1.4rem' }}>Diversify beyond a single market</h4>
      </div>

      <div className="article-body">
        <p>For most Indian investors, the portfolio sits almost entirely in domestic assets — Indian stocks, mutual funds, fixed deposits and real estate. That made sense when global access was hard. Today, it's far easier — and there are good reasons to look beyond home.</p>

        <h2>1. Reduce single-market dependence</h2>
        <p>When all your investments depend on one economy, your wealth moves with that economy. Domestic slowdowns, currency depreciation or policy shifts can hit your portfolio at the same time they're hitting your job and household. Global investing spreads that dependence.</p>

        <h2>2. Access companies you cannot buy at home</h2>
        <p>Many of the world's most valuable businesses — across software, AI, semiconductors, healthcare and consumer brands — are listed in the US. As an Indian investor, you use the products of these companies every day. Global investing lets you participate in their growth.</p>

        <blockquote>You already consume global products. Global investing is just owning a piece of the businesses that make them.</blockquote>

        <h2>3. Add USD-linked exposure</h2>
        <p>The Indian rupee has historically depreciated against the US dollar over long periods. Owning US assets gives your portfolio dollar-linked exposure — a natural hedge for big future expenses like overseas education or travel.</p>

        <h2>4. Sector exposure that's hard to replicate locally</h2>
        <p>Themes like AI, semiconductors, cloud infrastructure, biotech and global consumer brands are dominated by a small number of large US-listed names. ETFs make this exposure accessible without picking individual stocks.</p>

        <h2>What to keep in mind</h2>
        <ul>
          <li><strong>Market risk:</strong> US markets fluctuate too — sometimes sharply.</li>
          <li><strong>Currency risk:</strong> USD-INR movement affects rupee returns in both directions.</li>
          <li><strong>Regulatory and tax rules:</strong> Indian residents must follow LRS / FEMA rules; tax treatment differs from domestic equity.</li>
          <li><strong>Position sizing:</strong> Global investing is part of a portfolio — not a replacement for the rest of it.</li>
        </ul>

        <h2>How Platizio Global fits in</h2>
        <p>Platizio Global focuses on US Stocks and US ETFs, with education built in. The idea is simple: help you understand what you're investing in before you place an order — and make the steps to actually invest as short as possible.</p>

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
