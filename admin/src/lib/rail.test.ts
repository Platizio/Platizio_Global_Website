import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { RAIL_STORAGE_KEY, useRailCollapsed } from './rail'

describe('useRailCollapsed', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts expanded when nothing has been stored', () => {
    const { result } = renderHook(() => useRailCollapsed())
    expect(result.current[0]).toBe(false)
  })

  it('starts collapsed when that is what was stored', () => {
    window.localStorage.setItem(RAIL_STORAGE_KEY, 'collapsed')
    const { result } = renderHook(() => useRailCollapsed())
    expect(result.current[0]).toBe(true)
  })

  it('persists the choice so it survives a reload', () => {
    const { result } = renderHook(() => useRailCollapsed())
    act(() => result.current[1]())
    expect(result.current[0]).toBe(true)
    expect(window.localStorage.getItem(RAIL_STORAGE_KEY)).toBe('collapsed')
  })

  it('toggles back and stores the expanded state explicitly', () => {
    window.localStorage.setItem(RAIL_STORAGE_KEY, 'collapsed')
    const { result } = renderHook(() => useRailCollapsed())
    act(() => result.current[1]())
    expect(result.current[0]).toBe(false)
    expect(window.localStorage.getItem(RAIL_STORAGE_KEY)).toBe('expanded')
  })

  // A private-mode browser throws on localStorage access rather than returning
  // null. The rail is chrome; it must not take the console down with it.
  it('falls back to expanded when storage is unavailable', () => {
    const original = window.localStorage.getItem
    window.localStorage.getItem = () => {
      throw new Error('SecurityError')
    }
    const { result } = renderHook(() => useRailCollapsed())
    expect(result.current[0]).toBe(false)
    window.localStorage.getItem = original
  })
})
