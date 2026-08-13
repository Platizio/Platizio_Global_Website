// The transport seam for support form submissions.
//
// Submitting is now three steps, not one: create the ticket, PUT each
// attachment straight to Storage against a signed URL, then finalize so the
// server can confirm what actually landed and queue the acknowledgement. That
// is why SubmitResult is a union rather than an `ok: boolean` — "your request
// is logged as PG-2026-000042, but the statement did not upload" is a real
// state now, and a boolean cannot say it.
//
// TRANSPORTS
//
// Which one runs is decided at runtime by whether VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY are set:
//
//   configured    Supabase. The request is persisted in Postgres in Mumbai, a
//                 consent record is written in the same transaction, and the
//                 customer is given a real, trackable reference.
//
//   unconfigured  Web3Forms, as before, returning ticketRef: null. The success
//                 screen then shows no reference, which is the truthful thing
//                 to show for a submission that landed in an inbox and nowhere
//                 else.
//
// The fallback exists so that merging this cannot break a live support form in
// the window before the environment variables are set in Vercel. It is not a
// permanent arrangement: while it is in use, KYC-grade documents are still
// being routed through a US email service, which is the thing this whole change
// exists to stop. Set the variables and it retires itself.

import type { Priority } from '../ticketTaxonomy'
import type { ConsentRecord } from '../consent'

// --- Legacy transport ----------------------------------------------------
//
// Retained only for the unconfigured path above. Rotate this key when
// Web3Forms is retired — it has been public in the repository history, so
// removing the code does not remove the exposure.
export const WEB3FORMS_KEY = '256f7a96-c82a-41c5-b3eb-3c2395f68665'
export const WEB3FORMS_ENDPOINT = 'https' + '://api.web3forms.com/submit'

// --- Attachments ---------------------------------------------------------
//
// Everything in this section is a convenience, not a control. It reads
// filenames and sizes so the customer gets an immediate, specific message
// instead of a rejection thirty seconds later — but it never opens a file, so a
// .pdf that is a shell script passes every check here. The real gate is
// finalize-ticket reading the leading bytes back out of Storage, plus the
// bucket's own MIME allowlist and size cap.

export const ATTACHMENTS_ENABLED = true

export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024
export const ATTACHMENT_MAX_FILES = 3

/** Deliberately narrow: documents and screenshots are the real use cases. */
export const ATTACHMENT_ACCEPT = '.pdf,.png,.jpg,.jpeg'
const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg']

/** Extension → the MIME type the server will be told to expect. */
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
}

export const formatBytes = (bytes: number): string =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

const extensionOf = (name: string): string => name.split('.').pop()?.toLowerCase() ?? ''

