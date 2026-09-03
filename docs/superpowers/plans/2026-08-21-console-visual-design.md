# Support Console Visual Design — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the `admin/` support console into the Platizio Desk visual language across all ten screens, add a collapsible sidebar, and rebuild the ticket screen around a sticky action header.

**Architecture:** Styling only. Nothing under `supabase/` is touched, no RPC changes, no new features. The bulk of the diff lands in `admin/src/styles/console.css`; three components change structurally (`AppShell`, `Dashboard`, `TicketDetail`) and the rest change class names only. Two pieces carry real logic — sidebar persistence and the dashboard summary sentence — and those are extracted into pure, tested modules rather than being inlined into JSX.

**Tech Stack:** React 18, TypeScript `strict`, Vite 5, plain CSS with custom properties. Vitest + jsdom + @testing-library/react added in Task 1 — `admin/` has no test runner today, and the two logic modules above are worth testing properly.

**Spec:** `docs/superpowers/specs/2026-08-21-console-visual-design.md`

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `admin/src/styles/tokens.css` | Brand values mirrored from the marketing site | Add gradient + card-radius tokens |
| `admin/src/styles/console.css` | The console's entire visual system | Bulk of the work |
| `admin/src/lib/rail.ts` | Sidebar collapse state + persistence | **New** |
| `admin/src/lib/summary.ts` | Greeting and the dashboard summary sentence | **New** |
| `admin/src/components/AppShell.tsx` | Frame: rail, topbar, banners | Collapsible rail |
| `admin/src/screens/Dashboard.tsx` | Landing screen | Greeting, eyebrow sections, needs-attention table |
| `admin/src/screens/TicketDetail.tsx` | The work screen | Action header, narrowed rail, attachments moved |
| `admin/src/screens/*.tsx` (others) | Queue, Grievances, Enquiries, Outbox, Staff, Calendar, Login | Class names only |

Two new `lib/` modules rather than inline helpers: both are pure functions with branchy output that is easy to get subtly wrong and cheap to test. Everything else in this plan is declarative CSS, where a unit test would assert that a stylesheet says what it says.

---

## Task 1: Add a test runner to `admin/`

**Files:**
- Modify: `admin/package.json`
- Modify: `admin/vite.config.ts`

- [ ] **Step 1: Install the test dependencies**

```bash
cd admin && npm install -D vitest@^1.6.0 jsdom@^24.0.0 @testing-library/react@^15.0.0 @testing-library/dom@^10.0.0
```

Expected: `added N packages`.

- [ ] **Step 2: Add the test scripts**

In `admin/package.json`, replace the `"scripts"` block with:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview"
  },
```

- [ ] **Step 3: Configure Vitest**

Replace the whole of `admin/vite.config.ts` with:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Port 5174 so the console and the marketing site (5173) can run side by side —
// the round-trip test raises a ticket in one window and works it in the other.
// Both ports are named in the edge functions' ALLOWED_ORIGINS.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, strictPort: true },
  preview: { port: 5174, strictPort: true },
  build: { outDir: 'dist', sourcemap: false },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

- [ ] **Step 4: Verify the runner starts and finds nothing**

Run: `cd admin && npm test`
Expected: `No test files found, exiting with code 0` — or a "no tests" notice. It must not error on config.

- [ ] **Step 5: Verify the build still passes**

Run: `cd admin && npm run build`
Expected: `✓ built in …` with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add admin/package.json admin/package-lock.json admin/vite.config.ts
git commit -m "Add a test runner to the console"
```

---

## Task 2: Brand tokens

**Files:**
- Modify: `admin/src/styles/tokens.css`

- [ ] **Step 1: Add the gradient and card-radius tokens**

In `admin/src/styles/tokens.css`, find the `/* Brand */` block and insert these three lines immediately after the `--gold-deep: #7e3008;` line:

```css
  /* The accent as a gradient, which is how the marketing site actually uses it.
     Reserved for the primary action and the 3px card rule — it never carries
     state. State is the red/amber/green/blue family below. */
  --gold-gradient: linear-gradient(135deg, #e2682a 0%, #b94b12 50%, #7e3008 100%);
  --gold-gradient-h: linear-gradient(90deg, #e2682a 0%, #b94b12 50%, #7e3008 100%);
  --gold-glow: 0 5px 14px rgba(185, 75, 18, 0.35);
```

Then in the `/* Shape */` block, add one line after `--radius: 10px;`:

```css
  /* Cards take the marketing site's larger corner; inputs and small surfaces
     stay at --radius. --radius-full is already the pill and needs no partner. */
  --radius-card: 14px;
```

- [ ] **Step 2: Verify the build still passes**

Run: `cd admin && npm run build`
Expected: `✓ built in …`

- [ ] **Step 3: Commit**

```bash
git add admin/src/styles/tokens.css
git commit -m "Add the gradient and card-radius tokens"
```

---

## Task 3: Sidebar collapse state

**Files:**
- Create: `admin/src/lib/rail.ts`
- Test: `admin/src/lib/rail.test.ts`

