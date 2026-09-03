/**
 * Return shapes of the staff_* RPCs.
 *
 * Hand-mirrored from the SQL projections rather than generated, because the
 * functions return `jsonb` built by `jsonb_build_object` — there is no table
 * type for `supabase gen types` to read. The authority is the migration; each
 * interface below names the one it came from so a future change has somewhere
 * obvious to look.
 *
 * Every field is exactly as the SQL spells it. Where the database and the
 * projection disagree — consent_records.given_at surfacing as `grantedAt` —
 * the projection wins here, because that is what arrives over the wire.
 */

export type StaffRole = 'AGENT' | 'SUPERVISOR' | 'GRIEVANCE_OFFICER' | 'ADMIN'

export type TicketStatusInternal =
  | 'NEW'
  | 'TRIAGED'
  | 'IN_PROGRESS'
  | 'WAITING_ON_CUSTOMER'
  | 'WAITING_ON_BROKER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'SPAM'

export type TicketStatusCustomer =
  | 'RECEIVED'
  | 'IN_PROGRESS'
  | 'WAITING_ON_YOU'
  | 'RESOLVED'
  | 'CLOSED'

export type TicketPriority = 'LOW' | 'NORMAL' | 'URGENT'

export type ComplaintStage =
  | 'RAISED'
  | 'ACKNOWLEDGED'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'CLOSED'
  | 'ESCALATED_ARBITRATION'

export type EnquiryStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'CLOSED' | 'SPAM'

export type NotificationStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED'

/** private.sla_state(). Derived live from now(), never read off a stored flag. */
export type SlaState = 'N/A' | 'MET' | 'LATE' | 'BREACHED' | 'DUE'

/** staff_whoami() — 0024. */
export interface WhoAmI {
  signedIn: boolean
  userId?: string
  email?: string | null
  fullName?: string | null
  isActive?: boolean
  /** From user_roles. Authoritative. */
  roles: StaffRole[]
  isStaff: boolean
  can: Partial<Record<Capability, boolean>>
  /** From app_metadata in the JWT. Diverges from `roles` when a token is stale. */
  tokenRoles?: StaffRole[]
}

export type Capability =
  | 'viewQueue'
  | 'reply'
  | 'setStatus'
  | 'openAttachments'
  | 'raiseComplaint'
  | 'closeComplaint'
  | 'viewAccessLog'
  | 'administerStaff'
  | 'editCalendar'

/** The envelope every queue RPC returns — 0019 and 0031 agree on it. */
export interface Page<T> {
  rows: T[]
  total: number
  limit: number
  offset: number
}

