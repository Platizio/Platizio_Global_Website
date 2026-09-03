import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHead } from '../components/AppShell'
import { Chip, PriorityChip, SlaChip, StatusChip, TICKET_STATUSES, TICKET_STATUS_LABEL } from '../components/Chip'
import { DataTable, EmptyState, Pagination, type Column } from '../components/DataTable'
import { Time } from '../components/RelativeTime'
import { ticketQueue } from '../lib/rpc'
import { TICKET_CATEGORIES, categoryLabel } from '../lib/taxonomy'
import { useAsync } from '../lib/useAsync'
import type { TicketQueueFilters, TicketRow, TicketStatusInternal } from '../lib/types'

/**
 * The queue.
 *
 * Filter state lives in the URL rather than in component state, so a filtered
 * view is a link: the dashboard tiles point straight at one, the top-bar search
 * lands here, and an agent can send a colleague "the breaching ones" without
 * describing which dropdowns to set.
 *
 * The named views are the five ways this queue actually gets used. Everything
 * else is reachable through the filter row.
 */

const PAGE_SIZE = 25

/*
 * The console has one operator, so there is nothing to assign and nobody to
 * assign it to. What replaces "mine / unassigned" is the only distinction that
 * still carries information: has this been looked at yet.
 */
type View = 'unopened' | 'open' | 'sla' | 'all' | 'closed'

const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'unopened', label: 'Unopened' },
  { id: 'open', label: 'Opened' },
  { id: 'sla', label: 'Breaching' },
  { id: 'all', label: 'All open' },
  { id: 'closed', label: 'Closed' },
]

/** The open set, matching what staff_ticket_queue defaults to. */
const OPEN: TicketStatusInternal[] = [
  'NEW',
  'TRIAGED',
  'IN_PROGRESS',
  'WAITING_ON_CUSTOMER',
  'WAITING_ON_BROKER',
  'RESOLVED',
]

/** Everything open that someone has already picked up. */
const OPENED: TicketStatusInternal[] = OPEN.filter((s) => s !== 'NEW')

