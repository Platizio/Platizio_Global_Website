// sweep-storage — removes attachment objects that should no longer exist.
//
// Two populations, both listed by list_sweepable_attachments:
//   orphaned          a signed upload URL was issued and finalize never came
//                     back. Six hours old, so no live submission is caught.
//   retention_expired past the ticket's attachment retention date, which is
//                     deliberately allowed to be earlier than the ticket's own.
//
// This exists as a function rather than as SQL in the cron job because objects
// have to be removed through the Storage API. Deleting rows straight out of
// storage.objects leaves the underlying file in the bucket, where nothing will
// ever look at it again and no retention job will ever find it — the worst
// possible outcome for a store holding KYC documents.
//
// Order matters: object first, row second. If the delete fails the row stays
// and the next run tries again. The reverse would lose the only pointer to a
// file we are contractually obliged to have deleted.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { adminClient, ATTACHMENT_BUCKET, isServiceRoleCaller } from '../_shared/supabase.ts'

const BATCH = 100

interface Sweepable {
  attachment_id: string
  storage_path: string
  reason: string
}

Deno.serve(async (req: Request) => {
  if (!isServiceRoleCaller(req)) {
    return json(401, { error: 'Not authorised.' })
  }

  const admin = adminClient()

  const { data, error } = await admin.rpc('list_sweepable_attachments', { p_limit: BATCH })
  if (error) {
    console.error('could not list sweepable attachments', error)
    return json(500, { status: 'error' })
  }

  const rows = (data ?? []) as Sweepable[]
  if (rows.length === 0) return json(200, { status: 'ok', swept: 0 })

  const { data: removed, error: removeError } = await admin
    .storage
    .from(ATTACHMENT_BUCKET)
    .remove(rows.map((r) => r.storage_path))

  if (removeError) {
    console.error('could not remove objects', removeError)
    return json(500, { status: 'error', detail: 'Objects were not removed; rows left in place.' })
  }

  // Only the paths Storage confirms it removed. An object it did not report is
  // left with its row intact so the next run retries it, rather than being
  // forgotten about with the file still sitting in the bucket.
  const removedPaths = new Set((removed ?? []).map((o) => o.name))
  const sweptIds = rows.filter((r) => removedPaths.has(r.storage_path)).map((r) => r.attachment_id)

  // An object that Storage says is already gone still needs its row cleared,
  // or the sweep will retry it forever.
  const alreadyGone = rows
    .filter((r) => !removedPaths.has(r.storage_path) && r.reason === 'retention_expired')
    .map((r) => r.attachment_id)

  const toClear = [...new Set([...sweptIds, ...alreadyGone])]
  if (toClear.length === 0) return json(200, { status: 'ok', swept: 0, listed: rows.length })

  const { data: cleared, error: clearError } = await admin.rpc('confirm_attachments_swept', {
    p_ids: toClear,
  })

  if (clearError) {
    console.error('objects removed but rows not cleared', clearError)
    return json(500, { status: 'error', detail: 'Objects removed; rows not cleared.' })
  }

  const byReason = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1
    return acc
  }, {})

  console.log(`storage sweep: listed=${rows.length} cleared=${cleared}`, byReason)
  return json(200, { status: 'ok', listed: rows.length, swept: cleared, byReason })
})

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