/** staff_ticket_queue() row — 0019. */
export interface TicketRow {
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

export interface TicketQueueFilters {
  status?: TicketStatusInternal[]
  priority?: TicketPriority[]
  categoryId?: string
  /** 'me' | 'unassigned' | a staff uuid */
  assignee?: string
  slaOnly?: boolean
  q?: string
  sort?: 'due' | 'newest' | 'oldest'
  limit?: number
  offset?: number
}

/** staff_ticket_detail() — 0019, consent column corrected by 0026. */
export interface TicketDetail {
  ticket: {
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
    retentionExpiresAt: string
    attachmentRetentionExpiresAt: string
  }
  messages: TicketMessage[]
  attachments: TicketAttachment[]
  history: StatusChange[]
  consent: ConsentRecord | null
  complaint: Complaint | null
  notifications: NotificationRow[]
}

export interface TicketMessage {
  id: string
  authorKind: 'CUSTOMER' | 'STAFF' | 'SYSTEM'
  authorName: string
  body: string
  isInternal: boolean
  createdAt: string
}

export interface TicketAttachment {
  id: string
  filename: string
  declaredMime: string | null
  /** Read from the stored object's first 16 bytes. Trust this, not declaredMime. */
  verifiedMime: string | null
  bytes: number | null
  state: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'MISSING'
  rejection: string | null
  uploadedAt: string | null
}

export interface StatusChange {
  id: string
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
  consentText: string
  policyVersion: string
  /** consent_records.given_at. */
  grantedAt: string
  withdrawnAt: string | null
}

/**
 * Still returned by staff_ticket_detail(), and still typed here because this
 * file mirrors the SQL projection rather than what the UI happens to render.
 * Nothing displays it: the console surfaces no grievance workflow, because the
 * site has no grievance page and they are handled outside this system.
 */
export interface Complaint {
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

export interface NotificationRow {
  template: string
  toEmail: string
  subject: string
  status: NotificationStatus
  attempts: number
  lastError: string | null
  sentAt: string | null
  createdAt: string
}

/*
 * staff_directory() is deployed and unused. The console has one operator, so
 * there is nobody to pick from — every list of agents it once populated has
 * gone with the assignment controls.
 */

/**
 * staff_dashboard() — 0023, extended by 0031.
 *
 * `unassigned`, `mine`, `unassignedEnquiries` and `myEnquiries` are still
 * returned and still typed, because this file mirrors the projection. Nothing
 * reads them: on a one-person desk every open item is already theirs. What the
 * dashboard shows instead is `byStatus.NEW` — the count nobody has opened yet.
 */
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
  holidayCoverage?: unknown
  newEnquiries: number
  openEnquiries: number
  unassignedEnquiries: number
  myEnquiries: number
  /** Deliberately not called a breach: the target is internal and unpublished. */
  enquiriesOverdueFollowUp: number
  generatedAt: string
}

/** staff_enquiry_queue() row — 0031. */
export interface EnquiryRow {
  id: string
  enquiryRef: string
  fullName: string
  email: string
  phone: string
  interestId: string | null
  interestLabel: string | null
  status: EnquiryStatus
  assignedToId: string | null
  assignedToName: string | null
  source: string
  createdAt: string
  firstContactedAt: string | null
  closedAt: string | null
  /** INTERNAL working target. Never show this to an enquirer. */
  followUpTargetAt: string | null
  followUpOverdue: boolean
  noteCount: number
}

export interface EnquiryQueueFilters {
  status?: EnquiryStatus[]
  assignee?: string
  interestId?: string
  overdueOnly?: boolean
  q?: string
  sort?: 'oldest' | 'newest' | 'target'
  limit?: number
  offset?: number
}

/** staff_enquiry_detail() — 0031. */
export interface EnquiryDetail {
  enquiry: EnquiryRow & {
    message: string | null
    outcomeNote: string | null
    captchaVerified: boolean
    legalHold: boolean
    legalHoldReason: string | null
    retentionExpiresAt: string
  }
  notes: EnquiryNote[]
  consent: ConsentRecord | null
  notifications: NotificationRow[]
}

export interface EnquiryNote {
  id: string
  authorName: string
  authorLabel: string
  body: string
  createdAt: string
}

/** staff_outbox() row — 0031. */
export interface OutboxRow {
  id: string
  template: string
  toEmail: string
  subject: string
  status: NotificationStatus
  attempts: number
  maxAttempts: number
  nextAttemptAt: string
  lastError: string | null
  provider: string | null
  sentAt: string | null
  createdAt: string
  ticketId: string | null
  ticketRef: string | null
  enquiryId: string | null
  enquiryRef: string | null
}

/*
 * staff_list_accounts(), staff_set_roles(), staff_set_active() and the
 * invite-staff edge function are all deployed and all unused. The console is
 * worked by one person whose account is provisioned once from the SQL editor,
 * so there is nobody to invite and no roles to re-grant. See the README for
 * the bootstrap, which is now also the only account path.
 */

/** staff_holiday_calendar() — 0023. */
export interface HolidayCalendar {
  year: number
  holidays: Holiday[]
  businessHours: BusinessHours[]
  coverage: unknown
}

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

/** staff_attachment_access_history() — 0020. SUPERVISOR / GRIEVANCE_OFFICER / ADMIN. */
export interface AttachmentAccess {
  id: string
  filename: string
  actorLabel: string
  actorName: string | null
  reason: string | null
  clientIp: string | null
  accessedAt: string
}

/**
 * staff-attachment edge function response.
 *
 * The URL lives 60 seconds and the access was already logged before it was
 * minted, so there is nothing to do with this but use it immediately.
 */
export interface AttachmentOpen {
  url: string
  filename: string
  mime: string
  bytes: number
  ticketId: string
  expiresInSeconds: number
}

