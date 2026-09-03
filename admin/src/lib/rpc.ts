import type { PostgrestError } from '@supabase/supabase-js'
import { DEMO, demoOpenAttachment, demoRpc } from './demo'
import { supabase } from './supabase'
import type {
  AttachmentAccess,
  AttachmentOpen,
  Dashboard,
  EnquiryDetail,
  EnquiryQueueFilters,
  EnquiryRow,
  EnquiryStatus,
  HolidayCalendar,
  NotificationStatus,
  OutboxRow,
  Page,
  TicketDetail,
  TicketQueueFilters,
  TicketRow,
  TicketStatusInternal,
  WhoAmI,
} from './types'

/**
 * One wrapper per staff_* RPC.
 *
 * Every screen goes through this file and nothing goes around it. Two reasons,
 * and the first is not style:
 *
 * 1. RLS on every table is built on `public.is_staff()` and
 *    `has_staff_role()`, which read roles from the JWT's app_metadata —
 *    populated by the `custom_access_token_hook`. The staff_* RPCs are
 *    SECURITY DEFINER and guard with `private.require_staff()`, which reads
 *    `staff_users` and `user_roles` from the tables instead. So the RPCs work
 *    whether or not that hook is enabled on the project, while a direct
 *    PostgREST table select would silently return zero rows. Zero rows is the
 *    worst possible failure here: it looks exactly like an empty queue.
 *
 * 2. Postgres error codes need translating once, not in ten components.
 */

/* ── Errors ──────────────────────────────────────────────────────────────── */

export class RpcError extends Error {
  readonly code: string
  /** True when the server refused on authorisation rather than on input. */
  readonly denied: boolean

  constructor(message: string, code: string) {
    super(message)
    this.name = 'RpcError'
    this.code = code
    this.denied = code === '42501' || code === 'PGRST301'
  }
}

/**
 * The database's own refusals are written for the person reading them —
 * "Closing an enquiry needs a note saying how it ended", "You cannot remove
 * your own ADMIN role". Those are better than anything this layer could
 * invent, so they are passed through.
 *
 * PostgREST's are not: "permission denied for function staff_set_roles" names
 * an internal function to whoever asked. Only the shapes we recognise as ours
 * are repeated. This mirrors the `speakable()` allowlist that
 * supabase/functions/staff-attachment/index.ts already applies server-side.
 */
const OURS = [
  'This action requires',
  'Closing an enquiry',
  'You cannot ',
  'A staff user',
  'A reply needs',
  'A note needs',
  'Only a FAILED',
  'That request already',
  'no such ',
  'assignee must be',
  'Every date',
  'Every holiday',
  'p_year must be',
  'p_active must be',
]

function translate(error: PostgrestError): RpcError {
  const code = error.code ?? ''
  const raw = (error.message ?? '').trim()

  if (OURS.some((prefix) => raw.startsWith(prefix))) return new RpcError(raw, code)

  if (code === '42501' || code === 'PGRST301') {
    return new RpcError('You do not have permission to do that.', code)
  }
  if (code === 'P0002') return new RpcError('That record no longer exists.', code)
  if (code === '23503') {
    return new RpcError('Something that request referred to no longer exists.', code)
  }
  if (code === 'PGRST202') {
    return new RpcError(
      'That function is not deployed on this project yet. The console is ahead of the database.',
      code,
    )
  }
  return new RpcError('That did not work. Please try again in a moment.', code || 'unknown')
}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  // Dev-only fixtures, so the screens can be reviewed before a project exists.
  // DEMO folds to a constant `false` in a production build, so this branch and
  // everything it reaches are dropped from the bundle.
  if (DEMO) return (await demoRpc(fn, args ?? {})) as T

  const { data, error } = await supabase.rpc(fn, args ?? {})
  if (error) throw translate(error)
  return data as T
}

/* ── Identity ────────────────────────────────────────────────────────────── */

export function whoami(): Promise<WhoAmI> {
  return call<WhoAmI>('staff_whoami')
}

/* ── Dashboard ───────────────────────────────────────────────────────────── */

export function dashboard(): Promise<Dashboard> {
  return call<Dashboard>('staff_dashboard')
}

/* ── Tickets ─────────────────────────────────────────────────────────────── */

/**
 * `payload` is passed as a single jsonb argument, matching the RPC. Undefined
 * keys are stripped rather than sent as null: `staff_ticket_queue` treats an
 * absent `status` as "the open ones" and an explicit null as a cast error.
 */
export function ticketQueue(filters: TicketQueueFilters = {}): Promise<Page<TicketRow>> {
  return call<Page<TicketRow>>('staff_ticket_queue', { payload: clean(filters) })
}

export function ticketDetail(id: string): Promise<TicketDetail> {
  return call<TicketDetail>('staff_ticket_detail', { p_ticket_id: id })
}

export function setTicketStatus(id: string, status: TicketStatusInternal, note?: string) {
  return call<{
    ticketRef: string
    statusInternal: TicketStatusInternal
    statusCustomer: string
  }>('staff_set_status', {
    p_ticket_id: id,
    p_status: status,
    p_note: note?.trim() || null,
  })
}

