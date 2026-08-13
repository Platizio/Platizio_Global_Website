# Support ticketing backend

Postgres in Mumbai behind the `/help/raise` form: the request is stored, the
customer gets a real reference, and every status change afterwards is on an
append-only trail.

Project `qtjnlkobvnhhgsnyufzv`, region `ap-south-1`. Region is immutable, which
is why the pre-existing Singapore project was abandoned rather than reused.

```
supabase/
  config.toml
  migrations/     0001–0026, applied in order
  functions/
    _shared/                validation, CORS, captcha, tokens, clients
    create-ticket/          intake                     (browser, anon key)
    finalize-ticket/        upload confirmation + acknowledgement
    request-status-link/    emails a magic link        (browser, anon key)
    lookup-status/          token -> the customer's own tickets
    staff-attachment/       audited 60-second document link  (staff session)
    invite-staff/           auth user + roles, one call      (staff session)
    drain-outbox/           email sender               (cron, service key only)
    sweep-storage/          orphan + retention file removal (cron)

src/admin/api/            the staff side, as typed calls
  session.ts                sign-in and refresh, against GoTrue directly
  desk.ts                   every staff RPC, one function each
  types.ts                  the shapes those RPCs return
```

`src/admin/api` adds no dependency — no `@supabase/supabase-js`, same as the
customer transport in `src/help/api`. This is a marketing site whose bundle
every visitor downloads, and the SDK would be carried by all of them to serve
the handful of people who ever sign in. There is no admin **UI** yet; this is
the seam one would be built on.

---

## Before this takes real traffic

Nothing below is optional, and none of it can be done from a code change.

| # | What | Why it blocks |
|---|---|---|
| 1 | **Move the project to Pro (~$25/mo)** | Free projects auto-pause after ~7 days idle. A paused database means the intake form returns an error to a customer. Pro is also what buys point-in-time recovery for a store holding regulated personal data. |
| 2 | **DNS for the sending domain** — SPF, DKIM, DMARC | Longest external lead time; start it first. Until it is done no acknowledgement can be delivered. |
| 3 | **Turnstile site key + secret** | While `TURNSTILE_SECRET_KEY` is unset the function accepts submissions and records `captcha_verified = false`. Intake must not be linked publicly in that state. |
| 4 | **Resend (or Postmark) account + API key** | Supabase's built-in mailer is for auth only and explicitly not for transactional mail. |
| 5 | **Vault secrets** (below) | Without them the two cron-driven Edge Functions no-op. Nothing breaks; nothing sends either. |
| 6 | **Vercel environment variables** (below) | Until these are set, the form still posts to Web3Forms and issues no reference. |
| 7 | **Fill in the holiday calendar** | Only the fixed-date national holidays are seeded. Everything else — Diwali, Holi, the two Eids — moves, and the dates come from the exchange circular. See "The calendar errs short" below; `staff_dashboard()` reports `holidayCoverage.looksThin` until this is done. |
| 8 | **Restrict Supabase org membership** | Studio runs as `service_role`. Adding a member is granting database god mode — see "The honest limit" below. |

### Vercel environment variables

```
VITE_SUPABASE_URL=https://qtjnlkobvnhhgsnyufzv.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Settings → API>
VITE_TURNSTILE_SITE_KEY=<Turnstile site key>     # optional until go-live
```

None are secrets — everything prefixed `VITE_` is compiled into the bundle and
readable by anyone. **The service role key is not among them and must never be.**

### Supabase Edge Function secrets

Settings → Edge Functions → Secrets:

