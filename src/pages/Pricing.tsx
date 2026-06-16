import { Link } from 'react-router-dom'
import { TRADING_PLATFORM_URL } from '../constants'
import SEO from '../components/SEO'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

const dematCharges = [
  { head: 'Account Opening Fees', value: '$0' },
  { head: 'KYC / Profile Verification', value: '$0' },
  { head: 'Tracking US Stock Prices', value: 'Free' },
  { head: 'TradingView Charting', value: 'Free' },
]

const tradingCharges = [
  { head: 'Brokerage', value: '0.50% per transaction (or USD 1 minimum)' },
  { head: 'FINRA Transaction Fee', value: '$0.000195 — Multiplied by sales quantity' },
  { head: 'SEC Fee', value: '0.0000206 — Multiplied by trade value (applies on sell transactions)' },
  { head: 'IFSCA Turnover Fee', value: '0.00005 — Multiplied by trade value' },
  { head: 'IGST (For Indian Residents)', value: '18% — Calculated on brokerage value' },
]

const taxCards = [
  {
    icon: (<><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></>),
    title: 'US Stocks Tax on Capital Gains',
    points: [
      'STCG (≤24 months): Taxed as per your income tax slab + surcharge & cess',
      'LTCG (>24 months): 12.5% tax',
    ],
  },
  {
    icon: (<><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></>),
    title: 'Dividend Tax on US Shares',
    points: [
      '25% US withholding tax deducted at source',
      'Claim foreign tax credit while filing ITR in India',
    ],
  },
  {
    icon: (<><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>),
    title: 'TCS on US Stock Investment',
    points: [
      '20% TCS on investments above ₹10 lakh (LRS limit)',
      'Can be claimed as tax credit in ITR',
    ],
  },
]

export default function Pricing() {
  return (
    <>
      <SEO
        title="Pricing &amp; Charges — US Stocks Account"
        description="Transparent pricing for investing in US Stocks from India via Platizio Global — demat account charges, equity trading charges, and taxation & TCS details."
        canonical="/pricing"
      />
      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link><span>/</span><span>Pricing</span>
          </div>
          <h1>Pricing &amp; Charges</h1>
          <p>Simple, transparent charges for your Platizio Global US Stocks account — account fees, trading charges and applicable taxes.</p>
        </div>
      </section>

      {/* ===== DEMAT ACCOUNT CHARGES ===== */}
      <section className="section">
        <div className="container">
          <div className="section-header reveal">
            <h2 className="pricing-h2">Demat Account Charges for <span>US Stocks Account</span></h2>
          </div>
          <div className="pricing-table reveal">
            <div className="pricing-row pricing-head">
              <span>Charge Head</span>
              <span>Charges</span>
            </div>
            <div className="pricing-body">
              {dematCharges.map(({ head, value }) => (
                <div className="pricing-row" key={head}>
                  <span className="charge-head">{head}</span>
                  <span className="charge-val">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== EQUITY TRADING CHARGES ===== */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <div className="section-header reveal">
            <h2 className="pricing-h2">Equity Trading Charges for <span>US Stocks Account</span></h2>
          </div>
          <div className="pricing-table reveal">
            <div className="pricing-row pricing-head">
              <span>Charge Head</span>
              <span>Charge &amp; Calculations</span>
            </div>
            <div className="pricing-body">
              {tradingCharges.map(({ head, value }) => (
                <div className="pricing-row" key={head}>
                  <span className="charge-head">{head}</span>
                  <span className="charge-val">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== TAXATION & TCS ===== */}
      <section className="section">
        <div className="container">
          <div className="section-header reveal">
            <h2>Taxation &amp; TCS</h2>
          </div>
          <div className="tax-grid">
            {taxCards.map(({ icon, title, points }) => (
              <article className="tax-card reveal" key={title}>
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                </div>
                <h3>{title}</h3>
                <ul>
                  {points.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CLOSING CTA ===== */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
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
