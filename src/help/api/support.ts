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
// Web3Forms delivers attachments as email attachments, under the field name
// "attachment" exactly. Their basic uploader takes ONE file at 5MB; their
// advanced uploader takes up to THREE. We post with plain fetch + FormData
// rather than their client script, so multiple files are appended under the
// same repeated key — standard multipart, but how many they forward is not
// something their docs pin down.
//
// Because of that, ATTACHMENT_MANIFEST_FIELD always lists every filename as
// plain text in the email body. Even if only the first binary arrives, whoever
// picks up the ticket can see what else the customer meant to send and ask for
// it, rather than silently missing a document.
//
// IMPORTANT: attachment delivery requires a Web3Forms PRO plan at all. On the
// free tier nothing is delivered. Send one real test submission with files and
// confirm they arrive before telling customers this works — a silently dropped
// bank statement is worse than no upload field. If they do not arrive, set
// ATTACHMENTS_ENABLED to false; the form keeps working and the copy reverts to
// "reply to our email to attach".
export const ATTACHMENTS_ENABLED = true

export const ATTACHMENT_FIELD = 'attachment'
const ATTACHMENT_MANIFEST_FIELD = 'Attached files'

export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024
/** Matches the ceiling of the Web3Forms advanced uploader. */
export const ATTACHMENT_MAX_FILES = 3

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
    return `“${file.name}” is not a supported type. Attachments must be PDF, PNG or JPG.`
  }
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return `“${file.name}” is ${formatBytes(file.size)}. The limit is 5 MB per file — please compress it or email it to us instead.`
  }
  if (file.size === 0) {
    return `“${file.name}” appears to be empty. Please check it and try again.`
  }
  return null
}

export interface AttachmentAddResult {
  accepted: File[]
  error: string | null
}

/**
 * Merges a newly picked set into the existing list: validates each, skips
 * duplicates by name and size, and stops at ATTACHMENT_MAX_FILES. Returns the
 * full new list so the caller never has to reason about partial state.
 */
export function addAttachments(existing: File[], incoming: File[]): AttachmentAddResult {
  const accepted = [...existing]
  let error: string | null = null

  for (const file of incoming) {
    if (accepted.length >= ATTACHMENT_MAX_FILES) {
      error = `You can attach up to ${ATTACHMENT_MAX_FILES} files. Send anything further by replying to our email.`
      break
    }
    const isDuplicate = accepted.some((f) => f.name === file.name && f.size === file.size)
    if (isDuplicate) continue

    const problem = validateAttachment(file)
    if (problem) {
      error = problem
      continue // keep the valid ones already collected rather than dropping everything
    }
    accepted.push(file)
  }

  return { accepted, error }
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
  /** Up to ATTACHMENT_MAX_FILES. Only delivered on a Web3Forms PRO plan. */
  attachments?: File[]
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

  // Must be appended under this exact key for Web3Forms to treat these as
  // email attachments. FormData sets the multipart content type itself, which
  // is what their enctype="multipart/form-data" requirement amounts to here.
  const files = ATTACHMENTS_ENABLED ? (ticket.attachments ?? []) : []
  if (files.length) {
    files.forEach((file) => fd.append(ATTACHMENT_FIELD, file, file.name))
    // Always sent as text too — see the note at the top of this file. If the
    // binaries are stripped, this is what tells support a document is missing.
    fd.append(
      ATTACHMENT_MANIFEST_FIELD,
      files.map((f) => `${f.name} (${formatBytes(f.size)})`).join(', ')
    )
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
