# Support Console — Visual Design

**Date:** 2026-08-21
**Status:** Approved for implementation
**Applies to:** `admin/` — the staff console built alongside `2026-08-14-backend-activation-plan.md` Phase E
**Complements:** `2026-08-13-help-centre-design.md` (the customer side of the same system)

---

## Context

The console works. Every `staff_*` RPC wired, typecheck and build green. What it does
not do is look like Platizio — it looks like every admin panel, because it was built to a generic
console vocabulary rather than to the design system already sitting in `css/styles.css`.

That matters more than vanity. This is the tool an operations and compliance team lives in all day,
next to a customer-facing site that is carefully art-directed. A staff tool that looks like a
different company's software is a staff tool people trust less and read less carefully — and the
things being read here are statutory deadlines.

This spec restyles every screen into the visual language of the live `/help` page, at desk
density, and fixes one layout problem found along the way: on the ticket screen the actions an agent
performs most sit below the fold, underneath eight stacked rail cards.

**No backend work.** Nothing in `supabase/` changes. No new RPC, no migration, no change to what
any screen fetches. The entire diff is CSS and JSX, which is what makes it reviewable in one pass.

## Decisions

Settled through four rounds of side-by-side mockups (preserved in `.superpowers/brainstorm/`).

| Decision | Choice |
|---|---|
| Visual direction | **Platizio Desk** — the `/help` page's component language at desk density |
| Ticket screen layout | **Action header** — sticky header carrying status, SLA clocks and every action |
| Scope | **Every screen, styling only.** No new SQL, no new features |
| Sidebar | **Collapsible** — labelled at 232px by default, collapses to 56px, choice persisted |
| Operators | **One.** No assignment anywhere; unopened / opened replaces it. No staff screen |

## One operator, so nothing is assigned

**Added 2026-08-31.** The console is worked by a single person. Assignment therefore carries no
information — every open item is already theirs — and the whole apparatus is gone: no agent
dropdown, no "Assign to me", no assignee column, no mine/unassigned views, no per-person workload.

What replaces it is the only distinction still worth drawing: **has this been looked at yet.** That
needs no new column, because `status_internal` already encodes it.

| Concept | Maps to | Where it shows |
|---|---|---|
| **Unopened** | `status_internal = 'NEW'` | Queue tab, dashboard tile, status chip |
| **Opened** | `TRIAGED` (relabelled) and everything else still open | Queue tab, status chip |
| **Closed** | `CLOSED`, `SPAM` | Queue tab |

Enquiries take the same shape: `NEW` is Unopened, `CONTACTED`/`QUALIFIED` are Opened.

The dashboard's unopened count is `byStatus.NEW`, which `staff_dashboard()` already returns — no new
field, no new query. `unassigned`, `mine`, `unassignedEnquiries` and `myEnquiries` are still returned
and still typed, because `types.ts` mirrors the projection; nothing reads them.

`staff_directory()` and `staff_assign_ticket()` stay deployed and unused. `staff_assign_enquiry` was
dropped from `0031` rather than shipped without a caller — the same rule applied to
`staff_complaint_queue`. Restoring either is a small, self-contained change if a second person is
ever added.

**One consequence worth knowing.** `staff_assign_ticket` used to double as the NEW → TRIAGED
transition. With assignment gone, a ticket leaves Unopened when its status is changed or a reply is
posted — `staff_post_reply` already moves `NEW`/`TRIAGED` to `IN_PROGRESS`. Nothing is stranded.

### And no staff screen

Removed for the same reason. One operator means nobody to invite and no roles to re-grant, and the
account is provisioned once from the SQL editor — a path that never went through the console
anyway. `staff_list_accounts`, `staff_set_roles`, `staff_set_active` and the `invite-staff` edge
function all stay deployed and unused.

The console is therefore down to **eight screens**: Login, Dashboard, ticket queue, ticket detail,
enquiry queue, enquiry detail, Calendar, Outbox.