```
TURNSTILE_SECRET_KEY=<Turnstile secret>
RESEND_API_KEY=<Resend API key>
MAIL_FROM=Platizio Global Support <supportglobal@platizio.com>
ALLOWED_ORIGINS=https://platizioglobal.com,https://www.platizioglobal.com   # optional
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform.

### Vault secrets

Needed by the cron jobs, which call Edge Functions over HTTP and therefore need
a URL and a credential. Set them in the SQL editor:

```sql
select vault.create_secret('https://qtjnlkobvnhhgsnyufzv.supabase.co', 'project_url');
select vault.create_secret('<service role key>',                       'service_role_key');
select vault.create_secret('supportglobal@platizio.com',               'sla_alert_email');
```

Until `project_url` and `service_role_key` exist, `platizio-outbox-drain` and
`platizio-storage-sweep` log a notice and do nothing. Until `sla_alert_email`
exists, the SLA sweep still flags breaches but sends no warning.

---

## The security model, and its honest limit

`anon` has no privilege on any table and no policy on any table. Intake goes
through an Edge Function holding the service key, so the browser never carries a
credential that can write a ticket. Verified: every table returns **401** to the
anon key over HTTP, and every RPC returns *permission denied for function*.

Staff read and write through policies keyed on `app_metadata.platizio_roles`,
put there by `custom_access_token_hook`. Roles live in `app_metadata` and never
in `user_metadata`, because the latter is writable by the user it belongs to —
an agent who could write there could promote themselves to Grievance Officer.

**The limit:** Supabase Studio operates as `service_role`, which bypasses Row
Level Security entirely. While staff work in Studio, RLS is protecting nothing
from them.

What still holds is triggers and constraints. `service_role` bypasses RLS
specifically; it is not a superuser, and only a table's owner or a superuser can
disable a trigger. So the enforcement that matters is written as triggers, and
it holds as long as the tables stay owned by `postgres`.

Re-check that after any migration that creates a table:

```sql
select tablename, tableowner from pg_tables
where schemaname = 'public' and tableowner <> 'postgres';
-- must return zero rows
```

Given all of the above, **Studio access is itself the access control.** Restrict
org membership to Anuj Pal and the developer, and treat adding a member as
granting full read and write over every customer's support history.

---

## What each migration does

| File | Contents |
|---|---|
| `0001_enums` | State-machine value sets; the `private` schema |
| `0002_taxonomy` | Category/subcategory lookups, seeded from `src/help/ticketTaxonomy.ts` |
| `0003_tickets` | `tickets`, `ticket_messages`, `complaints`; reference generation |
| `0004_audit` | `ticket_status_history` and the append-only triggers |
| `0005_consent` | `consent_records` — verbatim text, not a boolean |
| `0006_attachments` | Attachment rows and the private bucket |
| `0007_notifications` | The email outbox |
| `0008_staff_roles` | `staff_users`, `user_roles`, the JWT hook, complaint-closure guard |
| `0009_business_hours` | The calendar and `add_business_time()` |
| `0010_rls` | Every policy in the system, in one file |
| `0011_cron` | Four scheduled jobs and their plumbing |
| `0012_intake_api` | The SECURITY DEFINER RPCs the Edge Functions call |
| `0013_purge_honours_ticket_hold` | Fix: a hold on a ticket now also holds its complaint |
| `0014_relocate_pg_net` | Move `pg_net` out of the `public` schema |
| `0015_status_lookup` | Magic-link tokens and the customer-safe ticket projection |
| `0016_fix_rate_limit_ambiguity` | Fix: the rate limiter raised on every call and never counted |
| `0017_staff_workflow` | Staff provisioning, assignment, status, replies; derived customer status |
| `0018_complaints_workflow` | Grievances: raise, progress, close; the T&C §23 clock joins the sweep |
| `0019_staff_read_api` | The read side: queue, detail, dashboard, directory; live SLA state |
| `0020_attachment_access` | Audited KYC downloads; storage policy narrowed to ADMIN break-glass |
| `0021_staff_admin_api` | Account lifecycle, the role-change trail, the last-admin lock |
| `0022_closure_emails` | Fix: resolving a ticket and closing a grievance both told the customer nothing |
| `0023_holiday_calendar` | `staff_set_holidays()`, and a coverage figure on the dashboard |
| `0024_staff_whoami` | Who is asking, and what they may do |
| `0025_admin_guard_allows_direct_sql` | Fix: `0021` locked the SQL editor out of creating the first admin |
| `0026_fix_consent_column_in_detail` | Fix: `0019` read `consent_records.granted_at`, which does not exist |

`0012` is not in the layout the design sketched, and that is deliberate: "what
can code outside the database make it do?" deserves one file as its answer, the
same argument that put all the RLS policies in `0010`. `0013`, `0014`, `0016`,
`0022`, `0025` and `0026` are corrections found by running the thing, appended
rather than folded back into the migrations they fix, because migrations are
append-only.

`0026` is the exception to that rule and says so in its own header: `0019` had
not shipped when the defect was found, so its file **is** corrected in place and
`0026` exists only because this project has already recorded `0019` as applied
and will not run it again. A fresh deployment gets `0019` right first time and
`0026` is a harmless re-creation there.

### `0016` is the one worth reading

The rate limiter **never worked**. `rate_limit_consume` declared a variable
named `window_start` and wrote to a column named `window_start`; PL/pgSQL calls
that ambiguous and refuses the statement outright, so every call raised.

It survived deployment because of how the two callers handle that error, and
they differ on purpose:

- `create-ticket` logs and continues. Losing a genuine support request because a
  counter was briefly unavailable is worse than failing to throttle one. So
  intake worked perfectly and was completely unthrottled.
- `request-status-link` fails closed, because it sends mail. It returned 503 for
  every request — which is how the bug surfaced, on its first test.

The lesson is not "fail closed everywhere"; intake's choice is still right. It
is that the fail-open branch turned a hard error into silence, and the signal
that would have caught it — how often the limiter errors — is the one nobody was
watching. **Worth an alert on that log line before this takes traffic.**

It also means the first verification pass read stronger than it was: the brief
asked for "exceed the rate limit; confirm rejection", and that check had not
actually been run. It has now, both directly and over HTTP.

---

## The customer status page

`/help/status`. A customer enters an email, gets a link by mail, and the link
opens the requests raised from that address.

**It is not "enter your ticket number", and cannot be.** References come from
one sequence, so a lookup keyed on the reference would hand anyone every
customer's name, email, mobile and problem description by counting upwards.
Adding "and your email" narrows that but still answers "has this person ever
contacted Platizio", which is itself a disclosure for a broker's support desk.
Proving control of the mailbox is the only version that leaks nothing.

- Tokens are 32 random bytes; only the SHA-256 is stored, so the table holds no
  working links.
- 30-minute expiry, reusable within it — a single-use link breaks on a refresh
  or an email client that pre-fetches URLs, and the failure looks like a bug.
- `request-status-link` returns an identical response whether or not the
  address has tickets, including when rate-limited. The truth is a log line.
- The projection is built in SQL and returns `status_customer` only. No
  internal status, no assigned agent, no SLA deadline, no submitting IP.
- Unlike intake, this endpoint **fails closed** if the rate limiter errors. It
  sends mail, and an unthrottled mail-sending endpoint is somebody else's
  problem to live with.

---

## The staff side

Two paths change a ticket, and both are legitimate:

| | |
|---|---|
| **The `staff_*` RPCs** | Do what a bare `UPDATE` cannot: stamp `first_response_at`, queue the customer's email, attach a reason to the trail. Called by a signed-in agent's own session. |
| **A direct edit in Studio** | Still audited by the trigger, still bound by every constraint. It just does not send or stamp anything the triggers cannot. |

The second exists because the team has to be able to work before an admin app
is built. It is not a hole — it is the consequence of shipping the database
first, and the trail records it either way.

**Provisioning the first account.** Creating the auth user needs the Auth admin
API, so do it in the dashboard (Authentication → Users → Add user), then:

```sql
select public.provision_staff_user(
  '<uuid from the dashboard>', 'Anuj Pal', 'anuj@platizio.com',
  array['ADMIN','GRIEVANCE_OFFICER']::public.staff_role[]);
