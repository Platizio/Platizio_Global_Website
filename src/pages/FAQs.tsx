import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

interface FaqItem {
  id: string
  q: string
  a: React.ReactNode
}

interface FaqSection {
  id: string
  num: number
  title: string
  items: FaqItem[]
}

const sections: FaqSection[] = [
  {
    id: 'getting-started',
    num: 1,
    title: 'Getting Started',
    items: [
      { id: 'gs-1', q: 'What is Platizio Global?', a: 'Platizio Global is a platform focused on US Stocks and ETFs. It is designed to help Indian investors explore international markets through a simple, education-first experience.' },
      { id: 'gs-2', q: 'Who can use Platizio Global?', a: 'Indian investors interested in global investing can use Platizio Global, subject to applicable rules and onboarding checks.' },
      { id: 'gs-3', q: 'What can I invest in?', a: 'US Stocks and US ETFs. Both options are available within the same Platizio Global experience.' },
      { id: 'gs-4', q: 'Is this suitable for beginners?', a: 'Yes. Platizio Global is built with beginners in mind, but users should understand the relevant risks before investing — our articles, videos and FAQs are a good starting point.' },
    ],
  },
  {
    id: 'how-to-invest',
    num: 2,
    title: 'How to Invest',
    items: [
      { id: 'hi-1', q: 'How do I start investing?', a: <span>Click <strong>Start Investing</strong>, complete onboarding, fund your account and place your first order — all within the Platizio Global trading platform.</span> },
      { id: 'hi-2', q: 'Where does the Start Investing button take me?', a: 'It redirects you to the Platizio Global trading platform, where account opening and investing happen.' },
      { id: 'hi-3', q: 'Can I invest in both US Stocks and ETFs?', a: 'Yes. The website offering focuses on both — you can build a portfolio combining individual US Stocks and diversified US ETFs.' },
      { id: 'hi-4', q: 'Can I contact someone before investing?', a: <span>Yes — use the <strong>Contact Us</strong> button at the top of any page, or reach us through WhatsApp / email support.</span> },
    ],
  },
  {
    id: 'stocks-etfs',
    num: 3,
    title: 'US Stocks and ETFs',
    items: [
      { id: 'se-1', q: 'What are US Stocks?', a: 'Shares of companies listed on US exchanges — across sectors like technology, healthcare, consumer brands and more.' },
      { id: 'se-2', q: 'What are US ETFs?', a: 'Basket-based instruments that trade like stocks. A single ETF can give you exposure to an entire index, sector or theme.' },
      { id: 'se-3', q: "What is better: US Stocks or ETFs?", a: "It depends on the investor's preference and goals. ETFs are generally simpler for diversified exposure, while single stocks let you target specific companies. Many investors combine both." },
      { id: 'se-4', q: 'Are ETFs suitable for long-term investing?', a: "They can be, depending on the specific ETF and the investor's objective. Broad index ETFs are commonly used for long-term goals." },
    ],
  },
  {
    id: 'compliance',
    num: 4,
    title: 'Compliance and Risk',
    items: [
      { id: 'cr-1', q: 'Is global investing risk-free?', a: 'No. Investments are subject to market risk, currency risk, regulatory risk and tax risk. There are no guaranteed returns.' },
      { id: 'cr-2', q: 'Does currency movement affect returns?', a: 'Yes. USD-INR movement can impact INR-denominated returns on US investments — both positively and negatively.' },
      { id: 'cr-3', q: 'Are there tax implications?', a: 'Yes. Tax treatment of global investments can differ from domestic ones. Investors should consult their tax advisor for personalised guidance.' },
      { id: 'cr-4', q: 'Are there remittance rules?', a: 'Yes. Indian residents must follow applicable LRS / FEMA rules when transferring funds for overseas investments.' },
      { id: 'cr-5', q: 'Does Platizio Global guarantee returns?', a: 'No. Returns are not guaranteed. Investors should read all relevant documents and consult their financial advisor before investing.' },
    ],
  },
  {
    id: 'support',
    num: 5,
    title: 'Support',
    items: [
      { id: 'sp-1', q: 'How can I contact Platizio Global?', a: <span>Through the <strong>Contact Us</strong> pop-up on any page, or via WhatsApp / email support — links are available in the footer.</span> },
      { id: 'sp-2', q: 'What details are required in the contact form?', a: 'Name, email and contact number are required. You can also share an optional message and select your interest area.' },
      { id: 'sp-3', q: 'How soon will the team respond?', a: 'Our team typically responds within standard business hours. Urgent queries may be prioritised based on the topic shared.' },
      { id: 'sp-4', q: 'Can I request a call back?', a: 'Yes — share your details through the contact form and our team will arrange a call back.' },
    ],
  },
]

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export default function FAQs() {
  const [openId, setOpenId] = useState<string | null>(null)
  const { openContact } = useAppContext()

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id))

  return (
    <>
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
          {sections.map(({ id, num, title, items }) => (
            <div className="faq-section reveal" id={id} key={id}>
              <h2><span className="num">{num}</span>{title}</h2>
              <div className="faq-list">
                {items.map(({ id: itemId, q, a }) => (
                  <div className={`faq-item${openId === itemId ? ' open' : ''}`} key={itemId}>
                    <button className="faq-q" onClick={() => toggle(itemId)}>
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
          ))}

          {/* Still have questions? */}
          <div
            className="reveal"
            style={{
              marginTop: '3rem',
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
    </>
  )
}