`administerStaff` survives as a capability because the Outbox still uses it to gate re-queueing a
failed customer email — an ADMIN-only action that has nothing to do with managing people.

**Recorded for whoever adds a second operator.** Three things come back together: the assignment
controls (§ above), this screen, and `staff_assign_enquiry` in `0031`. Each is self-contained.

### Explicitly out of scope

Named because each was considered and rejected, not overlooked:

- **Dashboard trends, sparklines and charts.** `staff_dashboard()` returns point-in-time counts and
  the database keeps no history. Real trends need a nightly snapshot table and a cron job to fill
  it; faked ones are worse than none on a compliance tool. Deflection rate is the one figure
  derivable today, from `tickets.source`, and it is still out of scope here.
- **A "New ticket" button.** It appeared in the mockups and cannot be built:
  `create_support_ticket` is granted to `service_role` only, so a staff console cannot call it. An
  agent raising a ticket for a customer who phoned in needs new SQL and compliance sign-off on the
  attested-consent wording. Dropped from the design; worth its own spec.
- **The grievance workflow.** Removed entirely on 2026-08-31 at the user's direction: the site has
  no grievance page — `https://platizioglobal.com/help/grievance` returns 404 — so the console
  should not imply one exists. No nav item, no screen, no chip, no ticket panel. `0018`'s
  `staff_raise_complaint` / `staff_set_complaint_stage` / `staff_close_complaint` remain deployed
  and unused, and `staff_complaint_queue` was dropped from `0031` rather than shipped without a
  caller.

  **Consequence, recorded deliberately.** Terms §25 and Privacy §19 still publish that grievances
  are *"acknowledged within 24 hours and addressed within 15 working days"*, and the footer still
  links `grievances@platizio.com`. Those arrive by email and phone, and are now tracked outside this
  system. Anyone reinstating the workflow should start here.
- **Realtime updates.** Polling stays as it is.
- **Dark mode.** Every state colour below would need re-picking for contrast, and a half-done dark
  mode is worse than none.

## `/help` as the base, plus three accents chosen on sight

This section was rewritten twice and the history matters, because it is the difference between a
decision and a drift.

**First cut** drew from the marketing site broadly, without distinguishing which page a device came
from. **Second cut** stripped it to `/help` alone, on the instruction that the console follow the
live Help & Support page and nothing else. **Third and final:** the two treatments were rendered
side by side as mockups, and the richer one was chosen on sight.

So the base is `/help` — the table below is still what governs panels, controls, rows, motion and
surfaces. Three devices from the **homepage** are deliberately layered on top of it:

| Reinstated | Source | Where |
|---|---|---|
| 3px gradient rule across the top edge | `.feature-card::before` | Stat tiles, ticket action header |
| Gradient-washed icon square | `.feature-icon` | Stat tiles |
| Gold uppercase eyebrow at `0.14em` | homepage section headers | Dashboard section labels |

Plus the glow under the primary button. **The 14px card radius did not come back** — every panel
stays at `--radius-lg`, 18px, which is what `/help` uses.

The discipline that survives from the strict pass: the gradient rule appears on tiles and the
action header **only**, never on the forty-odd ordinary cards, and it never carries state.

What `/help` establishes, and what still governs everything not listed above:

| Element | `/help` rule |
|---|---|
| Panel | white, `1.5px solid --gray-200`, `--radius-lg` (18px), no accent edge |
| Ranking | elevation only — the assistant carries `--shadow-lg`, the FAQ browser beside it carries none |
| Panel header | navy bar, white text, **steady** emerald dot with a `0 0 0 3px` ring |
| Heading | navy, `-0.01em`, weight 600, `text-wrap: balance` |
| Control | pill, `1.5px --gray-200`, weight 500 → hover **navy border + navy text** + `--shadow-sm` → active `scale(0.97)` |
| Primary | `--gold-gradient`, transparent border, weight 600, `--shadow-md` on hover. **The only gradient on the page.** |
| Affirmative | emerald border, `#047857` text |
| Record row | headline navy `550` + trail `--gray-500`, hover `--gray-50` and `translateX(4px)` |
| Small label | `--gray-400`, `0.07em`, uppercase, tabular figures — used for counts and captions. Dashboard *section* labels use the homepage eyebrow instead, see above |
| Motion | one settle per view — `translateY(8px)`, `0.34s cubic-bezier(0.16, 1, 0.3, 1)` |
| Surfaces | `::selection` at `rgba(185,75,18,.16)`; thin `--gray-300` scrollbars |

