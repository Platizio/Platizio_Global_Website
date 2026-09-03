import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import type { Capability } from '../lib/types'

/**
 * Route guards.
 *
 * These hide things. They do not protect anything — every staff_* RPC carries
 * its own `private.require_staff()` guard and refuses regardless of what the
 * browser renders. Removing a guard here would make the console confusing, not
 * insecure; the server is the boundary.
 */

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, session, me } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageWait />

  if (!session) {
    // `from` so a bookmarked ticket survives the round trip through login.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  // Signed in, but not staff — or staff whose account was deactivated. There is
  // no useful screen for this person, and every RPC would refuse them anyway.
  if (me && !me.isStaff) {
    return <Navigate to="/login" replace state={{ rejected: true }} />
  }

  // Session exists but whoami has not answered yet, or failed. Waiting beats
  // rendering a console whose permissions are unknown.
  if (!me) return <FullPageWait />

  return <>{children}</>
}

export function RequireCapability({
  capability,
  children,
}: {
  capability: Capability
  children: ReactNode
}) {
  const { can } = useAuth()

  if (!can(capability)) {
    return (
      <div className="card">
        <div className="empty">
          <h3>Not your desk</h3>
          <p>
            Your account does not have the role this section needs. If that looks wrong, an
            administrator can change your roles under Staff.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function FullPageWait() {
  return (
    <div className="login">
      <div className="login-card" role="status" aria-live="polite">
        <div className="login-brand">
          <div className="login-brand-mark" aria-hidden="true" />
          <div>
            <strong>Platizio Support</strong>
            <span>Checking your session…</span>
          </div>
        </div>
        <div className="stack" aria-hidden="true">
          <div className="skeleton" style={{ width: '70%' }} />
          <div className="skeleton" style={{ width: '45%' }} />
        </div>
      </div>
    </div>
  )
}
