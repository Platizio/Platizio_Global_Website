import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAppContext } from '../context/AppContext'
import SEO from '../components/SEO'
import { TRADING_PLATFORM_URL } from '../constants'
import { sections, searchFaqs, faqSchema, totalQuestionCount } from '../help/faqData'

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

interface Channel {
  title: string
  description: string
  value: string
  /** External destination (mailto:/tel:). Mutually exclusive with `to`. */
  href?: string
  /** Internal route, rendered as a <Link>. Mutually exclusive with `href`. */
  to?: string
  icon: React.ReactNode
}

const channels: Channel[] = [
  {
    title: 'Email us',
    description: 'Best for account questions, statements, and anything needing documents.',
    value: 'supportglobal@platizio.com',
    href: 'mailto:supportglobal@platizio.com',
    icon: (<><path d="M4 4h16v16H4z" /><path d="M4 7l8 6 8-6" /></>),
  },
  {
    title: 'Call or WhatsApp',
    description: 'Speak to the support team during business hours for urgent matters.',
    value: '+91 92898 37100',
    href: 'tel:+919289837100',
    icon: (<><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0122 16.92z" /></>),
  },
  {
    title: 'Check a request',
    description: 'Already raised something? See where it has got to.',
    value: 'Check a support request',
    to: '/help/status',
    icon: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  },
  {
    title: 'Raise a grievance',
    description: 'For formal complaints, reviewed by our Grievance Officer.',
    value: 'How to raise a grievance',
    to: '/help/grievance',
    icon: (<><path d="M12 2l9 4.5v5c0 5-3.8 9.4-9 10.5-5.2-1.1-9-5.5-9-10.5v-5z" /><path d="M12 8v4M12 16h.01" /></>),
  },
]

export default function Help() {
  const location = useLocation()
  const { openContact } = useAppContext()
  const [query, setQuery] = useState('')
  const [openSectionId, setOpenSectionId] = useState<string | null>(null)
  const [openItemId, setOpenItemId] = useState<string | null>(null)

  // Open the section a deep link points at (e.g. /help#taxation, previously
  // /faqs#taxation). The section element always renders regardless of open
  // state, so the hash scroll in App.tsx still finds its target either way.
  useEffect(() => {
    const hash = location.hash.slice(1)
    if (hash && sections.some((s) => s.id === hash)) {
      setOpenSectionId(hash)
      setOpenItemId(null)
    }
  }, [location.hash])

  const toggleSection = (id: string) => {
    setOpenSectionId((prev) => (prev === id ? null : id))
    setOpenItemId(null) // close any open question when switching sections
  }

  const toggleItem = (id: string) => setOpenItemId((prev) => (prev === id ? null : id))

  const trimmed = query.trim()
  const isSearching = trimmed.length > 0
  const results = isSearching ? searchFaqs(trimmed) : []

  const clearSearch = () => {
    setQuery('')
    setOpenItemId(null)
  }

  return (
    <>
      <SEO
        title="Help & Support — Answers, Contact & Grievance Redressal"
        description="Search answers about investing in US Stocks and ETFs from India with Platizio Global, or get in touch with our support team for account, funding, tax and platform help."
        canonical="/help"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link><span>/</span><span>Resources</span><span>/</span><span>Help &amp; Support</span>
          </div>
          <h1>Help &amp; Support</h1>
          <p>Search {totalQuestionCount} answers on getting started, funding, trading, taxation and account management — or reach our team directly.</p>
        </div>
      </section>

      {/* ===== RAISE A REQUEST =====
          Deliberately ahead of the answers. Nothing here uses .reveal: it sits
          above the fold on most screens, where the observer's 60ms pass can
          land before the element has settled into view. */}
      <section className="section help-raise-band">
        <div className="container" style={{ maxWidth: 880 }}>
          <div className="help-contact-cta">
            <h3>Need a hand with something?</h3>
            <p>Send us the details and our support team will get back to you within 24 hours on business days.</p>
            <div className="guide-cta-actions">
              <Link className="btn btn-gold" to="/help/raise">
                Raise a support request <ArrowIcon />
              </Link>
              <button className="btn btn-ghost" onClick={() => openContact('Platform Support')}>
                Quick enquiry
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SEARCH + ANSWERS =====
          Nothing in this region uses .reveal. The accordion is unmounted while a
          search is active, and the reveal observer in App.tsx only runs once per
          navigation — anything re-mounted afterwards would stay at opacity: 0. */}
      <section className="section">
        <div className="container" style={{ maxWidth: 880 }}>

          <div className="help-search">
            <span className="help-search-icon" aria-hidden="true"><SearchIcon /></span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for an answer — e.g. TCS, withdrawal, KYC"
              aria-label={`Search ${totalQuestionCount} help answers`}
            />
            {isSearching && (
              <button type="button" className="help-search-clear" onClick={clearSearch} aria-label="Clear search">
                <CloseIcon />
              </button>
            )}
          </div>

          {isSearching ? (
            <div className="help-results help-fade-in">
              <p className="help-results-count" role="status">
                {results.length === 0
                  ? 'No answers matched your search.'
                  : `${results.length} ${results.length === 1 ? 'answer' : 'answers'} for “${trimmed}”`}
              </p>

              {results.length > 0 ? (
                <div className="faq-list">
                  {results.map(({ sectionTitle, item }) => (
                    <div className={`faq-item${openItemId === item.id ? ' open' : ''}`} key={item.id}>
                      <button
                        className="faq-q"
                        onClick={() => toggleItem(item.id)}
                        aria-expanded={openItemId === item.id}
                      >
                        <span>
                          <span className="help-result-tag">{sectionTitle}</span>
                          {item.q}
                        </span>
                        <span className="ico"><PlusIcon /></span>
                      </button>
                      <div className="faq-a">
                        <div>{item.a}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="help-empty">
                  <p>Try a different word, or let our team answer it for you.</p>
                  <Link className="btn btn-gold" to="/help/raise">
                    Ask our support team <ArrowIcon />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            sections.map(({ id, num, title, note, items }) => (
              <div className={`faq-section${openSectionId === id ? ' section-open' : ''}`} id={id} key={id}>

                {/* Section header — click to expand */}
                <button className="faq-section-header" onClick={() => toggleSection(id)} aria-expanded={openSectionId === id}>
                  <span className="faq-section-label">
                    <span className="num">{num}</span>
                    <span className="faq-section-title">{title}</span>
                  </span>
                  <span className="faq-section-chevron" aria-hidden="true"><ChevronIcon /></span>
                </button>

                {/* Collapsible body */}
                <div className="faq-section-body">
                  <div className="faq-section-inner">
                    {note && note}
                    <div className="faq-list">
                      {items.map(({ id: itemId, q, a }) => (
                        <div className={`faq-item${openItemId === itemId ? ' open' : ''}`} key={itemId}>
                          <button
                            className="faq-q"
                            onClick={() => toggleItem(itemId)}
                            aria-expanded={openItemId === itemId}
                          >
                            {q}
                            <span className="ico"><PlusIcon /></span>
                          </button>
                          <div className="faq-a">
                            <div>{a}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ===== CONTACT CHANNELS ===== */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <div className="section-header reveal">
            <h2>Still need help?</h2>
            <p>Our support team is available Monday to Friday, 9:00 AM to 5:00 PM IST.</p>
          </div>

          <div className="card-grid-3 help-channel-grid reveal">
            {channels.map(({ title, description, value, href, to, icon }) => (
              <article className="help-channel-card" key={title}>
                <div className="guide-pdf-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                {to ? (
                  <Link className="help-channel-value" to={to}>{value}</Link>
                ) : (
                  <a className="help-channel-value" href={href}>{value}</a>
                )}
              </article>
            ))}
          </div>

          {/* Important Disclaimer */}
          <div className="help-disclaimer reveal">
            <p className="help-disclaimer-title">Important Disclaimer</p>
            <p className="help-disclaimer-fine">
              Investing in securities involves market risk, including the possible loss of capital. The value of investments can go up as well as down. The information on this page is provided for general guidance only and does not constitute investment, legal, or tax advice. Tax treatment depends on your individual circumstances and may change. Please read all product terms and consult a qualified financial or tax advisor before investing. Platizio Services LLP facilitates access to US markets through its US brokerage partner; investments are executed and held with ViewTrade IFSC at GIFT City.
            </p>
          </div>
        </div>
      </section>

      {/* ===== START INVESTING CTA ===== */}
      <section className="cta-band reveal">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2>Ready to Start Investing?</h2>
          <p>Open your Platizio Global account and explore US Stocks and ETFs today.</p>
          <a
            className="btn btn-gold btn-lg"
            href={TRADING_PLATFORM_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Start Investing <ArrowIcon />
          </a>
        </div>
      </section>
    </>
  )
}
