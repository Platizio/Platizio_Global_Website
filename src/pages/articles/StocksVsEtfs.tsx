import { Link } from 'react-router-dom'
import { TRADING_PLATFORM_URL } from '../../constants'

export default function StocksVsEtfs() {
  return (
    <article className="article">
      <div className="breadcrumb" style={{ color: 'var(--gray-500)', marginBottom: '1rem' }}>
        <Link to="/" style={{ color: 'var(--gold-deep)' }}>Home</Link><span>/</span>
        <Link to="/media" style={{ color: 'var(--gold-deep)' }}>Media</Link><span>/</span>
        <span>Article</span>
      </div>

      <p className="article-meta">Beginners · 5 min read</p>
      <h1>US Stocks vs ETFs: Which is Better for Beginners?</h1>

      <div className="article-hero media-thumb t-2" style={{ aspectRatio: 'auto' }}>
        <h4 style={{ fontSize: '1.4rem' }}>Single stocks or a diversified basket?</h4>
      </div>

      <div className="article-body">
        <p>"Should I start with US Stocks or US ETFs?" is one of the most common questions first-time global investors ask. There's no single right answer — but a few practical guidelines can help you decide.</p>

        <h2>Start with the difference</h2>
        <p>A <strong>US Stock</strong> is a share of a single company — say Apple or Microsoft. When you buy it, your return depends entirely on that one company.</p>
        <p>A <strong>US ETF</strong> is a basket of securities packaged into one tradeable instrument. Buy an S&amp;P 500 ETF and you indirectly own a slice of 500 large US companies.</p>

        <blockquote>Stocks are concentrated bets. ETFs are diversified ones. Both have a place — they just suit different goals.</blockquote>

        <h2>When ETFs make sense</h2>
        <ul>
          <li><strong>You're just starting out.</strong> Broad index ETFs (like S&amp;P 500 or Nasdaq-100) let you participate in the US market without researching individual companies.</li>
          <li><strong>You want simplicity.</strong> One purchase, hundreds of underlying holdings.</li>
          <li><strong>You want theme exposure</strong> — AI, semiconductors, clean energy — without picking the winner.</li>
          <li><strong>You want lower single-stock risk.</strong> A bad earnings report from one company has a small impact on a diversified ETF.</li>
        </ul>

        <h2>When single stocks make sense</h2>
        <ul>
          <li><strong>You have a specific view</strong> on a particular company and are willing to research it.</li>
          <li><strong>You want concentrated exposure</strong> to a business you understand well.</li>
          <li><strong>You're building on top of an ETF core</strong> — using individual stocks as "satellite" positions.</li>
        </ul>

        <h2>A common starting structure</h2>
        <p>Many first-time investors use a <strong>core-and-satellite</strong> approach:</p>
        <ul>
          <li>A broad ETF (like a S&amp;P 500 or Nasdaq-100 ETF) as the core position.</li>
          <li>A small allocation to 2–3 individual stocks you understand and want to own directly.</li>
        </ul>
        <p>This balances diversification with the chance to participate in specific companies you believe in.</p>

        <h2>What to keep in mind</h2>
        <p>Both options carry market risk and currency risk. ETFs reduce single-stock risk but do not eliminate the chance of overall market declines. Tax treatment may differ — consult your tax advisor for your specific situation.</p>

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
