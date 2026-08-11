// DECISION: this form stays on Web3Forms and does NOT move onto the ticketing
// backend.
//
// It is a sales enquiry, not a support request. Routing it into `tickets` would
// put it in the queue support is measured on and start an SLA clock against a
// promise the site never made for enquiries — "24 hours on business days"
// is published for support, and inheriting it here by accident would create an
// obligation nobody agreed to. When it does move, it should move to its own
// table with its own timings, in a later slice.
//
// What could not wait for that slice is the consent gap. This form collected
// name, email and phone with no consent checkbox at all, which sits badly
// against Privacy Policy §6 whatever the transport. It now carries one, worded
// for this purpose, and sends the sentence verbatim rather than "Yes" — so the
// email that lands in the inbox is at least a record of what was agreed to.
// That is weaker than a row in consent_records and is not a substitute for
// migrating; it is the difference between a weak record and none.

import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../context/AppContext'
import { WEB3FORMS_KEY, WEB3FORMS_ENDPOINT } from '../help/api/support'
import {
  ENQUIRY_CONSENT_BEFORE_LINK,
  ENQUIRY_CONSENT_TEXT,
  CONSENT_LINK_LABEL,
  CONSENT_AFTER_LINK,
  POLICY_VERSION,
  POLICY_URL,
} from '../help/consent'

interface FormState {
  fullName: string
  email: string
  phone: string
  interest: string
  message: string
  consentGiven: boolean
}

const EMPTY: FormState = { fullName: '', email: '', phone: '', interest: '', message: '', consentGiven: false }
// Shared with the /help/raise intake form so the key lives in exactly one place
const KEY = WEB3FORMS_KEY
const EP  = WEB3FORMS_ENDPOINT

export default function ContactModal() {
  const { isContactOpen, contactInterest, closeContact } = useAppContext()
  const [form, setForm]           = useState<FormState>(EMPTY)
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending]     = useState(false)
  const [error, setError]         = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isContactOpen) {
      lastFocusedRef.current = document.activeElement as HTMLElement
      setForm((f) => ({ ...f, interest: contactInterest || '' }))
      setSubmitted(false)
      setError('')
      setTimeout(() => nameRef.current?.focus(), 200)
    }
  }, [isContactOpen, contactInterest])

  useEffect(() => {
    if (!isContactOpen) {
      // Restore focus to the element that opened the modal
      lastFocusedRef.current?.focus?.()
      const t = setTimeout(() => { setForm(EMPTY); setSubmitted(false); setError('') }, 300)
      return () => clearTimeout(t)
    }
  }, [isContactOpen])

  // Close on Escape and trap focus within the dialog (accessibility)
  useEffect(() => {
    if (!isContactOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeContact(); return }
      if (e.key === 'Tab' && modalRef.current) {
        const f = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isContactOpen, closeContact])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (sending) return // guard against double-submit

    // Client-side validation (noValidate is set, so we validate here for custom, accessible messages)
    const name = form.fullName.trim()
    const email = form.email.trim()
    const phoneDigits = form.phone.replace(/\D/g, '')
    const focusField = (id: string) => (document.getElementById(id) as HTMLElement | null)?.focus()

    if (name.length < 2) {
      setError('Please enter your full name.'); focusField('fullName'); return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.'); focusField('email'); return
    }
    if (phoneDigits.length < 8) {
      setError('Please enter a valid contact number (at least 8 digits).'); focusField('phone'); return
    }
    if (!form.consentGiven) {
      setError('Please confirm you consent to us using these details to contact you.'); focusField('contactConsent'); return
    }

    setSending(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    // Verbatim, with the policy version it referred to — not "Yes", which
    // would evidence nothing about what was actually agreed to.
    fd.set('Consent given', `${ENQUIRY_CONSENT_TEXT} (policy version ${POLICY_VERSION}, ${POLICY_URL})`)
    fd.append('access_key', KEY)
    fd.append('subject',    `New Enquiry from ${name} — Platizio Global`)
    fd.append('from_name',  'Platizio Global Website')
    try {
      const res  = await fetch(EP, { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.success) { setSubmitted(true) }
      else { setError(data.message || 'Something went wrong. Please try again.') }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className={`modal-overlay${isContactOpen ? ' is-open' : ''}`}
      id="contactModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contactTitle"
      onClick={(e) => { if (e.target === e.currentTarget) closeContact() }}
    >
      <div className="modal" ref={modalRef}>
        <button className="modal-close" aria-label="Close" onClick={closeContact}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="form-body" style={{ display: submitted ? 'none' : undefined }}>
          <div className="modal-header">
            <h3 id="contactTitle">Get in touch with Platizio Global</h3>
            <p>Have a question about US Stocks, ETFs or onboarding? Share your details and our team will reach out.</p>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="fullName">Full Name <span className="req">*</span></label>
                <input ref={nameRef} type="text" id="fullName" name="fullName" required placeholder="Your full name" value={form.fullName} onChange={handleChange} />
              </div>
              <div className="field">
                <label htmlFor="email">Email ID <span className="req">*</span></label>
                <input type="email" id="email" name="email" required placeholder="you@example.com" value={form.email} onChange={handleChange} />
              </div>
              <div className="field">
                <label htmlFor="phone">Contact Number <span className="req">*</span></label>
                <input type="tel" id="phone" name="phone" required pattern="[0-9 +\-]{6,}" placeholder="+91 98XXX XXXXX" value={form.phone} onChange={handleChange} />
              </div>
              <div className="field">
                <label htmlFor="interest">Interest</label>
                <select id="interest" name="interest" value={form.interest} onChange={handleChange}>
                  <option value="">Select an option (optional)</option>
                  <option>US Stocks</option>
                  <option>US ETFs</option>
                  <option>Account Opening</option>
                  <option>Platform Support</option>
                  <option>General Query</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="message">Message / Query</label>
                <textarea id="message" name="message" placeholder="Tell us how we can help (optional)" value={form.message} onChange={handleChange} />
              </div>
              {/* Composed from the same constants that build the sentence sent
                  with the submission, so the two cannot drift apart. */}
              <div className="help-consent">
                <input
                  type="checkbox"
                  id="contactConsent"
                  name="consentGiven"
                  checked={form.consentGiven}
                  onChange={handleChange}
                />
                <label htmlFor="contactConsent">
                  {ENQUIRY_CONSENT_BEFORE_LINK}
                  <a href="/privacy">{CONSENT_LINK_LABEL}</a>{CONSENT_AFTER_LINK} <span className="req">*</span>
                </label>
              </div>

              {error && <p role="alert" style={{ color: '#B94B12', fontSize: '0.9rem', marginBottom: '0.75rem', textAlign: 'center' }}>{error}</p>}
              <button type="submit" className="btn btn-gold btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={sending}>
                {sending ? 'Sending…' : 'Submit Enquiry'}
              </button>
            </form>
          </div>
        </div>

        <div className="success-state" style={{ display: submitted ? 'block' : 'none' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
          </svg>
          <h3>Thank you</h3>
          <p>Our team will contact you shortly.</p>
        </div>
      </div>
    </div>
  )
}
