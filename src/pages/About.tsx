import { Link } from 'react-router-dom'
import { TRADING_PLATFORM_URL } from '../constants'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
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

const whyPoints = [
  { title: 'India-focused global investing platform', body: 'Built for Indian investors exploring international markets — designed with local context in mind.' },
  { title: 'US Stocks and ETFs focus', body: 'A clear product focus instead of confusing users with too many offerings.' },
  { title: 'Education-first approach', body: 'Articles, videos, FAQs and explainers — built so you can learn before you invest.' },
  { title: 'Trading platform CTA', body: 'A direct user journey from learning to investing — no detours, no confusion.' },
  { title: 'Contact support', body: 'An easy way to ask questions before starting — via Contact Us, WhatsApp or email.' },
]

export default function About() {
  return (
    <>
      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link><span>/</span><span>About Us</span>
          </div>
          <h1>Building a simpler path to global investing</h1>
          <p>Platizio is a financial services platform; Platizio Global is our dedicated section helping Indian investors explore US Stocks and ETFs.</p>
        </div>
      </section>

      {/* ===== ABOUT PLATIZIO ===== */}
      <section className="section">
        <div className="container">
          <div className="about-grid">
            <div className="reveal">
              <span className="eyebrow">Section 1 · About Platizio</span>
              <h2>A platform across asset classes</h2>
              <p style={{ marginTop: '1rem', fontSize: '1.05rem' }}>
                Platizio is a financial services platform focused on helping investors explore different investment opportunities across asset classes. Through Platizio Global, the focus is on enabling global investing exposure — mainly through US Stocks and ETFs.
              </p>
              <p style={{ marginTop: '1rem', fontSize: '1.05rem' }}>
                We aim to make every step — from learning the basics to placing your first international order — feel approachable.
              </p>
            </div>
            <div className="about-art reveal" aria-hidden="true">
              <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="50" cy="50" r="40" />
                <path d="M10 50h80" />
                <path d="M50 10a55 55 0 0 1 18 40 55 55 0 0 1-18 40 55 55 0 0 1-18-40 55 55 0 0 1 18-40z" />
                <circle cx="50" cy="50" r="6" fill="currentColor" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ABOUT PLATIZIO GLOBAL ===== */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <div className="about-grid">
            <div className="about-art reveal" aria-hidden="true" style={{ order: -1 }}>
              <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="15" y="35" width="14" height="50" rx="2" />
                <rect x="35" y="20" width="14" height="65" rx="2" />
                <rect x="55" y="45" width="14" height="40" rx="2" />
                <rect x="75" y="28" width="14" height="57" rx="2" />
                <path d="M10 20l20-8 20 12 20-15 20 8" style={{ opacity: 0.5 }} />
              </svg>
            </div>
            <div className="reveal">
              <span className="eyebrow">Section 2 · About Platizio Global</span>
              <h2>Built for investors looking beyond home</h2>
              <p style={{ marginTop: '1rem', fontSize: '1.05rem' }}>
                Platizio Global is built for investors who want to diversify beyond domestic markets and explore US-listed stocks and ETFs. The platform focuses on making global investing easier to understand through education, platform support and simple user journeys.
              </p>
              <p style={{ marginTop: '1rem', fontSize: '1.05rem' }}>
                We help investors move from curiosity to confident first investment — backed by educational content and easy access to support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRODUCT OFFERINGS ===== */}
      <section className="section">
        <div className="container">
          <div className="subsection-header reveal" style={{ textAlign: 'center', margin: '0 auto 3rem' }}>
            <span className="eyebrow">Section 3</span>
            <h2>Our Product Offerings</h2>
            <p>Four things you get when you choose Platizio Global.</p>
          </div>
          <div className="feature-grid">
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

      {/* ===== WHY PLATIZIO GLOBAL ===== */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <div className="subsection-header reveal" style={{ textAlign: 'center', margin: '0 auto 3rem' }}>
            <span className="eyebrow">Section 4</span>
            <h2>Why Platizio Global?</h2>
            <p>What sets the experience apart.</p>
          </div>
          <ul className="value-list reveal" style={{ maxWidth: 820, margin: '0 auto' }}>
            {whyPoints.map(({ title, body }, i) => (
              <li key={title}>
                <span className="v-num">{i + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ul>
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