/** Returns an error message, or null when the file is acceptable. */
export function validateAttachment(file: File): string | null {
  const ext = extensionOf(file.name)
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

// --- The submission ------------------------------------------------------

export interface TicketSubmission {
  fullName: string
  email: string
  mobile: string
  /** Stable ids — these are the foreign keys. */
  categoryId: string
  subcategoryId: string
  /** Labels, carried only so the legacy transport can write a readable email. */
  categoryLabel: string
  subcategoryLabel: string
  priority: Priority
  subject: string
  description: string
  /** The sentence the customer actually agreed to, and the policy version. */
  consent: ConsentRecord
  /**
   * One UUID per form session. `if (sending) return` guards a double click but
   * not a slow network, where the customer reloads and sends again; this makes
   * the second submission return the first ticket instead of creating a second.
   */
  idempotencyKey: string
  turnstileToken?: string | null
  attachments?: File[]
}

/**
 * A fresh idempotency key. One per form session, not one per attempt — the
 * whole point is that two attempts at the same request share a key and collapse
 * into one ticket. crypto.randomUUID needs a secure context and Safari 15.4, so
 * there is a fallback; it only has to be unique, not unguessable, because the
 * key is proof of nothing on its own.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 1
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export type SubmitResult =
  /** Logged, and everything the customer attached is with it. */
  | { status: 'ok'; ticketRef: string | null }
  /** Logged — but some attachments did not make it, and they are named. */
  | { status: 'partial'; ticketRef: string | null; failedAttachments: string[] }
  /** Nothing was logged. `message` is safe to render directly. */
  | { status: 'error'; message: string }

// --- Configuration -------------------------------------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '') ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const isSupabaseConfigured = (): boolean =>
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/** True when the transport in use can hand back a trackable reference. */
export const canIssueTicketReference = isSupabaseConfigured

const GENERIC_FAILURE = 'Something went wrong. Please try again.'
const NETWORK_FAILURE = 'Network error. Please check your connection and try again.'

interface CreateResponse {
  ticketId: string
  ticketRef: string
  deduplicated: boolean
  uploads: Array<{ index: number; attachmentId: string; filename: string; signedUrl: string }>
  unavailable: string[]
}

interface FinalizeResponse {
  ticketRef: string
  acknowledgementQueued: boolean
  attachmentsVerified: number
  failedAttachments: string[]
}

async function callFunction<T>(name: string, body: unknown, timeoutMs: number, extra?: HeadersInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        ...(extra ?? {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const payload = await res.json().catch(() => ({})) as { error?: string }
    if (!res.ok) throw new SubmitFailure(payload.error || GENERIC_FAILURE)
    return payload as T
  } finally {
    clearTimeout(timer)
  }
}

/** Carries a message already safe to show a customer. */
class SubmitFailure extends Error {}

async function uploadToSignedUrl(signedUrl: string, file: File): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120_000)
  try {
    const res = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        // The signed token in the URL is what authorises this write; the key is
        // sent because Storage expects it on every request, not as the
        // authorisation itself.
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': file.type || MIME_BY_EXTENSION[extensionOf(file.name)] || 'application/octet-stream',
        'cache-control': 'max-age=3600',
        'x-upsert': 'false',
      },
      body: file,
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`storage responded ${res.status}`)
  } finally {
    clearTimeout(timer)
  }
}

async function submitViaSupabase(ticket: TicketSubmission): Promise<SubmitResult> {
  const files = ATTACHMENTS_ENABLED ? (ticket.attachments ?? []) : []

  let created: CreateResponse
  try {
    created = await callFunction<CreateResponse>(
      'create-ticket',
      {
        idempotencyKey: ticket.idempotencyKey,
        fullName: ticket.fullName,
        email: ticket.email,
        mobile: ticket.mobile,
        categoryId: ticket.categoryId,
        subcategoryId: ticket.subcategoryId,
        priority: ticket.priority,
        subject: ticket.subject,
        description: ticket.description,
        consent: ticket.consent,
        attachments: files.map((f) => ({
          filename: f.name,
          mime: f.type || MIME_BY_EXTENSION[extensionOf(f.name)] || 'application/octet-stream',
          bytes: f.size,
        })),
      },
      30_000,
      ticket.turnstileToken ? { 'x-turnstile-token': ticket.turnstileToken } : undefined,
    )
  } catch (error) {
    if (error instanceof SubmitFailure) return { status: 'error', message: error.message }
    return { status: 'error', message: NETWORK_FAILURE }
  }

  // Past this point the ticket exists. Nothing below may return `error`: the
  // customer's request has been logged and telling them otherwise would send
  // them round again to raise a duplicate.

  // A deduplicated response means this form session was already submitted, and
  // its attachments were dealt with the first time. Re-uploading would be
  // pointless, and finalizing again would only be a no-op.
  if (created.deduplicated) {
    return { status: 'ok', ticketRef: created.ticketRef }
  }

  const failed = [...created.unavailable]

  await Promise.all(
    created.uploads.map(async (upload) => {
      // By position, not by name. Two files can legitimately share a filename
      // and differ in content — the picker permits it, since duplicates are
      // rejected on name *and* size — and matching by name would upload one of
      // them into both slots.
      const file = files[upload.index]
      if (!file) {
        failed.push(upload.filename)
        return
      }
      try {
        await uploadToSignedUrl(upload.signedUrl, file)
      } catch {
        // Named, not thrown. One failed document must not cost the customer
        // the whole request.
        failed.push(upload.filename)
      }
    }),
  )

  try {
    const finalized = await callFunction<FinalizeResponse>(
      'finalize-ticket',
      { ticketId: created.ticketId, idempotencyKey: ticket.idempotencyKey },
      30_000,
    )
    // finalize is the authority on what is actually in the bucket — it read the
    // objects back — so its list replaces anything guessed at above.
    for (const name of finalized.failedAttachments ?? []) {
      if (!failed.includes(name)) failed.push(name)
    }
  } catch {
    // The ticket stands and the acknowledgement is queued against it; only the
    // attachment confirmation was lost. The cron sweep clears whatever was left
    // unconfirmed, so the customer is told what we actually know.
    for (const upload of created.uploads) {
      if (!failed.includes(upload.filename)) failed.push(upload.filename)
    }
  }

  return failed.length > 0
    ? { status: 'partial', ticketRef: created.ticketRef, failedAttachments: failed }
    : { status: 'ok', ticketRef: created.ticketRef }
}

