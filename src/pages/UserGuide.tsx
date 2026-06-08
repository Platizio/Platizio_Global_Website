import { Link } from 'react-router-dom'
import { TRADING_PLATFORM_URL } from '../constants'
import { useAppContext } from '../context/AppContext'
import SEO from '../components/SEO'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

interface Step {
  id: string
  num: number
  title: string
  body: React.ReactNode
}

const steps: Step[] = [
  {
    id: 'create-account',
    num: 1,
    title: 'Create your account',
    body: (
      <>
        <p>Head to the Platizio Global platform and sign up with a few basic details:</p>
        <ul>
          <li>First and last name (as on your PAN)</li>
          <li>Email address and mobile number</li>
          <li>Residency type (Resident Indian)</li>
          <li>A secure password</li>
        </ul>
        <p>Accept the Terms &amp; Privacy Policy and select <strong>Create Account</strong>. You&apos;ll then be taken to the login screen.</p>
      </>
    ),
  },
  {
    id: 'log-in',
    num: 2,
    title: 'Log in & verify',
    body: (
      <>
        <p>Log in with your registered email and password. For your security, a one-time password (OTP) is sent to your email — enter it to verify it&apos;s really you.</p>
        <p>Once verified, you&apos;ll move straight into onboarding.</p>
        <p className="guide-note"><strong>Forgot your password?</strong> Choose &ldquo;Forgot Password&rdquo;, enter the OTP sent to your email, and set a new one.</p>
      </>
    ),
  },
  {
    id: 'complete-kyc',
    num: 3,
    title: 'Complete your KYC',
    body: (
      <>
        <p>Indian residents can complete KYC in one of two ways:</p>
        <ul>
          <li><strong>DigiLocker (fastest):</strong> Give consent, log in to DigiLocker, and allow access to your Aadhaar and PAN. Your personal and address details are fetched and pre-filled automatically.</li>
          <li><strong>Manual:</strong> Enter your personal, address, and identity details and upload the required documents yourself.</li>
        </ul>
        <p>You&apos;ll also answer a short investment profile — investment objective, experience, risk tolerance, annual income, and occupation — which helps ensure the products you see are suitable for you.</p>
        <p>Submit your application for review. Most accounts are approved within <strong>1–3 business days</strong>, and you&apos;ll receive a welcome email once you&apos;re live. Your account is opened in your name with ViewTrade IFSC at GIFT City.</p>
      </>
    ),
  },
  {
    id: 'fund-account',
    num: 4,
    title: 'Fund your account (via LRS)',
    body: (
      <>
        <p>Add money to start investing — all remittances are made under the RBI&apos;s <strong>Liberalised Remittance Scheme (LRS)</strong>, which allows up to USD 250,000 per individual per financial year.</p>
        <ul>
          <li><strong>Link your bank:</strong> Add up to three Indian bank accounts. Each is confirmed with a small penny-drop verification.</li>
          <li><strong>Deposit:</strong> Remit INR either through an <strong>integrated net-banking</strong> flow with supported banks (a quick online journey) or via a <strong>manual outward remittance</strong> following your bank&apos;s process. Your bank converts INR to USD.</li>
        </ul>
        <p>Funds typically reflect as buying power on a <strong>T+1</strong> basis. Note that TCS at 20% applies on LRS remittances for overseas investment above ₹10 lakh in a financial year — this is collected by your bank and is creditable against your income tax.</p>
      </>
    ),
  },
  {
    id: 'discover',
    num: 5,
    title: 'Discover investments',
    body: (
      <>
        <p>Explore the US market before you invest:</p>
        <ul>
          <li>Browse trending stocks, top ETFs, gainers and losers, sectors, and curated screeners.</li>
          <li>Open any <strong>stock</strong> for price charts, analyst consensus, key financials, technical indicators, and corporate actions.</li>
          <li>Open any <strong>ETF</strong> for its NAV, holdings and allocation, fund metrics, returns, and benchmark comparison.</li>
        </ul>
        <p>Take your time here — our Media articles and videos are a good companion while you learn.</p>
      </>
    ),
  },
  {
    id: 'place-trade',
    num: 6,
    title: 'Place your first trade',
    body: (
      <>
        <p>Select a stock or ETF to open the order screen, which shows the ticker, current price, and day&apos;s change. Every order shares a few common fields: <strong>order type, quantity (or amount), validity, session, buying power,</strong> and <strong>approximate charges</strong>.</p>
        <p>Choose the order type that fits your goal:</p>
        <ul>
          <li><strong>Market (by quantity):</strong> Buys or sells a set number of shares immediately at the current market price.</li>
          <li><strong>Market (by amount / fractional):</strong> Invest a specific dollar amount instead of whole shares — ideal for high-priced stocks.</li>
          <li><strong>Limit:</strong> Set the maximum price you&apos;ll pay (buy) or the minimum you&apos;ll accept (sell). Executes only at your price or better.</li>
          <li><strong>Stop:</strong> Becomes a market order once the stock reaches your trigger (stop) price.</li>
          <li><strong>Stop-limit:</strong> Once the stop price is reached, it becomes a limit order at the price you set.</li>
        </ul>
        <p>Review your buying power and estimated charges, then tap <strong>Confirm Order</strong>. Sell orders work the same way.</p>
      </>
    ),
  },
  {
    id: 'track-portfolio',
    num: 7,
    title: 'Track your portfolio',
    body: (
      <>
        <p>Your portfolio gives you a clear, real-time view of your investments:</p>
        <ul>
          <li><strong>Current value</strong> of all your holdings combined</li>
          <li><strong>Unrealised P&amp;L</strong> (overall) and <strong>today&apos;s P&amp;L</strong>, in both amount and percentage</li>
          <li>Per-holding detail: quantity, average price, invested value, current value, and gain/loss</li>
        </ul>
        <p>Gains appear in green and losses in red, so you can read your position at a glance.</p>
      </>
    ),
  },
  {
    id: 'manage-account',
    num: 8,
    title: 'Manage your account',
    body: (
      <>
        <p>From your <strong>Profile</strong> you can view your account details, change your password, and log out securely.</p>
        <ul>
          <li><strong>Withdraw:</strong> Request a withdrawal (minimum $20) of settled funds to a linked bank account. The amount is converted from USD to INR during processing, subject to daily cut-off timelines.</li>
          <li><strong>Close account:</strong> For security, account closure is handled by our team — just contact support and we&apos;ll guide you through it.</li>
        </ul>
      </>
    ),
  },
]