export function postReply(id: string, body: string, internal: boolean) {
  return call<{
    ticketRef: string
    messageId: string
    internal: boolean
    emailQueued: boolean
    wasFirstResponse?: boolean
  }>('staff_post_reply', {
    p_ticket_id: id,
    p_body: body,
    p_internal: internal,
  })
}

/* ── Attachments ─────────────────────────────────────────────────────────── */

/**
 * Goes through the edge function, not the RPC, and that ordering is the whole
 * design: `staff_open_attachment` writes `attachment_access_log` *before* any
 * URL exists, then the function mints a 60-second signed link. There is
 * deliberately no way to read an attachment without leaving a record.
 *
 * `functions.invoke` sends the caller's access token, so `auth.uid()` inside
 * the RPC is the agent — reaching for the service key here would log every
 * access as "service role" and make the audit trail worthless.
 */
export async function openAttachment(attachmentId: string, reason?: string): Promise<AttachmentOpen> {
  if (DEMO) return demoOpenAttachment()

  const { data, error } = await supabase.functions.invoke('staff-attachment', {
    body: { attachmentId, reason: reason?.trim() || undefined },
  })

  if (error) throw await fromFunctionError(error, 'We could not open that attachment.')
  return data as AttachmentOpen
}

export function attachmentAccessHistory(ticketId: string, limit = 100): Promise<AttachmentAccess[]> {
  return call<AttachmentAccess[]>('staff_attachment_access_history', {
    p_ticket_id: ticketId,
    p_limit: limit,
  })
}

/* ── Enquiries (0031) ────────────────────────────────────────────────────── */

export function enquiryQueue(filters: EnquiryQueueFilters = {}): Promise<Page<EnquiryRow>> {
  return call<Page<EnquiryRow>>('staff_enquiry_queue', { payload: clean(filters) })
}

export function enquiryDetail(id: string): Promise<EnquiryDetail> {
  return call<EnquiryDetail>('staff_enquiry_detail', { p_enquiry_id: id })
}

export function addEnquiryNote(id: string, body: string) {
  return call<{ enquiryRef: string; noteId: string }>('staff_add_enquiry_note', {
    p_enquiry_id: id,
    p_body: body,
  })
}

export function setEnquiryStatus(id: string, status: EnquiryStatus, note?: string) {
  return call<{
    enquiryRef: string
    status: EnquiryStatus
    firstContactedAt: string | null
    closedAt: string | null
  }>('staff_set_enquiry_status', {
    p_enquiry_id: id,
    p_status: status,
    p_note: note?.trim() || null,
  })
}

/* ── Outbox (0031) ───────────────────────────────────────────────────────── */

export function outbox(
  filters: { status?: NotificationStatus[]; template?: string; limit?: number; offset?: number } = {},
): Promise<Page<OutboxRow>> {
  return call<Page<OutboxRow>>('staff_outbox', { payload: clean(filters) })
}

export function retryNotification(id: string) {
  return call<{ id: string; status: string }>('staff_retry_notification', { p_id: id })
}

/* ── Calendar ────────────────────────────────────────────────────────────── */

export function holidayCalendar(year?: number): Promise<HolidayCalendar> {
  return call<HolidayCalendar>('staff_holiday_calendar', { p_year: year ?? null })
}

/**
 * Replaces the whole year.
 *
 * `staff_set_holidays` deletes every holiday in `year` and reloads from the
 * array, so a partial list silently removes the dates it omits. The calendar
 * screen therefore always sends the full edited list, and says so on screen.
 */
export function setHolidays(year: number, holidays: Array<{ date: string; label: string }>) {
  return call<{ year: number; removed: number; loaded: number; actor: string }>('staff_set_holidays', {
    p_year: year,
    p_holidays: holidays,
  })
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Drops undefined and empty-string values.
 *
 * The queue RPCs read their filters with `nullif(trim(payload ->> 'x'), '')`,
 * so an empty string and an absent key already mean the same thing to them.
 * Sending `{status: undefined}` does not — it serialises to JSON `null`, and
 * `jsonb_typeof(null) <> 'array'` quietly takes the default branch, which is
 * fine, while `(null)::int` in the paging casts is not.
 */
function clean(input: object): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value) && value.length === 0) continue
    out[key] = value
  }
  return out
}

/**
 * Edge functions answer with `{error: "..."}` and a non-2xx status. supabase-js
 * wraps that in a FunctionsHttpError whose `.message` is only "Edge Function
 * returned a non-2xx status code" — the useful text is in the response body,
 * which has to be read back off the error.
 */
async function fromFunctionError(error: unknown, fallback: string): Promise<RpcError> {
  const context = (error as { context?: Response }).context
  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as { error?: string }
      if (body?.error) return new RpcError(body.error, String(context.status))
    } catch {
      // Body was not JSON, or was already consumed. Fall through to the generic
      // message rather than surfacing a parse failure the agent cannot act on.
    }
  }
  return new RpcError(fallback, 'function')
}