- [ ] **Step 1: Write the failing test**

Create `admin/src/lib/rail.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd admin && npx vitest run src/lib/rail.test.ts`
Expected: FAIL — `Failed to resolve import "./rail"`.

- [ ] **Step 3: Write the implementation**

Create `admin/src/lib/rail.ts`:

```ts
import { useCallback, useState } from 'react'

/**
 * Whether the sidebar is collapsed, remembered between visits.
 *
 * Persisted rather than reset per session because the choice is about how
 * someone works, not about what they are looking at right now: an agent who
 * lives on the ticket screen wants the width back every morning without
 * asking for it again.
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd admin && npx vitest run src/lib/rail.test.ts`
Expected: `Test Files 1 passed`, `Tests 5 passed`.

- [ ] **Step 5: Commit**

```bash
git add admin/src/lib/rail.ts admin/src/lib/rail.test.ts
git commit -m "Remember whether the sidebar is collapsed"
```

---

## Task 4: Collapsible sidebar — CSS

**Files:**
- Modify: `admin/src/styles/tokens.css`
- Modify: `admin/src/styles/console.css`

- [ ] **Step 1: Add the collapsed width token**

In `admin/src/styles/tokens.css`, in the `/* Layout */` block, add one line after `--sidebar-w: 232px;`:

```css
  --sidebar-w-collapsed: 56px;
```

- [ ] **Step 2: Make the shell width-aware**

In `admin/src/styles/console.css`, replace the `.shell` rule with:

```css
.shell {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  min-height: 100vh;
  transition: grid-template-columns var(--t);
}

.shell.is-collapsed {
  grid-template-columns: var(--sidebar-w-collapsed) 1fr;
}
```

- [ ] **Step 3: Add the collapsed sidebar rules**

Immediately after the existing `.sidebar-foot { … }` rule in `admin/src/styles/console.css`, add:

```css
/* ── Collapsed rail ───────────────────────────────────────────────────────── */

.rail-toggle {
  margin-left: auto;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--gray-400);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  flex: 0 0 auto;
}

.rail-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--white);
}

.is-collapsed .sidebar-brand {
  justify-content: center;
  padding: 0 8px;
}

/* The brand wordmark, the section headings and the nav labels all go. The
   toggle stays: a rail you cannot get back out of is a trap. */
.is-collapsed .sidebar-brand-text,
.is-collapsed .sidebar-section,
.is-collapsed .nav-item-label,
.is-collapsed .sidebar-foot {
  display: none;
}

.is-collapsed .nav-item {
  justify-content: center;
  padding: 9px 0;
  position: relative;
}

/* A count cannot be read at 56px, and a truncated one is worse than none —
   "12" rendered as "1" is actively wrong. It becomes a presence indicator. */
.is-collapsed .nav-item-count {
  position: absolute;
  top: 5px;
  right: 9px;
  min-width: 0;
  width: 7px;
  height: 7px;
  padding: 0;
  border-radius: 50%;
  font-size: 0;
  color: transparent;
  overflow: hidden;
}
```

- [ ] **Step 4: Add the nav icon and label rules**

Immediately after the `.nav-item.is-active { … }` rule, add:

```css
.nav-item-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
}

.nav-item-icon svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav-item-label {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}
```

- [ ] **Step 5: Verify the build passes**

Run: `cd admin && npm run build`
Expected: `✓ built in …`

- [ ] **Step 6: Commit**

```bash
git add admin/src/styles/tokens.css admin/src/styles/console.css
git commit -m "Style the collapsed rail"
```

---

## Task 5: Collapsible sidebar — wiring

**Files:**
- Modify: `admin/src/components/AppShell.tsx`

- [ ] **Step 1: Add the icon set**

At the top of `admin/src/components/AppShell.tsx`, immediately after the import block, add:

```tsx
/**
 * Nav icons.
 *
 * Inline SVG rather than an icon package: seven glyphs do not justify a
 * dependency, and the console's whole point is that it ships from a five-runtime-
 * dependency repo. Each is a 16px stroke icon inheriting currentColor.
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
  grievances: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2.5 20h19Z" />
      <path d="M12 10v4" />
      <path d="M12 17.2v.1" />
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
  staff: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 11a3 3 0 1 0-1.5-5.6M18 20a5.5 5.5 0 0 0-2.2-4.4" />
    </svg>
  ),
}
```

- [ ] **Step 2: Wire the hook and the shell class**

In the same file, replace the opening of `AppShell` — from `export function AppShell() {` down to and including the line `  return (`, plus the two lines after it — with:

```tsx
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
```

- [ ] **Step 3: Add the import**

In the same file's import block, add after the `import { DEMO } from '../lib/demo'` line:

```tsx
import { useRailCollapsed } from '../lib/rail'
```

- [ ] **Step 4: Give every nav item an icon**

Replace each `<Item …>` call in the sidebar with the icon-carrying form. The full nav block becomes:

```tsx
        <div className="sidebar-nav">
          <Item to="/" end label="Dashboard" icon="dashboard" collapsed={collapsed} />

          <div className="sidebar-section">Support</div>
          <Item to="/tickets" label="Tickets" icon="tickets" count={d?.open} collapsed={collapsed} />
          <Item
            to="/grievances"
            label="Grievances"
            icon="grievances"
            count={d?.openComplaints}
            alert={(d?.complaintsBreached ?? 0) > 0}
            collapsed={collapsed}
          />

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
          {can('administerStaff') && (
            <Item to="/staff" label="Staff" icon="staff" collapsed={collapsed} />
          )}
        </div>
```

- [ ] **Step 5: Rewrite the Item component**

Replace the whole `function Item({ … })` definition with:

```tsx
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
  // Collapsed, the visible text is gone, so the accessible name has to come
  // from somewhere else. An icon with no name is unusable with a screen reader,
  // and `title` alone is not a reliable one.
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
```

- [ ] **Step 6: Run the typecheck**

Run: `cd admin && npm run typecheck`
Expected: no output.

- [ ] **Step 7: Verify in the browser**

Run: `cd admin && npm run dev` with `VITE_DEMO=1` set in `admin/.env.local`, then open `http://localhost:5174`.

Check all four:
1. The rail opens labelled at 232px.
2. Clicking the chevron collapses it to 56px; labels and section headings disappear; counts become dots.
3. Reloading keeps it collapsed. Expanding and reloading keeps it expanded.
4. Tabbing to a collapsed nav item announces "Tickets (6)" rather than nothing.

- [ ] **Step 8: Commit**

```bash
git add admin/src/components/AppShell.tsx
git commit -m "Let the sidebar collapse"
```

---

## Task 6: The Platizio Desk card, button and tile vocabulary

**Files:**
- Modify: `admin/src/styles/console.css`

- [ ] **Step 1: Restyle cards**

Replace the `.card` rule and the `.card-note` rule with:

```css
.card {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

/* The 3px gradient rule is the marketing site's signature move, and it is used
   here on the stat tiles and the ticket action header only. On all forty-odd
   cards it stops being a signature and becomes wallpaper. Opt in with
   .card.is-featured; do not add it anywhere else without deleting it somewhere. */
.card.is-featured {
  position: relative;
}

.card.is-featured::before {
  content: '';
  position: absolute;
  top: 0;
  inset-inline: 0;
  height: 3px;
  background: var(--gold-gradient-h);
}

.card-note {
  padding: 10px 16px;
  border-top: 1px solid var(--gray-200);
  background: var(--gray-50);
  font-size: 12px;
  color: var(--gray-600);
}
```

- [ ] **Step 2: Restyle buttons as pills**

Replace the `.btn` rule and the `.btn-primary` pair with:

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 34px;
  padding: 0 16px;
  border: 1.5px solid var(--gray-200);
  border-radius: var(--radius-full);
  background: var(--white);
  color: var(--gray-700);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--t-fast), border-color var(--t-fast), color var(--t-fast),
    box-shadow var(--t-fast), transform var(--t-fast);
}

.btn:hover:not(:disabled) {
  background: var(--gray-50);
  border-color: var(--gray-300);
}

/* The one gradient button on a screen — the thing you came here to do. If a
   screen ends up with two, one of them is not the primary action. */
.btn-primary {
  background: var(--gold-gradient);
  border-color: transparent;
  color: var(--white);
  box-shadow: var(--gold-glow);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(185, 75, 18, 0.42);
}

.btn-navy {
  background: var(--navy);
  border-color: var(--navy);
  color: var(--white);
}

.btn-navy:hover:not(:disabled) {
  background: var(--navy-deep);
  border-color: var(--navy-deep);
}
```

- [ ] **Step 3: Restyle the stat tiles**

Replace the `.tile` rule with:

```css
.tile {
  display: block;
  position: relative;
  overflow: hidden;
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-card);
  padding: 14px 16px;
  box-shadow: var(--shadow-sm);
  color: inherit;
  transition: border-color var(--t-fast), box-shadow var(--t-fast), transform var(--t-fast);
}

.tile::before {
  content: '';
  position: absolute;
  top: 0;
  inset-inline: 0;
  height: 3px;
  background: var(--gold-gradient-h);
}

.tile-icon {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: linear-gradient(135deg, rgba(185, 75, 18, 0.15), rgba(185, 75, 18, 0.05));
  margin-bottom: 9px;
}

a.tile:hover {
  text-decoration: none;
  border-color: var(--gray-300);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
```

- [ ] **Step 4: Give chips and tabs the brand treatment**

Replace the `.tab.is-active` rule with:

```css
.tab.is-active {
  color: var(--gold-deep);
  border-bottom-color: var(--gold);
}
```

Then add, immediately after the `.chip-row` rule:

```css
/* Section label, lifted from the marketing site's .eyebrow. */
.eyebrow {
  display: block;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gold-deep);
  margin: 22px 0 10px;
}

