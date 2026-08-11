// finalize-ticket — confirm what actually landed, then queue the acknowledgement.
//
// The browser tells us it finished uploading. It is not believed about anything
// else: what is recorded comes from reading the objects out of Storage. The
// declared MIME type came from the operating system's guess at a file
// extension, and a file named .pdf is not a PDF until its first four bytes say
// %PDF.
//
// The acknowledgement is queued here rather than at create time, because
// telling somebody "we have your bank statement" before checking whether the
// upload arrived is a promise this system would then be unable to keep.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { preflight, json, fail } from '../_shared/cors.ts'
import { adminClient, ATTACHMENT_BUCKET, sniffMime } from '../_shared/supabase.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_MIME = ['application/pdf', 'image/png', 'image/jpeg']
const MAX_BYTES = 5 * 1024 * 1024

interface AttachmentRow {
  id: string
  storage_path: string
  original_filename: string
  declared_mime: string
  verification_state: string
}

interface Verdict {
  attachmentId: string
  state: 'VERIFIED' | 'REJECTED' | 'MISSING'
  verifiedMime?: string
  verifiedBytes?: number
  reason?: string
}

Deno.serve(async (req: Request) => {
  const early = preflight(req)
  if (early) return early

  if (req.method !== 'POST') return fail(req, 405, 'Method not allowed.')

  let body: { ticketId?: string; idempotencyKey?: string }
  try {
    body = await req.json()
  } catch (error) {
    return fail(req, 400, 'We could not read that request.', error)
  }

  const ticketId = (body.ticketId ?? '').trim()
  const idempotencyKey = (body.idempotencyKey ?? '').trim()
  if (!UUID_RE.test(ticketId)) return fail(req, 400, 'That request identifier was not readable.')

  const admin = adminClient()

  // Proof that the caller is the one who created this ticket. The key is a UUID
  // the browser generated and only it and this database have seen, so requiring
  // it stops an anonymous caller finalizing — and so triggering the
  // acknowledgement email for — a ticket that is not theirs.
  const { data: ticket, error: ticketError } = await admin
    .from('tickets')
    .select('id, ticket_ref, idempotency_key')
    .eq('id', ticketId)
    .maybeSingle()

  if (ticketError) return fail(req, 500, 'We could not confirm your request.', ticketError)
  if (!ticket) return fail(req, 404, 'We could not find that request.')

  // Unconditional. A ticket with no key was not raised through the form — it
  // was created by staff — and nothing reaching this endpoint with an anon key
  // should be finalizing one of those.
  if (!ticket.idempotency_key || ticket.idempotency_key !== idempotencyKey) {
    return fail(req, 403, 'We could not confirm your request.', {
      reason: ticket.idempotency_key ? 'idempotency key mismatch' : 'ticket was not raised through the form',
      ticketId,
    })
  }

  const { data: attachments, error: attachmentError } = await admin
    .from('ticket_attachments')
    .select('id, storage_path, original_filename, declared_mime, verification_state')
    .eq('ticket_id', ticketId)
    .eq('verification_state', 'PENDING')

  if (attachmentError) return fail(req, 500, 'We could not confirm your request.', attachmentError)

  const verdicts: Verdict[] = []
  for (const row of (attachments ?? []) as AttachmentRow[]) {
    verdicts.push(await inspect(admin, row))
  }

  // Anything that is not what it claimed is removed from the bucket now rather
  // than left for the sweep: an unverified upload sitting in a private bucket
  // is still an unverified upload sitting in a private bucket.
  for (const verdict of verdicts) {
    if (verdict.state !== 'REJECTED') continue
    const row = (attachments as AttachmentRow[]).find((a) => a.id === verdict.attachmentId)
    if (!row) continue
    const { error } = await admin.storage.from(ATTACHMENT_BUCKET).remove([row.storage_path])
    if (error) console.error('could not remove a rejected object', row.storage_path, error)
  }

  const { data: finalized, error: finalizeError } = await admin.rpc('finalize_support_ticket', {
    p_ticket_id: ticketId,
    p_results: verdicts,
  })

  if (finalizeError) {
    return fail(req, 500, 'Your request was logged, but we could not confirm the attachments.', finalizeError)
  }

  const failed = verdicts
    .filter((v) => v.state !== 'VERIFIED')
    .map((v) => {
      const row = (attachments as AttachmentRow[]).find((a) => a.id === v.attachmentId)
      return row?.original_filename ?? 'a file'
    })

  return json(req, 200, {
    ticketRef: finalized?.ticketRef ?? ticket.ticket_ref,
    acknowledgementQueued: finalized?.acknowledgementQueued === true,
    attachmentsVerified: finalized?.attachmentsVerified ?? 0,
    failedAttachments: failed,
  })
})

