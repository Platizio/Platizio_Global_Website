import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * Transient confirmations and failures.
 *
 * Every mutating action in this console reports through here, so an agent never
 * has to work out whether a click did anything. Errors are sticky — they stay
 * until dismissed — because a failed reply that vanished after four seconds is
 * a reply the agent believes was sent.
 */

type ToastKind = 'ok' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  ok: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const Ctx = createContext<ToastApi | null>(null)

const AUTO_DISMISS_MS = 4500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      // Date.now() collides when two actions settle in the same millisecond,
      // which is common enough on an optimistic refresh; the random suffix is
      // only there to keep React keys distinct.
      const id = Date.now() * 1000 + Math.floor(Math.random() * 1000)
      setToasts((prev) => [...prev, { id, kind, message }])
      if (kind !== 'error') {
        window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
      }
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      ok: (message) => push('ok', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  )

  return (
    <Ctx.Provider value={api}>
      {children}
      {/*
        A polite live region, not assertive: these announce the result of
        something the agent just did, and interrupting their own typing to say
        "saved" is worse than waiting for a pause.
      */}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${toast.kind === 'error' ? 'toast-error' : toast.kind === 'ok' ? 'toast-ok' : ''}`}
          >
            <span>{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
