# Support Console — Dashboard Fields

**Date:** 2026-09-01
**Status:** Approved for implementation
**Applies to:** `admin/src/screens/Dashboard.tsx` and `admin/src/styles/console.css`
**Supersedes:** the dashboard sections of `2026-08-21-console-visual-design.md`

---

## Context

The dashboard grew to sixteen numbers across four headed sections, and six of them counted rows
another field had already counted. That is not a matter of taste — it is arithmetic:

| Field | Predicate | Overlap |
|---|---|---|
| `open` | `status_internal NOT IN ('CLOSED','SPAM')` | The sum of six status buckets, renamed |
| `awaitingFirstResponse` | `first_response_at IS NULL` | Strict **superset** of `firstResponseBreached` |
| `firstResponseBreached` | `first_response_at IS NULL AND now() > due` | Inside the above, *and* inside its status bucket |
| `resolutionBreached` | `resolved_at IS NULL AND now() > due` | Cuts across every status bucket |
| `openEnquiries` | `status IN ('NEW','CONTACTED','QUALIFIED')` | **Contains** `newEnquiries` |
| `newEnquiries` | `status = 'NEW'` | Inside the above |

A ticket that is `WAITING_ON_BROKER` and past its resolution clock appeared in three of those
numbers at once.

**The requirement that follows:** no field may display rows another field already displays. Fields
must be few, and each must mean exactly one thing.

## The governing idea

Only three things in this data model are **partitions** — sets where every row falls in exactly one
bucket: ticket status, enquiry status, notification status. Everything else is a cross-cutting
measure. Mixing a partition with cross-cutting measures is precisely what produces the same rows
under a different name.

So the dashboard carries **one partition and one list**:

- **Counts are a partition.** Nothing can be double-counted, because each ticket is in exactly one
  bucket by definition of `status_internal`.
- **Urgency is a list of items.** An item is on it or it is not; there is no arithmetic to get
  wrong. Everything that used to be an overlapping count became a row that names the actual thing.

There is no arithmetic *between* the two either — one counts, the other names.

## The counts

**"Open tickets by status" — six buckets.**

| # | Bucket | Counts |
|---|---|---|
| 1 | Unopened | `status_internal = 'NEW'` |
| 2 | Opened | `'TRIAGED'` |
| 3 | In progress | `'IN_PROGRESS'` |
| 4 | Waiting on customer | `'WAITING_ON_CUSTOMER'` |
| 5 | Waiting on broker | `'WAITING_ON_BROKER'` |
| 6 | Resolved | `'RESOLVED'` |

Three rules, each deliberate:

- **`CLOSED` and `SPAM` are excluded, and the heading says "open"** rather than claiming to be all
  tickets. Closed grows without bound and is archive, not work.
- **No total.** A total is the sum of the six rows directly above it — the exact failure that made
  `Open tickets = 6` unacceptable.
- **Zero-count buckets still render, greyed.** Hiding them made the layout jump as counts crossed
  zero, and a partition with holes in it stops reading as a partition.

**Implementation trap.** `byStatus` is built by `jsonb_object_agg` over a `GROUP BY
status_internal`, so **a status with no tickets is absent from the object entirely** — it is not
present with a zero. Iterating `Object.keys(byStatus)` therefore yields four buckets on a quiet day,
not six, and the partition silently loses rows. Iterate the fixed list of six statuses and read
`byStatus[s] ?? 0`.

Each bucket links to the queue filtered to that status: `/tickets?view=…&status=…`. Both parameters
are needed — `status` filters, `view` only decides which tab reads as active on arrival.

### Treatment: proportional bars

Each bucket shows its label, its count, and a bar sized to its share of the six. Because this is a
partition the bars are honestly comparable — they sum to the whole.

**Recorded caveat, accepted knowingly.** At six open tickets every bar is the same length and the
chart says nothing the number does not. It earns its place at thirty or forty, where "most of the
backlog is waiting on the broker" becomes visible at a glance. This was flagged before the choice
was made and chosen anyway; it is a bet on the queue growing, not an oversight.

Bar colour carries no state meaning: `--gold-gradient` on Unopened only, a muted tone on the two
waiting buckets, `--gray-300` elsewhere. **Red, amber and green are unavailable** — they already
mean breached, caution and met throughout the console, and a status bar is not a state.

