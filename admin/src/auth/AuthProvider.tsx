import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { DEMO, DEMO_ME } from '../lib/demo'
import { supabase } from '../lib/supabase'
import { whoami } from '../lib/rpc'
import type { Capability, StaffRole, WhoAmI } from '../lib/types'

/**
 * Who is signed in, and what the database says they may do.
 *
 * Two sources of truth are deliberately kept apart:
 *
 *   Session — from Supabase Auth. Answers "is there a valid token".
 *   WhoAmI  — from staff_whoami(). Answers "is this person staff, and what can
 *             they do". Read from staff_users / user_roles, not from the token.
 *
 * They can disagree, and the interesting failures live in the gap. A person can
 * hold a perfectly valid JWT and not be staff at all — auth.users contains
 * anyone ever invited, including someone since deactivated. So a successful
 * sign-in is not authorisation; `isStaff` is.
 */

interface AuthState {
  loading: boolean
  session: Session | null
  me: WhoAmI | null
  /** Roles changed under a live token. The console is showing stale capabilities. */
  roleDrift: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  can: (capability: Capability) => boolean
  hasRole: (role: StaffRole) => boolean
}

const Ctx = createContext<AuthState | null>(null)

/** How often staff_whoami() is re-read while the console sits open. */
const WHOAMI_POLL_MS = 5 * 60 * 1000

/**
 * Picks the real provider or the demo one.
 *
 * A component boundary rather than a branch inside one, because the two differ
 * in which hooks they run and React does not allow that conditionally. `DEMO`
 * is a build-time constant, so the unused half is dropped in production.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return DEMO ? <DemoAuthProvider>{children}</DemoAuthProvider> : <RealAuthProvider>{children}</RealAuthProvider>
}

/** Signed in as a fictional admin, against no backend at all. */
function DemoAuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthState>(
    () => ({
      loading: false,
      // Enough of a Session for RequireAuth's truthiness check. Nothing reads
      // the token because nothing in demo mode makes a network call.
      session: { access_token: 'demo', user: { id: DEMO_ME.userId } } as unknown as Session,
      me: DEMO_ME,
      roleDrift: false,
      signIn: async () => {},
      signOut: async () => {
        window.alert('Demo mode has no session to sign out of.')
      },
      refresh: async () => {},
      can: (capability) => Boolean(DEMO_ME.can?.[capability]),
      hasRole: (role) => DEMO_ME.roles.includes(role),
    }),
    [],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function RealAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [me, setMe] = useState<WhoAmI | null>(null)

  // Guards against a slow whoami from a previous session landing after a
  // faster one from the current session and overwriting it.
  const generation = useRef(0)

  const loadMe = useCallback(async (active: Session | null) => {
    const mine = ++generation.current

    if (!active) {
      setMe(null)
      return
    }

    try {
      const result = await whoami()
      if (generation.current !== mine) return

      // A valid token that is not a staff account. Signing them out here rather
      // than rendering an empty console is the honest answer: every screen
      // would refuse them anyway, one confusing error at a time.
      if (!result.signedIn || !result.isStaff) {
        setMe(result)
        return
      }
      setMe(result)
    } catch {
      if (generation.current !== mine) return
      // Network or an undeployed function. Treated as "unknown", not as
      // "not staff" — the difference matters, because the second would sign
      // someone out over a dropped connection.
      setMe(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      void loadMe(data.session).finally(() => {
        if (!cancelled) setLoading(false)
      })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      // TOKEN_REFRESHED fires hourly and carries no new information about who
      // this is; re-reading whoami on it would be four extra round trips a day
      // for nothing. Role drift is caught by the poll below instead.
      if (event !== 'TOKEN_REFRESHED') void loadMe(next)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [loadMe])

  /**
   * Re-read capabilities periodically.
   *
   * staff_whoami() returns both `roles` (from the tables) and `tokenRoles`
   * (from app_metadata in the JWT), and its own comment explains why: tokens
   * live an hour, so a console left open can be offering buttons the token no
   * longer backs. Polling turns "the action failed for no visible reason" into
   * a banner that says what happened.
   */
  useEffect(() => {
    if (!session) return
    const timer = window.setInterval(() => void loadMe(session), WHOAMI_POLL_MS)
    return () => window.clearInterval(timer)
  }, [session, loadMe])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) throw new Error(error.message)
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setMe(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadMe(session)
  }, [loadMe, session])

  const roleDrift = useMemo(() => {
    if (!me?.isStaff || !me.tokenRoles) return false
    const table = [...me.roles].sort().join(',')
    const token = [...me.tokenRoles].sort().join(',')
    return table !== token
  }, [me])

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      me,
      roleDrift,
      signIn,
      signOut,
      refresh,
      can: (capability) => Boolean(me?.can?.[capability]),
      hasRole: (role) => Boolean(me?.roles?.includes(role)),
    }),
    [loading, session, me, roleDrift, signIn, signOut, refresh],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
