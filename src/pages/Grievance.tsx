import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import SEO from '../components/SEO'

// Every commitment on this page (timelines, officer details, escalation ladder)
// is reproduced from what is already published in Terms & Conditions §23 / §25
// and the Privacy Policy §19. Do not introduce a new or reworded service-level
// promise here — it would become a third published SLA alongside those two.

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

const stages = [
  {
    step: '01',
    title: 'Contact support',
    body: (
      <>
        Start with the support team at <a href="mailto:supportglobal@platizio.com">supportglobal@platizio.com</a> or on <a href="tel:+919289837100">+91 92898 37100</a>. Most account, funding and platform issues are resolved at this stage.
      </>
    ),
    icon: (<><path d="M4 4h16v16H4z" /><path d="M4 7l8 6 8-6" /></>),
  },
  {
    step: '02',
    title: 'Escalate to the Grievance Officer',
    body: (
      <>
        If your issue is unresolved or you are not satisfied with the response, write to <a href="mailto:grievances@platizio.com">grievances@platizio.com</a>. Grievances will be acknowledged within 24 hours and addressed within 15 working days, subject to Applicable Law and the nature of the issue.
      </>
    ),
    icon: (<><path d="M12 2l9 4.5v5c0 5-3.8 9.4-9 10.5-5.2-1.1-9-5.5-9-10.5v-5z" /><path d="M9 12l2 2 4-4" /></>),
  },
  {
    step: '03',
    title: 'Formal dispute resolution',
    body: (
      <>
        If a dispute remains unresolved thirty days after being raised with the Grievance Officer, it may be referred to arbitration under the Arbitration and Conciliation Act, 1996, with Delhi as the seat and venue. See <Link to="/terms#tc-23">Terms &amp; Conditions §23</Link>.
      </>
    ),
    icon: (<><path d="M12 3v18M5 7h14M7 7l-3 7h6zM17 7l-3 7h6z" /></>),
  },
] as const

export default function Grievance() {
  const { openContact } = useAppContext()

  return (
    <>
      <SEO
        title="Grievance Redressal — How to Escalate a Complaint"
        description="How to raise and escalate a grievance with Platizio Global, including Grievance Officer contact details, acknowledgement and resolution timelines, and the formal dispute resolution process."
        canonical="/help/grievance"
      />

      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link><span>/</span><Link to="/help">Help &amp; Support</Link><span>/</span><span>Grievance Redressal</span>
          </div>
          <h1>Grievance Redressal</h1>
          <p>If something has gone wrong and support has not resolved it, here is exactly how to escalate — and what happens at each stage.</p>
        </div>
      </section>

      {/* ===== ESCALATION LADDER ===== */}
      <section className="section">
        <div className="container">
          <div className="section-header reveal">
            <h2>How to raise a grievance</h2>
            <p>Please follow these stages in order — starting at stage one lets us resolve most issues quickly.</p>
          </div>

          <div className="steps-grid">
            {stages.flatMap(({ step, title, body, icon }, i, arr) => {
              const card = (
                <div className="step-card reveal" key={step}>
                  <div className="step-num">{step}</div>
                  <div className="step-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                  </div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              )
              if (i < arr.length - 1) {
                return [
                  card,
                  <div className="step-arrow" key={`arrow-${i}`} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </div>,
                ]
              }
              return [card]
            })}
          </div>
        </div>
      </section>

      {/* ===== OFFICER, WHAT TO INCLUDE, ROUTING ===== */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container" style={{ maxWidth: 880 }}>

          {/* Details reproduced verbatim from Terms §25 and Privacy §19 */}
          <div className="legal-contact reveal">
            <h3>Grievance Officer</h3>
            <p>
              <strong style={{ color: 'rgba(255,255,255,0.9)' }}>Anuj Pal</strong> — Operations and Compliance Head<br />
              Platizio Services LLP, Unit No. DGL-229, Second Floor, DLF Galleria Mall,<br />
              Mayur Vihar-1, Delhi, India – 110092<br /><br />
              Email: <a href="mailto:grievances@platizio.com">grievances@platizio.com</a><br />
              Call: <a href="tel:+919289837100">+91 9289837100</a><br />
              Business Hours: Monday to Friday, 9:00 AM to 5:00 PM IST
            </p>
          </div>

          <div className="help-disclaimer reveal">
            <p className="help-disclaimer-title">What to include in your grievance</p>
            <p>
              Sending these details up front avoids a round trip and helps us investigate straight away:
            </p>
            <ul className="help-checklist">
              <li>The email address registered on your Platizio Global account</li>
              <li>Your trading account number, if the issue relates to your account</li>
              <li>The date the issue occurred and a clear description of what happened</li>
              <li>Any earlier email thread with support, so we can pick up the history</li>
              <li>Supporting documents such as screenshots, statements or transaction references</li>
            </ul>
          </div>

          <div className="help-disclaimer reveal">
            <p className="help-disclaimer-title">Matters handled by our broker partner</p>
            <p>
              Matters relating to execution, custody, settlement, account statements, ViewTrade charges or brokerage account operations may be escalated by us to ViewTrade or the relevant service provider. Please continue to route all queries through Platizio support rather than contacting the broker directly — we coordinate with our broker partner on your behalf.
            </p>
          </div>

          {/* Regulator escalation slot — intentionally empty. Platizio does not hold a
              broker-dealer, investment adviser or portfolio manager registration for this
              offering (see Disclaimer), so naming a regulator complaint portal here would
              itself be misleading. Requires compliance sign-off before anything is added. */}

          <div className="help-contact-cta reveal">
            <h3>Not sure if this is a grievance?</h3>
            <p>If you just need a question answered, start with support — it is usually faster.</p>
            <div className="guide-cta-actions">
              <Link className="btn btn-ghost" to="/help">Search Help &amp; Support</Link>
              <button className="btn btn-gold" onClick={() => openContact('Platform Support')}>
                Contact support <ArrowIcon />
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
