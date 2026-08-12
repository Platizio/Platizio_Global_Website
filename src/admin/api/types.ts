// The shapes the staff RPCs actually return.
//
// Hand-written rather than generated. `supabase gen types` would describe every
// one of these functions as returning `Json`, because they all return jsonb —
// which is true and useless. The shapes below are the contract the migrations
// build by hand in jsonb_build_object(), so this file is where that contract is
// written down for the compiler.
//
// That does mean the two can drift: changing a key in a migration and not here
// compiles fine and breaks at runtime. The mitigation is that each interface
// names the migration that produces it, so a change to one has an obvious
// second place to look.

// --- enums, mirrored from 0001 ---------------------------------------------

export const TICKET_STATUS_INTERNAL = [
  'NEW',
  'TRIAGED',
  'IN_PROGRESS',
  'WAITING_ON_CUSTOMER',
  'WAITING_ON_BROKER',
  'RESOLVED',
  'CLOSED',
  'SPAM',
] as const
export type TicketStatusInternal = (typeof TICKET_STATUS_INTERNAL)[number]

export const TICKET_STATUS_CUSTOMER = [
  'RECEIVED',
  'IN_PROGRESS',
  'WAITING_ON_YOU',
  'RESOLVED',
  'CLOSED',
] as const
export type TicketStatusCustomer = (typeof TICKET_STATUS_CUSTOMER)[number]

export const TICKET_PRIORITIES = ['LOW', 'NORMAL', 'URGENT'] as const
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

export const COMPLAINT_STAGES = [
  'RAISED',
  'ACKNOWLEDGED',
  'UNDER_REVIEW',
  'RESOLVED',
  'CLOSED',
  'ESCALATED_ARBITRATION',
] as const
export type ComplaintStage = (typeof COMPLAINT_STAGES)[number]

