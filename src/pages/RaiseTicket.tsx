import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'
import {
  CATEGORIES,
  PRIORITIES,
  getCategory,
  getSubcategory,
} from '../help/ticketTaxonomy'
import {
  consentRecord,
  CONSENT_BEFORE_LINK,
  CONSENT_LINK_LABEL,
  CONSENT_AFTER_LINK,
} from '../help/consent'
import { useTurnstile } from '../help/useTurnstile'
import {
  submitTicket,
  addAttachments,
  formatBytes,
  newIdempotencyKey,
  ATTACHMENTS_ENABLED,
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_FILES,
} from '../help/api/support'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

interface FormState {
  fullName: string
  email: string
  mobile: string
  categoryId: string
  subcategoryId: string
  priority: string
  subject: string
  description: string
  consentGiven: boolean
}

const EMPTY: FormState = {
  fullName: '',
  email: '',
  mobile: '',
  categoryId: '',
  subcategoryId: '',
  priority: 'NORMAL',
  subject: '',
  description: '',
  consentGiven: false,
}

/** What the success screen needs to know. */
interface Submitted {
  email: string
  /** Null on the fallback transport, which cannot issue one. */
  ticketRef: string | null
  failedAttachments: string[]
}

export default function RaiseTicket() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [submitted, setSubmitted] = useState<Submitted | null>(null)

  // Held outside FormState: Files are not form values we want to spread or
  // reset with the rest, and the <input type="file"> needs clearing by ref.
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const turnstile = useTurnstile()

  // One key for this form session, deliberately stable across retries. If the
  // network stalls and the customer sends again, the second request carries the
  // same key, collides on a unique constraint server-side, and returns the
  // first ticket instead of raising a duplicate. A new key is minted only when
  // they start a genuinely new request.
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey())

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    if (!picked.length) return

    const { accepted, error: problem } = addAttachments(attachments, picked)
    setAttachments(accepted)
    setError(problem ?? '')

    // Always reset the input, not just on rejection: the picker replaces its
    // FileList each time, so without this, re-picking a file that was skipped
    // as a duplicate fires no change event and looks broken.
    resetFileInput()
  }

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
    setError('')
    resetFileInput()
  }

  const selectedCategory = getCategory(form.categoryId)
  const selectedSubcategory = getSubcategory(form.categoryId, form.subcategoryId)

  // Hover gives the description via the option's title attribute, but touch
  // and keyboard users never hover — so the current selection's description is
  // also shown inline beneath the control.
  const activeDescription = selectedSubcategory?.description ?? selectedCategory?.description ?? ''

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
      // Subcategories belong to a category — keep them from going out of sync
      ...(name === 'categoryId' ? { subcategoryId: '' } : {}),
    }))
  }

  const focusField = (id: string) => (document.getElementById(id) as HTMLElement | null)?.focus()

  const startAnother = () => {
    setForm(EMPTY)
    setAttachments([])
    resetFileInput()
    setSubmitted(null)
    setError('')
    // A new request is a new key, or it would be treated as a resend of the
    // last one and hand back the previous reference.
    idempotencyKeyRef.current = newIdempotencyKey()
    turnstile.reset()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (sending) return

    const name = form.fullName.trim()
    const email = form.email.trim()
    const mobileDigits = form.mobile.replace(/\D/g, '')
    const subject = form.subject.trim()
    const description = form.description.trim()

    if (name.length < 2) return fail('Please enter your full name.', 'rt-fullName')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please enter a valid email address.', 'rt-email')
    if (mobileDigits.length < 8) return fail('Please enter a valid mobile number (at least 8 digits).', 'rt-mobile')
    if (!form.categoryId) return fail('Please choose a category.', 'rt-categoryId')
    if (!form.subcategoryId) return fail('Please choose a subcategory.', 'rt-subcategoryId')
    if (subject.length < 4) return fail('Please enter a short subject for your request.', 'rt-subject')
    if (description.length < 20) return fail('Please describe the issue in a little more detail (at least 20 characters).', 'rt-description')
    if (!form.consentGiven) return fail('Please confirm you consent to us using these details to respond.', 'rt-consentGiven')
    if (turnstile.enabled && !turnstile.ready) {
      setError('Please complete the verification check below before sending.')
      return
    }

    setSending(true)
    setError('')

    const result = await submitTicket({
      fullName: name,
      email,
      mobile: form.mobile.trim(),
      categoryId: form.categoryId,
      subcategoryId: form.subcategoryId,
      categoryLabel: selectedCategory?.label ?? '',
      subcategoryLabel: selectedSubcategory?.label ?? '',
      priority: (form.priority as (typeof PRIORITIES)[number]['id']),
      subject,
      description,
      consent: consentRecord(),
      idempotencyKey: idempotencyKeyRef.current,
      turnstileToken: turnstile.getToken(),
      attachments,
    })

    setSending(false)

    if (result.status === 'error') {
      setError(result.message)
      // The token is single-use, so a retry needs a fresh one. The idempotency
      // key is deliberately NOT reset — a retry is the same request.
      turnstile.reset()
      return
    }

    setSubmitted({
      email,
      ticketRef: result.ticketRef,
      failedAttachments: result.status === 'partial' ? result.failedAttachments : [],
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function fail(message: string, fieldId: string) {
    setError(message)
    focusField(fieldId)
  }

  return (
    <>
      <SEO
        title="Raise a Support Request"
        description="Send the Platizio Global support team a detailed request about your account, funding, trading, withdrawals, statements or the platform, and we will reply by email."
        canonical="/help/raise"
      />

      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link><span>/</span><Link to="/help">Help &amp; Support</Link><span>/</span><span>Raise a Request</span>
          </div>
          <h1>Raise a Support Request</h1>
          <p>Tell us what you need and our team will get back to you. The more detail you give, the faster we can resolve it.</p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          {submitted ? (
            <div className="help-submitted help-fade-in">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
              </svg>
              <h2>Your request has been sent</h2>

              {/* Shown only when the request was stored and the reference can
                  actually be looked up. Where it cannot be, nothing is shown —
                  a number that leads nowhere is worse than no number. */}
              {submitted.ticketRef && (
                <div className="help-ticket-ref">
                  <p className="help-ticket-ref-label">Your reference</p>
                  <p className="help-ticket-ref-value">{submitted.ticketRef}</p>
                </div>
              )}

              {submitted.failedAttachments.length > 0 && (
                <div className="help-attachment-warning" role="status">
                  <strong>Your request was logged, but we did not receive
                  {submitted.failedAttachments.length === 1 ? ' this file' : ' these files'}:</strong>
                  <ul>
                    {submitted.failedAttachments.map((name) => (<li key={name}>{name}</li>))}
                  </ul>
                  Please reply to our email once you hear from us and attach
                  {submitted.failedAttachments.length === 1 ? ' it' : ' them'} there.
                </div>
              )}

              <p>
                Our support team will reply to <strong>{submitted.email}</strong>. Business hours are Monday to Friday, 9:00 AM to 5:00 PM IST.
              </p>
              <p className="help-disclaimer-fine">
                {submitted.ticketRef
                  ? 'Please quote your reference if you write to us about this again. Need to send another screenshot, statement or document? Reply directly to our email once you hear from us and attach it there.'
                  : 'Need to send another screenshot, statement or document? Reply directly to our email once you hear from us and attach it there.'}
              </p>
              <div className="guide-cta-actions">
                <Link className="btn btn-ghost" to="/help">Back to Help &amp; Support</Link>
                <button className="btn btn-gold" onClick={startAnother}>
                  Raise another request
                </button>
              </div>
            </div>
          ) : (
            <>
            <form onSubmit={handleSubmit} noValidate className="help-form">

              <h2 className="help-form-legend">Your details</h2>

              <div className="field">
                <label htmlFor="rt-fullName">Full name <span className="req">*</span></label>
                <input type="text" id="rt-fullName" name="fullName" value={form.fullName} onChange={handleChange} placeholder="Your full name" />
              </div>

              <div className="help-form-row">
                <div className="field">
                  <label htmlFor="rt-email">Email <span className="req">*</span></label>
                  <input type="email" id="rt-email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
                </div>
                <div className="field">
                  <label htmlFor="rt-mobile">Mobile <span className="req">*</span></label>
                  <input type="tel" id="rt-mobile" name="mobile" value={form.mobile} onChange={handleChange} placeholder="+91 98XXX XXXXX" />
                </div>
              </div>

              <h2 className="help-form-legend">Your request</h2>

              <div className="help-form-row">
                <div className="field">
                  <label htmlFor="rt-categoryId">Category <span className="req">*</span></label>
                  {/* title= is what surfaces the description on hover. It is
                      the only per-option hover affordance a native <select>
                      supports, and keeping the native control is worth more
                      than a custom widget here — it stays keyboard-navigable
                      and uses the OS picker on mobile. */}
                  <select id="rt-categoryId" name="categoryId" value={form.categoryId} onChange={handleChange}>
                    <option value="">Select a category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id} title={c.description}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="rt-subcategoryId">Subcategory <span className="req">*</span></label>
                  {/* value is the stable id, not the label — the label is free
                      to be reworded without orphaning historical tickets. */}
                  <select id="rt-subcategoryId" name="subcategoryId" value={form.subcategoryId} onChange={handleChange} disabled={!selectedCategory}>
                    <option value="">{selectedCategory ? 'Select a subcategory' : 'Choose a category first'}</option>
                    {selectedCategory?.subcategories.map((s) => (
                      <option key={s.id} value={s.id} title={s.description}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* The inline echo of the hovered/selected description. Keyed so
                  the fade replays on change — otherwise the text swaps
                  silently. Pure-CSS fade, never .reveal: this mounts after the
                  reveal observer has already run. */}
              {activeDescription && (
                <p className="help-selection-desc help-fade-in" key={activeDescription}>
                  {activeDescription}
                </p>
              )}

              <div className="field">
                <label htmlFor="rt-priority">How urgent is it?</label>
                <select id="rt-priority" name="priority" value={form.priority} onChange={handleChange}>
                  {PRIORITIES.map((p) => (<option key={p.id} value={p.id}>{p.label}</option>))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="rt-subject">Subject <span className="req">*</span></label>
                <input type="text" id="rt-subject" name="subject" value={form.subject} onChange={handleChange} placeholder="One line summarising your request" />
              </div>

              <div className="field">
                <label htmlFor="rt-description">Description <span className="req">*</span></label>
                <textarea id="rt-description" name="description" value={form.description} onChange={handleChange} rows={6} placeholder="What happened, when it happened, and any amounts, dates or reference numbers involved." />
              </div>

              {ATTACHMENTS_ENABLED && (
                <div className="field">
                  <label htmlFor="rt-attachment">Attachments</label>

                  {attachments.length > 0 && (
                    <ul className="help-file-list">
                      {attachments.map((file, i) => (
                        <li className="help-file-chosen" key={`${file.name}-${file.size}`}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" />
                          </svg>
                          <span className="help-file-name">{file.name}</span>
                          <span className="help-file-size">{formatBytes(file.size)}</span>
                          <button type="button" onClick={() => removeAttachment(i)} aria-label={`Remove ${file.name}`}>
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* The picker stays visible until the cap is reached, so a
                      second batch adds to the list rather than replacing it. */}
                  {attachments.length < ATTACHMENT_MAX_FILES && (
                    <input
                      type="file"
                      id="rt-attachment"
                      name="attachment"
                      ref={fileInputRef}
                      accept={ATTACHMENT_ACCEPT}
                      multiple
                      onChange={handleFileChange}
                      className="help-file-input"
                    />
                  )}
                  <p className="help-file-note">
                    Optional — up to {ATTACHMENT_MAX_FILES} files, PDF, PNG or JPG, 5 MB each. Screenshots, statements or transaction receipts help us investigate faster.
                    <strong> Please redact anything you do not need to share, and never upload passwords or full card numbers.</strong>
                  </p>
                </div>
              )}

              <div className="help-consent">
                <input type="checkbox" id="rt-consentGiven" name="consentGiven" checked={form.consentGiven} onChange={handleChange} />
                {/* Composed from the same three constants that build the text
                    stored in consent_records, so what the customer reads and
                    what we keep as evidence cannot drift apart. */}
                <label htmlFor="rt-consentGiven">
                  {CONSENT_BEFORE_LINK}<Link to="/privacy">{CONSENT_LINK_LABEL}</Link>{CONSENT_AFTER_LINK} <span className="req">*</span>
                </label>
              </div>

              {/* Renders nothing at all until a site key is configured. */}
              {turnstile.enabled && (
                <div className="help-turnstile" ref={turnstile.containerRef} />
              )}

              {error && <p role="alert" className="help-form-error">{error}</p>}

              <button type="submit" className="btn btn-gold btn-lg help-form-submit" disabled={sending}>
                {sending ? 'Sending…' : <>Send request <ArrowIcon /></>}
              </button>

              <p className="help-disclaimer-fine help-form-footnote">
                {ATTACHMENTS_ENABLED
                  ? `Need to send more than ${ATTACHMENT_MAX_FILES} documents? Reply to our email once we get back to you and attach the rest there.`
                  : 'Documents cannot be attached here — reply to our email once we get back to you and attach them there.'}
              </p>
            </form>

            {/* ===== AFTER YOU SUBMIT =====
                Timelines are reproduced from the Support FAQ, the same figures
                shown on /help. Do not reword them into a new promise here. */}
            <div className="help-next">
              <p className="help-next-title">What happens after you submit</p>
              <ol className="help-next-steps">
                <li>
                  <span className="help-next-num">1</span>
                  <span>
                    <strong>We acknowledge it</strong>
                    You get a reply from our support team within 24 hours on business days.
                  </span>
                </li>
                <li>
                  <span className="help-next-num">2</span>
                  <span>
                    <strong>We investigate</strong>
                    If your request involves funding, settlement or custody, we may need to check with our broker partner before we can answer.
                  </span>
                </li>
                <li>
                  <span className="help-next-num">3</span>
                  <span>
                    <strong>We resolve it</strong>
                    Most queries are resolved within 1–5 days. If you are not satisfied with the outcome, you can escalate through our{' '}
                    <Link to="/help/grievance">grievance process</Link>.
                  </span>
                </li>
              </ol>
            </div>

            {/* Anti-phishing notice. A support form is exactly where a scammed
                user arrives, so this is placed where they will be typing. */}
            <div className="help-security">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2l9 4.5v5c0 5-3.8 9.4-9 10.5-5.2-1.1-9-5.5-9-10.5v-5z" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <p>
                <strong>Never share your password, OTP or full bank card details</strong> — not in this form, and not with anyone claiming to be from Platizio. Our team will never ask you for them.
              </p>
            </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