export default function TicketQueue() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const view = (params.get('view') as View) || 'all'
  const q = params.get('q') ?? ''
  const categoryId = params.get('category') ?? ''
  const priority = params.get('priority') ?? ''
  const status = params.get('status') ?? ''
  const sort = (params.get('sort') as TicketQueueFilters['sort']) || 'due'
  const offset = Number(params.get('offset') ?? 0)

  const filters = useMemo<TicketQueueFilters>(() => {
    const base: TicketQueueFilters = { limit: PAGE_SIZE, offset, sort, q: q || undefined }

    if (categoryId) base.categoryId = categoryId
    if (priority) base.priority = [priority as TicketRow['priority']]

    // An explicit status filter always wins over the view's implied one — the
    // dropdown is the more specific instruction.
    if (status) {
      base.status = [status as TicketStatusInternal]
    } else if (view === 'closed') {
      base.status = ['CLOSED', 'SPAM']
    } else if (view === 'unopened') {
      base.status = ['NEW']
    } else if (view === 'open') {
      base.status = OPENED
    } else {
      base.status = OPEN
    }

    if (view === 'sla') base.slaOnly = true

    return base
  }, [view, q, categoryId, priority, status, sort, offset])

  const { data, error, loading, initial, reload } = useAsync(
    () => ticketQueue(filters),
    [JSON.stringify(filters)],
  )

  const rows = data?.rows ?? []

  const set = (next: Record<string, string | null>) => {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value == null || value === '') merged.delete(key)
      else merged.set(key, value)
    }
    // Any change to the filters invalidates the page number.
    if (!('offset' in next)) merged.delete('offset')
    setParams(merged, { replace: true })
  }

  const columns: Column<TicketRow>[] = [
    {
      key: 'ref',
      header: 'Reference',
      className: 'cell-ref',
      cell: (row) => (
        // A real link, so the row is reachable by keyboard and openable in a
        // new tab. The row click handler is a convenience on top of it.
        <a
          href={`/tickets/${row.id}`}
          onClick={(event) => {
            event.preventDefault()
            navigate(`/tickets/${row.id}`)
          }}
        >
          {row.ticketRef}
        </a>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      cell: (row) => (
        <div className="cell-subject">
          {row.subject}
          <span className="cell-sub">
            {row.requesterName} · {categoryLabel(row.categoryId)}
          </span>
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', cell: (row) => <PriorityChip priority={row.priority} /> },
    { key: 'status', header: 'Status', cell: (row) => <StatusChip status={row.statusInternal} /> },
    {
      key: 'first',
      header: 'First reply',
      cell: (row) => (
        <SlaChip state={row.firstResponseState} dueAt={row.firstResponseDueAt} label="Due" />
      ),
    },
    {
      key: 'resolution',
      header: 'Resolution',
      cell: (row) => (
        <SlaChip state={row.resolutionState} dueAt={row.resolutionDueAt} label="Due" />
      ),
    },
    {
      key: 'flags',
      header: '',
      cell: (row) => (
        <span className="chip-row">
          {row.legalHold && <Chip tone="warn">Legal hold</Chip>}
          {row.attachmentCount > 0 && <Chip tone="muted">{row.attachmentCount} file</Chip>}
        </span>
      ),
    },
    {
      key: 'age',
      header: 'Raised',
      cell: (row) => <Time iso={row.createdAt} relativeFirst />,
    },
  ]

  return (
    <>
      <PageHead
        title="Tickets"
        lede={q ? `Search results for “${q}”` : undefined}
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

      <section className="card">
        <div className="tabs" role="tablist" aria-label="Saved views">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={view === item.id}
              className={`tab${view === item.id ? ' is-active' : ''}`}
              onClick={() => set({ view: item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="filters">
          <label htmlFor="f-q">Search</label>
          <input
            id="f-q"
            type="search"
            defaultValue={q}
            placeholder="Reference, subject, name, email"
            onKeyDown={(event) => {
              if (event.key === 'Enter') set({ q: (event.target as HTMLInputElement).value })
            }}
          />

          <label htmlFor="f-cat">Category</label>
          <select id="f-cat" value={categoryId} onChange={(event) => set({ category: event.target.value })}>
            <option value="">Any</option>
            {TICKET_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>

          <label htmlFor="f-pri">Priority</label>
          <select id="f-pri" value={priority} onChange={(event) => set({ priority: event.target.value })}>
            <option value="">Any</option>
            <option value="URGENT">Urgent</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>

          <label htmlFor="f-status">Status</label>
          <select id="f-status" value={status} onChange={(event) => set({ status: event.target.value })}>
            <option value="">{view === 'closed' ? 'Closed and spam' : 'All open'}</option>
            {TICKET_STATUSES.map((item) => (
              <option key={item} value={item}>
                {TICKET_STATUS_LABEL(item)}
              </option>
            ))}
          </select>

          <span className="spacer" />

          <label htmlFor="f-sort">Sort</label>
          <select id="f-sort" value={sort} onChange={(event) => set({ sort: event.target.value })}>
            <option value="due">Most urgent first</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        <DataTable
          caption="Support tickets"
          columns={columns}
          rows={rows}
          keyOf={(row) => row.id}
          onOpen={(row) => navigate(`/tickets/${row.id}`)}
          loading={initial && loading}
          empty={
            <EmptyState title="Nothing in this view">
              {view === 'unopened'
                ? 'Everything that has come in has been looked at. Inbox zero.'
                : view === 'sla'
                  ? 'No ticket has passed its due time. This is the view you want to be empty.'
                  : q
                    ? 'No ticket matches that search.'
                    : 'No tickets match these filters.'}
            </EmptyState>
          }
        />

        {data && (
          <Pagination
            total={data.total}
            limit={data.limit}
            offset={data.offset}
            onOffset={(next) => set({ offset: String(next) })}
            noun="tickets"
          />
        )}
      </section>
    </>
  )
}
