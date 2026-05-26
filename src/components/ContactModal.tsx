import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../context/AppContext'

interface FormState {
  fullName: string
  email: string
  phone: string
  interest: string
  message: string
}

const EMPTY_FORM: FormState = {
  fullName: '',
  email: '',
  phone: '',
  interest: '',
  message: '',
}

export default function ContactModal() {
  const { isContactOpen, contactInterest, closeContact } = useAppContext()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitted, setSubmitted] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Pre-select interest when modal opens
  useEffect(() => {
    if (isContactOpen) {
      setForm((f) => ({ ...f, interest: contactInterest || '' }))
      setSubmitted(false)
      setTimeout(() => nameInputRef.current?.focus(), 200)
    }
  }, [isContactOpen, contactInterest])

  // Reset form when modal fully closes
  useEffect(() => {
    if (!isContactOpen) {
      const t = setTimeout(() => {
        setForm(EMPTY_FORM)
        setSubmitted(false)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [isContactOpen])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isContactOpen) closeContact()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isContactOpen, closeContact])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[Platizio Global] Contact lead:', form)
    setSubmitted(true)
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
      <div className="modal">
        <button className="modal-close" aria-label="Close" onClick={closeContact}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Form state */}
        <div className="form-body" style={{ display: submitted ? 'none' : undefined }}>
          <div className="modal-header">
            <h3 id="contactTitle">Get in touch with Platizio Global</h3>
            <p>Have a question about US Stocks, ETFs or onboarding? Share your details and our team will reach out.</p>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="fullName">Full Name <span className="req">*</span></label>
                <input
                  ref={nameInputRef}
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                  placeholder="Your full name"
                  value={form.fullName}
                  onChange={handleChange}
                />
              </div>
              <div className="field">
                <label htmlFor="email">Email ID <span className="req">*</span></label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div className="field">
                <label htmlFor="phone">Contact Number <span className="req">*</span></label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  pattern="[0-9 +\-]{6,}"
                  placeholder="+91 98XXX XXXXX"
                  value={form.phone}
                  onChange={handleChange}
                />
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
                <textarea
                  id="message"
                  name="message"
                  placeholder="Tell us how we can help (optional)"
                  value={form.message}
                  onChange={handleChange}
                />
              </div>
              <button type="submit" className="btn btn-gold btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
                Submit Enquiry
              </button>
            </form>
          </div>
        </div>

        {/* Success state */}
        <div className="success-state" style={{ display: submitted ? 'block' : 'none' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <h3>Thank you</h3>
          <p>Our team will contact you shortly.</p>
        </div>
      </div>
    </div>
  )
}
