import type { ReactNode } from 'react'

/**
 * The queue table.
 *
 * Rows are clickable and focusable. A `<tr>` cannot be a `<button>` without
 * breaking table semantics, so the row carries `tabIndex` and a keydown
 * handler instead, and every row also contains a real link in its first cell —
 * that link is what a screen reader announces and what middle-click opens. The
 * row handler is a convenience on top, not the only way in.
 */

export interface Column<T> {
  key: string
  header: string
  /** Rendered into the cell. */
  cell: (row: T) => ReactNode
  /** Applied to both the header and the cells. */
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  keyOf,
  onOpen,
  loading,
  empty,
  caption,
}: {
  columns: Column<T>[]
  rows: T[]
  keyOf: (row: T) => string
  onOpen?: (row: T) => void
  loading?: boolean
  empty?: ReactNode
  caption: string
}) {
  if (loading) {
    return (
      <div className="card-body stack" aria-busy="true" aria-live="polite">
        <span className="visually-hidden">Loading…</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ width: `${92 - i * 7}%` }} aria-hidden="true" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) return <>{empty ?? <EmptyState title="Nothing here" />}</>

  return (
    <div className="table-wrap">
      <table className="data">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.className}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={keyOf(row)}
              tabIndex={onOpen ? 0 : undefined}
              onClick={onOpen ? () => onOpen(row) : undefined}
              onKeyDown={
                onOpen
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        // Space scrolls the page by default, which on a long
                        // queue jumps the agent away from the row they just
                        // chose.
                        event.preventDefault()
                        onOpen(row)
                      }
                    }
                  : undefined
              }
            >
              {columns.map((column) => (
                <td key={column.key} className={column.className}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EmptyState({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  )
}

export function Pagination({
  total,
  limit,
  offset,
  onOffset,
  noun = 'results',
}: {
  total: number
  limit: number
  offset: number
  onOffset: (next: number) => void
  noun?: string
}) {
  if (total === 0) return null

  const from = offset + 1
  const to = Math.min(offset + limit, total)
  const canPrev = offset > 0
  const canNext = to < total

  return (
    <div className="pagination">
      <span>
        {from}–{to} of {total.toLocaleString()} {noun}
      </span>
      <span className="spacer" />
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => onOffset(Math.max(0, offset - limit))}
        disabled={!canPrev}
      >
        Previous
      </button>
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => onOffset(offset + limit)}
        disabled={!canNext}
      >
        Next
      </button>
    </div>
  )
}
