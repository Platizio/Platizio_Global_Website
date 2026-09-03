import type { ReactNode } from 'react'
import type {
  EnquiryStatus,
  NotificationStatus,
  SlaState,
  TicketPriority,
  TicketStatusInternal,
} from '../lib/types'

/**
 * The console's colour language for state.
 *
 * Every mapping from a database value to a colour lives here and nowhere else.
 * The rule being enforced is that a colour means the same thing on every
 * screen: red is "someone needs to act now", amber is "internal / caution",
 * green is "done and on time", grey is "no signal". An agent scanning a queue
 * reads the colours before the words, so a screen that picked its own would be
 * actively misleading rather than merely inconsistent.
 */

type Tone = 'neutral' | 'muted' | 'danger' | 'warn' | 'ok' | 'info' | 'accent'

export function Chip({
  tone = 'neutral',
  dot = false,
  title,
  children,
}: {
  tone?: Tone
  dot?: boolean
  title?: string
  children: ReactNode
}) {
  return (
    <span className={`chip chip-${tone}`} title={title}>
      {dot && <span className="chip-dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

/* ── SLA ─────────────────────────────────────────────────────────────────── */

const SLA_TONE: Record<SlaState, Tone> = {
  BREACHED: 'danger',
  LATE: 'warn',
  MET: 'ok',
  DUE: 'neutral',
  'N/A': 'muted',
}

const SLA_LABEL: Record<SlaState, string> = {
  BREACHED: 'Breached',
  LATE: 'Met late',
  MET: 'Met',
  DUE: 'Due',
  'N/A': '—',
}

/**
 * `state` is computed server-side by private.sla_state() against now(), not
 * read off tickets.first_response_breached — those stored flags are written by
 * the 15-minute sweep and lag reality between runs. Nothing here recomputes it
 * from `dueAt`; the timestamp is shown only as the tooltip.
 */
export function SlaChip({
  state,
  dueAt,
  label,
}: {
  state: SlaState
  dueAt?: string | null
  label?: string
}) {
  if (state === 'N/A') return <span className="muted small">—</span>

  return (
    <Chip
      tone={SLA_TONE[state]}
      dot={state === 'BREACHED'}
      title={dueAt ? `${label ?? 'Due'} ${new Date(dueAt).toLocaleString()}` : undefined}
    >
      {SLA_LABEL[state]}
    </Chip>
  )
}

/* ── Ticket status ───────────────────────────────────────────────────────── */

/*
 * Labels, not database values. The enum stays exactly as 0001 defined it; these
 * are what a single operator sees.
 *
 * NEW and TRIAGED are relabelled because with one person there is no queue to
 * be triaged *into* — the only distinction that matters is whether anyone has
 * looked at this yet. That is what NEW means and what TRIAGED means the moment
 * after.
 */
const TICKET_STATUS: Record<TicketStatusInternal, { tone: Tone; label: string }> = {
  NEW: { tone: 'info', label: 'Unopened' },
  TRIAGED: { tone: 'info', label: 'Opened' },
  IN_PROGRESS: { tone: 'accent', label: 'In progress' },
  WAITING_ON_CUSTOMER: { tone: 'warn', label: 'Waiting on customer' },
  WAITING_ON_BROKER: { tone: 'warn', label: 'Waiting on broker' },
  RESOLVED: { tone: 'ok', label: 'Resolved' },
  CLOSED: { tone: 'muted', label: 'Closed' },
  SPAM: { tone: 'muted', label: 'Spam' },
}

export function StatusChip({ status }: { status: TicketStatusInternal }) {
  const it = TICKET_STATUS[status]
  return <Chip tone={it.tone}>{it.label}</Chip>
}

export const TICKET_STATUS_LABEL = (status: TicketStatusInternal) => TICKET_STATUS[status].label

export const TICKET_STATUSES = Object.keys(TICKET_STATUS) as TicketStatusInternal[]

/* ── Priority ────────────────────────────────────────────────────────────── */

const PRIORITY: Record<TicketPriority, { tone: Tone; label: string }> = {
  URGENT: { tone: 'danger', label: 'Urgent' },
  NORMAL: { tone: 'neutral', label: 'Normal' },
  LOW: { tone: 'muted', label: 'Low' },
}

export function PriorityChip({ priority }: { priority: TicketPriority }) {
  const it = PRIORITY[priority]
  return (
    <Chip tone={it.tone} dot={priority === 'URGENT'}>
      {it.label}
    </Chip>
  )
}

/* Complaint stages have no chip. The console surfaces no grievance workflow —
   the site has no grievance page, and they are handled outside this system. */

/* ── Enquiry status ──────────────────────────────────────────────────────── */

const ENQUIRY: Record<EnquiryStatus, { tone: Tone; label: string }> = {
  NEW: { tone: 'info', label: 'Unopened' },
  CONTACTED: { tone: 'accent', label: 'Contacted' },
  QUALIFIED: { tone: 'accent', label: 'Qualified' },
  CONVERTED: { tone: 'ok', label: 'Converted' },
  CLOSED: { tone: 'muted', label: 'Closed' },
  SPAM: { tone: 'muted', label: 'Spam' },
}

export function EnquiryChip({ status }: { status: EnquiryStatus }) {
  const it = ENQUIRY[status]
  return <Chip tone={it.tone}>{it.label}</Chip>
}

export const ENQUIRY_STATUSES = Object.keys(ENQUIRY) as EnquiryStatus[]
export const ENQUIRY_STATUS_LABEL = (status: EnquiryStatus) => ENQUIRY[status].label

/* ── Outbox ──────────────────────────────────────────────────────────────── */

const NOTIFICATION: Record<NotificationStatus, { tone: Tone; label: string }> = {
  PENDING: { tone: 'neutral', label: 'Queued' },
  SENDING: { tone: 'info', label: 'Sending' },
  SENT: { tone: 'ok', label: 'Sent' },
  FAILED: { tone: 'danger', label: 'Failed' },
  CANCELLED: { tone: 'muted', label: 'Cancelled' },
}

export function NotificationChip({ status }: { status: NotificationStatus }) {
  const it = NOTIFICATION[status]
  return (
    <Chip tone={it.tone} dot={status === 'FAILED'}>
      {it.label}
    </Chip>
  )
}

/* ── Source ──────────────────────────────────────────────────────────────── */

/**
 * `chatbot` is the guided assistant at /help, and its taxonomy came from the
 * node the customer walked to rather than a dropdown they picked — which is
 * why deflection reporting reads this column and why it is worth showing.
 */
export function SourceChip({ source }: { source: string }) {
  const label: Record<string, string> = {
    web: 'Web form',
    chatbot: 'Assistant',
    email: 'Email',
    phone: 'Phone',
    staff: 'Raised by staff',
    referral: 'Referral',
  }
  return <Chip tone="muted">{label[source] ?? source}</Chip>
}
