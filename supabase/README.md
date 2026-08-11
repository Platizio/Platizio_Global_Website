# Support ticketing backend

Postgres in Mumbai behind the `/help/raise` form: the request is stored, the
customer gets a real reference, and every status change afterwards is on an
append-only trail.

Project `qtjnlkobvnhhgsnyufzv`, region `ap-south-1`. Region is immutable, which
is why the pre-existing Singapore project was abandoned rather than reused.

```
supabase/
  config.toml
  migrations/     0001–0014, applied in order
  functions/
    _shared/                validation, CORS, captcha, service client
    create-ticket/          intake            (browser, anon key)
    finalize-ticket/        upload confirmation + acknowledgement
    drain-outbox/           email sender      (cron, service key only)
    sweep-storage/          orphan + retention file removal (cron)
```

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
| 7 | **Fill in the holiday calendar** | `business_holidays` is seeded with three fixed-date national holidays only. Everything else moves with the lunar calendar and is an operational decision. |
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

Two files are not in the layout the design sketched, and both are deliberate.
`0012` exists because "what can code outside the database make it do?" deserves
one file as its answer, the same argument that put all the RLS policies in
`0010`. `0013` and `0014` are corrections found by running the thing, and are
appended rather than folded back into `0011` because migrations are append-only.

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

**Acknowledgement** — rendered at enqueue and inspected in full; carries the
real reference, the published timelines quoted from the Support FAQ, and the
anti-phishing line. A retried finalize did not queue a second one.

**Retention** — a ticket with a live complaint survived the purge; under legal
hold it survived; with both released it was deleted, and its trail, consent and
attachment rows cascaded with it.

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

**One deliberate advisor notice remains:** `private.rate_limit_hits` has RLS
enabled with no policies. That is the intent — no policy means no access, and
the schema is not exposed to PostgREST at all.

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
- **`ContactModal`** now captures consent but still posts to Web3Forms. The
  decision recorded in that file is that it moves to its own table with its own
  timings in a later slice — deliberately not into `tickets`, which would put
  sales enquiries into the queue support is measured on.