/**
 * Reads the object back out of Storage: does it exist, how big is it really,
 * and what do its opening bytes say it is.
 */
async function inspect(
  admin: ReturnType<typeof adminClient>,
  row: AttachmentRow,
): Promise<Verdict> {
  const slash = row.storage_path.lastIndexOf('/')
  const folder = row.storage_path.slice(0, slash)
  const name = row.storage_path.slice(slash + 1)

  const { data: listed, error: listError } = await admin
    .storage
    .from(ATTACHMENT_BUCKET)
    .list(folder, { search: name, limit: 1 })

  if (listError) {
    console.error('could not list an attachment folder', folder, listError)
    return { attachmentId: row.id, state: 'MISSING', reason: 'The upload could not be confirmed.' }
  }

  const object = (listed ?? []).find((o) => o.name === name)
  if (!object) {
    // The customer closed the tab mid-upload, or the PUT failed. Not an error
    // on their part and not worth failing the ticket over.
    return { attachmentId: row.id, state: 'MISSING', reason: 'The file was not received.' }
  }

  const size = Number(object.metadata?.size ?? 0)
  if (!Number.isFinite(size) || size <= 0) {
    return { attachmentId: row.id, state: 'REJECTED', reason: 'The file arrived empty.' }
  }
  if (size > MAX_BYTES) {
    return { attachmentId: row.id, state: 'REJECTED', reason: 'The file is over the 5 MB limit.' }
  }

  // Range request rather than a download: sixteen bytes is enough to identify
  // every type we accept, and pulling 5 MB through a function to read four of
  // them would be absurd.
  const { data: signed, error: signError } = await admin
    .storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(row.storage_path, 60)

  if (signError || !signed?.signedUrl) {
    console.error('could not sign a read URL', row.storage_path, signError)
    return { attachmentId: row.id, state: 'MISSING', reason: 'The upload could not be confirmed.' }
  }

  let head: Uint8Array
  try {
    const res = await fetch(signed.signedUrl, { headers: { Range: 'bytes=0-15' } })
    if (!res.ok && res.status !== 206) {
      return { attachmentId: row.id, state: 'MISSING', reason: 'The upload could not be read back.' }
    }
    head = new Uint8Array(await res.arrayBuffer())
  } catch (error) {
    console.error('could not read an attachment head', row.storage_path, error)
    return { attachmentId: row.id, state: 'MISSING', reason: 'The upload could not be read back.' }
  }

  const actual = sniffMime(head)
  if (!actual || !ALLOWED_MIME.includes(actual)) {
    console.warn('attachment content did not match an accepted type', {
      path: row.storage_path,
      declared: row.declared_mime,
    })
    return {
      attachmentId: row.id,
      state: 'REJECTED',
      reason: 'The file contents are not a PDF, PNG or JPG.',
    }
  }

  if (actual !== row.declared_mime) {
    // Not fatal — a .jpg that is really a PNG is a mislabel, not an attack —
    // but the mismatch is worth recording, and verified_mime is what gets
    // stored either way.
    console.warn('declared and actual MIME differ', {
      path: row.storage_path,
      declared: row.declared_mime,
      actual,
    })
  }

  return { attachmentId: row.id, state: 'VERIFIED', verifiedMime: actual, verifiedBytes: size }
}