export const STAFF_ROLES = ['AGENT', 'SUPERVISOR', 'GRIEVANCE_OFFICER', 'ADMIN'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

/**
 * Derived live from the due dates by private.sla_state(), not read from the
 * stored breach flags — those are set by the hourly sweep and lag reality by up
 * to an hour.
 *
 *   MET      answered inside the window
 *   LATE     answered, but after the window closed
 *   BREACHED not answered and the window has closed
 *   DUE      not answered, window still open
 *   N/A      no due date applies
 */
export type SlaState = 'MET' | 'LATE' | 'BREACHED' | 'DUE' | 'N/A'

// --- 0024: staff_whoami ----------------------------------------------------

/**
 * Advisory only. Every capability here is separately enforced by
 * require_staff() inside the function that performs it — this exists so a
 * console can grey out a button, never so it can decide anything.
 */
export interface StaffCapabilities {
  viewQueue?: boolean
  assign?: boolean
  reply?: boolean
  setStatus?: boolean
  openAttachments?: boolean
  raiseComplaint?: boolean
  closeComplaint?: boolean
  viewAccessLog?: boolean
  administerStaff?: boolean
  editCalendar?: boolean
}

export interface WhoAmI {
  signedIn: boolean
  userId?: string
  email?: string
  fullName?: string
  isActive?: boolean
  /** From the table, which is authoritative. */
  roles: StaffRole[]
  isStaff: boolean
  can: StaffCapabilities
  /**
   * From the JWT, which is a snapshot taken when the token was issued. If this
   * disagrees with `roles`, the session is stale and needs a refresh before the
   * console's rendering matches what the database will allow.
   */
  tokenRoles?: StaffRole[]
}

// --- 0019: the queue -------------------------------------------------------

export interface QueueFilters {
  status?: TicketStatusInternal[]
  /** A uuid, or the literals 'me' / 'unassigned'. */
  assignee?: string
  categoryId?: string
  priority?: TicketPriority[]
  /** Only tickets already past a due date. */
  slaOnly?: boolean
  /** Matches reference, subject, requester name or email. */
  q?: string
  limit?: number
  offset?: number
  sort?: 'due' | 'newest' | 'oldest'
}

export interface QueueRow {
  id: string
  ticketRef: string
  subject: string
  requesterName: string
  requesterEmail: string
  categoryId: string
  subcategoryId: string
  priority: TicketPriority
  statusInternal: TicketStatusInternal
  statusCustomer: TicketStatusCustomer
  assignedAgentId: string | null
  assignedAgentName: string | null
  createdAt: string
  firstResponseDueAt: string | null
  firstResponseAt: string | null
  resolutionDueAt: string | null
  resolvedAt: string | null
  firstResponseState: SlaState
  resolutionState: SlaState
  hasComplaint: boolean
  complaintRef: string | null
  legalHold: boolean
  attachmentCount: number
}

export interface QueuePage {
  rows: QueueRow[]
  total: number
  limit: number
  offset: number
}

// --- 0019: the detail ------------------------------------------------------

export interface TicketDetailHeader {
  id: string
  ticketRef: string
  subject: string
  description: string
  requesterName: string
  requesterEmail: string
  requesterMobile: string
  categoryId: string
  categoryLabel: string | null
  subcategoryId: string
  subcategoryLabel: string | null
  priority: TicketPriority
  statusInternal: TicketStatusInternal
  statusCustomer: TicketStatusCustomer
  assignedAgentId: string | null
  assignedAgentName: string | null
  source: string
  captchaVerified: boolean
  createdAt: string
  firstResponseDueAt: string | null
  firstResponseAt: string | null
  resolutionDueAt: string | null
  resolvedAt: string | null
  closedAt: string | null
  firstResponseState: SlaState
  resolutionState: SlaState
  legalHold: boolean
  legalHoldReason: string | null
  retentionExpiresAt: string | null
  attachmentRetentionExpiresAt: string | null
}

export interface TicketMessage {
  id: string
  authorKind: 'CUSTOMER' | 'STAFF' | 'SYSTEM'
  authorName: string
  body: string
  /** Never shown to the customer. The staff view is the only place these exist. */
  isInternal: boolean
  createdAt: string
}

export interface TicketAttachment {
  id: string
  filename: string
  declaredMime: string
  verifiedMime: string | null
  bytes: number
  /** Only VERIFIED files can be opened; the rest failed or never arrived. */
  state: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'MISSING'
  rejection: string | null
  uploadedAt: string | null
}

export interface StatusHistoryEntry {
  id: number
  fromInternal: TicketStatusInternal | null
  toInternal: TicketStatusInternal
  fromCustomer: TicketStatusCustomer | null
  toCustomer: TicketStatusCustomer
  actorLabel: string
  note: string | null
  changedAt: string
}

export interface ConsentRecord {
  purpose: string
  /** The exact words shown at the time, not a reconstruction. */
  consentText: string
  policyVersion: string
  policyUrl: string
  /** consent_records.given_at — when the customer agreed. */
  grantedAt: string
  withdrawnAt: string | null
}

export interface ComplaintSummary {
  id: string
  complaintRef: string
  stage: ComplaintStage
  acknowledgementDueAt: string | null
  acknowledgedAt: string | null
  resolutionDueAt: string | null
  resolvedAt: string | null
  closedAt: string | null
  closureSummary: string | null
  closedByName: string | null
  acknowledgementState: SlaState
  resolutionState: SlaState
}

export interface NotificationRecord {
  template: string
  toEmail: string
  subject: string
  status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
  attempts: number
  lastError: string | null
  sentAt: string | null
  createdAt: string
}

export interface TicketDetail {
  ticket: TicketDetailHeader
  messages: TicketMessage[]
  attachments: TicketAttachment[]
  history: StatusHistoryEntry[]
  consent: ConsentRecord | null
  complaint: ComplaintSummary | null
  notifications: NotificationRecord[]
}

// --- 0019 / 0023: the dashboard -------------------------------------------

export interface HolidayCoverage {
  next12Months: number
  lastLoadedDate: string | null
  /** True when the variable-date holidays almost certainly have not been loaded. */
  looksThin: boolean
  note: string
}

export interface Dashboard {
  open: number
  unassigned: number
  mine: number
  awaitingFirstResponse: number
  firstResponseBreached: number
  resolutionBreached: number
  byStatus: Partial<Record<TicketStatusInternal, number>>
  openComplaints: number
  complaintsBreached: number
  outboxPending: number
  outboxFailed: number
  holidayCoverage: HolidayCoverage
  generatedAt: string
}

export interface DirectoryEntry {
  id: string
  fullName: string
  email: string
  isSelf: boolean
  roles: StaffRole[]
}

// --- 0017 / 0018 / 0022: the write results --------------------------------

export interface AssignResult {
  ticketRef: string
  assignedTo: string | null
}

export interface ReplyResult {
  ticketRef: string
  messageId: string
  internal: boolean
  emailQueued: boolean
  wasFirstResponse?: boolean
}

export interface StatusResult {
  ticketRef: string
  statusInternal: TicketStatusInternal
  statusCustomer: TicketStatusCustomer
  /** True when this transition queued the resolution email. */
  emailQueued: boolean
}

export interface RaiseComplaintResult {
  complaintId: string
  complaintRef: string
  ticketRef: string
  stage: ComplaintStage
}

export interface ComplaintStageResult {
  complaintRef: string
  stage: ComplaintStage
}

export interface CloseComplaintResult {
  complaintRef: string
  stage: 'CLOSED'
  emailQueued: boolean
}

// --- 0020: attachments -----------------------------------------------------

export interface OpenedAttachment {
  /** A bearer token for the document in URL form. Do not store it. */
  url: string
  filename: string
  mime: string
  bytes: number
  ticketId: string
  expiresInSeconds: number
}

export interface AttachmentAccessEntry {
  id: number
  filename: string
  actorLabel: string
  actorName: string | null
  reason: string | null
  clientIp: string | null
  accessedAt: string
}

// --- 0021: staff administration -------------------------------------------

export interface StaffAccount {
  id: string
  fullName: string
  email: string
  isActive: boolean
  createdAt: string
  roles: StaffRole[]
  openTickets: number
  lastActionAt: string | null
}

export interface SetRolesResult {
  userId: string
  email: string
  granted: StaffRole[]
  revoked: StaffRole[]
  roles: StaffRole[]
}

export interface SetActiveResult {
  userId: string
  email: string
  isActive: boolean
}

export interface InviteResult {
  userId: string
  email: string
  fullName: string
  roles: StaffRole[]
  invitationSent: boolean
  note: string
}

// --- 0023: the calendar ----------------------------------------------------

export interface Holiday {
  date: string
  label: string
  weekday: string
}

export interface BusinessHours {
  weekday: number
  opensAt: string
  closesAt: string
  isWorking: boolean
}

export interface HolidayCalendar {
  year: number
  holidays: Holiday[]
  businessHours: BusinessHours[]
  coverage: HolidayCoverage
}

export interface SetHolidaysResult {
  year: number
  removed: number
  loaded: number
  actor: string
}