`/help` has no tables, so the queue row is derived from the one list of clickable records it does
have — `.assistant-result`, the FAQ search hit — rather than invented.

## The token layer

`admin/src/styles/tokens.css` mirrors the brand values from `css/styles.css:5-50`. Three additions
and two corrections:

```css
/* The gradient appears in exactly one place on /help — .assistant-option
   .is-primary, the button that raises a ticket. There is no horizontal
   variant and no glow, because neither exists on the page. */
--gold-gradient: linear-gradient(135deg, #E2682A 0%, #B94B12 50%, #7E3008 100%);

/* The assistant's status dot, and the halo under the spine's current step. */
--emerald-ring: 0 0 0 3px rgba(16, 185, 129, 0.2);
--gold-ring:    0 0 0 3px rgba(185, 75, 18, 0.14);

/* 18px, matching --radius-lg on the live site. Every panel on /help uses this
   one corner, so there is no separate card radius. */
--radius-lg: 18px;
```

`--radius-full: 999px` already exists and is what the pills use. `--radius` (10px) stays for inputs
and small surfaces. Nothing else in the token file changes; the brand values were already correct.

## Component specifications

### Colour semantics

The rule that governs everything else: **the gradient belongs to the primary action and nothing
else. It never carries state, and it never edges a surface.** State is the red/amber/green/blue/
neutral family only.

| Meaning | Token pair | Used for |
|---|---|---|
| Act now | `--danger` on `--danger-bg` | Breached SLA, urgent priority, failed email |
| Caution / internal | `--warn` on `--warn-bg` | Met late, internal notes, legal hold, **every enquiry follow-up state** |
| Done, on time | `--ok` on `--ok-bg` | Met SLA, resolved, sent, converted |
| Informational | `--info` on `--info-bg` | New, triaged, sending, customer message |
| No signal | muted | Closed, low priority, N/A |

**Never red on an enquiry follow-up target.** `contact_enquiries.internal_follow_up_target_at` is an
internal working figure with no published SLA — migration `0027` says so explicitly. Giving it the
same colour as a breached ticket is how it starts being treated as one, and then quoted to an
enquirer. Amber, everywhere, with the words "internal target" beside it.

### Cards

```css
.card {
  border: 1.5px solid var(--gray-200);
  border-radius: var(--radius-lg);
  background: var(--white);
}
```

That is the whole treatment — the border and the corner. `/help` puts no rule, gradient or accent
edge on any surface, and neither does the console.

**Ranking is done with elevation alone.** On `/help` the assistant carries `--shadow-lg` and the FAQ
browser beside it carries none, and the live stylesheet says why: without it "the two read as
interchangeable cards and nothing says which is the point of the page". The console applies the same
device through `.card.is-primary-panel` — used on the ticket screen's conversation thread and on the
action header, and nowhere else.

A card that is genuinely a link (a stat tile) takes the control hover instead: border to `--navy`,
background to `--gray-50`. No lift, no glow.

### The panel bar

`/help`'s most recognisable component, and the console's counterpart to it is the ticket
conversation — the one surface each screen exists to serve. Navy bar, white title, and a **steady**
emerald dot ringed at `0 0 0 3px`. It must not pulse: the live stylesheet notes that "a blinking dot
on a support panel reads as an alert", which matters more here, where a genuine alert is red and
means a breached statutory deadline.

### Buttons

`.assistant-option`, at desk scale. Pill, `1.5px --gray-200`, weight **500**, and every state kept
verbatim:

- **hover** → border and text to `--navy`, plus `--shadow-sm`. Navy, not grey: this is what makes a
  control read as a control rather than a link.
- **active** → `scale(0.97)`. The live comment calls it a "tactile press… reads as a physical
  control rather than a link".

Height is the one change — the site sets `min-height: 44px` for touch, and this is a
mouse-and-keyboard tool, so it comes down to **34px**. Nothing else about the control changes.

| Variant | Treatment | Rule |
|---|---|---|
| `.btn-primary` | `--gold-gradient`, transparent border, weight 600, `--shadow-md` on hover | **At most one per surface.** On `/help` this is the button that raises a ticket, and it is the only gradient on the page. A modal counts as its own surface; an inline form panel does not. |
| `.btn-affirm` | Emerald border, `#047857` text | `.assistant-option.is-affirm` — confirms rather than commits |
| `.btn-navy` | Solid `--navy` | Discloses something without committing to it |
| `.btn` | White, `--gray-200` border | Everything else |
| `.btn-danger` | White fill, red border and text | Outlined, never filled — nothing destructive is one mis-click away |
| `.btn-ghost` | Transparent | Cancel, dismiss |

### Chips

**No change.** `admin/src/components/Chip.tsx` already centralises every mapping, already renders
pills via `--radius-full`, and already puts a leading dot on the three states that mean "act now"
(`BREACHED`, `URGENT`, `FAILED`) so they do not rest on hue alone. It was built to this spec before
the spec existed; it is listed here as a component of the system, not as work.

### Stat tiles

Gradient top rule, a 30px gradient-washed icon square, uppercase label, 24px tabular figure, and a
hint line. Every tile is a link into the queue pre-filtered to exactly what it counted — that is
already true and stays true.

### Section headers

Dashboard sections use the homepage's `.eyebrow` — uppercase, `letter-spacing: 0.14em`, weight 700,
`--gold-deep`. It is the strongest of the three reinstated accents and the one that does most work:
it separates Support from Sales from Email without a rule, a box or a heading level.

Page headings stay on `/help`'s treatment — `--navy`, weight 600, `letter-spacing: -0.01em`,
`text-wrap: balance`. The eyebrow sits *above* a heading, not beside one, so the two do not compete.

## Screen changes

### Dashboard

From four undifferentiated tile grids to a prioritised page:

1. **Greeting header** — "Good afternoon, Anuj", with a one-line summary derived from the counts
   already in hand ("Two things are past their deadline and one email has not gone out"). Derived
   client-side from the `staff_dashboard()` payload; no new field.
2. **Eyebrow-labelled sections** — Support · Sales · Email.
3. **"Needs attention now"** — a table of the handful of tickets that have breached a deadline,
   from a `staff_ticket_queue({slaOnly: true})` call the screen can already make.

### Ticket detail — the action header

The one layout change in this spec. In the current build the actions an agent performs most —
status changes — sat below the fold under a stack of eight rail cards, so the things done
every few minutes are the things you scroll to find.

A sticky header at the top of the screen carries, in order:

- Breadcrumb and monospace reference
- Subject as the page heading
- Status, priority, source and legal-hold chips on one row
- **Actions as pills on that same row, right-aligned:** Status ▾ · Close · Refresh
- **A two-box SLA strip:** first reply and resolution

Below it, the existing two-column layout with the rail narrowed from 320px to **198px**. The rail
keeps reference material only: requester, status, consent and retention, email delivery. Everything
an agent *does* lives in the header and is never scrolled away from.

Attachments move up under "The request", where they belong — they are part of what the customer
sent, not a separate concern.

### Queue, Enquiries, Outbox, Calendar

Styling only. Tabs gain the gold underline, filter rows gain the card treatment, tables gain the
sticky header and row hover. No structural change; the filter payloads and RPC calls are untouched.

## The collapsible sidebar

