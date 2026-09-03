import { TICKET_STATUS_LABEL } from '../components/Chip'
import type { Dashboard, TicketStatusInternal } from './types'

/**
 * The dashboard's one partition: six buckets, every open ticket in exactly one.
 *
 * The point of a partition is that nothing can be double-counted — a ticket is
 * in one bucket by definition of `status_internal`, so no bucket can restate
 * another under a different name. That property is the whole design, and it is
 * why there is no total: a total would be the sum of the six rows above it,
 * which is exactly the duplication being removed.
 */

/**
 * In workflow order. CLOSED and SPAM are deliberately absent — closed grows
 * without bound and is archive, not work — which is why every heading over
 * these buckets says "open tickets" rather than claiming to be all of them.
 */
export const OPEN_STATUSES: TicketStatusInternal[] = [
  'NEW',
  'TRIAGED',
  'IN_PROGRESS',
  'WAITING_ON_CUSTOMER',
  'WAITING_ON_BROKER',
  'RESOLVED',
]

/**
 * Bar colour carries no state meaning. Red, amber and green are unavailable:
 * they already mean breached, caution and met everywhere else in the console,
 * and a status is not a state.
 */
export type BucketTone = 'new' | 'waiting' | 'plain'

export interface Bucket {
  status: TicketStatusInternal
  label: string
  count: number
  /** 0–100, this bucket's share of the six. Zero when nothing is open. */
  share: number
  to: string
  tone: BucketTone
}

/**
 * Six buckets, always, whatever `byStatus` contains.
 *
 * `staff_dashboard()` builds byStatus with `jsonb_object_agg` over a
 * `GROUP BY status_internal`, so **a status with no tickets is absent from the
 * object entirely** — it is not present with a zero. Iterating the object's own
 * keys would therefore yield four buckets on a quiet day instead of six, the
 * layout would jump as counts crossed zero, and a partition with holes in it
 * stops reading as a partition. So the fixed list is iterated and the object is
 * only ever read from.
 */
export function buildPartition(byStatus: Dashboard['byStatus'] | undefined): Bucket[] {
  const counts = OPEN_STATUSES.map((status) => byStatus?.[status] ?? 0)
  const total = counts.reduce((sum, n) => sum + n, 0)

  return OPEN_STATUSES.map((status, i) => ({
    status,
    // From Chip.tsx so a bucket and a chip can never disagree about what
    // NEW is called.
    label: TICKET_STATUS_LABEL(status),
    count: counts[i],
    // Guarded, not because zero tickets is unlikely but because it is the
    // state this screen is in every quiet afternoon, and 0/0 is NaN.
    share: total === 0 ? 0 : (counts[i] / total) * 100,
    to: `/tickets?view=all&status=${status}`,
    tone:
      status === 'NEW'
        ? 'new'
        : status === 'WAITING_ON_CUSTOMER' || status === 'WAITING_ON_BROKER'
          ? 'waiting'
          : 'plain',
  }))
}
