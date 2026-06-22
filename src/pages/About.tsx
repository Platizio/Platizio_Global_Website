import { Link } from 'react-router-dom'
import { TRADING_PLATFORM_URL } from '../constants'
import SEO from '../components/SEO'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0, color: 'var(--gold)' }}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

const offerings = [
  {
    icon: <><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /></>,
    title: 'US Stocks',
    body: 'Invest in US-listed companies across sectors — technology, healthcare, consumer brands and more.',
  },
  {
    icon: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 3v18" /></>,
    title: 'US ETFs',
    body: 'Invest in diversified baskets, indices, sectors and themes through a single listed instrument.',
  },
  {
    icon: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
    title: 'Educational Content',
    body: 'Learn about global investing, ETFs, risks, taxation and market basics through articles and videos.',
  },
  {
    icon: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" /></>,
    title: 'Platform Support',
    body: 'Assistance for onboarding, account-related queries and ongoing user support.',
  },
]

export default function About() {
  return (
    <>
      <SEO
        title="About Us — IFSCA-Regulated Global Investing Platform"
        description="Learn about Platizio Global — an IFSCA-regulated platform that helps Indian investors access US Stocks and ETFs through the RBI's Liberalised Remittance Scheme (LRS)."
        canonical="/about"
      />
      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link><span>/</span><span>About Us</span>
          </div>
          <h1>About Platizio Global</h1>
          <p>Your trusted partner in building resilient, future-ready portfolios</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          </div>
        </div>
      </section>

      {/* ===== WHAT IS PLATIZIO ===== */}
      <section className="section">
        <div className="container">
          <div className="about-grid">
            <div className="reveal">
              <span className="eyebrow">What is Platizio?</span>
              <h2>A platform built for every investor</h2>
              <p style={{ marginTop: '1rem', fontSize: '1.05rem' }}>
                Platizio Services LLP is a licensed and certified distributor of <strong>Mutual Funds</strong> and <strong>Specialised Investment Funds (SIFs)</strong>, helping investors access advanced strategies through a transparent, regulated framework.
              </p>
              <p style={{ marginTop: '1rem', fontSize: '1.05rem' }}>
                We combine research-backed insights with personalized guidance to make institutional-grade investing accessible to every investor.
              </p>
              <p style={{ marginTop: '1rem', fontSize: '1.05rem' }}>
                Through <strong>Platizio Global</strong>, we extend that same commitment — enabling Indian investors to explore US Stocks and ETFs with education, support, and a simple onboarding flow. We provide end-to-end guidance tailored to your specific investment goals.
              </p>
              <p style={{ marginTop: '1.25rem', fontSize: '0.92rem', color: 'var(--gray-500)', fontWeight: 500 }}>
                Platizio Services LLP · Financial Products Distribution Platform
              </p>
            </div>
            <div className="about-art reveal">
              <picture>
                <source srcSet="/platizio-logo.webp" type="image/webp" />
                <img src="/platizio-logo.png" alt="Platizio Global" className="about-logo-img" />
              </picture>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DIRECTOR / LEADERSHIP ===== */}
      <section className="section">
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">Leadership</span>
            <h2>Experienced leadership committed to your financial success</h2>
          </div>
          <div className="leader-card reveal">
            <div className="leader-photo-wrap">
              <picture>
                <source srcSet="/sir.webp" type="image/webp" />
                <img src="/sir.png" alt="Vividh — Director, Platizio Global" className="leader-photo" />
              </picture>
            </div>
            <div className="leader-info">
              <h3>Vividh</h3>
              <p className="leader-designation">Founder & CEO, Platizio Global</p>
              <p className="leader-credential">MBA, Certified Financial Planner (CFP®)</p>
              <ul className="leader-points">
                <li><CheckIcon />Over 30 years of experience across financial services and International Business</li>
                <li><CheckIcon />Deep understanding of Global financial markets (Equities / Bonds / Commodities)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHAT WE OFFER ===== */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <div className="section-header reveal" style={{ textAlign: 'center', margin: '0 auto 3rem' }}>
            <span className="eyebrow">What We Offer</span>
            <h2>Our Product Offerings</h2>
            <p>What you get when you choose Platizio Global.</p>
          </div>
          <div className="about-offerings-grid">
            {offerings.map(({ icon, title, body }) => (
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

      {/* ===== REGULATORY COMPLIANCE ===== */}
      <section className="section">
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">Regulatory Compliance</span>
            <h2>Operating under strict regulatory frameworks</h2>
          </div>
          <div className="reg-statement reveal">
            <div className="reg-statement-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3>IFSCA &amp; GIFT City Framework</h3>
            <p>
              Your international investments are routed through the GIFT City framework under the strict regulatory oversight of the IFSCA, ensuring the highest global standards of compliance and investor protection.
            </p>
          </div>
        </div>
      </section>

      {/* ===== PARTNERSHIP ===== */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <div className="section-header reveal">
            <h2>Partnership</h2>
          </div>
          <div className="partner-grid">
            <article className="partner-card reveal">
              <div className="partner-card-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h3>Transparent global infrastructure optimized for absolute reliability</h3>
            </article>
            <article className="partner-card reveal">
              <div className="partner-card-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <h3>Global Execution via ViewTrade</h3>
              <p>
                To provide seamless access to US Stocks and ETFs, we have partnered with ViewTrade, a globally recognized leader in B2B financial technology and brokerage solutions. This strategic partnership powers our platform with institutional-grade trade routing, reliable execution, and secure asset custody.
              </p>
            </article>
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