Default **232px, labelled**, with section headings and live counts. A control in the brand row
collapses it to **56px, icons only**. The choice persists in `localStorage` under
`platizio-console-rail`, so it survives a reload and a redeploy.

Requirements that are easy to get wrong:

- The toggle is a real `<button>` carrying `aria-expanded`.
- Collapsed items keep an accessible name — `aria-label` plus a `title` for the sighted tooltip.
  An icon with no name is unusable with a screen reader.
- A count that cannot be rendered collapses to a **dot**, not a truncated number. `12` shown as `1`
  is worse than no number at all.
- The transition is a width change, and it respects `prefers-reduced-motion` like everything else.

## Accessibility

Carried forward from the existing build, none of it optional:

- `:focus-visible { outline: 3px solid var(--gold) }` — the same convention as the marketing site,
  so someone who tabs through both does not have to learn two.
- Real `<button>` elements. Table rows stay `tabIndex`-focusable with `Enter` and `Space` handlers,
  and every row keeps a real link in its reference cell for middle-click and screen readers.
- Toast region stays `aria-live="polite"`. Errors are sticky; confirmations fade.
- The chips that mean "act now" carry a dot, so state does not rest on hue alone.
- Contrast: every foreground/background pair in the state palette is checked at 4.5:1 against its
  own background, not against white.

## Files touched

```
admin/src/styles/tokens.css          three additions
admin/src/styles/console.css         the bulk of the change
admin/src/components/AppShell.tsx    collapsible rail, greeting-aware header
admin/src/screens/Dashboard.tsx      greeting, eyebrow sections, needs-attention table
admin/src/screens/TicketDetail.tsx   action header, narrowed rail, attachments moved
admin/src/screens/*.tsx              class renames only
```

`admin/src/lib/*` is not touched. No file under `supabase/` is touched.

## Verification

1. **`npm run build` in `admin/`** — tsc plus vite build. The only automated gate this app has.
2. **`npm run build` at the repo root** — must still report **50 pages, 49 sitemap URLs**. The
   console shares no code with the marketing site, so any change to that number means something
   leaked.
3. **Walk all eight screens in demo mode** — `VITE_DEMO=1` renders every screen from fixtures with no
   backend, which is what makes a styling change reviewable without a database.
4. **Collapse and reload** — the rail returns collapsed. Collapse, navigate to a ticket, reload
   again: still collapsed.
5. **No grievance surface anywhere** — no nav item, no screen, no chip, no panel, no action.
   `/grievances` redirects to the dashboard. The only permitted appearances of the word are the
   `GRIEVANCE_OFFICER` role name, a customer's own message text, and the `complaint_acknowledgement`
   template in the outbox — all of which are records, not features.
6. **Keyboard only** — tab from the rail through the queue into a ticket, reply, change status.
   Every control reachable, focus ring visible on all of them, nothing reachable only by mouse.
7. **Collapsed rail with a screen reader** — every icon announces its destination.
8. **Narrow viewport** — 1280px is the design target; at 1100px the ticket detail drops to one
   column and the action header must not overflow.

## Risks

- **The accent spreads.** Three homepage devices are deliberately in play, and each one is scoped to
  a named place: the gradient rule to stat tiles and the ticket action header, the icon square to
  stat tiles, the gold eyebrow to dashboard section labels. **Nothing else.** Put the rule on an
  ordinary card and it stops being a signature; put an eyebrow on every heading and the page stops
  having bands. The check is a grep for `gold-gradient-h` — it should return the token definition
  and exactly two rules, `.tile::before` and `.thead::before`.
- **The action header grows.** It currently holds four chips, four buttons and four SLA boxes. That
  is already near the limit for one strip at 1280px. Anything new added later belongs in the rail.
- **Demo fixtures drift from the RPC projections.** `admin/src/lib/demo.ts` is hand-written and
  verified against nothing. A screen that looks right in demo mode can still be wrong against the
  database — only the round trip against a real project proves anything, and that remains unrun
  until Docker or a Supabase branch is available.
