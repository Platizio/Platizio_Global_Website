# Dashboard Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's sixteen-number status strip with one partition (six open-ticket status buckets drawn as proportional bars) and one "Needs attention" list, so that no field displays rows another field already displays.

**Architecture:** Two pure functions in `admin/src/lib/` do all the arithmetic and shaping, and `Dashboard.tsx` only renders. That split exists because the two bugs this design is fixing — double-counted rows, and a partition that silently loses buckets — are both arithmetic bugs, and arithmetic that lives inside JSX cannot be tested. `buildPartition()` turns `staff_dashboard().byStatus` into exactly six buckets with shares; `buildAttention()` merges three already-existing queue RPCs into one capped list of items. No new SQL, no changes under `supabase/`.

**Tech Stack:** React 18 + TypeScript (`strict`) + Vite 5, `react-router-dom` v6, Vitest + jsdom. Plain CSS with custom properties from `admin/src/styles/tokens.css`.

**Source spec:** [docs/superpowers/specs/2026-09-01-dashboard-fields-design.md](../specs/2026-09-01-dashboard-fields-design.md)

---

## Before you start

**Read the spec first.** It carries the reasoning; this plan carries the steps. In particular the
`byStatus` trap in Task 1 will look like an over-cautious null check until you have read why it is
not.

**Working directory.** Every `npm` command in this plan runs in `admin/`, not the repo root. The
one exception is Task 6 step 4, which is explicitly the root build and says so.

**On committing.** The user's standing instruction this session is: *"Don't push anything or ask
for it until I say."* Nothing in this repo has been committed or pushed. The commit steps below are
written out because a plan without them is incomplete — but **do not run any `git commit` until the
user has said to commit.** If they have not, do the work and leave it in the working tree. Never
run `git push`, and do not ask to.

**Start the dev server once, not per task:**

```bash
cd admin && npm run dev
```

It serves on `http://localhost:5174`. Demo fixtures are on when `VITE_DEMO=1` is set in
`admin/.env.local` — check that it is, or every screen will try to reach a real Supabase project.

---

## File structure

| File | Responsibility |
|---|---|
| `admin/src/lib/partition.ts` | **new.** The six open statuses and their shares. Pure; knows nothing about React. |
| `admin/src/lib/partition.test.ts` | **new.** Nine tests, including the `byStatus` trap and the divide-by-zero. |
| `admin/src/lib/attention.ts` | **new.** Merges three sources into one capped list of items. Pure. |
| `admin/src/lib/attention.test.ts` | **new.** Fourteen tests, including the per-source cap, the truncation link and `lateBy`. |
| `admin/src/lib/demo.ts` | **modify.** Derive `byStatus`/`open` from the ticket fixtures instead of hand-writing them; make the demo queue lopsided so the bars can be judged. |
| `admin/src/screens/Dashboard.tsx` | **rewrite.** Rendering and three RPC calls. No arithmetic. |
| `admin/src/styles/console.css` | **modify.** Delete `.status-strip` / `.status-seg`; add `.dash-split`, `.bar-*`, `.attn-*`. |

Untouched, and worth stating because earlier passes drifted into them: `admin/src/lib/summary.ts`,
`admin/src/lib/rpc.ts`, `admin/src/lib/types.ts`, `admin/src/components/Chip.tsx`, and every file
under `supabase/`.

---

### Task 1: The partition

Six buckets, every open ticket in exactly one, each with its share of the six.

**Files:**
- Create: `admin/src/lib/partition.ts`
- Test: `admin/src/lib/partition.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `admin/src/lib/partition.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { OPEN_STATUSES, buildPartition } from './partition'

