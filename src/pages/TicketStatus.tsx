import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SEO from '../components/SEO'
import { useTurnstile } from '../help/useTurnstile'
import {
  requestStatusLink,
  lookupStatus,
  statusCopy,
  formatIst,
  isStatusLookupAvailable,
  type StatusTicket,
} from '../help/api/status'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

type View =
  | { mode: 'ask' }
  | { mode: 'sent'; message: string }
  | { mode: 'loading' }
  | { mode: 'tickets'; email: string; tickets: StatusTicket[] }
  | { mode: 'expired' }

export default function TicketStatus() {
  const [params] = useSearchParams()
  const token = params.get('token')

  const [view, setView] = useState<View>(token ? { mode: 'loading' } : { mode: 'ask' })
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const turnstile = useTurnstile()

  useEffect(() => {
    if (!token) return
    let cancelled = false

    lookupStatus(token).then((result) => {
      if (cancelled) return
      if (result.status === 'ok') {
        setView({ mode: 'tickets', email: result.email, tickets: result.tickets })
      } else if (result.status === 'expired') {
        setView({ mode: 'expired' })
      } else {
        setError(result.message)
        setView({ mode: 'ask' })
      }
    })

    return () => { cancelled = true }
  }, [token])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (sending) return

    const address = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError('Please enter a valid email address.')
      document.getElementById('ts-email')?.focus()
      return
    }
    if (turnstile.enabled && !turnstile.ready) {
      setError('Please complete the verification check below before continuing.')
      return
    }

    setSending(true)
    setError('')
    const result = await requestStatusLink(address, turnstile.getToken())
    setSending(false)
    turnstile.reset()

    if (result.status === 'error') {
      setError(result.message)
      return
    }
    setView({ mode: 'sent', message: result.message })
  }

  return (
    <>
      <SEO
        title="Check a Support Request"
        description="Check the status of a support request you have raised with Platizio Global. We send a secure link to the email address the request came from."
        canonical="/help/status"
      />

      <section className="page-hero">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link><span>/</span><Link to="/help">Help &amp; Support</Link><span>/</span><span>Check a Request</span>
          </div>
          <h1>Check a Support Request</h1>
          <p>See where your request has got to. We send a secure link to the email address it was raised from.</p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>

          {!isStatusLookupAvailable() ? (
            <div className="help-submitted">
              <h2>Not available yet</h2>
              <p>
                Request tracking is not switched on yet. If you have raised a request, our support
                team will reply to you by email — just reply to that email if you need an update.
              </p>
              <div className="guide-cta-actions">
                <Link className="btn btn-ghost" to="/help">Back to Help &amp; Support</Link>
              </div>
            </div>
          ) : view.mode === 'loading' ? (
            <div className="help-submitted">
              <h2>Looking up your requests…</h2>
              <p>One moment.</p>
            </div>
          ) : view.mode === 'sent' ? (
            <div className="help-submitted help-fade-in">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16v16H4z" /><path d="M4 7l8 6 8-6" />
              </svg>
              <h2>Check your email</h2>
              <p>{view.message}</p>
              <p className="help-disclaimer-fine">
                The link works for 30 minutes. If it does not arrive within a few minutes, check
                your spam folder — and make sure you used the same address you raised the request from.
              </p>
              <div className="guide-cta-actions">
                <Link className="btn btn-ghost" to="/help">Back to Help &amp; Support</Link>
              </div>
            </div>
          ) : view.mode === 'expired' ? (
            <div className="help-submitted help-fade-in">
              <h2>That link has expired</h2>
              <p>
                Links last 30 minutes, so this one no longer works. Request a new one and we will
                email it straight over.
              </p>
              <div className="guide-cta-actions">
                <Link className="btn btn-gold" to="/help/status">Request a new link</Link>
              </div>
            </div>
          ) : view.mode === 'tickets' ? (
            <div className="help-fade-in">
              <p className="help-selection-desc" style={{ marginBottom: '1.5rem' }}>
                Showing requests raised from <strong>{view.email}</strong>.
              </p>

              {view.tickets.length === 0 ? (
                <div className="help-submitted">
                  <h2>No requests found</h2>
                  <p>There are no support requests against this email address.</p>
                  <div className="guide-cta-actions">
                    <Link className="btn btn-gold" to="/help/raise">Raise a request</Link>
                  </div>
                </div>
              ) : (
                <ul className="status-list">
                  {view.tickets.map((ticket) => {
                    const copy = statusCopy(ticket.status)
                    return (
                      <li className="status-card" key={ticket.ticketRef}>
                        <div className="status-card-head">
                          <span className="status-ref">{ticket.ticketRef}</span>
                          <span className={`status-badge status-badge-${copy.tone}`}>{copy.label}</span>
                        </div>

                        <h3 className="status-subject">{ticket.subject}</h3>
                        <p className="status-detail">{copy.detail}</p>

                        <dl className="status-meta">
                          <div>
                            <dt>Category</dt>
                            <dd>{ticket.categoryLabel} · {ticket.subcategoryLabel}</dd>
                          </div>
                          <div>
                            <dt>Raised</dt>
                            <dd>{formatIst(ticket.raisedAt)}</dd>
                          </div>
                          <div>
                            <dt>Last updated</dt>
                            <dd>{formatIst(ticket.updatedAt)}</dd>
                          </div>
                        </dl>

                        {ticket.attachments.length > 0 && (
                          <ul className="status-files">
                            {ticket.attachments.map((file) => (
                              <li key={file.filename} className={file.received ? '' : 'is-missing'}>
                                {file.filename}
                                {/* Said plainly rather than hidden: if a document
                                    did not arrive, the customer is the only one
                                    who can send it again. */}
                                <span>{file.received ? 'received' : 'not received'}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="guide-cta-actions" style={{ marginTop: '2rem' }}>
                <Link className="btn btn-ghost" to="/help">Back to Help &amp; Support</Link>
                <Link className="btn btn-gold" to="/help/raise">Raise another request</Link>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} noValidate className="help-form">
                <h2 className="help-form-legend">Your email address</h2>

                <div className="field">
                  <label htmlFor="ts-email">Email <span className="req">*</span></label>
                  <input
                    type="email"
                    id="ts-email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                <p className="help-file-note">
                  Use the address you raised the request from. We will email you a secure link
                  rather than showing anything here, so nobody else can look up your requests.
                </p>

                {turnstile.enabled && (
                  <div className="help-turnstile" ref={turnstile.containerRef} />
                )}

                {error && <p role="alert" className="help-form-error">{error}</p>}

                <button type="submit" className="btn btn-gold btn-lg help-form-submit" disabled={sending}>
                  {sending ? 'Sending…' : <>Email me a link <ArrowIcon /></>}
                </button>
              </form>

              <div className="help-security">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2l9 4.5v5c0 5-3.8 9.4-9 10.5-5.2-1.1-9-5.5-9-10.5v-5z" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <p>
                  <strong>We will never ask you for your password, OTP or full card details</strong> —
                  not here, and not by email. If you receive a link you did not ask for, ignore it;
                  nothing has been shared with whoever requested it.
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
