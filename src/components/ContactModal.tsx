import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../context/AppContext'

interface FormState {
  fullName: string
  email: string
  phone: string
  interest: string
  message: string
}

const EMPTY: FormState = { fullName: '', email: '', phone: '', interest: '', message: '' }
const KEY = '256f7a96-c82a-41c5-b3eb-3c2395f68665'
const EP  = 'https' + '://api.web3forms.com/submit'

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
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
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

    setSending(true)
    setError('')
    const fd = new FormData(e.currentTarget)
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
