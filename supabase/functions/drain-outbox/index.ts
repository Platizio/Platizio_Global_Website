// drain-outbox — sends what intake queued. Called once a minute by pg_cron.
//
// The email itself was rendered and stored when the ticket was finalized, so
// this function holds no presentation logic at all: it claims rows, posts them
// to the provider, and reports back. That is deliberate. The sender is the part
// most likely to fail, and the less it knows the fewer ways it can fail wrongly.
//
// Claiming is done with FOR UPDATE SKIP LOCKED inside claim_notifications, so
// two overlapping runs cannot send the same email twice.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { adminClient, isServiceRoleCaller } from '../_shared/supabase.ts'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const BATCH = 10

interface Notification {
  id: string
  to_email: string
  reply_to: string | null
  subject: string
  body_text: string
  body_html: string | null
}

Deno.serve(async (req: Request) => {
  if (!isServiceRoleCaller(req)) {
    return json(401, { error: 'Not authorised.' })
  }

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('MAIL_FROM')

  // Returns before claiming anything. If this claimed rows and then failed,
  // every queued acknowledgement would burn its five attempts against a
  // configuration gap and land in FAILED — so the queue would be empty and
  // permanently undeliverable by the time the sending domain was ready.
  if (!apiKey || !from) {
    console.warn('RESEND_API_KEY / MAIL_FROM are not set — outbox left untouched')
    return json(200, {
      status: 'not_configured',
      detail: 'Email sending is not configured yet. Queued messages are held, not failed.',
    })
  }

  const admin = adminClient()
  const { data: claimed, error: claimError } = await admin.rpc('claim_notifications', { p_limit: BATCH })

  if (claimError) {
    console.error('could not claim notifications', claimError)
    return json(500, { status: 'error', detail: 'Could not claim from the outbox.' })
  }

  const batch = (claimed ?? []) as Notification[]
  let sent = 0
  let failed = 0

  for (const message of batch) {
    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [message.to_email],
          subject: message.subject,
          text: message.body_text,
          ...(message.body_html ? { html: message.body_html } : {}),
          ...(message.reply_to ? { reply_to: [message.reply_to] } : {}),
        }),
      })

      const payload = await res.json().catch(() => ({})) as { id?: string; message?: string }

      if (!res.ok) {
        failed++
        await admin.rpc('complete_notification', {
          p_id: message.id,
          p_ok: false,
          p_provider: 'resend',
          p_error: `HTTP ${res.status}: ${payload.message ?? 'no detail'}`,
        })
        continue
      }

      sent++
      await admin.rpc('complete_notification', {
        p_id: message.id,
        p_ok: true,
        p_provider: 'resend',
        p_message_id: payload.id ?? null,
      })
    } catch (error) {
      failed++
      // Reported rather than thrown: one unreachable send must not abandon the
      // rest of the batch in SENDING, where only the reaper would find them.
      await admin.rpc('complete_notification', {
        p_id: message.id,
        p_ok: false,
        p_provider: 'resend',
        p_error: String(error).slice(0, 500),
      })
    }
  }

  console.log(`outbox drain: claimed=${batch.length} sent=${sent} failed=${failed}`)
  return json(200, { status: 'ok', claimed: batch.length, sent, failed })
})

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
