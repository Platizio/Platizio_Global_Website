// The staff desk, as typed calls.
//
// Every function here is one round trip. There is no client-side joining, no
// assembling a ticket from six selects — the RPCs in 0019 return the shape a
// screen wants, so this file is a thin, honest wrapper and nothing else.
//
// Nothing here is a security boundary. `can` from staff_whoami() will tell a
// console which buttons to grey out, and this module will happily call any
// function it is asked to; the refusal comes from require_staff() inside the
// database. A console with a bug shows the wrong buttons. It does not get the
// wrong answers.

import {
  authorizedFetch,
  supabaseUrl,
  AuthFailure,
  isStaffBackendConfigured,
} from './session'
import type {
  AssignResult,
  AttachmentAccessEntry,
  CloseComplaintResult,
  ComplaintStage,
  ComplaintStageResult,
  Dashboard,
  DirectoryEntry,
  HolidayCalendar,
  InviteResult,
  OpenedAttachment,
  QueueFilters,
  QueuePage,
  RaiseComplaintResult,
  SetActiveResult,
  SetHolidaysResult,
  SetRolesResult,
  StaffAccount,
  StaffRole,
  StatusResult,
  TicketDetail,
  TicketStatusInternal,
  ReplyResult,
  WhoAmI,
} from './types'

export { AuthFailure, isStaffBackendConfigured }

/**
 * An error with a message already fit to show a staff member. The database's
 * own refusals are passed through verbatim — "This action requires one of these
 * roles: GRIEVANCE_OFFICER" is written for the person reading it and says
 * nothing about the schema. Anything unrecognised is replaced.
 */
export class DeskFailure extends Error {
  constructor(message: string, readonly code?: string) {
    super(message)
  }
}

interface PostgrestError {
  code?: string
  message?: string
  details?: string
  hint?: string
}

