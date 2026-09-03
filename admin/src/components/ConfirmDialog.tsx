import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * The gate in front of anything hard to walk back.
 *
 * Its job is to name the consequence, not to ask "are you sure". Closing a
 * ticket re-anchors a five-year retention clock and emails the customer;
 * marking one SPAM freezes what they can see; deactivating an account signs
 * someone out of their shift. "Are you sure?" conveys none of that, so the
 * `body` is where the actual effect goes.
 *
 * `requireNote` exists because several of these actions write into an
 * append-only audit trail, and a blank note there is a row nobody can explain
 * six months later.
 */

export interface ConfirmSpec {
  title: string
  body: ReactNode
  confirmLabel: string
  tone?: 'primary' | 'danger'
  requireNote?: boolean
  noteLabel?: string
  noteHint?: string
  minNote?: number
  onConfirm: (note: string) => Promise<void> | void
}

export function ConfirmDialog({ spec, onClose }: { spec: ConfirmSpec | null; onClose: () => void }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const firstFieldRef = useRef<HTMLTextAreaElement | HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!spec) return
    setNote('')
    setError('')
    setBusy(false)
    // Focus lands inside the dialog so the keyboard does not stay behind it.
    window.setTimeout(() => firstFieldRef.current?.focus(), 0)
  }, [spec])

  useEffect(() => {
    if (!spec) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [spec, busy, onClose])

  if (!spec) return null

  const min = spec.minNote ?? 3

  const submit = async () => {
    if (spec.requireNote && note.trim().length < min) {
      setError(`Please write at least ${min} characters.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      await spec.onConfirm(note.trim())
      onClose()
    } catch (err) {
      // Kept in the dialog rather than thrown to a toast: the agent is still
      // looking at the thing that failed and may want to edit the note and
      // try again without rebuilding the whole action.
      setError(err instanceof Error ? err.message : 'That did not work.')
      setBusy(false)
    }
  }

  return (
    <div
      className="dialog-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="dialog-head">
          <h2 id="confirm-title">{spec.title}</h2>
        </div>

        <div className="dialog-body">
          <div className="stack">
            <div>{spec.body}</div>

            {spec.requireNote && (
              <div className="field">
                <label htmlFor="confirm-note">{spec.noteLabel ?? 'Note'}</label>
                <textarea
                  id="confirm-note"
                  ref={firstFieldRef as React.RefObject<HTMLTextAreaElement>}
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  disabled={busy}
                />
                {spec.noteHint && <p className="field-hint">{spec.noteHint}</p>}
              </div>
            )}

            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="dialog-foot">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${spec.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={submit}
            disabled={busy}
            ref={!spec.requireNote ? (firstFieldRef as React.RefObject<HTMLButtonElement>) : undefined}
          >
            {busy ? 'Working…' : spec.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Small hook so a screen can drive the dialog without hand-rolling the state. */
export function useConfirm() {
  const [spec, setSpec] = useState<ConfirmSpec | null>(null)
  return {
    spec,
    confirm: (next: ConfirmSpec) => setSpec(next),
    close: () => setSpec(null),
  }
}