.eyebrow:first-child {
  margin-top: 0;
}
```

- [ ] **Step 5: Give page headings the site's treatment**

Replace the `.page-head h1` rule with:

```css
.page-head h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--navy);
  letter-spacing: -0.02em;
}
```

- [ ] **Step 6: Verify the build passes**

Run: `cd admin && npm run build`
Expected: `✓ built in …`

- [ ] **Step 7: Verify in the browser**

With the dev server running in demo mode, open `http://localhost:5174` and check:
1. Cards have 14px corners and no gradient rule.
2. Stat tiles have the gradient rule and lift on hover.
3. Buttons are pills; exactly one gradient button per screen.
4. The active queue tab has a gold underline.

- [ ] **Step 8: Commit**

```bash
git add admin/src/styles/console.css
git commit -m "Restyle cards, buttons and tiles in the Platizio language"
```

---

## Task 7: The dashboard summary sentence

**Files:**
- Create: `admin/src/lib/summary.ts`
- Test: `admin/src/lib/summary.test.ts`

- [ ] **Step 1: Write the failing test**

Create `admin/src/lib/summary.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { greeting, summarise } from './summary'
import type { Dashboard } from './types'

const CLEAR: Dashboard = {
  open: 4,
  unassigned: 0,
  mine: 2,
  awaitingFirstResponse: 0,
  firstResponseBreached: 0,
  resolutionBreached: 0,
  byStatus: {},
  openComplaints: 0,
  complaintsBreached: 0,
  outboxPending: 0,
  outboxFailed: 0,
  newEnquiries: 0,
  openEnquiries: 0,
  unassignedEnquiries: 0,
  myEnquiries: 0,
  enquiriesOverdueFollowUp: 0,
  generatedAt: '2026-08-21T08:30:00.000Z',
}

describe('summarise', () => {
  it('says so plainly when there is nothing to chase', () => {
    expect(summarise(CLEAR)).toBe('Nothing is past its deadline and the outbox is clear.')
  })

  it('counts a single breached ticket', () => {
    expect(summarise({ ...CLEAR, firstResponseBreached: 1 })).toBe(
      'One ticket is past a deadline.',
    )
  })

  it('adds the two ticket clocks together', () => {
    expect(summarise({ ...CLEAR, firstResponseBreached: 1, resolutionBreached: 2 })).toBe(
      'Three tickets are past a deadline.',
    )
  })

  it('joins two clauses with "and"', () => {
    expect(summarise({ ...CLEAR, firstResponseBreached: 1, outboxFailed: 1 })).toBe(
      'One ticket is past a deadline and one email has failed to send.',
    )
  })

  it('joins three clauses with commas and a final "and"', () => {
    expect(
      summarise({ ...CLEAR, firstResponseBreached: 1, complaintsBreached: 1, outboxFailed: 2 }),
    ).toBe(
      'One ticket is past a deadline, one grievance is past a statutory deadline and two emails have failed to send.',
    )
  })

  it('switches to digits above ten', () => {
    expect(summarise({ ...CLEAR, outboxFailed: 14 })).toBe('14 emails have failed to send.')
  })

  // Enquiries are deliberately absent from every clause above. They carry no
  // published SLA, so an overdue follow-up is not a deadline and must never be
  // reported as one.
  it('never reports an overdue enquiry follow-up as a deadline', () => {
    expect(summarise({ ...CLEAR, enquiriesOverdueFollowUp: 5 })).toBe(
      'Nothing is past its deadline and the outbox is clear.',
    )
  })
})

describe('greeting', () => {
  it('says good morning in the Indian morning', () => {
    expect(greeting(new Date('2026-08-21T03:30:00.000Z'))).toBe('Good morning')
  })

  it('says good afternoon after midday IST', () => {
    expect(greeting(new Date('2026-08-21T08:30:00.000Z'))).toBe('Good afternoon')
  })

  it('says good evening after five IST', () => {
    expect(greeting(new Date('2026-08-21T14:30:00.000Z'))).toBe('Good evening')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd admin && npx vitest run src/lib/summary.test.ts`
Expected: FAIL — `Failed to resolve import "./summary"`.

- [ ] **Step 3: Write the implementation**

Create `admin/src/lib/summary.ts`:

```ts
import type { Dashboard } from './types'

/**
 * The one line under the dashboard greeting.
 *
 * Derived entirely from counts already in hand — no extra request, no new field.
 * Its job is to answer "is anything on fire" before the agent reads a single
 * tile, so it names only things with a real deadline attached.
 *
 * Enquiries are deliberately excluded. `internal_follow_up_target_at` is an
 * internal working target with no published SLA (migration 0027 says so), and a
 * sentence that reports it beside two genuine breaches is how it starts being
 * treated as one.
 */

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

function say(n: number): string {
  return n <= 10 ? WORDS[n] : String(n)
}

function join(parts: string[]): string {
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

export function summarise(d: Dashboard): string {
  const parts: string[] = []

  const lateTickets = d.firstResponseBreached + d.resolutionBreached
  if (lateTickets > 0) {
    parts.push(
      `${say(lateTickets)} ${lateTickets === 1 ? 'ticket is' : 'tickets are'} past a deadline`,
    )
  }

  if (d.complaintsBreached > 0) {
    parts.push(
      `${say(d.complaintsBreached)} ${d.complaintsBreached === 1 ? 'grievance is' : 'grievances are'} past a statutory deadline`,
    )
  }

  if (d.outboxFailed > 0) {
    parts.push(
      `${say(d.outboxFailed)} ${d.outboxFailed === 1 ? 'email has' : 'emails have'} failed to send`,
    )
  }

  if (parts.length === 0) return 'Nothing is past its deadline and the outbox is clear.'

  const sentence = join(parts)
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`
}

/**
 * Time of day in Asia/Kolkata, not the reader's locale.
 *
 * Every SLA in this system is computed against that timezone's business hours.
 * An agent travelling would otherwise be greeted with a good evening while the
 * desk they are looking at is mid-morning.
 */
export function greeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    }).format(now),
  )

  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd admin && npx vitest run src/lib/summary.test.ts`
Expected: `Test Files 1 passed`, `Tests 10 passed`.

- [ ] **Step 5: Commit**

```bash
git add admin/src/lib/summary.ts admin/src/lib/summary.test.ts
git commit -m "Derive the dashboard's summary sentence from the counts"
```

---

## Task 8: Dashboard screen

**Files:**
- Modify: `admin/src/screens/Dashboard.tsx`

- [ ] **Step 1: Fix up the imports**

In `admin/src/screens/Dashboard.tsx`, change the existing line

```tsx
import { dashboard } from '../lib/rpc'
```

to

```tsx
import { dashboard, ticketQueue } from '../lib/rpc'
```

and add these two new lines to the same import block:

```tsx
import { useAuth } from '../auth/AuthProvider'
import { greeting, summarise } from '../lib/summary'
```

- [ ] **Step 2: Fetch the attention list and the signed-in name**

Immediately after the existing `const { data, error, initial, reload } = useAsync(...)` line, add:

```tsx
  const { me } = useAuth()

  // The handful of tickets that actually need someone right now. Same RPC the
  // queue uses, with the filter the "Breaching" tab already sends.
  const attention = useAsync(
    () => ticketQueue({ slaOnly: true, sort: 'due', limit: 5 }),
    [],
    { pollMs: POLL_MS },
  )

  const firstName = (me?.fullName ?? '').trim().split(' ')[0]
```

- [ ] **Step 3: Replace the page header**

Replace the whole `<PageHead … />` element with:

```tsx
      <PageHead
        title={firstName ? `${greeting(new Date())}, ${firstName}` : greeting(new Date())}
        lede={data ? summarise(data) : 'Loading…'}
        actions={
          <button type="button" className="btn btn-sm" onClick={reload}>
            Refresh
          </button>
        }
      />
```

- [ ] **Step 4: Swap the section headings for eyebrows**

There are four headings of the form:

```tsx
            <h2 id="dash-support" className="sidebar-section" style={{ paddingLeft: 0 }}>
              Support
            </h2>
```

Replace each with the eyebrow form, keeping its existing `id` and text:

```tsx
            <h2 id="dash-support" className="eyebrow">
              Support
            </h2>
```

Do the same for `dash-grievance` ("Grievances"), `dash-sales` ("Sales enquiries") and `dash-ops` ("Email").

- [ ] **Step 5: Give every tile an icon square**

In the `Tile` function at the bottom of the file, replace the returned JSX with:

```tsx
  return (
    <Link className={`tile${tone ? ` is-${tone}` : ''}`} to={to}>
      <div className="tile-icon" aria-hidden="true" />
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value.toLocaleString()}</div>
      {hint && <div className="tile-hint">{hint}</div>}
    </Link>
  )