/** Codes whose messages are written for a person and are safe to surface. */
const SPEAKABLE = new Set([
  '42501', // insufficient_privilege — "requires an active staff account"
  '22023', // invalid_parameter_value — "requires a summary of the outcome"
  '23000', // integrity_constraint_violation — "would leave no active ADMIN"
  'P0001', // bare raise exception, which in this schema is always a written message
])

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  let res: Response
  try {
    res = await authorizedFetch(`${supabaseUrl()}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      body: JSON.stringify(args),
    })
  } catch (error) {
    if (error instanceof AuthFailure) throw error
    throw new DeskFailure('Network error. Please check your connection and try again.')
  }

  if (res.status === 401) {
    throw new AuthFailure('Your session has ended. Please sign in again.')
  }

  const payload = await res.json().catch(() => null)

  if (!res.ok) {
    const error = (payload ?? {}) as PostgrestError
    const code = error.code ?? ''
    if (SPEAKABLE.has(code) && error.message) throw new DeskFailure(error.message, code)
    if (code === 'P0002') throw new DeskFailure('That record no longer exists.', code)
    console.error(`rpc ${fn} failed`, error)
    throw new DeskFailure('Something went wrong. Please try again.', code)
  }

  return payload as T
}

async function callFunction<T>(name: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await authorizedFetch(`${supabaseUrl()}/functions/v1/${name}`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  } catch (error) {
    if (error instanceof AuthFailure) throw error
    throw new DeskFailure('Network error. Please check your connection and try again.')
  }

  const payload = await res.json().catch(() => ({})) as { error?: string }
  if (!res.ok) throw new DeskFailure(payload.error || 'Something went wrong. Please try again.')
  return payload as T
}

// --- who am I --------------------------------------------------------------

export const whoAmI = (): Promise<WhoAmI> => rpc<WhoAmI>('staff_whoami')

// --- the queue -------------------------------------------------------------

export const ticketQueue = (filters: QueueFilters = {}): Promise<QueuePage> =>
  rpc<QueuePage>('staff_ticket_queue', { payload: filters })

export const ticketDetail = (ticketId: string): Promise<TicketDetail> =>
  rpc<TicketDetail>('staff_ticket_detail', { p_ticket_id: ticketId })

export const dashboard = (): Promise<Dashboard> => rpc<Dashboard>('staff_dashboard')

export const directory = (): Promise<DirectoryEntry[]> =>
  rpc<DirectoryEntry[]>('staff_directory')

// --- working a ticket ------------------------------------------------------

/** Passing no agent assigns the ticket to the caller. */
export const assignTicket = (ticketId: string, agentId?: string | null): Promise<AssignResult> =>
  rpc<AssignResult>('staff_assign_ticket', { p_ticket_id: ticketId, p_agent_id: agentId ?? null })

/**
 * The note is recorded on the status-history row, which is append-only — it
 * cannot be edited afterwards by anyone at any key, so write it as if it were
 * going into a regulatory file, because it is.
 *
 * Moving to RESOLVED also emails the customer, with the note as the body.
 */
export const setStatus = (
  ticketId: string,
  status: TicketStatusInternal,
  note?: string,
): Promise<StatusResult> =>
  rpc<StatusResult>('staff_set_status', {
    p_ticket_id: ticketId,
    p_status: status,
    p_note: note ?? null,
  })

/**
 * `internal: true` writes a note only the desk sees and sends nothing.
 * `internal: false` emails the customer and, if this is the first such reply,
 * stops the first-response SLA clock.
 */
export const postReply = (
  ticketId: string,
  body: string,
  internal = false,
): Promise<ReplyResult> =>
  rpc<ReplyResult>('staff_post_reply', {
    p_ticket_id: ticketId,
    p_body: body,
    p_internal: internal,
  })

// --- grievances ------------------------------------------------------------

export const raiseComplaint = (ticketId: string, summary?: string): Promise<RaiseComplaintResult> =>
  rpc<RaiseComplaintResult>('staff_raise_complaint', {
    p_ticket_id: ticketId,
    p_summary: summary ?? null,
  })

export const setComplaintStage = (
  complaintId: string,
  stage: Exclude<ComplaintStage, 'CLOSED'>,
  note?: string,
): Promise<ComplaintStageResult> =>
  rpc<ComplaintStageResult>('staff_set_complaint_stage', {
    p_complaint_id: complaintId,
    p_stage: stage,
    p_note: note ?? null,
  })

/**
 * GRIEVANCE_OFFICER only, and the summary is sent to the complainant as the
 * firm's formal answer. Closing is one-way.
 */
export const closeComplaint = (complaintId: string, summary: string): Promise<CloseComplaintResult> =>
  rpc<CloseComplaintResult>('staff_close_complaint', {
    p_complaint_id: complaintId,
    p_summary: summary,
  })

// --- attachments -----------------------------------------------------------

/**
 * Returns a URL that works for about a minute and is recorded against the
 * caller's name before it is issued. Follow it immediately; do not keep it, log
 * it, or put it anywhere it might be read by someone else — for its lifetime it
 * is the document.
 */
export const openAttachment = (attachmentId: string, reason?: string): Promise<OpenedAttachment> =>
  callFunction<OpenedAttachment>('staff-attachment', { attachmentId, reason })

/** SUPERVISOR, GRIEVANCE_OFFICER or ADMIN: who has been reading this file. */
export const attachmentAccessHistory = (
  ticketId: string,
  limit = 100,
): Promise<AttachmentAccessEntry[]> =>
  rpc<AttachmentAccessEntry[]>('staff_attachment_access_history', {
    p_ticket_id: ticketId,
    p_limit: limit,
  })

// --- staff administration (ADMIN) -----------------------------------------

export const listAccounts = (): Promise<StaffAccount[]> =>
  rpc<StaffAccount[]>('staff_list_accounts')

/** Creates the login if the address has none, then grants the roles. */
export const inviteStaff = (
  email: string,
  fullName: string,
  roles: StaffRole[],
  redirectTo?: string,
): Promise<InviteResult> =>
  callFunction<InviteResult>('invite-staff', { email, fullName, roles, redirectTo })

/** Replaces the whole role set. Passing an empty array is refused. */
export const setRoles = (
  userId: string,
  roles: StaffRole[],
  note?: string,
): Promise<SetRolesResult> =>
  rpc<SetRolesResult>('staff_set_roles', {
    p_user_id: userId,
    p_roles: roles,
    p_note: note ?? null,
  })

/**
 * Deactivation is the leaver switch; accounts are never deleted, because their
 * id is attached to every message they wrote. Note it does not kill an existing
 * token — that expires within the hour.
 */
export const setActive = (
  userId: string,
  active: boolean,
  note?: string,
): Promise<SetActiveResult> =>
  rpc<SetActiveResult>('staff_set_active', {
    p_user_id: userId,
    p_active: active,
    p_note: note ?? null,
  })

// --- the calendar (ADMIN to write) ----------------------------------------

export const holidayCalendar = (year?: number): Promise<HolidayCalendar> =>
  rpc<HolidayCalendar>('staff_holiday_calendar', { p_year: year ?? null })

/**
 * Replaces the year outright. Take the dates from the exchange circular rather
 * than from memory: a wrong holiday quietly loosens the published SLA, and due
 * dates are stored when a ticket is created, so this only affects tickets
 * raised after it is loaded.
 */
export const setHolidays = (
  year: number,
  holidays: Array<{ date: string; label: string }>,
): Promise<SetHolidaysResult> =>
  rpc<SetHolidaysResult>('staff_set_holidays', { p_year: year, p_holidays: holidays })
