import { Link } from 'react-router-dom'
import { TRADING_PLATFORM_URL } from '../constants'
import { useAppContext } from '../context/AppContext'
import SEO from '../components/SEO'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const resources = [
  {
    title: 'Account Registration — Resident Indians',
    description: 'How to create your Platizio Global account and complete your KYC, step by step.',
    href: 'https://drive.google.com/file/d/19NpAvDwdVMEU5xRPD5xDAR_iBIEFyUJH/view?usp=sharing',
  },
  {
    title: 'Funding Instructions',
    description: 'How to add funds to your account from your Indian bank under the LRS. Updated 10 June 2026.',
    href: 'https://drive.google.com/file/d/1IzR3xHFgLOonXZ6xpzotMTagOdcbjL-7/view?usp=sharing',
  },
]

export default function UserGuide() {
  const { openContact } = useAppContext()

  return (
    <>
      <SEO
        title="User Guide — How to Start Investing in US Stocks & ETFs"
        description="Download the official Platizio Global guides — account registration for resident Indians and funding instructions (LRS) — to start investing in US Stocks & ETFs."
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
          <p>Download our step-by-step guides to open and fund your account for investing in US Stocks &amp; ETFs.</p>
        </div>
      </section>

      {/* ===== PDF RESOURCES ===== */}
      <section className="section">
        <div className="container" style={{ maxWidth: 900 }}>
          <p className="guide-intro">
            Use the official Platizio Global guides below.
          </p>

          <div className="guide-pdf-grid">
            {resources.map(({ title, description, href }) => (
              <article className="guide-pdf-card reveal" key={title}>
                <div className="guide-pdf-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                  </svg>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <a className="btn btn-gold" href={href} target="_blank" rel="noopener noreferrer">
                  <DownloadIcon /> View / Download
                </a>
              </article>
            ))}
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