```

- [ ] **Step 6: Add the needs-attention table**

Immediately before the closing `</>` of the `data ? (…) : null` branch — that is, after the "Tickets by status" `</section>` — add:

```tsx
          <section className="card" aria-labelledby="dash-attention">
            <div className="card-head">
              <h2 id="dash-attention">Needs attention now</h2>
              <span className="card-head-actions">
                <Link className="btn btn-sm" to="/tickets?view=sla">
                  Open the queue
                </Link>
              </span>
            </div>

            {attention.data && attention.data.rows.length === 0 ? (
              <div className="empty">
                <h3>Nothing is past its due time</h3>
                <p>This is the panel you want to be empty.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <caption className="visually-hidden">
                    Tickets that have passed a service-level deadline
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Subject</th>
                      <th scope="col">Priority</th>
                      <th scope="col">First reply</th>
                      <th scope="col">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(attention.data?.rows ?? []).map((row) => (
                      <tr key={row.id}>
                        <td className="cell-ref">
                          <Link to={`/tickets/${row.id}`}>{row.ticketRef}</Link>
                        </td>
                        <td>
                          <div className="cell-subject">
                            {row.subject}
                            <span className="cell-sub">{row.requesterName}</span>
                          </div>
                        </td>
                        <td>
                          <PriorityChip priority={row.priority} />
                        </td>
                        <td>
                          <SlaChip
                            state={row.firstResponseState}
                            dueAt={row.firstResponseDueAt}
                          />
                        </td>
                        <td>
                          {row.assignedAgentName ?? <span className="muted">Unassigned</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
```

- [ ] **Step 7: Extend the Chip import**

Change the existing Chip import line to:

```tsx
import {
  PriorityChip,
  SlaChip,
  TICKET_STATUS_LABEL,
  TICKET_STATUSES,
} from '../components/Chip'
```

- [ ] **Step 8: Run the typecheck and tests**

Run: `cd admin && npm run typecheck && npm test`
Expected: no typecheck output; `Tests 15 passed`.

- [ ] **Step 9: Verify in the browser**

Open `http://localhost:5174` in demo mode. Check:
1. The heading reads "Good <time of day>, Demo" and the line under it names the breaches.
2. The four section labels are uppercase gold eyebrows.
3. Tiles have icon squares and the gradient rule.
4. "Needs attention now" lists the two breaching demo tickets and each reference links through.

- [ ] **Step 10: Commit**

```bash
git add admin/src/screens/Dashboard.tsx
git commit -m "Rebuild the dashboard around what needs attention"
```

---

## Task 9: Ticket action header — CSS

**Files:**
- Modify: `admin/src/styles/console.css`

- [ ] **Step 1: Narrow the detail rail**

Replace the `.detail` rule with:

```css
.detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 198px;
  gap: 16px;
  align-items: start;
}
```

- [ ] **Step 2: Add the action header**

Immediately before the `.detail { … }` rule, add:

```css
/* ── Ticket action header ─────────────────────────────────────────────────── */
/*
   Everything an agent DOES lives here, and it does not scroll away. The reason
   is specific to this screen: a ticket can carry a grievance whose statutory
   clocks are shorter and harder than the ticket's own, and in the previous
   layout those clocks were the third and fourth rail cards down.
*/

.thead {
  position: sticky;
  top: var(--topbar-h);
  z-index: 10;
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  padding: 14px 18px;
  margin-bottom: 16px;
  overflow: hidden;
}

.thead::before {
  content: '';
  position: absolute;
  top: 0;
  inset-inline: 0;
  height: 3px;
  background: var(--gold-gradient-h);
}

.thead-crumb {
  font-size: 12px;
  color: var(--gray-500);
  margin-bottom: 2px;
}

.thead-ref {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--gray-600);
}

.thead h1 {
  font-size: 20px;
  font-weight: 700;
  color: var(--navy);
  letter-spacing: -0.02em;
  margin-bottom: 9px;
}

.thead-row {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.thead-actions {
  margin-left: auto;
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

/* Two boxes on an ordinary ticket, four when a grievance exists. */
.sla-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 9px;
  margin-top: 12px;
}

.sla-box {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 9px 11px;
}

.sla-box-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--gray-500);
}

.sla-box-value {
  margin-top: 4px;
}

.sla-box-due {
  font-size: 11px;
  color: var(--gray-500);
  margin-top: 3px;
}

@media (max-width: 1100px) {
  .thead {
    position: static;
  }
}
```

- [ ] **Step 3: Verify the build passes**

Run: `cd admin && npm run build`
Expected: `✓ built in …`

- [ ] **Step 4: Commit**

```bash
git add admin/src/styles/console.css
git commit -m "Style the ticket action header"
```

---

## Task 10: Ticket detail screen

**Files:**
- Modify: `admin/src/screens/TicketDetail.tsx`

- [ ] **Step 1: Replace the page header with the action header**

Replace the whole `<PageHead … />` element with:

```tsx
      <header className="thead">
        <div className="thead-crumb">
          <Link to="/tickets">Tickets</Link> / <span className="thead-ref">{ticket.ticketRef}</span>
        </div>
        <h1>{ticket.subject}</h1>

        <div className="thead-row">
          <StatusChip status={ticket.statusInternal} />
          <PriorityChip priority={ticket.priority} />
          <SourceChip source={ticket.source} />
          {complaint && <ComplaintChip stage={complaint.stage} />}
          {ticket.legalHold && <Chip tone="warn">Legal hold</Chip>}

          <div className="thead-actions">
            {can('assign') && ticket.assignedAgentId !== me?.userId && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void act(() => api.assignTicket(id, null), 'Assigned to you.')}
              >
                Assign to me
              </button>
            )}

            {can('setStatus') && (
              <>
                <label className="visually-hidden" htmlFor="thead-status">
                  Status
                </label>
                <select
                  id="thead-status"
                  className="btn btn-sm"
                  value={ticket.statusInternal}
                  onChange={(event) => changeStatus(event.target.value as TicketStatusInternal)}
                >
                  {TICKET_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {TICKET_STATUS_LABEL(status)}
                    </option>
                  ))}
                </select>
              </>
            )}

            {can('setStatus') && ticket.statusInternal !== 'CLOSED' && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => changeStatus('CLOSED')}
              >
                Close
              </button>
            )}

            <button type="button" className="btn btn-sm" onClick={detail.reload}>
              Refresh
            </button>
          </div>
        </div>

        <div className="sla-strip">
          <div className="sla-box">
            <div className="sla-box-label">First reply</div>
            <div className="sla-box-value">
              <SlaChip state={ticket.firstResponseState} dueAt={ticket.firstResponseDueAt} />
            </div>
            <div className="sla-box-due">{formatDateTime(ticket.firstResponseDueAt)}</div>
          </div>

          <div className="sla-box">
            <div className="sla-box-label">Resolution</div>
            <div className="sla-box-value">
              <SlaChip state={ticket.resolutionState} dueAt={ticket.resolutionDueAt} />
            </div>
            <div className="sla-box-due">{formatDateTime(ticket.resolutionDueAt)}</div>
          </div>

          {/* Only when a grievance exists. Empty boxes would imply a clock that
              is not running. */}
          {complaint && (
            <>
              <div className="sla-box">
                <div className="sla-box-label">Grievance ack</div>
                <div className="sla-box-value">
                  <SlaChip
                    state={complaint.acknowledgementState}
                    dueAt={complaint.acknowledgementDueAt}
                  />
                </div>
                <div className="sla-box-due">Statutory · 8 business hours</div>
              </div>

              <div className="sla-box">
                <div className="sla-box-label">Grievance resolve</div>
                <div className="sla-box-value">
                  <SlaChip state={complaint.resolutionState} dueAt={complaint.resolutionDueAt} />
                </div>
                <div className="sla-box-due">Statutory · 120 business hours</div>
              </div>
            </>
          )}
        </div>
      </header>
```

- [ ] **Step 2: Remove the now-duplicated rail cards**

Delete two whole `<section className="card">` blocks from the `<aside className="detail-rail">`:

1. The one whose `card-head` contains `<h2>Service levels</h2>` — the SLA strip replaces it.
2. The one whose `card-head` contains `<h2>Handling</h2>` — assignment and status now live in the header.

Then, so assignment is still changeable to *someone else*, add this as the first card in the rail:

```tsx
          <section className="card">
            <div className="card-head">
              <h2>Owner</h2>
            </div>
            <div className="card-body">
              <div className="field">
                <label htmlFor="assignee">Assigned to</label>
                <select
                  id="assignee"
                  value={ticket.assignedAgentId ?? ''}
                  disabled={!can('assign')}
                  onChange={(event) =>
                    void act(
                      () => api.assignTicket(id, event.target.value || null),
                      'Assignment updated.',
                    )
                  }
                >
                  <option value="">Unassigned</option>
                  {(agents.data ?? []).map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.fullName}
                      {agent.isSelf ? ' (you)' : ''}
                    </option>
                  ))}
                </select>
                {ticket.statusInternal === 'NEW' && (
                  <p className="field-hint">Assigning a new ticket also moves it to Triaged.</p>
                )}
              </div>
              <p className="field-hint">Customer sees: {CUSTOMER_VIEW[ticket.statusInternal]}</p>
            </div>
          </section>
```

- [ ] **Step 3: Move attachments under the request**

Cut the whole `{attachments.length > 0 && ( <section className="card"> … </section> )}` block from `detail-main` and paste it immediately after the "The request" `</section>`, so the reading order is: the request, then what they sent with it, then the conversation.

- [ ] **Step 4: Mark the requester card as featured**

On the rail's "Requester" section, change the opening tag to:

```tsx
          <section className="card is-featured">
```

- [ ] **Step 5: Run the typecheck**

Run: `cd admin && npm run typecheck`
Expected: no output. If it complains that `PageHead` is now unused, remove it from the import.

- [ ] **Step 6: Verify in the browser**

Open `http://localhost:5174/tickets/t-1` in demo mode — the demo fixture for `t-1` carries a grievance. Check:
1. The header sticks to the top of the viewport as the thread scrolls.
2. **Four** SLA boxes appear, because this ticket has a grievance.
3. Then open `/tickets/t-3`, which has none: **two** boxes, no empty ones.
4. Assign / Status / Close / Refresh are all in the header and never scroll away.
5. Attachments sit directly under "The request".

- [ ] **Step 7: Commit**

```bash
git add admin/src/screens/TicketDetail.tsx
git commit -m "Put the ticket's actions and clocks in a header that does not scroll away"
```

---

## Task 11: Remaining screens and final verification

**Files:**
- Modify: `admin/src/screens/Grievances.tsx`, `Enquiries.tsx`, `Outbox.tsx`, `StaffAdmin.tsx`, `Calendar.tsx`, `TicketQueue.tsx`, `EnquiryDetail.tsx`, `Login.tsx`

- [ ] **Step 1: Fix the double primary on the Staff screen**

The spec's rule is one gradient button per surface. A modal counts as its own
surface — it has a scrim and nothing behind it is reachable — but an inline form
panel does not, because the page-level buttons are still on screen beside it.

`admin/src/screens/StaffAdmin.tsx` currently has three. Running the check:

| Line | Button | Surface | Verdict |
|---|---|---|---|
| 174 | "Add someone" | Page | **Demote.** It opens a form; it does not commit anything |
| 421 | "Send invitation" | Inline form, visible alongside line 174 | Keep — this is the commit |
| 311 | "Save roles" | Modal dialog | Keep — its own surface |

At line 174, change:

```tsx
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setInviting(true)}>
```

to:

```tsx
            <button type="button" className="btn btn-navy btn-sm" onClick={() => setInviting(true)}>
```

- [ ] **Step 2: Verify no other screen has two**

Run: `grep -n "btn-primary" admin/src/screens/*.tsx`

Expected — exactly six matches, one per surface:

```
admin/src/screens/Calendar.tsx:168           Save calendar
admin/src/screens/EnquiryDetail.tsx:222      Add note
admin/src/screens/Login.tsx:120              Sign in
admin/src/screens/StaffAdmin.tsx:311         Save roles   (modal)
admin/src/screens/StaffAdmin.tsx:421         Send invitation
admin/src/screens/TicketDetail.tsx:321       Send reply
```

`TicketQueue.tsx`, `Grievances.tsx`, `Enquiries.tsx` and `Outbox.tsx` must not
appear at all — they are lists with no commit action, and their "Refresh"
buttons stay plain `btn btn-sm`. If any of them appears, demote it.

- [ ] **Step 3: Run the full gate**

```bash
cd admin && npm run typecheck && npm test && npm run build
```

Expected: no typecheck output, `Tests 15 passed`, `✓ built in …`.

- [ ] **Step 4: Confirm the marketing site is untouched**

```bash
cd .. && npm run build
```

Expected: the final line reads `50 pages, … ` and the sitemap line reads `(49 urls)`. Any other number means something leaked between the two apps.

- [ ] **Step 5: Walk all ten screens in demo mode**

With `VITE_DEMO=1` set, visit each of `/`, `/tickets`, `/tickets/t-1`, `/tickets/t-3`, `/grievances`, `/enquiries`, `/enquiries/e-1`, `/outbox`, `/staff`, `/calendar`. On each, confirm:

1. Cards are 14px-cornered; the gradient rule appears **only** on stat tiles, the ticket action header and the ticket's Requester card.
2. At most one gradient button per screen.
3. No red on an enquiry follow-up state anywhere — amber only.
4. The rail's collapsed state persists across all of them.

- [ ] **Step 6: Keyboard pass**

From `/tickets`, using only the keyboard: tab to a row, press `Enter` to open it, tab to the composer, type, tab to Send. Every control must show the 3px gold focus ring. Then collapse the rail and tab through it — each icon must announce its label and count.

- [ ] **Step 7: Narrow viewport**

Resize to 1100px. The ticket detail must drop to a single column and the action header must stop being sticky rather than overflowing.

- [ ] **Step 8: Commit**

```bash
git add admin/src
git commit -m "Sweep the remaining screens into the Platizio language"
```

---

## Self-review notes

Checked against the spec:

- **Token layer** → Task 2. All three gradient tokens plus `--radius-card`; no `--radius-pill`, since `--radius-full` already exists.
- **Colour semantics, chips** → no task. `Chip.tsx` already implements the vocabulary exactly, including the leading dot on `BREACHED`/`URGENT`/`FAILED`. The spec says so; there is deliberately no task here.
- **Cards, buttons, tiles, eyebrow, headings** → Task 6.
- **Dashboard** → Tasks 7 and 8.
- **Ticket action header** → Tasks 9 and 10.
- **Collapsible sidebar** → Tasks 3, 4, 5, including the dot-not-truncated-number rule and the accessible name when collapsed.
- **Remaining screens** → Task 11.
- **Accessibility** → verified in Tasks 5, 10 and 11 rather than as a separate task, because each item belongs to the screen it applies to.
- **Verification section** → Task 11 steps 3–7 cover all eight checks in the spec.

Type consistency: `useRailCollapsed(): [boolean, () => void]` (Task 3) is destructured as `const [collapsed, toggleRail]` in Task 5. `summarise(d: Dashboard): string` and `greeting(now: Date): string` (Task 7) are called as `summarise(data)` and `greeting(new Date())` in Task 8. `ICONS` keys (Task 5 step 1) are `dashboard`, `tickets`, `grievances`, `enquiries`, `outbox`, `calendar`, `staff` — matching every `icon=` prop in step 4.

One thing this plan does **not** prove: that any of it works against a real database. The browser checks all run against `admin/src/lib/demo.ts`, whose fixtures are hand-written and verified against nothing. A screen that looks right in demo mode can still be wrong against the live project — and migration `0031` remains entirely unrun, since the machine has no Docker.
