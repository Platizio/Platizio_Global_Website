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
  submitTicket,
  validateAttachment,
  formatBytes,
  ATTACHMENTS_ENABLED,
  ATTACHMENT_ACCEPT,
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
  subcategory: string
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
  subcategory: '',
  priority: 'Normal',
  subject: '',
  description: '',
  consentGiven: false,
}

export default function RaiseTicket() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [submittedTo, setSubmittedTo] = useState<string | null>(null)

  // Held outside FormState: a File is not a form value we want to spread or
  // reset with the rest, and the <input type="file"> needs clearing by ref.
  const [attachment, setAttachment] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return setAttachment(null)

    const problem = validateAttachment(file)
    if (problem) {
      setError(problem)
      clearAttachment() // reject it outright rather than hold an invalid file
      return
    }
    setError('')
    setAttachment(file)
  }

  function clearAttachment() {
    setAttachment(null)
    // Resetting the DOM input matters: without it, re-picking the same file
    // fires no change event and the user thinks the control is broken.
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const selectedCategory = getCategory(form.categoryId)
  const selectedSubcategory = getSubcategory(form.categoryId, form.subcategory)

  // Guidance narrows as the user narrows: broad category advice the moment a
  // category is picked, replaced by subcategory-specific advice once they
  // choose one. Falling back rather than hiding means the panel never
  // disappears mid-flow, which would read as a glitch.
  const guidance = selectedSubcategory ?? selectedCategory
  const guidanceTitle = selectedSubcategory
    ? `What to include for ${selectedSubcategory.label}`
    : selectedCategory
      ? `What to include for ${selectedCategory.label}`
      : ''

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
      // Subcategories belong to a category — keep them from going out of sync
      ...(name === 'categoryId' ? { subcategory: '' } : {}),
    }))
  }

  const focusField = (id: string) => (document.getElementById(id) as HTMLElement | null)?.focus()

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
    if (!form.subcategory) return fail('Please choose a subcategory.', 'rt-subcategory')
    if (subject.length < 4) return fail('Please enter a short subject for your request.', 'rt-subject')
    if (description.length < 20) return fail('Please describe the issue in a little more detail (at least 20 characters).', 'rt-description')
    if (!form.consentGiven) return fail('Please confirm you consent to us using these details to respond.', 'rt-consentGiven')

    setSending(true)
    setError('')

    const result = await submitTicket({
      fullName: name,
      email,
      mobile: form.mobile.trim(),
      category: selectedCategory?.label ?? '',
      subcategory: form.subcategory,
      priority: form.priority,
      subject,
      description,
      consentGiven: form.consentGiven,
      attachment,
    })

    setSending(false)
    if (result.ok) {
      setSubmittedTo(email)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setError(result.message ?? 'Something went wrong. Please try again.')
    }
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
          {submittedTo ? (
            // Deliberately no ticket reference or status link: there is no
            // ticketing backend yet, so a reference number would be fiction.
            <div className="help-submitted help-fade-in">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
              </svg>
              <h2>Your request has been sent</h2>
              <p>
                Our support team will reply to <strong>{submittedTo}</strong>. Business hours are Monday to Friday, 9:00 AM to 5:00 PM IST.
              </p>
              <p className="help-disclaimer-fine">
                Need to send another screenshot, statement or document? Reply directly to our email once you hear from us and attach it there.
              </p>
              <div className="guide-cta-actions">
                <Link className="btn btn-ghost" to="/help">Back to Help &amp; Support</Link>
                <button
                  className="btn btn-gold"
                  onClick={() => { setForm(EMPTY); clearAttachment(); setSubmittedTo(null); setError('') }}
                >
                  Raise another request
                </button>
              </div>
            </div>
          ) : (
            <>
            {/* ===== CHECK FIRST =====
                Deflection, not decoration. Every link here points at a section
                that already answers the question, so a user who reads it never
                needs the form — and the queue stays for things that need a
                person. Plain <Link>s, no .reveal: this block is inside the
                conditional branch and the observer has already run. */}
            <div className="help-prefill">
              <p className="help-prefill-title">Check these first</p>
              <p className="help-prefill-intro">
                Most questions we receive are already answered on the help page — you may get your answer straight away.
              </p>
              <ul className="help-quicklinks">
                <li><Link to="/help#funding">Adding funds, LRS &amp; TCS</Link></li>
                <li><Link to="/help#withdrawals">Withdrawals &amp; settlement</Link></li>
                <li><Link to="/help#taxation">Taxation for Indian residents</Link></li>
                <li><Link to="/help#portfolio-reports">Statements &amp; reports</Link></li>
                <li><Link to="/help#managing-account">Login &amp; account changes</Link></li>
              </ul>
              <p className="help-prefill-search">
                Or <Link to="/help">search all 71 answers</Link>.
              </p>
            </div>

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
                  <select id="rt-categoryId" name="categoryId" value={form.categoryId} onChange={handleChange}>
                    <option value="">Select a category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="rt-subcategory">Subcategory <span className="req">*</span></label>
                  <select id="rt-subcategory" name="subcategory" value={form.subcategory} onChange={handleChange} disabled={!selectedCategory}>
                    <option value="">{selectedCategory ? 'Select a subcategory' : 'Choose a category first'}</option>
                    {selectedCategory?.subcategories.map((s) => (
                      <option key={s.label} value={s.label}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Guidance, narrowing from category to subcategory. Keyed on the
                  active guidance so React remounts it and the fade replays when
                  the advice changes — otherwise the text swaps silently and the
                  user never notices it updated. Pure-CSS fade, not .reveal:
                  this mounts after the reveal observer has already run. */}
              {guidance && (
                <div className="help-hint help-fade-in" key={guidanceTitle}>
                  <p className="help-hint-title">{guidanceTitle}</p>
                  <ul className="help-checklist">
                    {guidance.detailsToInclude.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>

                  {selectedSubcategory?.caution && (
                    <p className="help-hint-caution">{selectedSubcategory.caution}</p>
                  )}

                  {!selectedSubcategory && (
                    <p className="help-hint-link">Choose a subcategory for more specific guidance.</p>
                  )}

                  {selectedCategory?.faqAnchor && (
                    <p className="help-hint-link">
                      Might already be answered — see{' '}
                      <Link to={`/help#${selectedCategory.faqAnchor}`}>{selectedCategory.label} questions</Link>.
                    </p>
                  )}
                </div>
              )}

              <div className="field">
                <label htmlFor="rt-priority">How urgent is it?</label>
                <select id="rt-priority" name="priority" value={form.priority} onChange={handleChange}>
                  {PRIORITIES.map((p) => (<option key={p} value={p}>{p}</option>))}
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
                  <label htmlFor="rt-attachment">Attachment</label>
                  {attachment ? (
                    <div className="help-file-chosen">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" />
                      </svg>
                      <span className="help-file-name">{attachment.name}</span>
                      <span className="help-file-size">{formatBytes(attachment.size)}</span>
                      <button type="button" onClick={clearAttachment} aria-label={`Remove ${attachment.name}`}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      id="rt-attachment"
                      name="attachment"
                      ref={fileInputRef}
                      accept={ATTACHMENT_ACCEPT}
                      onChange={handleFileChange}
                      className="help-file-input"
                    />
                  )}
                  <p className="help-file-note">
                    Optional — one PDF, PNG or JPG, up to 5 MB. Screenshots, statements or transaction receipts help us investigate faster.
                    <strong> Please redact anything you do not need to share, and never upload passwords or full card numbers.</strong>
                  </p>
                </div>
              )}

              <div className="help-consent">
                <input type="checkbox" id="rt-consentGiven" name="consentGiven" checked={form.consentGiven} onChange={handleChange} />
                <label htmlFor="rt-consentGiven">
                  I consent to Platizio Global using the details above to respond to my request, in line with the <Link to="/privacy">Privacy Policy</Link>. <span className="req">*</span>
                </label>
              </div>

              {error && <p role="alert" className="help-form-error">{error}</p>}

              <button type="submit" className="btn btn-gold btn-lg help-form-submit" disabled={sending}>
                {sending ? 'Sending…' : <>Send request <ArrowIcon /></>}
              </button>

              <p className="help-disclaimer-fine help-form-footnote">
                {ATTACHMENTS_ENABLED
                  ? 'Need to send more than one document? Reply to our email once we get back to you and attach the rest there.'
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
