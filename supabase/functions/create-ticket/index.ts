// create-ticket — the only way a support request enters the database.
//
// Order matters here, and it is cheapest-first on purpose: shape, then captcha,
// then rate limit, then the write. A malformed body is rejected without costing
// a Cloudflare round trip; a rate-limited caller is rejected without costing a
// database transaction.
//
// The write itself is a single RPC. create_support_ticket does the ticket, the
// consent record and the attachment rows in one transaction, because a ticket
// that exists without its consent record is a compliance problem and three
// sequential PostgREST calls can produce exactly that.
//
// Attachments never pass through here. The response carries short-lived signed
// upload URLs, each scoped to one path inside this ticket's folder, and the
// browser PUTs to Storage directly.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { preflight, json, fail } from '../_shared/cors.ts'
import { adminClient, ATTACHMENT_BUCKET } from '../_shared/supabase.ts'
import { verifyTurnstile } from '../_shared/turnstile.ts'
import { parseTicketIntent, ValidationError, clientIp } from '../_shared/validation.ts'

// Generous enough that a person retrying a failed submission never notices, low
// enough that the form is not a bulk mail relay. Counted per fixed window.
const IP_LIMIT = 10
const EMAIL_LIMIT = 5
const WINDOW = '1 hour'

Deno.serve(async (req: Request) => {
  const early = preflight(req)
  if (early) return early

  if (req.method !== 'POST') {
    return fail(req, 405, 'Method not allowed.')
  }

  let intent
  try {
    intent = parseTicketIntent(await req.json())
  } catch (error) {
    if (error instanceof ValidationError) return fail(req, 400, error.message)
    return fail(req, 400, 'We could not read that request.', error)
  }

  const ip = clientIp(req)
  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null

  const captcha = await verifyTurnstile(req.headers.get('x-turnstile-token'), ip)
  if (!captcha.ok) {
    return fail(req, 403, captcha.message ?? 'Verification failed.')
  }

  const admin = adminClient()

  // Two buckets, because they fail differently: the IP limit catches one script
  // hammering the endpoint, the email limit catches a distributed attempt to
  // bury one person's inbox under acknowledgements.
  for (const [bucket, limit] of [
    [`intake:ip:${ip ?? 'unknown'}`, IP_LIMIT],
    [`intake:email:${intent.email}`, EMAIL_LIMIT],
  ] as const) {
    // An unidentifiable caller is not exempted — they all share one bucket,
    // which is stricter than being let through, not looser.
    const { data, error } = await admin.rpc('rate_limit_consume', {
      p_bucket: bucket,
      p_limit: limit,
      p_window: WINDOW,
    })

    if (error) {
      // Failing open here is the right call: the rate limiter is an abuse
      // control, and losing a genuine support request because a counter table
      // was briefly unavailable is the worse outcome.
      console.error('rate limit check failed; allowing the request', error)
      break
    }
    if (data && data.allowed === false) {
      console.warn('rate limit hit', bucket, data)
      return fail(req, 429, 'You have sent several requests recently. Please wait a little while before sending another.')
    }
  }

  const { data: created, error: createError } = await admin.rpc('create_support_ticket', {
    payload: {
      idempotencyKey: intent.idempotencyKey,
      fullName: intent.fullName,
      email: intent.email,
      mobileRaw: intent.mobileRaw,
      mobileDigits: intent.mobileDigits,
      categoryId: intent.categoryId,
      subcategoryId: intent.subcategoryId,
      priority: intent.priority,
      subject: intent.subject,
      description: intent.description,
      captchaVerified: captcha.verified,
      ip,
      userAgent,
      consent: intent.consent,
      attachments: intent.attachments.map((a) => ({
        filename: a.filename,
        safeName: a.safeName,
        mime: a.mime,
        bytes: a.bytes,
      })),
    },
  })

  if (createError) {
    // A foreign key violation here means the category/subcategory pair does not
    // exist or do not belong together — a stale bundle, or a hand-made request.
    if (createError.code === '23503') {
      return fail(req, 400, 'That category is no longer available. Please reload the page and try again.', createError)
    }
    return fail(req, 500, 'We could not log your request. Please try again in a moment.', createError)
  }

  // Signed upload URLs, one per attachment, each valid for one path. Minted
  // after the ticket exists so that an anonymous caller cannot farm upload
  // capacity without leaving a ticket behind to account for it.
  //
  // `index` is the position in the array the browser sent, echoed back so the
  // client can pair each URL with the exact File object it belongs to. Pairing
  // by filename instead would break on two files with the same name and
  // different contents — a real case, since the picker allows it — by uploading
  // one of them twice under both slots.
  const uploads: Array<{ index: number; attachmentId: string; filename: string; signedUrl: string }> = []
  const unavailable: string[] = []

  const requested = (created?.attachments ?? []) as Array<{
    attachmentId: string
    path: string
    filename: string
  }>

  for (const [index, attachment] of requested.entries()) {
    const { data: signed, error: signError } = await admin
      .storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUploadUrl(attachment.path)

    if (signError || !signed) {
      // The ticket stands. The customer is told which document did not go
      // through, which is far better than losing the whole request over it.
      console.error('could not sign an upload URL', attachment.path, signError)
      unavailable.push(attachment.filename)
      continue
    }

    uploads.push({
      index,
      attachmentId: attachment.attachmentId,
      filename: attachment.filename,
      signedUrl: signed.signedUrl,
    })
  }

  return json(req, 200, {
    ticketId: created.ticketId,
    ticketRef: created.ticketRef,
    deduplicated: created.deduplicated === true,
    uploads,
    unavailable,
  })
})
