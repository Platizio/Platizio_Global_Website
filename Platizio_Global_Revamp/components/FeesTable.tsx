import { Link } from 'react-router-dom'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

/**
 * Highlights only. /pricing stays the source of truth for every number, so a
 * rate is never maintained in two places — change it there and this page keeps
 * pointing at it.
 *
 * `free: true` marks the rows worth reading first. It drives emphasis, not a
 * different meaning.
 */
const FEE_ROWS: { head: string; value: string; free?: boolean }[] = [
  { head: 'Account opening', value: '$0', free: true },
  { head: 'KYC and profile verification', value: '$0', free: true },
  { head: 'Live prices and TradingView charts', value: 'Free', free: true },
  { head: 'Brokerage', value: '0.29% per trade, minimum $1' },
  { head: 'Exchange and regulatory fees', value: 'Charged at cost' },
]

export default function FeesTable() {
  return (
    <section className="section fees-section" aria-labelledby="fees-heading">
      <div className="container">
        <div className="section-header reveal">
          <span className="eyebrow">What it costs</span>
          <h2 id="fees-heading">No account fee. One brokerage rate.</h2>
          <p>
            You pay to trade, not to hold an account. Everything below applies to your
            Platizio Global US Stocks account.
          </p>
        </div>

        <div className="pricing-table fees-table reveal">
          <div className="pricing-row pricing-head">
            <span>Charge</span>
            <span>Amount</span>
          </div>
          <div className="pricing-body">
            {FEE_ROWS.map(({ head, value, free }) => (
              <div className="pricing-row" key={head}>
                <span className="charge-head">{head}</span>
                <span className={`charge-val${free ? ' charge-val--free' : ''}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="fees-footnote">
          Taxes apply separately — TCS on remittances above the LRS threshold, and capital
          gains and dividend tax on your returns.{' '}
          <Link className="fees-link" to="/pricing">
            See full pricing and taxes <ArrowIcon />
          </Link>
        </p>
      </div>
    </section>
  )
}
