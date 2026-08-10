// Single transport seam for support form submissions.
//
// Today this posts to Web3Forms — the same form-to-email service the site's
// contact modal has always used, delivering to the existing support inbox.
// There is no database behind it, so nothing here may hand the customer a
// ticket reference or a status URL: promising a trackable ticket that cannot
// be tracked is worse than promising nothing.
//
// When a real ticketing backend exists, submitTicket() is the only function
// that changes. The TicketSubmission shape below already matches the Ticket
// entity, so callers and the form itself stay as they are.

export const WEB3FORMS_KEY = '256f7a96-c82a-41c5-b3eb-3c2395f68665'
export const WEB3FORMS_ENDPOINT = 'https' + '://api.web3forms.com/submit'

// --- Attachments ---------------------------------------------------------
//
// Web3Forms delivers attachments as email attachments, and the field MUST be
// named exactly "attachment" — their basic uploader takes ONE file, 5MB max.
//
// IMPORTANT: attachment delivery requires a Web3Forms PRO plan. On the free
// tier the file is not delivered. Send one real test submission with a file
// and confirm it arrives in the support inbox before telling customers this
// works — a silently dropped bank statement is worse than no upload field.
// If it does not arrive, set ATTACHMENTS_ENABLED to false; the form keeps
// working and the copy reverts to "reply to our email to attach".
export const ATTACHMENTS_ENABLED = true

export const ATTACHMENT_FIELD = 'attachment'
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024

/** Deliberately narrow: documents and screenshots are the real use cases. */
export const ATTACHMENT_ACCEPT = '.pdf,.png,.jpg,.jpeg'
const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg']

export const formatBytes = (bytes: number): string =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

/** Returns an error message, or null when the file is acceptable. */
export function validateAttachment(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return 'Attachments must be a PDF, PNG or JPG file.'
  }
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return `That file is ${formatBytes(file.size)}. The limit is 5 MB — please compress it or email it to us instead.`
  }
  if (file.size === 0) {
    return 'That file appears to be empty. Please check it and try again.'
  }
  return null
}

export interface TicketSubmission {
  fullName: string
  email: string
  mobile: string
  category: string
  subcategory: string
  priority: string
  subject: string
  description: string
  consentGiven: boolean
  /** Optional single file. Only delivered on a Web3Forms PRO plan. */
  attachment?: File | null
}

export interface SubmitResult {
  ok: boolean
  /** Human-readable message, safe to render directly. */
  message?: string
}

export async function submitTicket(ticket: TicketSubmission): Promise<SubmitResult> {
  const fd = new FormData()

  fd.append('Name', ticket.fullName)
  fd.append('Email', ticket.email)
  fd.append('Mobile', ticket.mobile)
  fd.append('Category', ticket.category)
  fd.append('Subcategory', ticket.subcategory)
  fd.append('Reported urgency', ticket.priority)
  fd.append('Subject', ticket.subject)
  fd.append('Description', ticket.description)
  fd.append('Consent given', ticket.consentGiven ? 'Yes' : 'No')

  // Must be appended under this exact key for Web3Forms to treat it as an
  // email attachment. FormData sets the multipart content type itself, which
  // is what their enctype="multipart/form-data" requirement amounts to here.
  if (ATTACHMENTS_ENABLED && ticket.attachment) {
    fd.append(ATTACHMENT_FIELD, ticket.attachment, ticket.attachment.name)
    // Named separately so the file is still traceable in the email body even
    // if the attachment itself is stripped by the plan tier.
    fd.append('Attached file', `${ticket.attachment.name} (${formatBytes(ticket.attachment.size)})`)
  }

  fd.append('access_key', WEB3FORMS_KEY)
  // Subcategory now carries the routing signal, so it belongs in the subject
  // line where whoever triages the inbox will actually see it.
  fd.append('subject', `[${ticket.category} · ${ticket.subcategory}] ${ticket.subject} — ${ticket.fullName}`)
  fd.append('from_name', 'Platizio Global Help & Support')

  try {
    const res = await fetch(WEB3FORMS_ENDPOINT, { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok && data.success) return { ok: true }
    return { ok: false, message: data.message || 'Something went wrong. Please try again.' }
  } catch {
    return { ok: false, message: 'Network error. Please check your connection and try again.' }
  }
}