// --- Legacy transport ----------------------------------------------------

const ATTACHMENT_FIELD = 'attachment'
const ATTACHMENT_MANIFEST_FIELD = 'Attached files'

async function submitViaWeb3Forms(ticket: TicketSubmission): Promise<SubmitResult> {
  const fd = new FormData()

  fd.append('Name', ticket.fullName)
  fd.append('Email', ticket.email)
  fd.append('Mobile', ticket.mobile)
  fd.append('Category', ticket.categoryLabel)
  fd.append('Subcategory', ticket.subcategoryLabel)
  fd.append('Reported urgency', ticket.priority)
  fd.append('Subject', ticket.subject)
  fd.append('Description', ticket.description)
  // Verbatim, not "Yes" — even on the transport that cannot store it properly,
  // the sentence agreed to belongs in the record that does exist.
  fd.append('Consent given', `${ticket.consent.text} (policy version ${ticket.consent.version})`)

  const files = ATTACHMENTS_ENABLED ? (ticket.attachments ?? []) : []
  if (files.length) {
    files.forEach((file) => fd.append(ATTACHMENT_FIELD, file, file.name))
    // Always sent as text too: if the binaries are stripped, this is what tells
    // support that a document is missing.
    fd.append(
      ATTACHMENT_MANIFEST_FIELD,
      files.map((f) => `${f.name} (${formatBytes(f.size)})`).join(', ')
    )
  }

  fd.append('access_key', WEB3FORMS_KEY)
  fd.append('subject', `[${ticket.categoryLabel} · ${ticket.subcategoryLabel}] ${ticket.subject} — ${ticket.fullName}`)
  fd.append('from_name', 'Platizio Global Help & Support')

  try {
    const res = await fetch(WEB3FORMS_ENDPOINT, { method: 'POST', body: fd })
    const data = await res.json()
    // ticketRef stays null: this submission is an email and nothing more, and a
    // reference nobody can look up is worse than none.
    if (res.ok && data.success) return { status: 'ok', ticketRef: null }
    return { status: 'error', message: data.message || GENERIC_FAILURE }
  } catch {
    return { status: 'error', message: NETWORK_FAILURE }
  }
}

export async function submitTicket(ticket: TicketSubmission): Promise<SubmitResult> {
  if (!isSupabaseConfigured()) {
    console.warn(
      'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — support requests are ' +
      'going to Web3Forms and are not being stored. No ticket reference can be issued.',
    )
    return submitViaWeb3Forms(ticket)
  }
  return submitViaSupabase(ticket)
}
