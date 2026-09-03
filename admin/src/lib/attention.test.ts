import { describe, expect, it } from 'vitest'
import { buildAttention, lateBy } from './attention'
import type { EnquiryRow, OutboxRow, TicketRow } from './types'

const NOW = Date.parse('2026-09-01T12:00:00Z')
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString()
const hoursAhead = (h: number) => new Date(NOW + h * 3600_000).toISOString()

function ticket(over: Partial<TicketRow> = {}): TicketRow {
  return {
    id: 't-1',
    ticketRef: 'PG-2026-000118',
    subject: 'Withdrawal has not arrived',
    requesterName: 'Rohit Sharma',
    requesterEmail: 'rohit@example.com',
    categoryId: 'funding',
    subcategoryId: 'withdrawal',
    priority: 'URGENT',
    statusInternal: 'IN_PROGRESS',
    statusCustomer: 'IN_PROGRESS',
    assignedAgentId: null,
    assignedAgentName: null,
    createdAt: hoursAgo(40),
    firstResponseDueAt: hoursAgo(36),
    firstResponseAt: hoursAgo(35),
    resolutionDueAt: hoursAgo(6),
    resolvedAt: null,
    firstResponseState: 'MET',
    resolutionState: 'BREACHED',
    hasComplaint: false,
    complaintRef: null,
    legalHold: false,
    attachmentCount: 0,
    ...over,
  }
}

function enquiry(over: Partial<EnquiryRow> = {}): EnquiryRow {
  return {
    id: 'e-1',
    enquiryRef: 'PG-ENQ-2026-000031',
    fullName: 'Vikram Desai',
    email: 'vikram@example.com',
    phone: '+91 99870 11234',
    interestId: 'us-stocks',
    interestLabel: 'US stocks and ETFs',
    status: 'NEW',
    assignedToId: null,
    assignedToName: null,
    source: 'web',
    createdAt: hoursAgo(29),
    firstContactedAt: null,
    closedAt: null,
    followUpTargetAt: hoursAgo(5),
    followUpOverdue: true,
    noteCount: 0,
    ...over,
  }
}

function email(over: Partial<OutboxRow> = {}): OutboxRow {
  return {
    id: 'n-1',
    template: 'ticket_acknowledgement',
    toEmail: 'rohit@example.com',
    subject: '[PG-2026-000118] We have your support request',
    status: 'FAILED',
    attempts: 5,
    maxAttempts: 5,
    nextAttemptAt: hoursAgo(1),
    lastError: 'Resend: 422 domain platizio.com is not verified',
    provider: 'resend',
    sentAt: null,
    createdAt: hoursAgo(7),
    ticketId: 't-1',
    ticketRef: 'PG-2026-000118',
    enquiryId: null,
    enquiryRef: null,
    ...over,
  }
}

describe('lateBy', () => {
  it('reports hours past a deadline', () => {
    expect(lateBy(hoursAgo(6), NOW)).toBe('6h')
  })

  it('reports days once past a day', () => {
    expect(lateBy(hoursAgo(50), NOW)).toBe('2d')
  })

  it('says nothing about a deadline still ahead', () => {
    expect(lateBy(hoursAhead(3), NOW)).toBe('')
  })

  it('says nothing about a missing or unparseable timestamp', () => {
    expect(lateBy(null, NOW)).toBe('')
    expect(lateBy('not a date', NOW)).toBe('')
  })
})

describe('buildAttention', () => {
  it('is empty and totals zero when every source is null', () => {
    const result = buildAttention({ tickets: null, enquiries: null, emails: null }, NOW)

    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
    expect(result.shown).toBe(0)
  })

  it('caps each source at five while reporting the true total', () => {
    // The landing screen must not become an unbounded page on the worst day of
    // the year, which is the day it most needs to be readable.
    const rows = Array.from({ length: 9 }, (_, i) => ticket({ id: `t-${i}`, ticketRef: `R-${i}` }))
    const result = buildAttention({ tickets: { rows, total: 11 } }, NOW)

    expect(result.items).toHaveLength(5)
    expect(result.shown).toBe(5)
    expect(result.total).toBe(11)
  })

  it('adds the totals of all three sources, not just what is shown', () => {
    const result = buildAttention(
      {
        tickets: { rows: [ticket()], total: 7 },
        enquiries: { rows: [enquiry()], total: 3 },
        emails: { rows: [email()], total: 2 },
      },
      NOW,
    )

    expect(result.total).toBe(12)
    expect(result.shown).toBe(3)
    expect(result.items.map((i) => i.kind)).toEqual(['Ticket', 'Enquiry', 'Email'])
  })

  it('names how late a breached ticket is', () => {
    const result = buildAttention({ tickets: { rows: [ticket()], total: 1 } }, NOW)

    expect(result.items[0].note).toBe('Resolution 6h late')
    expect(result.items[0].to).toBe('/tickets/t-1')
    expect(result.items[0].meta).toBe('PG-2026-000118 · Rohit Sharma')
  })

  it('names the first-reply clock when that is the one breached', () => {
    const rows = [
      ticket({ firstResponseState: 'BREACHED', firstResponseAt: null, resolutionState: 'DUE' }),
    ]
    const result = buildAttention({ tickets: { rows, total: 1 } }, NOW)

    // "1d", not "36h": past a day the unit coarsens, matching relative() in
    // RelativeTime.ts. A queue is scanned, not read.
    expect(result.items[0].note).toBe('First reply 1d late')
  })

  it('says an enquiry is past target, never overdue and never breached', () => {
    // 0027 is explicit that internal_follow_up_target_at is an internal working
    // figure with no published response time, and must never be quoted as one.
    const result = buildAttention({ enquiries: { rows: [enquiry()], total: 1 } }, NOW)

    expect(result.items[0].note).toBe('Past target')
    expect(result.items[0].meta).toContain('nobody has called back')
  })

  it('does not claim nobody called back when somebody did', () => {
    const rows = [enquiry({ firstContactedAt: hoursAgo(20) })]
    const result = buildAttention({ enquiries: { rows, total: 1 } }, NOW)

    expect(result.items[0].meta).toContain('no follow-up since first contact')
  })

  it('carries the provider error on a failed email', () => {
    const result = buildAttention({ emails: { rows: [email()], total: 1 } }, NOW)

    expect(result.items[0].kind).toBe('Email')
    expect(result.items[0].note).toBe('Never sent')
    expect(result.items[0].meta).toContain('domain platizio.com is not verified')
    expect(result.items[0].meta).toContain('5 attempts')
  })

  it('links the kind through to the full screen only when a source is truncated', () => {
    const rows = Array.from({ length: 5 }, (_, i) => ticket({ id: `t-${i}` }))
    const result = buildAttention(
      {
        tickets: { rows, total: 11 }, // truncated: 11 exist, 5 drawn
        emails: { rows: [email()], total: 1 }, // complete
      },
      NOW,
    )

    // Indexed, not .at(-1): tsconfig sets lib to ES2020 and Array.prototype.at
    // is ES2022, so .at() typechecks as an error in this project.
    expect(result.items[0].kindTo).toBe('/tickets?view=sla')
    expect(result.items[result.items.length - 1].kindTo).toBeNull()
  })

  it('gives every item a key unique across the three kinds', () => {
    const result = buildAttention(
      {
        tickets: { rows: [ticket({ id: 'x' })], total: 1 },
        enquiries: { rows: [enquiry({ id: 'x' })], total: 1 },
        emails: { rows: [email({ id: 'x' })], total: 1 },
      },
      NOW,
    )

    expect(new Set(result.items.map((i) => i.key)).size).toBe(3)
  })
})