export default function UserGuide() {
  const { openContact } = useAppContext()

  return (
    <>
      <SEO
        title="User Guide — How to Start Investing in US Stocks & ETFs"
        description="A step-by-step guide to getting started on Platizio Global — sign up, complete KYC, fund via LRS, discover US Stocks & ETFs, place your first trade, and manage your account."
        canonical="/user-guide"
      />

      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link><span>/</span>
            <span>Resources</span><span>/</span>
            <span>User Guide</span>
          </div>
          <h1>User Guide</h1>
          <p>Everything you need to go from sign-up to your first trade in US Stocks &amp; ETFs with Platizio Global.</p>
        </div>
      </section>

      {/* ===== GUIDE BODY ===== */}
      <section className="section">
        <div className="container" style={{ maxWidth: 900 }}>
          <p className="guide-intro">
            Getting started takes just a few steps. Follow the journey below — from creating
            your account to placing your first order and tracking your portfolio. You can
            jump to any step using the quick links.
          </p>

          {/* Quick links */}
          <nav className="guide-toc reveal" aria-label="Guide steps">
            {steps.map(({ id, num, title }) => (
              <a key={id} href={`#${id}`} className="guide-toc-link">
                <span className="guide-toc-num">{num}</span>
                <span>{title}</span>
              </a>
            ))}
          </nav>

          {/* Steps */}
          <div className="guide-steps">
            {steps.map(({ id, num, title, body }) => (
              <article className="guide-step reveal" id={id} key={id}>
                <div className="guide-step-head">
                  <span className="guide-step-num">{num}</span>
                  <h2>{title}</h2>
                </div>
                <div className="guide-step-body">{body}</div>
              </article>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="guide-disclaimer reveal">
            <p>
              This guide describes the typical journey on the Platizio Global trading platform.
              Exact screens, available banks, timelines, and features may vary and are subject
              to change. Investing in securities involves market risk; please read all product
              terms and consult a qualified financial or tax advisor before investing.
            </p>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-band reveal">
            <h2>Ready to begin?</h2>
            <p>Create your account and place your first international order on Platizio Global.</p>
            <div className="guide-cta-actions">
              <a className="btn btn-gold btn-lg" href={TRADING_PLATFORM_URL} target="_blank" rel="noopener noreferrer">
                Start Investing <ArrowIcon />
              </a>
              <button className="btn btn-light btn-lg" onClick={() => openContact()}>
                Need help? Contact us
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
