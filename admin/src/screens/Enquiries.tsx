import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHead } from '../components/AppShell'
import { Chip, ENQUIRY_STATUSES, ENQUIRY_STATUS_LABEL, EnquiryChip } from '../components/Chip'
import { DataTable, EmptyState, Pagination, type Column } from '../components/DataTable'
import { Time } from '../components/RelativeTime'
import { enquiryQueue } from '../lib/rpc'
import { useAsync } from '../lib/useAsync'
import type { EnquiryQueueFilters, EnquiryRow, EnquiryStatus } from '../lib/types'

/**
 * Sales enquiries from the contact form.
 *
 * Deliberately a separate desk from tickets, and the separation is not
 * cosmetic: an enquiry carries no published response time, so nothing on this
 * screen uses the word SLA, shows a breach chip, or borrows the support
 * queue's red. The follow-up target is an internal working figure and is
 * labelled as one everywhere it appears.
 *
 * Sorted oldest-first, because a sales queue is worked in the order it arrived
 * rather than by whichever deadline is nearest.
 */

const PAGE_SIZE = 25

const OPEN: EnquiryStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED']

export default function Enquiries() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const view = params.get('view') ?? 'all'
  const status = params.get('status') ?? ''
  const q = params.get('q') ?? ''
  const offset = Number(params.get('offset') ?? 0)

  const filters = useMemo<EnquiryQueueFilters>(() => {
    const base: EnquiryQueueFilters = { limit: PAGE_SIZE, offset, sort: 'oldest', q: q || undefined }

    if (status) base.status = [status as EnquiryStatus]
    else if (view === 'unopened') base.status = ['NEW']
    else if (view === 'opened') base.status = ['CONTACTED', 'QUALIFIED']
    else if (view === 'closed') base.status = ['CONVERTED', 'CLOSED', 'SPAM']
    else base.status = OPEN

    if (view === 'overdue') base.overdueOnly = true

    return base
  }, [view, status, q, offset])

  const { data, error, loading, initial, reload } = useAsync(
    () => enquiryQueue(filters),
    [JSON.stringify(filters)],
  )

  const set = (next: Record<string, string | null>) => {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value == null || value === '') merged.delete(key)
      else merged.set(key, value)
    }
    if (!('offset' in next)) merged.delete('offset')
    setParams(merged, { replace: true })
  }

  const columns: Column<EnquiryRow>[] = [
    {
      key: 'ref',
      header: 'Reference',
      className: 'cell-ref',
      cell: (row) => (
        <a
          href={`/enquiries/${row.id}`}
          onClick={(event) => {
            event.preventDefault()
            navigate(`/enquiries/${row.id}`)
          }}
        >
          {row.enquiryRef}
        </a>
      ),
    },
    {
      key: 'who',
      header: 'Enquirer',
      cell: (row) => (
        <div className="cell-subject">
          {row.fullName}
          <span className="cell-sub">
            {row.email} · {row.phone}
          </span>
        </div>
      ),
    },
    {
      key: 'interest',
      header: 'Interested in',
      cell: (row) => row.interestLabel ?? <span className="muted">—</span>,
    },
    { key: 'status', header: 'Status', cell: (row) => <EnquiryChip status={row.status} /> },
    {
      key: 'followup',
      header: 'Follow up by',
      cell: (row) =>
        row.followUpTargetAt ? (
          // Amber, never red. This target is internal and unpublished; giving it
          // the same colour as a breached SLA is how it starts being treated as
          // one, and then quoted to an enquirer.
          row.followUpOverdue ? (
            <Chip tone="warn" title="Internal working target — not a published SLA">
              Overdue
            </Chip>
          ) : (
            <Time iso={row.followUpTargetAt} relativeFirst />
          )
        ) : (
          <span className="muted">—</span>
        ),
    },
    { key: 'notes', header: 'Notes', cell: (row) => <span className="cell-num">{row.noteCount}</span> },
    { key: 'created', header: 'Received', cell: (row) => <Time iso={row.createdAt} relativeFirst /> },
  ]

  return (
    <>
      <PageHead
        title="Enquiries"
        lede="Sales enquiries from the contact form. No published response time — the follow-up target below is internal."
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
          {[
            { id: 'unopened', label: 'Unopened' },
            { id: 'opened', label: 'Opened' },
            { id: 'overdue', label: 'Past target' },
            { id: 'all', label: 'All open' },
            { id: 'closed', label: 'Finished' },
          ].map((item) => (
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
          <label htmlFor="e-q">Search</label>
          <input
            id="e-q"
            type="search"
            defaultValue={q}
            placeholder="Reference, name, email, phone, message"
            onKeyDown={(event) => {
              if (event.key === 'Enter') set({ q: (event.target as HTMLInputElement).value })
            }}
          />

          <label htmlFor="e-status">Status</label>
          <select id="e-status" value={status} onChange={(event) => set({ status: event.target.value })}>
            <option value="">This view's default</option>
            {ENQUIRY_STATUSES.map((item) => (
              <option key={item} value={item}>
                {ENQUIRY_STATUS_LABEL(item)}
              </option>
            ))}
          </select>
        </div>

        <DataTable
          caption="Sales enquiries"
          columns={columns}
          rows={data?.rows ?? []}
          keyOf={(row) => row.id}
          onOpen={(row) => navigate(`/enquiries/${row.id}`)}
          loading={initial && loading}
          empty={
            <EmptyState title="No enquiries in this view">
              {view === 'overdue'
                ? 'Everything has been picked up inside its follow-up window.'
                : 'Nothing matches these filters.'}
            </EmptyState>
          }
        />

        {data && (
          <Pagination
            total={data.total}
            limit={data.limit}
            offset={data.offset}
            onOffset={(next) => set({ offset: String(next) })}
            noun="enquiries"
          />
        )}
      </section>
    </>
  )
}