```

After that first one, `invite-staff` does both halves in a call — it creates the
login through the Auth admin API and grants the roles, rolling the auth user
back if the second half fails. An orphaned login is not harmless: it exists, it
can complete a password reset, and it holds no roles, so it reads as a dormant
employee rather than as debris.

Only an **active** `ADMIN` may call it, and that is checked against the table
rather than the token — `has_staff_role()` reads `app_metadata`, which is a
snapshot from up to an hour ago, so an admin switched off twenty minutes ago
would still pass it. `staff_whoami()` reads `staff_users.is_active`, so they do
not.

**Roles afterwards** are `staff_set_roles()` (replaces the set) and
`staff_set_active()` (the leaver switch — accounts are never deleted, because
their id is attached to every message they wrote). Both are ADMIN-only, both
append to `staff_role_audit`, and two locks stop the answer to "who is admin"
becoming "nobody":

- An admin cannot strip their own `ADMIN` or deactivate themselves. The
  realistic version of this mistake is not malice, it is someone tidying up
  their own account and locking the door from the outside.
- The last active `ADMIN` cannot be removed by any route, including the service
  key and the SQL editor. Without this, the first lock is defeated by two admins
  demoting each other.

`staff_set_active` does **not** kill an existing token. Tokens live an hour, so
a deactivated account keeps working until its current one expires; for a real
emergency, deactivate *and* sign the user out in the dashboard.

**Enable the JWT hook** — Authentication → Hooks → Customize Access Token (JWT)
Claims → `public.custom_access_token_hook`. Creating the function is not enough.
Without this every staff login issues a token with no roles, which reads as
"not staff" to every policy.

**Customer status is derived**, not set by hand. `WAITING_ON_BROKER` shows the
customer plain "In progress" — they never learn their query is sitting with a
counterparty. An agent who wants to say something different can still set
`status_customer` explicitly in the same statement; the trigger defers to them.

**Replying is what stops the first-response clock.** `staff_post_reply` stamps
`first_response_at` and nothing else does, because a separate "mark responded"
call would eventually be missed and the SLA report would quietly measure
nothing. An internal note deliberately does not stop it.

**Grievances.** `staff_raise_complaint` registers one, emails the customer the
acknowledgement T&C §23 promises within 24 hours, and **reopens the ticket** —
a customer who escalates is saying the matter is not settled, whatever the
ticket says. Closure is `staff_close_complaint`, requires a written outcome, and
is refused to anyone without `GRIEVANCE_OFFICER`. It still cannot be done from
Studio at all, because a Studio session has no resolvable actor.

**Reading the desk.** Four read RPCs, each one round trip and each returning the
shape a screen wants: `staff_ticket_queue` (filter, search, paginate),
`staff_ticket_detail` (ticket, messages, attachments, trail, consent, grievance
and outbox in one call), `staff_dashboard`, `staff_directory`.

SLA state on those comes from the due dates *live*, not from the stored
`first_response_breached` flags. Those are set by the hourly sweep, so between
sweeps they lag by up to an hour, and a queue that says "on time" about a ticket
that went past due forty minutes ago is worse than no queue.

### Two endings that used to be silent

Found while writing the read API, and fixed in `0022`:

- `staff_set_status(..., 'RESOLVED')` resolved the ticket and **sent nothing**.
  Every reply the customer had received said "reply to this email"; the last
  word in the conversation was ours and we never said it.
- `staff_close_complaint()` wrote the closure summary into an **internal** note.
  So the outcome of a formal grievance — the document the whole escalation
  exists to produce — was recorded where the complainant could not see it. That
  is not a UX gap; a grievance process that does not communicate its outcome has
  not concluded.

Both now render at enqueue and go through the same outbox as everything else.
The resolution email carries the closing note as its body and names the
escalation route, because a resolution the customer does not accept is exactly
when the grievance path matters. The internal note on closure stays — the email
is a separate obligation and neither substitutes for the other.

### Someone looked at a customer's passport

`0006` put attachments in a private bucket and `0010` gave staff a storage
SELECT policy over it. Correct as far as it goes — the documents are not public
and the people who need them can reach them. What it did not do is leave a
record. An agent could enumerate every object and download every address proof,
bank statement and government ID the firm has ever received, and afterwards
nothing anywhere said they had.

For ordinary attachments that would be untidy. For KYC-grade documents it is the
precise thing this system was built to avoid — the original complaint about
Web3Forms was that these files went somewhere unaccountable.

So `0020` narrows the storage policy to `ADMIN` break-glass, and ordinary access
goes through `staff_open_attachment()`, which writes an append-only
`attachment_access_log` row and hands back a path. The `staff-attachment` Edge
Function turns that into a **60-second** signed URL using the service key. The
enforcement is not a rule asking clients to log their reads; it is the removal
of any way to read without logging — minting a signed URL needs the service key,
and the service key is not in the browser.

Two consequences worth naming:

- The log is written **before** the URL exists, so a failure to sign leaves a
  record of an access that produced no bytes. That is the right way round: an
  over-recorded attempt is noise, an unrecorded successful read is the failure.
- `attachment_access_log.attachment_id` carries **no foreign key**, deliberately.
  Attachments are purged at 12 months while the ticket lives five years, so a
  cascade would lose the record of who read the file before the record stopped
  mattering. And `ON DELETE SET NULL` executes as a real `UPDATE`, which an
  append-only table refuses — `confirm_attachments_swept()` would have started
  failing on the first 12-month sweep. Append-only and `ON DELETE SET NULL`
  cannot both be true of one column.

`staff_attachment_access_history()` is the supervisory read, and is restricted
to `SUPERVISOR` / `GRIEVANCE_OFFICER` / `ADMIN`. An agent writes to that log
constantly and never needs to read it; letting the watched read the watchlist is
how you find out which reads go unnoticed.

### The calendar errs short

`business_holidays` holds the statutory fixed dates only. Every other Indian
market holiday moves, and the dates come from the exchange circular each year.
`0023` does **not** guess them, and that is a choice rather than an omission:

- A *missing* holiday makes the SLA tighter than it should be. We promise a
  first response sooner than the calendar really allows.
- A *wrongly-added* holiday makes the SLA looser. We quietly give ourselves an
  extra day the customer was never told about.

The first is embarrassing; the second makes a published SLA untrue, which is the
whole thing this system exists to prevent. So load them from the circular:

```sql
select public.staff_set_holidays(2027, '[
  {"date":"2027-01-26","label":"Republic Day"},
  {"date":"2027-03-22","label":"Holi"}
]'::jsonb);
```

It replaces the year outright rather than merging — the failure mode of a merge
is last year's Diwali sitting in the table, silently extending one SLA a year,
indistinguishable from a date somebody meant to add. It refuses an empty list,
refuses a date outside the year named, and de-duplicates a repeated line.

**Due dates are stored when a ticket is created** (that is how `0009` makes them
immutable), so loading a holiday changes the SLA of tickets raised *afterwards*
and nothing already in the queue. Load the year before the year starts.

---

## Verification

Everything below was run against the live project. `[HTTP]` means it was
exercised over real HTTP through PostgREST or the Edge Function, not simulated.

**Schema and triggers** — all pass:

- Studio-style direct `UPDATE` of a ticket's status → trail row appended,
  actor recorded as `sql:postgres`
- `UPDATE` / `DELETE` on `ticket_status_history` → rejected, both
- `DELETE` a consent record → rejected; rewriting consent text → rejected;
  recording a withdrawal → allowed
- Editing a `ticket_messages` row after the fact → rejected
- A subcategory from the wrong category → foreign key violation
- A fourth attachment on one ticket → rejected
- An attachment path outside its own ticket folder → check violation
- Closing a complaint with no authenticated actor → rejected
- A 5-character description → check violation

**SLA arithmetic:**

| Raised (IST) | First response due | Correct |
|---|---|---|
| Fri 16:30 | **Mon 16:30** | never Saturday |
| Sat 11:00 | Mon 17:00 | clock starts Monday 09:00 |
| Thu 1 Oct 16:00 | Mon 5 Oct 16:00 | Fri 2 Oct is a seeded holiday |
| Mon 03:00 | Mon 17:00 | clamped to opening |

**RLS** `[HTTP]` — `tickets`, `consent_records`, `ticket_status_history`,
`staff_users`, `ticket_categories` all returned 401 to the anon key. In-database
role impersonation additionally confirmed every table, every RPC and the
`private` schema are denied to `anon`, and that a signed-in non-staff user sees
zero rows.

**Intake** `[HTTP]` — a real submission returned `PG-2026-000001` with a signed
upload URL scoped to that ticket's folder and a sanitised filename. The ticket,
its consent record (verbatim text + policy version), its attachment row and its
trail row were all written in one transaction. Whitespace was trimmed and the
email lowercased.

**Abuse** `[HTTP]` — a replayed submission returned the original reference and
created no second ticket. A malformed submission returned a clean 400 that
quotes no schema detail. `drain-outbox` called with the anon key returned 401.
Seven intake attempts from one address: five accepted, the sixth and seventh
refused with **429**.

**Status page** `[HTTP]` — a known and an unknown address returned byte-identical
responses; only the known one minted a token and queued mail. What is stored is
the SHA-256, not the link. The token opened exactly one ticket carrying the
customer-safe fields and nothing else — no internal status, no agent, no SLA
date, no mobile number. Expired and unrecognised tokens both dead-end.

**Acknowledgement** — rendered at enqueue and inspected in full; carries the
real reference, the published timelines quoted from the Support FAQ, and the
anti-phishing line. A retried finalize did not queue a second one.

**Retention** — a ticket with a live complaint survived the purge; under legal
hold it survived; with both released it was deleted, and its trail, consent and
attachment rows cascaded with it.

**Staff workflow** — run against a real provisioned staff account with a
simulated session (the JWT hook, `auth.uid()` and every policy exercised for the
first time). Assignment promoted `NEW → TRIAGED`; an internal note left
`first_response_at` null and queued no mail; a reply stamped it, queued the
mail and moved the ticket to `IN_PROGRESS`; `WAITING_ON_BROKER` showed the
customer `IN_PROGRESS`; resolving stamped `resolved_at`; raising a grievance
reopened the ticket and queued the acknowledgement. An `AGENT` attempting to
close the grievance was refused, the `GRIEVANCE_OFFICER` succeeded, and a
signed-in non-staff user was refused everything.

**The JWT hook** — returns `app_metadata.platizio_roles` for each staff member,
preserves existing claims, and returns an empty array for a stranger.

**Staff RLS** — with an `AGENT` token: tickets, consent records and the trail
readable; `notifications` (SUPERVISOR/ADMIN) and `ticket_access_tokens` (ADMIN)
both return zero rows. A signed-in non-staff user reads zero rows everywhere.

**The read API, admin surface and audited attachments** — 37 steps against four
simulated staff sessions (ADMIN, AGENT, SUPERVISOR, GRIEVANCE_OFFICER) plus a
signed-in stranger and a plain SQL session. All pass:

| | |
|---|---|
| Bootstrap | The first `ADMIN` provisioned from a claimless SQL session — the `0025` path |
| Queue | Default view, `unassigned` filter, and a search for a literal `%` returning **0** rather than everything, which is the `LIKE` escaping working |
| Detail | Consent record with its `given_at` and policy URL, attachments, trail — the `0026` fix |
| SLA | A ticket raised 15:44 IST Wed came due **15:45 IST Thu** — 8 business hours across a closing time |
| Workflow | Reply stamped first response and queued mail; `WAITING_ON_BROKER` showed the customer `IN_PROGRESS`; resolving queued the resolution email carrying the closing note; **resolving a second time queued no second email** |
| Grievance | Closure by the officer queued the outcome email to the customer, carrying the findings verbatim |
| Attachments | Opening one wrote the log row with actor, reason and IP; the supervisor read it back |
| Append-only | `UPDATE` and `DELETE` on `attachment_access_log`, and `DELETE` on `staff_role_audit`, all rejected from a `postgres` session |
| Admin locks | Self-demotion refused, self-deactivation refused, and deactivating the **only** admin refused even from SQL |
| Calendar | Agent refused; wrong-year payload refused; empty payload refused; a 4-line list with one duplicate loaded as 3 |

Refusals were checked by their message, not just by failing:
`This action requires one of these roles: GRIEVANCE_OFFICER`,
`This action requires an active staff account`,
`You cannot deactivate your own account.`

All fixture data was purged afterwards and every counter is back to zero.
Removing the `staff_role_audit` rows needed the table's owner to drop the
trigger and put it back, which is itself the property that table claims:
`service_role` cannot do that, and `postgres` can.

**Every SECURITY DEFINER function reachable by `authenticated` was checked for
its guard** — 18 of 19 call `require_staff()` or `require_admin()`. The
nineteenth is `staff_whoami()`, which is unguarded on purpose and reads only the
caller's own row.

**Build** — `npm run build` (which runs `tsc` first) is clean.

### Not verified here, and why

**The browser → Storage upload leg.** This container's network policy blocks
outbound HTTPS to `*.supabase.co`, and `pg_net` — the workaround used for every
other `[HTTP]` check above — can only send a JSON body, so it cannot `PUT` file
bytes to a signed URL. Everything on both sides of that leg is verified: the
signed URL is minted correctly, and `finalize-ticket` correctly reported the
file as missing and returned the partial-failure state when no upload arrived.

**Check this first on the first real submission.** Attach a PDF, then confirm:

```sql
select original_filename, verification_state, verified_mime, verified_bytes
from public.ticket_attachments order by created_at desc limit 5;
```

`verification_state` must be `VERIFIED` and `verified_mime` `application/pdf`.
If it says `MISSING`, the `PUT` in `uploadToSignedUrl` is not landing — check
the browser network tab for the response Storage gave.

**Email delivery**, which needs the Resend key and the sending domain.

---

## Operational notes

**Cron jobs** (`select * from cron.job`):

| Job | Schedule (UTC) | Does |
|---|---|---|
| `platizio-outbox-drain` | every minute | sends queued email |
| `platizio-sla-sweep` | every 15 min | warns 2h before a deadline, flags after |
| `platizio-storage-sweep` | hourly at :17 | removes orphaned and expired files |
| `platizio-retention-purge` | 21:00 (02:30 IST) | deletes what §9 says to delete |

**The reference sequence** starts at 1, so the first real ticket is
`PG-2026-000001`. Verification data was purged and the sequence rewound. Two
references subtracted give a volume estimate, so the reference must never be
used as an ordering or counting signal anywhere public.

**Two advisor notices remain, both deliberate.**

`private.rate_limit_hits` has RLS enabled with no policies (INFO). That is the
intent — no policy means no access, and the schema is not exposed to PostgREST
at all.

`authenticated_security_definer_function_executable` (WARN) fires once for each
of the 19 staff RPCs. It is describing the architecture rather than a defect:
every staff function is `SECURITY DEFINER` and granted to `authenticated`
precisely so that a signed-in agent reaches a written refusal instead of
`permission denied for function`, and so the projection they get is decided in
one place rather than by whatever RLS happens to allow.

The lint's real concern — a `SECURITY DEFINER` function that forgets to
authorise — is worth checking mechanically after any migration that adds one:

```sql
select p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  and p.prosrc !~ 'require_staff|require_admin';
-- must return staff_whoami and nothing else
```

---

## Still open — needs a person, not a developer

- **The residency line.** `faqData.tsx` sc-6 says data is *"stored in GIFT
  IFSC, India"*. Mumbai is India but is not GIFT City. Either that answer is
  clarified to distinguish brokerage custody from support systems, or the claim
  does not match the system. Compliance call, and it is the one item here that
  is a published statement rather than a configuration gap.
- **Privacy Policy §7** covers "cloud service providers" generically. Naming
  Supabase would be cleaner.
- **Attachment retention** — 12 months or the full 5 years.
  `tickets.attachment_retention_expires_at` is a separate column so this is an
  `UPDATE`, not a migration. Currently defaults to 5 years.
- **The SLA reading.** "Within 24 hours on business days" is encoded as 8
  business hours — one working day. The alternative reading, 24 *business*
  hours, is three working days and would make the internal clock laxer than the
  public promise. Worth a sign-off; see the long note in `0009`.
- **Who owns the queue**, and who gets Supabase org membership.
- **Web3Forms key rotation** when the fallback transport is retired. The key is
  in the repository history, so deleting the code does not undo the exposure.
- **The admin app.** The database and its API are complete, and `src/admin/api`
  is a typed client for all of it, but **there is no UI**. That is the one
  substantial thing still missing, and it is a frontend job rather than a
  backend one. Until it exists the team works in Studio — audited, but
  `service_role`, so see "the honest limit" above.

  Two actions Studio cannot perform at all, because both need a resolvable
  actor: closing a grievance, and opening an attachment through the audited
  path. The second has an `ADMIN` break-glass route through the storage policy
  if the Edge Function is ever down; the first does not.
- **`ContactModal`** now captures consent but still posts to Web3Forms. The
  decision recorded in that file is that it moves to its own table with its own
  timings in a later slice — deliberately not into `tickets`, which would put
  sales enquiries into the queue support is measured on.
