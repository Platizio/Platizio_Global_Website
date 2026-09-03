import type { EnquiryRow, OutboxRow, TicketRow } from './types'

/**
 * The dashboard's one list.
 *
 * Everything that used to be an overlapping count — "Awaiting first reply",
 * "First reply breached", "Resolution breached", "Enquiries past target",
 * "Email failed" — became a row here that names the actual thing. A count can
 * contain another count; an item is on a list or it is not, so nothing can be
 * double-counted and there is no arithmetic between this and the partition.
 *
 * All three sources are RPCs that already exist. No new SQL.
 */

export type AttentionKind = 'Ticket' | 'Enquiry' | 'Email'

export interface AttentionItem {
  key: string
  /** Prefixes the row, so three different things share one list unambiguously. */
  kind: AttentionKind
  /**
   * The screen holding the rest of this source's rows, set only when the source
   * was truncated by the cap. Null when everything is already on the list —
   * a "see all" that leads to the same four rows is worse than no link.
   */
  kindTo: string | null
  to: string
  title: string
  meta: string
  /** The short state phrase: "Resolution 6h late", "Past target", "Never sent". */
  note: string
  tone: 'danger' | 'warn'
}

/** The `{rows, total}` half of the Page envelope every queue RPC returns. */
export interface AttentionSource<T> {
  rows: T[]
  total: number
}

export interface Attention {
  items: AttentionItem[]
  /** How many rows are drawn, after the per-source cap. */
  shown: number
  /** How many exist across all three sources, before it. */
  total: number
}

/**
 * Five per source.
 *
 * An uncapped list turns the landing screen into an unbounded page on the worst
 * day of the year, which is the day it most needs to be readable.
 */
export const ATTENTION_CAP = 5

/**
 * "6h", "2d" — how far past `iso` we are, or '' if it is not past.
 *
 * `now` is a parameter rather than a call to Date.now() so a test can state the
 * moment it is asking about instead of racing the clock.
 */
export function lateBy(iso: string | null | undefined, now: number): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then) || then >= now) return ''

  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86_400)}d`
}

function ticketNote(row: TicketRow, now: number): string {
  if (row.firstResponseState === 'BREACHED') {
    const late = lateBy(row.firstResponseDueAt, now)
    return late ? `First reply ${late} late` : 'First reply overdue'
  }
  if (row.resolutionState === 'BREACHED') {
    const late = lateBy(row.resolutionDueAt, now)
    return late ? `Resolution ${late} late` : 'Resolution overdue'
  }
  // staff_ticket_queue was asked for slaOnly rows, so this is unreachable in
  // practice. It is here so a server-side filter change degrades to a vague
  // row rather than a blank one.
  return 'Past a deadline'
}

/**
 * Cap one source and work out whether it was truncated.
 *
 * `total` is the unpaged count the RPC reports, so it is the honest answer to
 * "how many are there" even though only `ATTENTION_CAP` rows came back.
 */
function take<T>(
  source: AttentionSource<T> | null | undefined,
  screen: string,
  toItem: (row: T, kindTo: string | null) => AttentionItem,
): AttentionItem[] {
  const rows = (source?.rows ?? []).slice(0, ATTENTION_CAP)
  const kindTo = (source?.total ?? 0) > rows.length ? screen : null
  return rows.map((row) => toItem(row, kindTo))
}

export function buildAttention(
  sources: {
    tickets?: AttentionSource<TicketRow> | null
    enquiries?: AttentionSource<EnquiryRow> | null
    emails?: AttentionSource<OutboxRow> | null
  },
  now: number = Date.now(),
): Attention {
  const items: AttentionItem[] = [
    ...take(sources.tickets, '/tickets?view=sla', (row, kindTo) => ({
      key: `ticket:${row.id}`,
      kind: 'Ticket',
      kindTo,
      to: `/tickets/${row.id}`,
      title: row.subject,
      meta: `${row.ticketRef} · ${row.requesterName}`,
      note: ticketNote(row, now),
      tone: 'danger',
    })),

    ...take(sources.enquiries, '/enquiries?view=overdue', (row, kindTo) => ({
      key: `enquiry:${row.id}`,
      kind: 'Enquiry',
      kindTo,
      to: `/enquiries/${row.id}`,
      title: row.interestLabel ? `${row.fullName} — ${row.interestLabel}` : row.fullName,
      meta: `${row.enquiryRef} · ${
        row.firstContactedAt ? 'no follow-up since first contact' : 'nobody has called back'
      }`,
      // "Past target", never "overdue" and never "breached": 0027 is explicit
      // that this figure is internal and must never be quoted as a published
      // response time. Amber, not red, for the same reason.
      note: 'Past target',
      tone: 'warn',
    })),

    ...take(sources.emails, '/outbox?status=FAILED', (row, kindTo) => ({
      key: `email:${row.id}`,
      kind: 'Email',
      kindTo,
      to: '/outbox?status=FAILED',
      title: row.subject,
      meta: `${row.lastError ?? 'No error recorded'} · ${row.attempts} attempt${
        row.attempts === 1 ? '' : 's'
      }`,
      note: 'Never sent',
      tone: 'danger',
    })),
  ]

  return {
    items,
    shown: items.length,
    total:
      (sources.tickets?.total ?? 0) +
      (sources.enquiries?.total ?? 0) +
      (sources.emails?.total ?? 0),
  }
}
