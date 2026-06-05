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
    icon: <><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/></>,
    title: 'US Stocks',
    body: 'Invest in US-listed companies across sectors — technology, healthcare, consumer brands and more.',
  },
  {
    icon: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 3v18"/></>,
    title: 'US ETFs',
    body: 'Invest in diversified baskets, indices, sectors and themes through a single listed instrument.',
  },
  {
    icon: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
    title: 'Educational Content',
    body: 'Learn about global investing, ETFs, risks, taxation and market basics through articles and videos.',
  },
  {
    icon: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/></>,
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
            <span className="compliance-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              SEBI Compliant
            </span>
            <span className="compliance-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
              AMFI Registered
            </span>
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
                Through <strong>Platizio Global</strong>, we extend that same commitment — enabling Indian investors to explore US Stocks and ETFs with education, support, and a simple onboarding flow.
              </p>
              <p style={{ marginTop: '1.25rem', fontSize: '0.92rem', color: 'var(--gray-500)', fontWeight: 500 }}>
                Platizio Services LLP · Financial Products Distribution Platform
              </p>
            </div>
            <div className="about-art reveal">
              <img src="/platizio-logo.png" alt="Platizio Global" className="about-logo-img" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== OUR FOUNDATION ===== */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">Our Foundation</span>
            <h2>Built on principles that guide every decision and interaction</h2>
          </div>
          <div className="mvv-grid">
            <div className="mvv-card reveal">
              <div className="mvv-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <h3>Our Mission</h3>
              <p>To help investors make informed, risk-aware investment decisions through transparent, research-driven solutions across modern and traditional asset classes.</p>
            </div>
            <div className="mvv-card reveal">
              <div className="mvv-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>
              <h3>Our Vision</h3>
              <p>To be a trusted investment platform enabling investors to build resilient, future-ready portfolios across market cycles.</p>
            </div>
            <div className="mvv-card reveal">
              <div className="mvv-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <h3>Our Values</h3>
              <p>Integrity, clarity, and trust guide every interaction. We focus on suitability, transparency, and long-term outcomes while maintaining disciplined risk management.</p>
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
              <img src="/sir.png" alt="Vividh — Director, Platizio Global" className="leader-photo" />
            </div>
            <div className="leader-info">
              <h3>Vividh</h3>
              <p className="leader-designation">Director, Platizio Global</p>
              <p className="leader-credential">Certified Financial Planner (CFP®)</p>
              <ul className="leader-points">
                <li><CheckIcon />Over 25 years of experience across financial services and International Business</li>
                <li><CheckIcon />Deep understanding of Indian financial markets (Equities / Bonds / Commodities)</li>
                <li><CheckIcon />Active interest in Equity Derivatives and Algorithmic Trading</li>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
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
            <p>We operate under strict regulatory frameworks to ensure the highest standards of investor protection.</p>
          </div>
          <div className="reg-grid">
            <div className="reg-card reveal">
              <div className="reg-logo amfi-logo" aria-label="AMFI">AMFI</div>
              <div>
                <h3>AMFI Registered</h3>
                <p>
                  Platizio Services LLP is registered with the <strong>Association of Mutual Funds in India (AMFI)</strong>, ensuring adherence to the highest standards of ethical mutual fund distribution.
                </p>
              </div>
            </div>
            <div className="reg-card reveal">
              <div className="reg-logo sebi-logo" aria-label="SEBI">SEBI</div>
              <div>
                <h3>SEBI Compliant</h3>
                <p>
                  We operate under the regulatory framework of the <strong>Securities and Exchange Board of India (SEBI)</strong>, maintaining full transparency and investor protection across all offerings, including Specialized Investment Funds (SIFs).
                </p>
              </div>
            </div>
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
