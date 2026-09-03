import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

/**
 * Sign in.
 *
 * No sign-up link and no self-serve password reset, because the project sets
 * `enable_signup = false` and accounts are created by an ADMIN through
 * `invite-staff`. Offering either would be a control that cannot work.
 *
 * The one case worth handling carefully is a valid login that is not a staff
 * account. Supabase Auth will happily authenticate anyone in `auth.users`;
 * `staff_whoami()` is what decides whether they belong here. RequireAuth
 * bounces them back with `rejected` so this screen can say why instead of
 * looping them silently through a login that appears to succeed.
 */

export default function Login() {
  const { session, me, signIn, signOut } = useAuth()
  const location = useLocation()
  const state = (location.state ?? {}) as { from?: string; rejected?: boolean }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Arriving here as a signed-in non-staff user means the token is useless to
  // this console. Clearing it stops the next visit repeating the same loop.
  useEffect(() => {
    if (state.rejected && session) void signOut()
  }, [state.rejected, session, signOut])

  if (session && me?.isStaff) {
    return <Navigate to={state.from && state.from !== '/login' ? state.from : '/'} replace />
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return

    if (!email.trim() || !password) {
      setError('Enter your email address and password.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await signIn(email, password)
      // Nothing to do on success: RequireAuth re-renders once whoami answers.
    } catch (err) {
      setError(
        err instanceof Error && /invalid login/i.test(err.message)
          ? 'That email address and password do not match.'
          : err instanceof Error
            ? err.message
            : 'Could not sign you in.',
      )
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-mark" aria-hidden="true" />
          <div>
            <strong>Platizio Global</strong>
            <span>Support console</span>
          </div>
        </div>

        <h1>Sign in</h1>
        <p className="login-lede">Staff accounts only.</p>

        {state.rejected && (
          <div className="banner banner-danger" role="alert">
            <span>
              That login worked, but it is not an active staff account. Ask an administrator to
              set one up for you.
            </span>
          </div>
        )}

        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              autoFocus
              disabled={busy}
            />
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={busy}
            />
          </div>

          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-foot">
          Forgotten your password, or need an account? Ask an administrator — this console does
          not send its own reset emails.
        </p>
      </div>
    </div>
  )
}
