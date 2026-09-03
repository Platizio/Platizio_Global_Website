import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { DEMO } from '../lib/demo'
import { useRailCollapsed } from '../lib/rail'
import { dashboard } from '../lib/rpc'
import { useAsync } from '../lib/useAsync'

/**
 * Nav icons.
 *
 * Inline SVG rather than an icon package: seven glyphs do not justify a
 * dependency, and this console ships from a repo that keeps its runtime
 * dependencies countable on one hand. Each is a 16px stroke icon inheriting
 * currentColor, so the active and hover states need no separate artwork.
 */
const ICONS: Record<string, JSX.Element> = {
  dashboard: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  tickets: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5V9a2 2 0 0 0 0 6v2.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5V15a2 2 0 0 0 0-6Z" />
    </svg>
  ),
  enquiries: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  ),
  outbox: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12h5l2 3h4l2-3h5" />
      <path d="M4.5 6h15l1.5 6v6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-6Z" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
}

/**
 * The frame every screen sits in.
 *
 * The sidebar counts are the reason this component fetches anything: an agent
 * should not have to visit the dashboard to discover that four tickets have
 * breached. They refresh on a timer, which is the whole of this console's
 * "realtime" story — Supabase Realtime would be better and is deliberately out
 * of scope for v1.
 */

const COUNT_POLL_MS = 60_000

export function AppShell() {
  const { me, signOut, can, roleDrift, refresh } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [collapsed, toggleRail] = useRailCollapsed()

  const counts = useAsync(dashboard, [], { pollMs: COUNT_POLL_MS })
  const d = counts.data

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const q = query.trim()
    if (q.length < 2) return
    navigate(`/tickets?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className={`shell${collapsed ? ' is-collapsed' : ''}`}>
      <nav className="sidebar" aria-label="Sections">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark" aria-hidden="true" />
          <span className="sidebar-brand-text">
            Platizio
            <span className="sidebar-brand-sub">Support console</span>
          </span>
          <button
            type="button"
            className="rail-toggle"
            onClick={toggleRail}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <div className="sidebar-nav">
          <Item to="/" end label="Dashboard" icon="dashboard" collapsed={collapsed} />

          <div className="sidebar-section">Support</div>
          <Item to="/tickets" label="Tickets" icon="tickets" count={d?.open} collapsed={collapsed} />

          <div className="sidebar-section">Sales</div>
          <Item
            to="/enquiries"
            label="Enquiries"
            icon="enquiries"
            count={d?.openEnquiries}
            collapsed={collapsed}
          />

          <div className="sidebar-section">Operations</div>
          <Item
            to="/outbox"
            label="Outbox"
            icon="outbox"
            count={(d?.outboxPending ?? 0) + (d?.outboxFailed ?? 0)}
            alert={(d?.outboxFailed ?? 0) > 0}
            collapsed={collapsed}
          />
          {can('editCalendar') && (
            <Item to="/calendar" label="Calendar" icon="calendar" collapsed={collapsed} />
          )}
        </div>

        <div className="sidebar-foot">
          {d ? `Counts as of ${new Date(d.generatedAt).toLocaleTimeString()}` : 'Loading counts…'}
        </div>
      </nav>

      <div className="main">
        <header className="topbar">
          <form className="topbar-search" onSubmit={submitSearch} role="search">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tickets — reference, subject, name or email"
              aria-label="Search tickets"
            />
          </form>

          <div className="topbar-right">
            <div className="whoami">
              <div className="whoami-name">{me?.fullName ?? me?.email ?? 'Signed in'}</div>
              <div className="whoami-roles">{me?.roles?.join(' · ') || 'No roles'}</div>
            </div>
            <button type="button" className="btn btn-sm" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </header>

        <main className="content">
          {/*
            Unmissable on purpose. Every number below is invented, and someone
            who forgot which mode they opened could otherwise read a fictional
            SLA breach as a real one.
          */}
          {DEMO && (
            <div className="banner banner-info" role="status">
              <span>
                <strong>Demo mode.</strong> Every ticket, enquiry and count on this screen is
                fixture data — nothing is connected to a database, and anything that would write
                will refuse. Remove <code>VITE_DEMO=1</code> from <code>admin/.env.local</code> and
                restart to use the real project.
              </span>
            </div>
          )}

          {/*
            The token carries roles from when it was issued; staff_whoami reads
            them from the tables now. When they disagree, someone changed this
            account's roles during the session — surfacing it beats letting an
            action fail with "permission denied" for no visible reason.
          */}
          {roleDrift && (
            <div className="banner banner-warn" role="status">
              <span>
                Your access changed while you were signed in. Sign out and back in to pick up the
                new permissions.
              </span>
              <button type="button" className="btn btn-sm" onClick={() => void refresh()}>
                Re-check
              </button>
            </div>
          )}

          {counts.error && (
            <div className="banner banner-danger" role="alert">
              <span>Could not load the sidebar counts: {counts.error}</span>
              <button type="button" className="btn btn-sm" onClick={counts.reload}>
                Retry
              </button>
            </div>
          )}

          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Item({
  to,
  label,
  icon,
  count,
  alert,
  end,
  collapsed,
}: {
  to: string
  label: string
  icon: keyof typeof ICONS
  count?: number
  alert?: boolean
  end?: boolean
  collapsed: boolean
}) {
  // Collapsed, the visible text is gone and the count is reduced to a dot, so
  // the accessible name has to carry both. An icon with no name is unusable
  // with a screen reader, and a dot conveys "something" without saying what.
  const badge = count != null && count > 0 ? ` (${count})` : ''

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}
      aria-label={collapsed ? `${label}${badge}` : undefined}
      title={collapsed ? `${label}${badge}` : undefined}
    >
      <span className="nav-item-icon">{ICONS[icon]}</span>
      <span className="nav-item-label">{label}</span>
      {count != null && count > 0 && (
        <span className={`nav-item-count${alert ? ' is-alert' : ''}`}>{count}</span>
      )}
    </NavLink>
  )
}

/** Standard page header. Every screen uses it so the h1 is never missing. */
export function PageHead({
  title,
  lede,
  actions,
}: {
  title: string
  lede?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {lede && <p>{lede}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </div>
  )
}
