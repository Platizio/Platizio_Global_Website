import type { Dashboard } from './types'

/**
 * The one line under the dashboard greeting.
 *
 * Derived entirely from counts already in hand — no extra request, no new
 * field. Its job is to answer "is anything on fire" before the agent reads a
 * single tile, so it names only things with a real deadline attached.
 *
 * Enquiries are deliberately excluded. `internal_follow_up_target_at` is an
 * internal working target with no published SLA (migration 0027 says so), and a
 * sentence that reports it beside two genuine breaches is how it starts being
 * treated as one.
 */

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

function say(n: number): string {
  return n <= 10 ? WORDS[n] : String(n)
}

function join(parts: string[]): string {
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/**
 * The sentence under the greeting.
 *
 * `lateTicketCount` is passed in rather than derived from the dashboard, and
 * that is the whole point of the parameter. It must be the number of *tickets*
 * past a deadline — `staff_ticket_queue({slaOnly:true}).total`, the same figure
 * the attention panel below counts its rows from.
 *
 * It used to be `firstResponseBreached + resolutionBreached`, which counts
 * clocks, not tickets. A ticket that has blown both appears in both counters, so
 * five overdue tickets read as "Ten tickets are past a deadline" — the exact
 * double-count this dashboard was rebuilt to remove, surviving in the one file
 * the rebuild left alone. It was invisible in the fixtures, where the two
 * counters happened to name different tickets, and appeared the moment it met
 * real data. There is no way to recover the true count from the two counters:
 * their overlap is unknowable from the numbers alone.
 */
export function summarise(d: Dashboard, lateTicketCount: number): string {
  const parts: string[] = []

  if (lateTicketCount > 0) {
    parts.push(
      `${say(lateTicketCount)} ${lateTicketCount === 1 ? 'ticket is' : 'tickets are'} past a deadline`,
    )
  }

  // `complaintsBreached` is deliberately not reported. staff_dashboard() still
  // returns it, but the console surfaces no grievance workflow at all — the
  // site has no grievance page and they are handled outside this system — so a
  // sentence naming one would point at something an agent cannot open.

  if (d.outboxFailed > 0) {
    parts.push(
      `${say(d.outboxFailed)} ${d.outboxFailed === 1 ? 'email has' : 'emails have'} failed to send`,
    )
  }

  if (parts.length === 0) return 'Nothing is past its deadline and the outbox is clear.'

  const sentence = join(parts)
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`
}

/**
 * Time of day in Asia/Kolkata, not the reader's locale.
 *
 * Every SLA in this system is computed against that timezone's business hours.
 * An agent travelling would otherwise be greeted with a good evening while the
 * desk they are looking at is mid-morning.
 */
export function greeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    }).format(now),
  )

  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
