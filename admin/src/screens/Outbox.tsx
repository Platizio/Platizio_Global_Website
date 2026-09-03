import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { PageHead } from '../components/AppShell'
import { NotificationChip } from '../components/Chip'
import { DataTable, EmptyState, Pagination, type Column } from '../components/DataTable'
import { Time } from '../components/RelativeTime'
import { useToast } from '../components/Toast'
import * as api from '../lib/rpc'
import { useAsync } from '../lib/useAsync'
import type { NotificationStatus, OutboxRow } from '../lib/types'

/**
 * The email outbox.
 *
 * Every workflow in the system queues mail into `notifications` inside its own
 * transaction and nothing sends inline; a cron job drains it a minute later.
 * That is a good design with one blind spot — when the drain stops working,
 * everything upstream still reports success. This screen is where that becomes
 * visible.
 *
 * The specific failure worth naming: `drain-outbox` reads `project_url` and
 * `service_role_key` from Vault to authenticate its own call. With either
 * unset it logs that it is skipping and returns. The symptom is a growing pile
 * of PENDING with no errors on any of them — which looks like Resend being
 * down and is not.
 */

const PAGE_SIZE = 25

export default function Outbox() {
  const [params, setParams] = useSearchParams()
  const toast = useToast()
  const { can } = useAuth()

  const status = params.get('status') ?? ''
  const offset = Number(params.get('offset') ?? 0)

  const filters = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset,
      status: status
        ? [status as NotificationStatus]
        : (['PENDING', 'SENDING', 'FAILED'] as NotificationStatus[]),
    }),
    [status, offset],
  )

  const { data, error, loading, initial, reload } = useAsync(
    () => api.outbox(filters),
    [JSON.stringify(filters)],
    { pollMs: 30_000 },
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

  const retry = async (row: OutboxRow) => {
    try {
      await api.retryNotification(row.id)
      toast.ok('Queued for another attempt.')
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not re-queue that email.')
    }
  }

  const stuck = useMemo(() => {
    const rows = data?.rows ?? []
    // Queued a while ago, never attempted, no error recorded. That combination
    // is the drain not running rather than the provider refusing.
    const old = Date.now() - 15 * 60 * 1000
    return rows.filter(
      (row) => row.status === 'PENDING' && row.attempts === 0 && new Date(row.createdAt).getTime() < old,
    ).length
  }, [data])

  const columns: Column<OutboxRow>[] = [
    { key: 'status', header: 'Status', cell: (row) => <NotificationChip status={row.status} /> },
    {
      key: 'template',
      header: 'Email',
      cell: (row) => (
        <div className="cell-subject">
          {row.subject}
          <span className="cell-sub">
            {row.template.replace(/_/g, ' ')} → {row.toEmail}
          </span>
        </div>
      ),
    },
    {
      key: 'about',
      header: 'About',
      className: 'cell-ref',
      cell: (row) =>
        row.ticketId ? (
          <Link to={`/tickets/${row.ticketId}`}>{row.ticketRef}</Link>
        ) : row.enquiryId ? (
          <Link to={`/enquiries/${row.enquiryId}`}>{row.enquiryRef}</Link>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      key: 'attempts',
      header: 'Tries',
      cell: (row) => (
        <span className="cell-num">
          {row.attempts}/{row.maxAttempts}
        </span>
      ),
    },
    {
      key: 'when',
      header: 'Queued',
      cell: (row) => <Time iso={row.createdAt} relativeFirst />,
    },
    {
      key: 'error',
      header: 'Last error',
      cell: (row) =>
        row.lastError ? (
          <span className="small" style={{ color: 'var(--danger)' }}>
            {row.lastError}
          </span>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      key: 'action',
      header: '',
      cell: (row) =>
        row.status === 'FAILED' && can('administerStaff') ? (
          <button type="button" className="btn btn-sm" onClick={() => void retry(row)}>
            Retry
          </button>
        ) : null,
    },
  ]

  return (
    <>
      <PageHead
        title="Outbox"
        lede="Every email the system has queued. Nothing is sent inline — a cron job drains this once a minute."
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

      {stuck > 0 && (
        <div className="banner banner-warn" role="status">
          <span>
            {stuck} {stuck === 1 ? 'email has' : 'emails have'} been queued for over fifteen
            minutes without a single attempt. That is the drain not running, not the mail provider
            refusing — check that the Vault secrets <code>project_url</code> and{' '}
            <code>service_role_key</code> are set, and that <code>RESEND_API_KEY</code> and{' '}
            <code>MAIL_FROM</code> exist as function secrets.
          </span>
        </div>
      )}

      <section className="card">
        <div className="filters">
          <label htmlFor="o-status">Status</label>
          <select id="o-status" value={status} onChange={(event) => set({ status: event.target.value })}>
            <option value="">Not yet delivered</option>
            <option value="PENDING">Queued</option>
            <option value="SENDING">Sending</option>
            <option value="FAILED">Failed</option>
            <option value="SENT">Sent</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <span className="spacer" />
          {!can('administerStaff') && (
            <span className="small muted">Only an administrator can re-queue a failed email.</span>
          )}
        </div>

        <DataTable
          caption="Email outbox"
          columns={columns}
          rows={data?.rows ?? []}
          keyOf={(row) => row.id}
          loading={initial && loading}
          empty={
            <EmptyState title="Nothing waiting">
              {status === 'FAILED'
                ? 'No email has failed. Good.'
                : 'Everything queued has been delivered.'}
            </EmptyState>
          }
        />

        <div className="card-note">
          A retry resets the attempt counter as well as the status — without that, the next single
          failure would mark it failed again permanently.
        </div>

        {data && (
          <Pagination
            total={data.total}
            limit={data.limit}
            offset={data.offset}
            onOffset={(next) => set({ offset: String(next) })}
            noun="emails"
          />
        )}
      </section>
    </>
  )
}
