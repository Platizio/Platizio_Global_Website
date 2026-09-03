/**
 * Time formatting.
 *
 * Everything the database returns is an ISO timestamp in UTC. Everything shown
 * here is rendered in Asia/Kolkata, because that is where the desk is and
 * because every SLA in the system is computed against that timezone's business
 * hours — showing an agent in another locale their own midnight would make the
 * due dates read as wrong when they are not.
 */

const TZ = 'Asia/Kolkata'

const DATE_TIME = new Intl.DateTimeFormat('en-IN', {
  timeZone: TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const DATE_ONLY = new Intl.DateTimeFormat('en-IN', {
  timeZone: TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return `${DATE_TIME.format(date)} IST`
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return DATE_ONLY.format(date)
}

/**
 * "3h ago" / "in 2d".
 *
 * Deliberately coarse. A queue is scanned, not read, and "1 day 4 hours 12
 * minutes" costs more to parse than it conveys. The exact stamp is always one
 * hover away via the title attribute.
 */
export function relative(iso?: string | null): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'

  const deltaSeconds = Math.round((then - Date.now()) / 1000)
  const ahead = deltaSeconds > 0
  const seconds = Math.abs(deltaSeconds)

  const value =
    seconds < 60
      ? 'just now'
      : seconds < 3600
        ? `${Math.floor(seconds / 60)}m`
        : seconds < 86400
          ? `${Math.floor(seconds / 3600)}h`
          : seconds < 86400 * 30
            ? `${Math.floor(seconds / 86400)}d`
            : `${Math.floor(seconds / (86400 * 30))}mo`

  if (value === 'just now') return value
  return ahead ? `in ${value}` : `${value} ago`
}

/** An absolute stamp with the relative one as its accessible label. */
export function Time({ iso, relativeFirst = false }: { iso?: string | null; relativeFirst?: boolean }) {
  if (!iso) return <span className="muted">—</span>
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className="nowrap">
      {relativeFirst ? relative(iso) : formatDateTime(iso)}
    </time>
  )
}

export function formatBytes(bytes?: number | null): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
