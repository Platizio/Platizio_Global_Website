import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import SEO, { breadcrumbSchema, faqSchema } from '../components/SEO'
import { TRADING_PLATFORM_URL } from '../constants'
import { ALL_FAQS, FAQ_SECTIONS, FEATURED_FAQS } from '../content/faqs'

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

export default function FAQs() {
  const [openSectionId, setOpenSectionId] = useState<string | null>(null)
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  // Featured questions repeat items that also live inside a section, so they
  // track their own open state — otherwise opening one here would open its twin.
  const [openFeaturedId, setOpenFeaturedId] = useState<string | null>(null)
  const { openContact } = useAppContext()
  const { hash } = useLocation()

  // Sections start collapsed, so a deep link like /faqs#funding would otherwise
  // scroll to a closed header and read as broken. The support assistant cites
  // answers with exactly that shape, so open whatever the hash names.
  // ScrollHandler in App.tsx does the scrolling; this only handles the opening.
  useEffect(() => {
    const sectionId = decodeURIComponent(hash.replace(/^#/, ''))
    if (sectionId && FAQ_SECTIONS.some((s) => s.id === sectionId)) {
      setOpenSectionId(sectionId)
    }
  }, [hash])

  const toggleSection = (id: string) => {
    setOpenSectionId((prev) => (prev === id ? null : id))
    setOpenItemId(null) // close any open question when switching sections
  }

  const toggleItem = (id: string) => setOpenItemId((prev) => (prev === id ? null : id))

  const toggleFeatured = (id: string) => setOpenFeaturedId((prev) => (prev === id ? null : id))

  return (
    <>
      <SEO
        title="FAQs — US Stocks &amp; ETF Investing Questions Answered"
        description="Find answers to common questions about investing in US Stocks and ETFs from India via Platizio Global — covering account opening, LRS, taxation, safety, and more."
        canonical="/faqs"
        jsonLd={[
          breadcrumbSchema([['Home', '/'], ['FAQs', '/faqs']]),
          faqSchema(ALL_FAQS),
        ]}
      />
      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link><span>/</span><span>FAQs</span>
          </div>
          <h1>Frequently Asked Questions</h1>
          <p>Common questions about Platizio Global, getting started, US Stocks &amp; ETFs, compliance and support.</p>
        </div>
      </section>

      {/* ===== FAQs ===== */}
      <section className="section">
        <div className="container" style={{ maxWidth: 880 }}>

          {/* Featured questions — the ones support is asked most often, so a
              visitor does not have to open eleven sections to find them. */}
          <div className="faq-featured">
            <h2 className="faq-featured-title">Featured questions</h2>
            <div className="faq-list">
              {FEATURED_FAQS.map(({ id, q, a, sectionId, sectionTitle }) => (
                <div className={`faq-item${openFeaturedId === id ? ' open' : ''}`} key={id}>
                  <button
                    className="faq-q"
                    onClick={() => toggleFeatured(id)}
                    aria-expanded={openFeaturedId === id}
                  >
                    {q}
                    <span className="ico"><PlusIcon /></span>
                  </button>
                  <div className="faq-a">
                    <div className="faq-a-clip">
                      <div>
                        {a}
                        <p className="faq-featured-jump">
                          <Link to={`/faqs#${sectionId}`}>More in {sectionTitle}</Link>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {FAQ_SECTIONS.map(({ id, num, title, note, items, readMore }) => (
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
              {/* The clip wrapper carries no padding of its own. A collapsing
                  grid row sizes to 0, but padding on the row's item is still
                  painted — so the padded element has to sit one level in. */}
              <div className="faq-section-body">
                <div className="faq-section-clip">
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
                          {/* Same reason as the section body: the grid item
                              must be padding-free for the row to collapse. */}
                          <div className="faq-a-clip">
                            <div>{a}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {readMore && readMore.length > 0 && (
                    <div className="faq-read-more">
                      <span>Read more:</span>
                      <ul>
                        {readMore.map(({ label, to }) => (
                          <li key={to}><Link to={to}>{label}</Link></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                </div>
              </div>
            </div>
          ))}

          {/* Important Disclaimer */}
          <div
            style={{
              marginTop: '2rem',
              padding: '1.5rem 2rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--gray-50)',
              border: '1px solid var(--gray-200)',
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--navy)' }}>Important Disclaimer</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontStyle: 'italic', margin: 0 }}>
              Investing in securities involves market risk, including the possible loss of capital. The value of investments can go up as well as down. The information in these FAQs is provided for general guidance only and does not constitute investment, legal, or tax advice. Tax treatment depends on your individual circumstances and may change. Please read all product terms and consult a qualified financial or tax advisor before investing. Platizio Services LLP facilitates access to US markets through its US brokerage partner; investments are executed and held with ViewTrade IFSC at GIFT City.
            </p>
          </div>

          {/* Still have questions? */}
          <div
            style={{
              marginTop: '2rem',
              padding: '2.25rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--gray-50)',
              border: '1px solid var(--gray-200)',
              textAlign: 'center',
            }}
          >
            <h3 style={{ marginBottom: '0.5rem' }}>Still have questions?</h3>
            <p style={{ marginBottom: '1.25rem' }}>Reach out and our team will get back to you shortly.</p>
            <button className="btn btn-gold" onClick={() => openContact()}>
              Contact Platizio Global
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
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
            Start Investing
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </section>
    </>
  )
}
