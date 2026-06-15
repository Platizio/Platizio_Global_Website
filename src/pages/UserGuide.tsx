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
        <h3>Before you begin</h3>
        <p>Keep these ready for a smooth sign-up:</p>
        <ul>
          <li>A valid, active email address and your Indian mobile number (+91)</li>
          <li>PAN card and Aadhaar card (used for identity &amp; address verification)</li>
          <li>Your basic investment and financial background details</li>
        </ul>
        <h3>Sign up</h3>
        <ol>
          <li>On the Platizio Global registration page, click <strong>Sign Up</strong>.</li>
          <li>Enter your <strong>First Name</strong> and <strong>Last Name</strong> exactly as they appear on your PAN card.</li>
          <li>Select residency type <strong>Resident Indian</strong>, choose country code <strong>+91</strong>, and enter your active mobile number.</li>
          <li>Provide a valid email address you can access — your OTP is sent here.</li>
          <li>Create a strong password (uppercase, lowercase, a number, and a special character) and re-enter it to confirm.</li>
          <li>Tick the box to accept the Terms of Service and Privacy Policy, then click <strong>Create Now</strong>.</li>
        </ol>
      </>
    ),
  },
  {
    id: 'log-in',
    num: 2,
    title: 'Verify your email',
    body: (
      <>
        <p>After clicking <strong>Create Now</strong>, you&apos;ll reach the OTP screen. Enter the <strong>one-time password (OTP)</strong> sent to your registered email address and click <strong>Continue</strong>.</p>
        <p className="guide-note"><strong>Tips:</strong> use your legal name exactly as on your PAN, keep your email active (it&apos;s used for OTPs and updates), choose a unique password, and never share your credentials or OTP with anyone — including Platizio Global staff.</p>
        <p>Returning later? Just log in with your registered email and password. Forgot it? Use <strong>Forgot Password</strong>, enter the email OTP, and set a new one.</p>
      </>
    ),
  },
  {
    id: 'complete-kyc',
    num: 3,
    title: 'Complete your KYC & onboarding',
    body: (
      <>
        <h3>DigiLocker KYC (recommended)</h3>
        <p>DigiLocker gives the smoothest experience — your details are fetched automatically. Click <strong>Yes</strong>, enter the mobile number linked to DigiLocker, verify the OTP, then give <strong>consent</strong> for your <strong>PAN</strong> and <strong>Aadhaar</strong> and click <strong>Allow</strong>. (No DigiLocker account? You can create one, or complete the details manually.)</p>
        <h3>Personal &amp; address details</h3>
        <p>Most fields are pre-filled from DigiLocker; a few (such as gender and date of birth) may need to be entered manually. Your Aadhaar address is set as your permanent address — if your current or mailing address is different, choose <strong>No</strong> and add it (pincode, country, state, city, and address lines).</p>
        <h3>Investment profile</h3>
        <p>Choose from the dropdowns: <strong>Investment Objective</strong>, <strong>Investment Experience</strong>, <strong>Risk Tolerance</strong>, <strong>Annual Income</strong>, and <strong>Occupation</strong>. These ensure the products shown are suitable for you and meet regulatory requirements.</p>
        <h3>Background details &amp; signature</h3>
        <p>Answer the short Yes/No background questions, then provide your signature — either upload it or simply type your name in the signature box.</p>
        <h3>Tax declarations</h3>
        <ul>
          <li><strong>Tax treaty (DTAA):</strong> Indian residents select <strong>No</strong> to &ldquo;Are you a U.S. citizen?&rdquo; and certify Indian tax residency. US dividends are normally withheld at 25% — you can claim the reduced rate under the India–U.S. DTAA (recommended).</li>
          <li><strong>FATCA/CRS:</strong> confirm your country of tax residence is India. If not, you&apos;ll add your country of residence and Tax Identification Number (TIN).</li>
        </ul>
        <h3>Nomination</h3>
        <p>Optionally add a nominee who will receive the assets in your account in the event of your death. We recommend adding one — make sure the details are correct.</p>
        <h3>Agreements &amp; declarations</h3>
        <p>Click <strong>Download All Documents</strong>, review them, then tick the confirmation checkbox. These include the Trade Handling Disclosure, Global Market Investing Risk Disclosures, Crypto / Restricted Product Disclosure, Grievance Redressal Policy, AML/KYC Policy, Referrer Disclaimer, the FATCA/CRS Declaration, <strong>Form W-8BEN</strong>, and the <strong>ViewTrade IFSC Customer Account Agreement</strong>.</p>
        <h3>Submit</h3>
        <p>Click <strong>Submit</strong>. Accounts are usually opened <strong>instantly</strong> after verification; if your application can&apos;t be auto-verified, it may take up to <strong>2 business days</strong>. You&apos;ll receive a confirmation email with your application reference number — keep it for your records.</p>
      </>
    ),
  },
  {
    id: 'fund-account',
    num: 4,
    title: 'Fund your account (via LRS)',
    body: (
      <>
        <p>To invest, first add money to your US investing account. Funds are remitted from your Indian bank account to the Platizio Global IFSC account under the RBI&apos;s <strong>Liberalised Remittance Scheme (LRS)</strong> — up to USD 250,000 per person per financial year. You can remit from any Indian bank that permits LRS, including by submitting <strong>Form A2</strong> (purpose code <strong>S0001</strong>).</p>
        <h3>Add a bank account</h3>
        <p>Log in, click <strong>Add Funds</strong>, then <strong>Bank Details → Add New Bank</strong>. Enter your <strong>bank account number</strong> and <strong>IFSC code</strong> (your name is auto-filled from your profile) and click <strong>Add</strong>. You can link up to <strong>three</strong> bank accounts for deposits and withdrawals.</p>
        <h3>Deposit funds</h3>
        <ol>
          <li>Click <strong>Deposit Funds</strong>, select your linked bank, and enter your <strong>PAN</strong> and the <strong>amount in INR</strong>, then click <strong>Continue</strong>.</li>
          <li>Review the summary — receivable amount, applicable charges, estimated bank FX rate, and the USD you&apos;ll receive.</li>
          <li>Tick the box confirming the funds are self-funded, then click <strong>Proceed</strong>.</li>
          <li>You&apos;re taken to your bank&apos;s remittance journey — authenticate as usual (net-banking login, MPIN/OTP, etc.). Once processed, the amount appears as <strong>Buying Power</strong>.</li>
        </ol>
        <h3>Which banks are supported</h3>
        <ul>
          <li><strong>Integrated online flow:</strong> HDFC Bank, ICICI Bank, and Axis Bank — start and complete funding directly from the platform.</li>
          <li><strong>Kotak Mahindra Bank:</strong> supported via Kotak net banking.</li>
          <li><strong>Other banks:</strong> use your bank&apos;s outward-remittance process — Form A2 (purpose code S0001) via your Relationship Manager or branch.</li>
        </ul>
        <p className="guide-note"><strong>Important:</strong> transfer only from your own bank account (third-party transfers aren&apos;t allowed), the account name must match your government ID, and mention your <strong>Platizio Global trading account number</strong> in the bank&apos;s &ldquo;Further Credit To&rdquo; / &ldquo;Additional Information&rdquo; field so the funds are credited correctly.</p>
        <p>To check your balance, open the <strong>profile menu</strong> (top-right) to see your <strong>Buying Power</strong> — the amount available to invest in US stocks and ETFs.</p>
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
