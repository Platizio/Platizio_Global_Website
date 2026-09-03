import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Load something, know whether it is loading, be able to reload it.
 *
 * Every screen in this console does the same three things, and hand-rolling
 * that ten times is how one of them ends up without the stale-response guard
 * and starts showing the previous ticket's data after a fast back-navigation.
 *
 * There is no cache and no deduplication on purpose. A support desk wants the
 * row as it is now, and an agent who clicks Reload after a colleague replied
 * should see the reply — not a memoised copy from ninety seconds ago.
 */

export interface Async<T> {
  data: T | null
  error: string | null
  loading: boolean
  /** True only on the first load, so a refresh does not blank the screen. */
  initial: boolean
  reload: () => void
}

export function useAsync<T>(
  run: () => Promise<T>,
  deps: unknown[],
  options: { pollMs?: number; enabled?: boolean } = {},
): Async<T> {
  const { pollMs, enabled = true } = options

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [initial, setInitial] = useState(true)

  // Incremented on every request; a response whose generation is stale is
  // discarded rather than written. This is what stops an earlier, slower call
  // from overwriting the result of a later, faster one.
  const generation = useRef(0)
  const runRef = useRef(run)
  runRef.current = run

  const load = useCallback(async () => {
    const mine = ++generation.current
    setLoading(true)
    try {
      const result = await runRef.current()
      if (generation.current !== mine) return
      setData(result)
      setError(null)
    } catch (err) {
      if (generation.current !== mine) return
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      if (generation.current === mine) {
        setLoading(false)
        setInitial(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setInitial(false)
      return
    }
    void load()
    // The dependency array is the caller's; `load` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  useEffect(() => {
    if (!pollMs || !enabled) return
    const timer = window.setInterval(() => void load(), pollMs)
    return () => window.clearInterval(timer)
  }, [pollMs, enabled, load])

  return { data, error, loading, initial, reload: load }
}
