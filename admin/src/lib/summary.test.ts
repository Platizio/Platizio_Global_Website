import { describe, expect, it } from 'vitest'
import { greeting, summarise } from './summary'
import type { Dashboard } from './types'

const CLEAR: Dashboard = {
  open: 4,
  unassigned: 0,
  mine: 2,
  awaitingFirstResponse: 0,
  firstResponseBreached: 0,
  resolutionBreached: 0,
  byStatus: {},
  openComplaints: 0,
  complaintsBreached: 0,
  outboxPending: 0,
  outboxFailed: 0,
  newEnquiries: 0,
  openEnquiries: 0,
  unassignedEnquiries: 0,
  myEnquiries: 0,
  enquiriesOverdueFollowUp: 0,
  generatedAt: '2026-08-21T08:30:00.000Z',
}

describe('summarise', () => {
  it('says so plainly when there is nothing to chase', () => {
    expect(summarise(CLEAR, 0)).toBe('Nothing is past its deadline and the outbox is clear.')
  })

  it('counts a single breached ticket', () => {
    expect(summarise({ ...CLEAR, firstResponseBreached: 1 }, 1)).toBe(
      'One ticket is past a deadline.',
    )
  })

  /*
   * The regression this file used to assert the opposite of.
   *
   * The old test was named "adds the two ticket clocks together" and expected
   * 1 + 2 = "Three tickets". That is counting clocks, not tickets: one ticket
   * that has blown both its deadlines sits in both counters. On live data five
   * overdue tickets rendered as "Ten tickets are past a deadline", and the
   * suite stayed green because the test encoded the same mistake as the code.
   */
  it('counts tickets, not clocks, when one ticket has blown both deadlines', () => {
    // Five tickets, each breaching first-reply AND resolution. The counters read
    // 5 and 5; the truth is five tickets.
    expect(summarise({ ...CLEAR, firstResponseBreached: 5, resolutionBreached: 5 }, 5)).toBe(
      'Five tickets are past a deadline.',
    )
  })

  it('ignores the two breach counters entirely', () => {
    // Whatever the counters say, the passed-in ticket count is what is reported.
    expect(summarise({ ...CLEAR, firstResponseBreached: 9, resolutionBreached: 9 }, 2)).toBe(
      'Two tickets are past a deadline.',
    )
  })

  it('joins two clauses with "and"', () => {
    expect(summarise({ ...CLEAR, firstResponseBreached: 1, outboxFailed: 1 }, 1)).toBe(
      'One ticket is past a deadline and one email has failed to send.',
    )
  })

  // The console surfaces no grievance workflow, so a breached complaint must
  // not appear in the sentence — it would name something an agent cannot open.
  it('never reports a breached grievance', () => {
    expect(summarise({ ...CLEAR, complaintsBreached: 3 }, 0)).toBe(
      'Nothing is past its deadline and the outbox is clear.',
    )
  })

  it('switches to digits above ten', () => {
    expect(summarise({ ...CLEAR, outboxFailed: 14 }, 0)).toBe('14 emails have failed to send.')
  })

  // Enquiries are deliberately absent from every clause above. They carry no
  // published SLA, so an overdue follow-up is not a deadline and must never be
  // reported as one.
  it('never reports an overdue enquiry follow-up as a deadline', () => {
    expect(summarise({ ...CLEAR, enquiriesOverdueFollowUp: 5 }, 0)).toBe(
      'Nothing is past its deadline and the outbox is clear.',
    )
  })
})

describe('greeting', () => {
  it('says good morning in the Indian morning', () => {
    expect(greeting(new Date('2026-08-21T03:30:00.000Z'))).toBe('Good morning')
  })

  it('says good afternoon after midday IST', () => {
    expect(greeting(new Date('2026-08-21T08:30:00.000Z'))).toBe('Good afternoon')
  })

  it('says good evening after five IST', () => {
    expect(greeting(new Date('2026-08-21T14:30:00.000Z'))).toBe('Good evening')
  })
})
