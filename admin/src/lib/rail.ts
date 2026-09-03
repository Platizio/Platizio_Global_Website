import { useCallback, useState } from 'react'

/**
 * Whether the sidebar is collapsed, remembered between visits.
 *
 * Persisted rather than reset per session because the choice is about how
 * someone works, not about what they are looking at right now: an agent who
 * lives on the ticket screen wants the width back every morning without asking
 * for it again.
 *
 * Every storage access is guarded. Safari in private mode throws on
 * localStorage rather than returning null, and a sidebar preference is not
 * worth taking the console down for.
 */

export const RAIL_STORAGE_KEY = 'platizio-console-rail'

function read(): boolean {
  try {
    return window.localStorage.getItem(RAIL_STORAGE_KEY) === 'collapsed'
  } catch {
    return false
  }
}

function write(collapsed: boolean): void {
  try {
    // Written explicitly either way rather than removed on expand, so the
    // stored value always says what the person chose instead of leaving
    // "expanded" and "never asked" indistinguishable.
    window.localStorage.setItem(RAIL_STORAGE_KEY, collapsed ? 'collapsed' : 'expanded')
  } catch {
    // Preference lost for this browser. Nothing else breaks.
  }
}

export function useRailCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(read)

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      write(next)
      return next
    })
  }, [])

  return [collapsed, toggle]
}
