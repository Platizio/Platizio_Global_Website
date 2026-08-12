// Staff sign-in, against GoTrue directly.
//
// No @supabase/supabase-js. The customer transport in src/help/api is plain
// fetch for the same reason: this is a marketing site whose bundle every
// visitor downloads, and the SDK would be carried by all of them to serve the
// handful of people who ever sign in. The three endpoints needed here are a
// password grant, a refresh grant and a logout, and they are ordinary HTTP.
//
// Two deliberate choices worth stating:
//
//   sessionStorage, not localStorage. The token is a bearer credential for a
//   system holding KYC documents. sessionStorage dies with the tab, which
//   costs a staff member one sign-in a day and removes a token that would
//   otherwise sit on disk indefinitely on whatever machine they used.
//
//   Refresh is proactive, not reactive. Waiting for a 401 and retrying means
//   every expiring session produces one failed write somewhere, and some of
//   those writes are not safely repeatable. The token is renewed a minute
//   before it expires instead.

import type { StaffRole } from './types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '') ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

const STORAGE_KEY = 'platizio.staff.session'
/** Renew this long before expiry rather than discovering it mid-request. */
const REFRESH_MARGIN_MS = 60_000
const REQUEST_TIMEOUT_MS = 20_000

export const isStaffBackendConfigured = (): boolean =>
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export interface StaffSession {
  accessToken: string
  refreshToken: string
  /** Epoch milliseconds. */
  expiresAt: number
  userId: string
  email: string
  /**
   * Roles as the *token* carries them, from app_metadata. Authoritative for
   * what the database will currently allow, and not necessarily current — see
   * WhoAmI.tokenRoles.
   */
  roles: StaffRole[]
}

/** Carries a message already safe to show a staff member. */
export class AuthFailure extends Error {}

let cached: StaffSession | null = null
let inFlightRefresh: Promise<StaffSession | null> | null = null

// --- storage ---------------------------------------------------------------

function load(): StaffSession | null {
  if (cached) return cached
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StaffSession
    if (!parsed?.accessToken || !parsed?.refreshToken) return null
    cached = parsed
    return parsed
  } catch {
    return null
  }
}

function store(session: StaffSession | null): void {
  cached = session
  if (typeof sessionStorage === 'undefined') return
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // A private-mode browser that refuses storage still gets a working session
    // for the life of the page; it just will not survive a reload.
  }
}

// --- token plumbing --------------------------------------------------------

interface GoTrueToken {
  access_token: string
  refresh_token: string
  expires_in: number
  user?: { id: string; email?: string; app_metadata?: { platizio_roles?: StaffRole[] } }
}

/**
 * Roles are read from the token's own payload rather than from the response
 * body, because that is what the database will see. If the JWT hook is not
 * enabled in the dashboard the claim is simply absent — which is exactly the
 * failure this returns as an empty array, so the console can say "your account
 * has no roles" instead of showing a desk that refuses every action.
 */
function rolesFromToken(accessToken: string): StaffRole[] {
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return []
    const normalised = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalised.padEnd(normalised.length + ((4 - (normalised.length % 4)) % 4), '=')
    const claims = JSON.parse(atob(padded)) as {
      app_metadata?: { platizio_roles?: StaffRole[] }
      sub?: string
      email?: string
    }
    const roles = claims.app_metadata?.platizio_roles
    return Array.isArray(roles) ? roles : []
  } catch {
    return []
  }
}

function toSession(token: GoTrueToken): StaffSession {
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * 1000,
    userId: token.user?.id ?? '',
    email: token.user?.email ?? '',
    roles: rolesFromToken(token.access_token),
  }
}

async function gotrue(path: string, body: unknown, bearer?: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${bearer ?? SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

// --- public surface --------------------------------------------------------

export function currentSession(): StaffSession | null {
  return load()
}

export async function signIn(email: string, password: string): Promise<StaffSession> {
  if (!isStaffBackendConfigured()) {
    throw new AuthFailure('The support backend is not configured for this deployment.')
  }

  const res = await gotrue('token?grant_type=password', {
    email: email.trim().toLowerCase(),
    password,
  })

  const payload = await res.json().catch(() => ({})) as GoTrueToken & { error_description?: string }

  if (!res.ok || !payload.access_token) {
    // GoTrue answers the same way for a wrong password and an unknown address,
    // and that is repeated here rather than improved on.
    throw new AuthFailure(
      res.status === 400
        ? 'That email address and password did not match.'
        : payload.error_description || 'We could not sign you in just now.',
    )
  }

  const session = toSession(payload)
  store(session)
  return session
}

/**
 * Returns the session with a usable access token, refreshing first if it is
 * close to expiry. Returns null when there is no session, or when the refresh
 * token has itself expired — in both cases the caller should show sign-in.
 *
 * Concurrent callers share one refresh. Firing several at once is not merely
 * wasteful: rotation invalidates the old refresh token, so the second request
 * would be presenting a token the first has already spent.
 */
export async function activeSession(): Promise<StaffSession | null> {
  const session = load()
  if (!session) return null
  if (Date.now() < session.expiresAt - REFRESH_MARGIN_MS) return session

  if (!inFlightRefresh) {
    inFlightRefresh = (async () => {
      try {
        const res = await gotrue('token?grant_type=refresh_token', {
          refresh_token: session.refreshToken,
        })
        const payload = await res.json().catch(() => ({})) as GoTrueToken
        if (!res.ok || !payload.access_token) {
          store(null)
          return null
        }
        const next = toSession(payload)
        store(next)
        return next
      } catch {
        // A network blip is not proof the session is dead. Hand back what we
        // have and let the request that follows fail honestly if it must —
        // discarding the refresh token here would sign the user out for the
        // duration of a dropped wifi connection.
        return session
      } finally {
        inFlightRefresh = null
      }
    })()
  }

  return inFlightRefresh
}

export async function signOut(): Promise<void> {
  const session = load()
  store(null)
  if (!session) return
  try {
    await gotrue('logout', {}, session.accessToken)
  } catch {
    // The local session is already gone, which is the part that matters to the
    // person at the keyboard. The server-side token expires within the hour.
  }
}

/**
 * The single place a staff access token is attached to a request. Everything in
 * desk.ts goes through here, so there is exactly one answer to "what happens
 * when the session has expired" rather than one per call site.
 */
export async function authorizedFetch(url: string, init: RequestInit): Promise<Response> {
  const session = await activeSession()
  if (!session) throw new AuthFailure('Your session has ended. Please sign in again.')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

export const supabaseUrl = (): string => SUPABASE_URL