## The list

**"Needs attention" — items, from three sources.** All three RPCs already exist; no new SQL.

| Source | Call | Row says |
|---|---|---|
| Breached tickets | `ticketQueue({ slaOnly: true, sort: 'due' })` | Subject, reference, requester, and *how late* |
| Enquiries past target | `enquiryQueue({ overdueOnly: true })` | Name, reference, that nobody has called back |
| Failed email | `outbox({ status: ['FAILED'] })` | What it was, to whom, and the provider's error |

Each row is prefixed with its kind — Ticket / Enquiry / Email — so three different things can share
one list without ambiguity.

**Each source is capped at five**, and the panel header states the true total when it exceeds what
is shown ("4 of 11"). An uncapped list turns the landing screen into an unbounded page on the worst
day of the year, which is the day it most needs to be readable. Where a source is truncated, its
kind links through to the screen that holds the rest.

The enquiry rows say **"past target"**, never "overdue" and never "breached". Migration `0027` is
explicit that `internal_follow_up_target_at` is an internal working figure with no published
response time, and must never be quoted as one.

## What is removed, and where it went

Eleven fields go. Four of them did not disappear — they changed form.

| Removed | Fate |
|---|---|
| Open tickets | Deleted. It is the sum of the six buckets |
| Awaiting first reply | Deleted. It contained the first-reply breach count |
| First reply breached | **Became a row** naming the ticket and how late it is |
| Resolution breached | **Became a row** |
| Enquiries unopened | Deleted. Sidebar badges the Enquiries section |
| Enquiries open | Deleted. Contained "unopened" |
| Enquiries past target | **Became a row** |
| Email queued | Deleted. Sidebar badges the Outbox; the stuck-queue banner covers the failure case |
| Email failed | **Became a row** carrying the provider error |
| Closed | Deleted from the partition — archive, not work |
| Spam | Deleted from the partition |

`staff_dashboard()` still returns every one of these. The screen stops reading them; the RPC is
unchanged.

## One overlap kept on purpose

The greeting sentence — *"Two tickets are past a deadline and one email has failed to send"* — does
restate what the list below names. It stays, because when nothing is wrong the list is empty and
the sentence is the only positive confirmation: *"Nothing is past its deadline and the outbox is
clear."* Prose read once on arrival is not the same failure as two numbers counting one row.

## Files

```
admin/src/screens/Dashboard.tsx   the segments array replaced by one partition + one item list
admin/src/styles/console.css      .status-strip and .status-seg removed; bar rules added
```

`admin/src/lib/summary.ts` is untouched. No file under `supabase/` is touched.

## Verification

1. **`npm run typecheck` and `npm test`** in `admin/` — 15 tests must still pass; none of them
   touches the dashboard, so a failure means something unrelated broke.
2. **`npm run build` at the repo root** — must still report 50 pages, 49 sitemap URLs.
3. **The disjointness check, in the browser.** Sum the six bucket counts; it must equal
   `staff_dashboard().open`. If it does not, a bucket is missing or double-counted.
4. **No label appears twice** on the screen. Assert programmatically, as before.
5. **Every bucket links correctly** — clicking "Waiting on broker" must land on the queue showing
   only `WAITING_ON_BROKER`, with the correct tab active.
6. **Empty state** — with nothing urgent, the list shows "Nothing needs attention" and the greeting
   sentence reads the all-clear. Verify by filtering the demo fixtures.
7. **Zero buckets** — a status with no tickets renders greyed rather than vanishing.
8. **Keyboard** — every bucket and every list row reachable and activatable, focus ring visible.

## Risks

- **The bars stay uninformative until the queue grows.** Accepted above. If the console is still
  handling six tickets a day in three months, the bars should come out and treatment A — the plain
  `/help` list — should go back in. That is a two-line change.
- **Three RPC calls where there was one.** The dashboard already made two; the third is the
  enquiry queue. All are `stable` and read-only, and the screen polls once a minute.
- **A quiet day hides the design flaw.** With one ticket in each bucket the partition looks
  balanced and the bars look deliberate. The arrangement should be judged against a lopsided
  queue — twenty waiting on the broker, none unopened — which the demo fixtures do not currently
  produce. Worth adjusting them before signing off on the look.