describe('buildPartition', () => {
  it('returns all six buckets when byStatus omits most of them', () => {
    // staff_dashboard() builds byStatus with jsonb_object_agg over a GROUP BY,
    // so a status with no tickets is ABSENT, not zero. This is the whole reason
    // this function exists rather than Object.keys(byStatus).map(...).
    const buckets = buildPartition({ NEW: 3 })

    expect(buckets).toHaveLength(6)
    expect(buckets.map((b) => b.status)).toEqual(OPEN_STATUSES)
    expect(buckets.find((b) => b.status === 'TRIAGED')?.count).toBe(0)
  })

  it('never includes CLOSED or SPAM, even when byStatus carries them', () => {
    const buckets = buildPartition({ NEW: 1, CLOSED: 400, SPAM: 90 })
    const statuses = buckets.map((b) => b.status)

    expect(statuses).not.toContain('CLOSED')
    expect(statuses).not.toContain('SPAM')
  })

  it('shares are proportional and sum to 100', () => {
    const buckets = buildPartition({ NEW: 1, TRIAGED: 1, IN_PROGRESS: 2 })

    expect(buckets.find((b) => b.status === 'IN_PROGRESS')?.share).toBe(50)
    expect(buckets.find((b) => b.status === 'NEW')?.share).toBe(25)
    expect(buckets.reduce((sum, b) => sum + b.share, 0)).toBeCloseTo(100)
  })

  it('gives every bucket a zero share when nothing is open, rather than NaN', () => {
    const buckets = buildPartition({})

    expect(buckets).toHaveLength(6)
    for (const bucket of buckets) {
      expect(bucket.count).toBe(0)
      expect(bucket.share).toBe(0)
    }
  })

  it('survives a missing byStatus entirely', () => {
    expect(buildPartition(undefined)).toHaveLength(6)
  })

  it('links carry both status and view', () => {
    // status is what filters; view only decides which tab reads as active on
    // arrival. Sending status alone filters correctly and highlights the wrong
    // tab.
    const broker = buildPartition({ WAITING_ON_BROKER: 2 }).find(
      (b) => b.status === 'WAITING_ON_BROKER',
    )

    expect(broker?.to).toBe('/tickets?view=all&status=WAITING_ON_BROKER')
  })

  it('labels come from the chip vocabulary, so the strip and the chips agree', () => {
    const buckets = buildPartition({})

    expect(buckets[0].label).toBe('Unopened')
    expect(buckets[1].label).toBe('Opened')
  })

  it('tones the unopened bucket and the two waiting buckets, nothing else', () => {
    const byTone = Object.fromEntries(buildPartition({}).map((b) => [b.status, b.tone]))

    expect(byTone.NEW).toBe('new')
    expect(byTone.WAITING_ON_CUSTOMER).toBe('waiting')
    expect(byTone.WAITING_ON_BROKER).toBe('waiting')
    expect(byTone.IN_PROGRESS).toBe('plain')
    expect(byTone.RESOLVED).toBe('plain')
  })

  it('total is the sum of the six, which is what open must equal', () => {
    // The disjointness check: sum(buckets) === staff_dashboard().open.
    const buckets = buildPartition({ NEW: 2, WAITING_ON_BROKER: 4, CLOSED: 11 })

    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(6)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd admin && npx vitest run src/lib/partition.test.ts
```

Expected: FAIL — `Failed to resolve import "./partition"`.

- [ ] **Step 3: Write the implementation**

Create `admin/src/lib/partition.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd admin && npx vitest run src/lib/partition.test.ts
```

Expected: PASS — 9 passed.

- [ ] **Step 5: Typecheck**

```bash
cd admin && npm run typecheck
```

Expected: no output, exit 0.

- [ ] **Step 6: Commit** *(only if the user has authorised commits — see "Before you start")*

```bash
git add admin/src/lib/partition.ts admin/src/lib/partition.test.ts && git commit -m "Add the dashboard status partition"
```

---

### Task 2: The attention list

Three sources, one list, each capped at five. An item is on it or it is not — there is no
arithmetic to get wrong, which is the point.

**Files:**
- Create: `admin/src/lib/attention.ts`
- Test: `admin/src/lib/attention.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `admin/src/lib/attention.test.ts`:

```ts
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

    expect(result.items[0].note).toBe('First reply 36h late')
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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd admin && npx vitest run src/lib/attention.test.ts
```

Expected: FAIL — `Failed to resolve import "./attention"`.

- [ ] **Step 3: Write the implementation**

Create `admin/src/lib/attention.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd admin && npx vitest run src/lib/attention.test.ts
```

Expected: PASS — 14 passed.

- [ ] **Step 5: Run the whole suite, to confirm nothing else moved**

```bash
cd admin && npm test
```

Expected: PASS — 38 passed (15 that existed before, 9 from Task 1, 14 from this task).

- [ ] **Step 6: Commit** *(only if the user has authorised commits)*

```bash
git add admin/src/lib/attention.ts admin/src/lib/attention.test.ts && git commit -m "Add the dashboard attention list"
```

---

### Task 3: Honest demo fixtures

Two problems, one cause. `DASHBOARD.byStatus` is hand-written beside the ticket fixtures, so the
two can disagree — they already did once, when the dashboard claimed twelve closed tickets and the
queue held none, and that only surfaced because the counts became clickable. And with one ticket in
every bucket, six equal bars say nothing, so the design cannot be judged.

Deriving the counts from the fixtures fixes the first permanently and makes the second safe to do.

**Files:**
- Modify: `admin/src/lib/demo.ts`

- [ ] **Step 1: Add the extra open tickets**

The demo queue currently holds one ticket per status. Add four more waiting on the broker and two
more unopened, so the backlog is lopsided the way a real one is.

In `admin/src/lib/demo.ts`, find the closing `]` of the `const TICKETS: TicketRow[] = [` array
(it is immediately before `const TICKET_DETAILS`). Insert this block just before that `]`:

```ts
  /*
   * Six more open tickets, so the queue is lopsided rather than one-per-bucket.
   * Six equal bars say nothing about a backlog; "most of it is waiting on the
   * broker" is the thing the partition exists to show, and a fixture set that
   * cannot express it cannot be used to judge the screen.
   *
   * They are generated rather than written out because nothing distinguishes
   * them but the reference — inventing six more plausible support stories would
   * be six more things to read and no more information.
   */
  ...Array.from({ length: 4 }, (_, i) => bulk(i, 'WAITING_ON_BROKER', 'Awaiting broker confirmation')),
  ...Array.from({ length: 2 }, (_, i) => bulk(i + 4, 'NEW', 'Statement does not match my trades')),
```

- [ ] **Step 2: Add the `bulk` helper**

`Array.from` above calls `bulk`, which does not exist yet. Add it immediately **before**
`const TICKETS: TicketRow[] = [`:

```ts
/**
 * A filler ticket for the demo queue.
 *
 * Deliberately plain: these exist to give the status partition something with a
 * shape, and every field that matters to it — the status — is a parameter.
 */
function bulk(i: number, statusInternal: TicketRow['statusInternal'], subject: string): TicketRow {
  return {
    id: `t-b${i}`,
    ticketRef: `PG-2026-0001${30 + i}`,
    subject,
    requesterName: ['Kabir Menon', 'Isha Rao', 'Neel Verma', 'Tara Joshi', 'Omar Sheikh', 'Riya Das'][i],
    requesterEmail: `demo${i}@example.com`,
    categoryId: 'account',
    subcategoryId: 'statements',
    priority: 'NORMAL',
    statusInternal,
    statusCustomer: statusInternal === 'NEW' ? 'RECEIVED' : 'IN_PROGRESS',
    assignedAgentId: null,
    assignedAgentName: null,
    createdAt: ago(12 + i * 3),
    firstResponseDueAt: ahead(4 + i),
    firstResponseAt: statusInternal === 'NEW' ? null : ago(6 + i),
    resolutionDueAt: ahead(30 + i),
    resolvedAt: null,
    firstResponseState: statusInternal === 'NEW' ? 'DUE' : 'MET',
    resolutionState: 'DUE',
    hasComplaint: false,
    complaintRef: null,
    legalHold: false,
    attachmentCount: 0,
  }
}
```

- [ ] **Step 3: Derive the dashboard counts from the fixtures**

Replace the hand-written `open:` and `byStatus:` fields in `const DASHBOARD: Dashboard = {`.

Find:

```ts
const DASHBOARD: Dashboard = {
  open: 6,
```

and

```ts
  byStatus: {
    NEW: 1,
    TRIAGED: 1,
    IN_PROGRESS: 1,
    WAITING_ON_CUSTOMER: 1,
    WAITING_ON_BROKER: 1,
    RESOLVED: 1,
    CLOSED: 2,
  },
```

Replace them so the object reads:

```ts
/**
 * Counted from TICKETS rather than written beside them.
 *
 * These two used to be maintained by hand and drifted: byStatus said twelve
 * tickets were closed while the queue held none, and it only surfaced when the
 * counts became clickable and one of them clicked into nothing. Deriving them
 * makes the dashboard and the queue incapable of disagreeing, which is also the
 * disjointness check the real screen is verified against — sum of the six open
 * buckets must equal `open`.
 */
const byStatus = TICKETS.reduce<Partial<Record<TicketRow['statusInternal'], number>>>(
  (acc, t) => ({ ...acc, [t.statusInternal]: (acc[t.statusInternal] ?? 0) + 1 }),
  {},
)

const DASHBOARD: Dashboard = {
  open: TICKETS.filter((t) => t.statusInternal !== 'CLOSED' && t.statusInternal !== 'SPAM').length,
```

...leaving the rest of the object as it is, and replacing the old literal `byStatus: {...}` block
with:

```ts
  byStatus,
```

- [ ] **Step 4: Typecheck**

```bash
cd admin && npm run typecheck
```

Expected: no output, exit 0. If it reports that `TicketRow` is not defined at the `bulk` helper,
the import at the top of `demo.ts` already has it — check you inserted `bulk` below the imports and
not above them.

- [ ] **Step 5: Confirm the hand-written counts are gone**

```bash
cd admin/src/lib && echo "literal byStatus block left: $(grep -c 'byStatus: {' demo.ts)" && echo "literal open count left: $(grep -c 'open: 6,' demo.ts)" && echo "derived byStatus present: $(grep -c 'const byStatus = TICKETS.reduce' demo.ts)"
```

Expected:
```
literal byStatus block left: 0
literal open count left: 0
derived byStatus present: 1
```

This only proves the edit landed. That the numbers are *right* is proved in the browser, at Task 6
step 6 — which is the point of deriving them: the check and the data now have one source.

- [ ] **Step 6: Commit** *(only if the user has authorised commits)*

```bash
git add admin/src/lib/demo.ts && git commit -m "Derive the demo dashboard counts from the ticket fixtures"
```

---

### Task 4: The styles

Delete the strip, add the bars and the list rows.

**Files:**
- Modify: `admin/src/styles/console.css`

- [ ] **Step 1: Delete the status-strip block**

The block runs from the `/* ── Status strip ──` banner to the line before the `/* ── Chips ──`
banner. Both banners are unique in the file, so delete by anchor rather than by line number:

```bash
cd admin/src/styles && awk '/^\/\* ── Status strip/{s=1} /^\/\* ── Chips/{s=0} !s' console.css > console.css.tmp && mv console.css.tmp console.css
```

- [ ] **Step 2: Verify the block is gone and nothing else went with it**

```bash
cd admin/src/styles && echo "status-seg left: $(grep -c 'status-seg\|status-strip' console.css)" && echo "chips still here: $(grep -c '^\.chip {' console.css)" && echo "tiles still here: $(grep -c '^\.tile {' console.css)"
```

Expected:
```
status-seg left: 0
chips still here: 1
tiles still here: 1
```

If `chips still here` is 0, the awk range ran away — restore with `git checkout admin/src/styles/console.css` and delete the block by hand instead.

- [ ] **Step 3: Add the new rules**

Append to the end of `admin/src/styles/console.css`:

```css
/* ── Dashboard: partition and attention ───────────────────────────────────── */
/*
   Two columns: the counts on the left, the work on the right. The counts are a
   partition and the list is items, so there is deliberately nothing to add up
   across the gap between them.
*/

.dash-split {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

@media (max-width: 1100px) {
  .dash-split {
    grid-template-columns: minmax(0, 1fr);
  }
}

.bars {
  padding: 6px 8px;
}

.bar-row {
  display: block;
  padding: 8px;
  border-radius: var(--radius);
  color: inherit;
  transition: background var(--t-fast);
}

a.bar-row:hover {
  text-decoration: none;
  background: var(--gray-50);
}

.bar-top {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 12.5px;
  color: var(--gray-700);
}

.bar-count {
  margin-left: auto;
  font-size: 14px;
  font-weight: 700;
  color: var(--navy);
  font-variant-numeric: tabular-nums;
}

/* An empty bucket is greyed rather than hidden. Hiding it made the layout jump
   as counts crossed zero, and a partition with holes stops reading as one. */
.bar-row.is-zero {
  opacity: 0.55;
}

.bar-track {
  height: 6px;
  margin-top: 6px;
  border-radius: var(--radius-full);
  background: var(--gray-100);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--gray-300);
}

/* Bar colour carries no state meaning, so red, amber and green are unavailable:
   they already mean breached, caution and met throughout the console, and a
   status is not a state. The accent marks what nobody has opened; the waiting
   buckets get a muted sand that is deliberately NOT --warn. */
.bar-row.tone-new .bar-fill {
  background: var(--gold-gradient);
}

.bar-row.tone-waiting .bar-fill {
  background: #e7c99a;
}

.attn-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.attn-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--gray-100);
}

.attn-row:last-child {
  border-bottom: 0;
}

/* The kind prefix. Three different things share one list, and without this the
   rows are ambiguous the moment a ticket and an enquiry sit side by side. */
.attn-kind {
  flex: none;
  width: 62px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gray-400);
}

/* Only where the source was truncated. The accent says it goes somewhere;
   the grey above says it is just a label. */
a.attn-kind {
  color: var(--gold-deep);
}

a.attn-kind:hover {
  text-decoration: underline;
}

.attn-body {
  min-width: 0;
  flex: 1;
}

.attn-body a {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--navy);
}

.attn-meta {
  display: block;
  font-size: 11.5px;
  color: var(--gray-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

- [ ] **Step 4: Commit** *(only if the user has authorised commits)*

```bash
git add admin/src/styles/console.css && git commit -m "Swap the dashboard status strip for bars and list rows"
```

---

### Task 5: The screen

Rendering only. Every number on it comes from Task 1 and every row from Task 2.

**Files:**
- Modify: `admin/src/screens/Dashboard.tsx` (full rewrite)

- [ ] **Step 1: Replace the file**

Replace the entire contents of `admin/src/screens/Dashboard.tsx` with:

```tsx
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { PageHead } from '../components/AppShell'
import { Chip } from '../components/Chip'
import { formatDateTime } from '../components/RelativeTime'
import { buildAttention } from '../lib/attention'
import { buildPartition } from '../lib/partition'
import { dashboard, enquiryQueue, outbox, ticketQueue } from '../lib/rpc'
import { greeting, summarise } from '../lib/summary'
import { useAsync } from '../lib/useAsync'

/**
 * The morning screen: one partition and one list.
 *
 * The partition counts — six buckets, every open ticket in exactly one, so no
 * bucket can restate another under a different name. The list names — every
 * urgent thing as a row saying which ticket, which enquiry, which email, rather
 * than as a count that overlapped three other counts.
 *
 * There is no arithmetic between them. One counts, the other names.
 *
 * All the shaping lives in lib/partition.ts and lib/attention.ts, and it lives
 * there because the bugs this screen was rebuilt to fix were arithmetic bugs,
 * and arithmetic inside JSX cannot be tested.
 */

const POLL_MS = 60_000
const CAP = 5

export default function Dashboard() {
  const { data, error, initial, reload } = useAsync(dashboard, [], { pollMs: POLL_MS })
  const { me } = useAuth()

  // Three sources, all read-only and all `stable`, polled once a minute. The
  // filters are the ones each screen's own urgent tab already sends.
  const lateTickets = useAsync(() => ticketQueue({ slaOnly: true, sort: 'due', limit: CAP }), [], {
    pollMs: POLL_MS,
  })
  const lateEnquiries = useAsync(
    () => enquiryQueue({ overdueOnly: true, sort: 'target', limit: CAP }),
    [],
    { pollMs: POLL_MS },
  )
  const failedEmail = useAsync(() => outbox({ status: ['FAILED'], limit: CAP }), [], {
    pollMs: POLL_MS,
  })

  const firstName = (me?.fullName ?? '').trim().split(' ')[0]
  const hello = greeting(new Date())

  const buckets = buildPartition(data?.byStatus)
  const attention = buildAttention({
    tickets: lateTickets.data,
    enquiries: lateEnquiries.data,
    emails: failedEmail.data,
  })

  const sourceError = lateTickets.error ?? lateEnquiries.error ?? failedEmail.error

  return (
    <>
      <PageHead
        title={firstName ? `${hello}, ${firstName}` : hello}
        lede={data ? summarise(data) : 'Loading…'}
        actions={
          <button type="button" className="btn btn-sm" onClick={reload}>
            Refresh
          </button>
        }
      />

      {error && (
        <div className="banner banner-danger" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {initial && !data ? (
        /* Shaped like the panel it becomes. A loading state that does not
           resemble the loaded one makes the page jump when it arrives. */
        <div className="card" aria-busy="true">
          <div className="bars">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div className="bar-row" key={i}>
                <div className="skeleton" style={{ width: '60%' }} />
                <div className="skeleton" style={{ height: 6, marginTop: 8 }} />
              </div>
            ))}
          </div>
        </div>
      ) : data ? (
        <div className="dash-split">
          <section aria-labelledby="dash-status">
            <h2 id="dash-status" className="eyebrow">
              Open tickets by status
            </h2>
            <div className="card">
              <div className="bars">
                {buckets.map((bucket) => (
                  <Link
                    key={bucket.status}
                    className={`bar-row tone-${bucket.tone}${bucket.count === 0 ? ' is-zero' : ''}`}
                    to={bucket.to}
                  >
                    <span className="bar-top">
                      {bucket.label}
                      <span className="bar-count">{bucket.count.toLocaleString()}</span>
                    </span>
                    {/* Decoration: the count beside it is the accessible value,
                        and a screen reader reading out a percentage of a
                        partition it cannot see adds nothing. */}
                    <span className="bar-track" aria-hidden="true">
                      <span className="bar-fill" style={{ width: `${bucket.share}%` }} />
                    </span>
                  </Link>
                ))}
              </div>
              {/* No total. A total is the sum of the six rows above it — the
                  exact duplication this screen was rebuilt to remove. */}
              <div className="card-note">
                Closed and spam are not counted here. Counts as of{' '}
                {formatDateTime(data.generatedAt)}.
              </div>
            </div>
          </section>

          {/*
            The point of the whole screen. The bars say how many; this says
            which, so the first thing seen each morning is the work rather than
            a number to go and reconstruct. It takes the assistant's treatment
            from /help — navy bar, steady emerald dot, elevation — because it is
            the one panel the screen exists to serve.
          */}
          <section className="card is-primary-panel" aria-labelledby="dash-attention">
            <div className="panel-bar">
              <span className="panel-bar-dot" aria-hidden="true" />
              <h2 id="dash-attention" className="panel-bar-title">
                Needs attention
              </h2>
              <span className="panel-bar-actions">
                {attention.total > attention.shown
                  ? `${attention.shown} of ${attention.total}`
                  : attention.total > 0
                    ? `${attention.total} item${attention.total === 1 ? '' : 's'}`
                    : ''}
              </span>
            </div>

            {sourceError ? (
              <div className="empty">
                <h3>Could not load this</h3>
                <p>{sourceError}</p>
              </div>
            ) : attention.items.length === 0 ? (
              <div className="empty">
                <h3>Nothing needs attention</h3>
                <p>This is the panel you want to be empty.</p>
              </div>
            ) : (
              <ul className="attn-list">
                {attention.items.map((item) => (
                  <li className="attn-row" key={item.key}>
                    {/* The kind becomes a link only where its source was
                        truncated — a "see all" that leads to the same rows
                        already on screen is worse than no link at all. */}
                    {item.kindTo ? (
                      <Link
                        className="attn-kind"
                        to={item.kindTo}
                        title={`See everything under ${item.kind.toLowerCase()}`}
                      >
                        {item.kind}
                      </Link>
                    ) : (
                      <span className="attn-kind">{item.kind}</span>
                    )}
                    <span className="attn-body">
                      <Link to={item.to}>{item.title}</Link>
                      <span className="attn-meta" title={item.meta}>
                        {item.meta}
                      </span>
                    </span>
                    <Chip tone={item.tone} dot={item.tone === 'danger'}>
                      {item.note}
                    </Chip>
                  </li>
                ))}
              </ul>
            )}

            {/*
              Kept from the old Email section. A queue draining every minute is
              not news, but one that never drains looks exactly like a working
              one until somebody asks why a customer heard nothing.
            */}
            {data.outboxPending > 20 && (
              <div className="card-note">
                A lot of mail is sitting queued. If it never drains, the usual cause is the Vault
                secrets <code>project_url</code> and <code>service_role_key</code> being unset — the
                cron job logs that it is skipping and returns, so a valid Resend key still sends
                nothing.
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  )
}
```

Note what is gone: the `Tile` component at the foot of the old file (nothing called it), the
`segments` array, the `queueLinkFor` helper (now `buildPartition`), and the imports of
`PriorityChip`, `SlaChip`, `TICKET_STATUSES` and `TICKET_STATUS_LABEL`.

- [ ] **Step 2: Typecheck**

```bash
cd admin && npm run typecheck
```

Expected: no output, exit 0.

If it reports `Property 'data' is missing` on the `buildAttention` call, `useAsync` returns
`data: T | null` and `AttentionSource` accepts `| null` — check you did not drop the `| null` from
the `sources` fields in Task 2.

- [ ] **Step 3: Run the suite**

```bash
cd admin && npm test
```

Expected: PASS — 38 passed.

- [ ] **Step 4: Commit** *(only if the user has authorised commits)*

```bash
git add admin/src/screens/Dashboard.tsx && git commit -m "Rebuild the dashboard as one partition and one list"
```

---

### Task 6: Verification

Everything the spec lists, in order. Do not skip the browser checks — the two defects this design
replaced were both invisible to the typechecker.

**Files:** none modified unless a check fails.

- [ ] **Step 1: Typecheck and test**

```bash
cd admin && npm run typecheck && npm test
```

Expected: typecheck silent; 38 tests passed. None of the 15 pre-existing tests touches the
dashboard, so a failure among those means something unrelated broke.

- [ ] **Step 2: Build the console**

```bash
cd admin && npm run build
```

Expected: `✓ built in …`, no TypeScript errors.

- [ ] **Step 3: Confirm the demo fixtures are still tree-shaken**

The fixtures grew in Task 3, so re-confirm they do not reach production:

```bash
cd admin && grep -rc "Kabir Menon" dist/assets/*.js | grep -v ':0' || echo "PASS — no fixture names in the bundle"
```

Expected: `PASS — no fixture names in the bundle`.

- [ ] **Step 4: Build the marketing site, at the repo root**

```bash
npm run build
```

Expected: 50 pages prerendered, 49 sitemap URLs. The console must not change either number.

- [ ] **Step 5: Load the dashboard**

Open `http://localhost:5174/` (sign in with the demo credentials if prompted). Confirm by eye:
six bars, the left column; the attention panel, the right column; no "Tickets by status" heading
anywhere — it now reads "Open tickets by status".

- [ ] **Step 6: The disjointness check**

In the browser console:

```js
[...document.querySelectorAll('.bar-count')].reduce((n, el) => n + Number(el.textContent.replace(/,/g, '')), 0)
```

Expected: `12` — and it must equal `open` in the dashboard payload. If the two differ, a bucket is
missing or double-counted, which is the failure the whole design exists to prevent.

- [ ] **Step 7: No label appears twice**

```js
(() => {
  const labels = [...document.querySelectorAll('.bar-top')].map(el => el.firstChild.textContent.trim())
  const dupes = labels.filter((l, i) => labels.indexOf(l) !== i)
  return dupes.length ? `DUPLICATE: ${dupes}` : 'PASS — every label unique'
})()
```

Expected: `PASS — every label unique`.

- [ ] **Step 8: Every bucket links correctly**

Click **Waiting on broker**. Expected: the queue at `/tickets?view=all&status=WAITING_ON_BROKER`,
showing only waiting-on-broker tickets, with the **All** tab active. Go back and repeat for
**Unopened**.

- [ ] **Step 9: Zero buckets render greyed rather than vanishing**

In the browser console, confirm all six rows are present whatever the counts:

```js
document.querySelectorAll('.bar-row').length
```

Expected: `6`. Then temporarily set `NEW` to absent — in `admin/src/lib/demo.ts` change the second
`Array.from` length from `2` to `0` and remove the `t-2` fixture's `statusInternal: 'NEW'` line to
`statusInternal: 'TRIAGED'`, save, and confirm the Unopened row is still drawn, greyed, showing 0.
**Revert both edits afterwards** — `git checkout admin/src/lib/demo.ts` if commits were made, or
undo by hand if not.

- [ ] **Step 10: Empty state**

Temporarily make every source empty: in `demo.ts`, change the `staff_ticket_queue` case's
`payload.slaOnly` filter to `rows = []`, the `staff_enquiry_queue` case's `payload.overdueOnly`
filter to `rows = []`, and the `staff_outbox` case's filter to `const rows = []`. Reload.

Expected: the panel reads **"Nothing needs attention / This is the panel you want to be empty."**,
the header shows no count, and the greeting sentence reads the all-clear. **Revert all three
edits.**

- [ ] **Step 11: The cap, its header, and the link-through**

With the fixtures restored the demo has four attention items — two breached tickets, one enquiry
past target, one failed email — and none of the three sources is truncated. So expect the header to
read **`4 items`**, not `4 of 4`, and expect every `Ticket` / `Enquiry` / `Email` prefix to be plain
grey text rather than a link.

To exercise the cap, temporarily change `ATTENTION_CAP` in `admin/src/lib/attention.ts` from `5` to
`1` and reload. Expected: three rows, one per source; the header reads **`3 of 4`**; and the
`Ticket` prefix is now an accent-coloured link to `/tickets?view=sla`, while `Enquiry` and `Email`
stay plain — only the truncated source links through. **Revert `ATTENTION_CAP` to `5`.**

- [ ] **Step 12: Keyboard**

Tab from the page heading. Expected: each of the six bars takes focus in order with a visible gold
focus ring, `Enter` follows the link, and every attention row's title link is reachable after them.

- [ ] **Step 13: Dark-on-light contrast of the waiting bars**

The waiting fill is `#e7c99a` on `--gray-100`. Confirm by eye at 100% zoom that a bar at a small
share is still visible against the track — it is decoration, not information, but an invisible bar
looks like a rendering bug.

- [ ] **Step 14: Commit** *(only if the user has authorised commits)*

```bash
git add -A admin docs/superpowers && git commit -m "Verify the rebuilt dashboard"
```

---

## What this plan does not do

- **No SQL.** `staff_dashboard()` still returns all eleven removed fields; the screen stops reading
  them. Migration `0031` is unchanged and still unrun.
- **No change to `summary.ts`.** The greeting sentence deliberately restates what the list names,
  because when nothing is wrong the list is empty and the sentence is the only positive
  confirmation.
- **The bars stay uninformative until the queue grows.** Accepted knowingly, and recorded in the
  spec. If the console is still handling six tickets a day in three months, swap the bar markup for
  the plain `/help` list — delete the `.bar-track` span from `Dashboard.tsx` and the `share` field
  from `partition.ts`, and nothing else changes.
