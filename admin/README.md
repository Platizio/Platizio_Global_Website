# Platizio Support Console

The staff side of the support system: work the ticket queue, reply, assign, escalate to a
grievance, handle sales enquiries, administer staff accounts, and watch the email outbox.

It is a **separate app** from the marketing site in the repository root — its own
`package.json`, its own build, and its own Vercel project on `admin.platizioglobal.com`. The two
share a Supabase project and nothing else.

## Running it

```bash
npm install
npm run dev          # http://localhost:5174
```

Copy `.env.example` to `.env.local` and fill both values in — the same project URL and anon key
the marketing site uses. Without them the app renders a "not configured" screen rather than a
login that could never succeed.

Port 5174 is deliberate: the marketing site runs on 5173, and the end-to-end check raises a
ticket in one window and works it in the other. Both ports are named in the edge functions'
`ALLOWED_ORIGINS`.

## How it talks to the backend

**Through the `staff_*` RPCs, exclusively.** Never a direct table select, and that is not a style
preference.

Every RLS policy in this project is built on `public.is_staff()` and `has_staff_role()`, which
resolve roles from `auth.jwt() -> app_metadata -> platizio_roles` — a claim written by the
`custom_access_token_hook`. The `staff_*` functions are `security definer` and guard with
`private.require_staff()`, which reads `staff_users` and `user_roles` **from the tables**. So the
RPCs work whether or not that hook is enabled on the project, while a direct PostgREST select
would silently return zero rows. Zero rows is the worst failure available here: it looks exactly
like an empty queue.

One thing goes through an edge function instead, because it needs the service key for work the
database cannot do alone:

- `staff-attachment` — writes `attachment_access_log` **before** minting a 60-second signed URL,
  so there is no way to read a customer's file without leaving a record.

It is called with `supabase.functions.invoke`, which sends the agent's own access token. It
acts as the caller when it checks authorisation, so `auth.uid()` inside the RPC is the actual
person rather than "service role".

## Permissions

There is no role logic in this app. `staff_whoami()` returns a `can` object and the UI reads it
directly. Five of its keys are used here — `viewQueue`, `reply`, `setStatus`, `openAttachments`,
`viewAccessLog`, plus `editCalendar` and `administerStaff` (the latter gates only one thing:
re-queueing a failed email from the Outbox). `assign`, `raiseComplaint` and `closeComplaint` are
still returned and ignored, because the workflows they gate are not in this console.

It also returns `roles` (from the tables, authoritative) and `tokenRoles` (from the JWT). Tokens
live an hour, so a console left open can be offering buttons the token no longer backs. When the
two disagree, `AuthProvider` shows a banner instead of letting the next action fail for no
visible reason.

**The guards in `src/auth/` hide things; they do not protect anything.** Every RPC refuses on its
own. Removing one would make the console confusing, not insecure.

## The account

**One operator, one account, created once from the Supabase SQL editor.** There is no staff
administration screen — nobody to invite, no roles to re-grant — so this is the only account path
the console has.

`private.require_admin()` permits a direct database session by design: it holds more authority
than the guard could withhold.

1. Create the auth user (Dashboard → Authentication → Add user), tick **Auto Confirm User**, and
   note the uuid.
2. ```sql
   select public.provision_staff_user(
     '<uuid>', 'Full Name', 'person@platizio.com',
     array['ADMIN']::public.staff_role[]
   );
   ```
3. Sign in.

Deactivating, re-granting roles, or adding a second person all still work — through
`staff_set_active`, `staff_set_roles` and the `invite-staff` edge function, which stay deployed.
They just have no UI. If a second operator is ever added, the assignment controls and the staff
screen are the two things to restore; the spec records what each involved.

## Deploying

A second Vercel project, **Root Directory `admin`**, with `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` set on it. `vercel.json` here rewrites every path to `index.html` and
sends `X-Robots-Tag: noindex, nofollow` plus `X-Frame-Options: DENY`.

Two settings live outside this repo and both can break things quietly:

| Where | What | Why it matters |
|---|---|---|
| Supabase → function secrets | `ALLOWED_ORIGINS` | Setting it **replaces** the default list in `_shared/cors.ts`. It must name every origin — the marketing domain included — or the public ticket form stops working. |
| Supabase → Auth → URL configuration | `https://admin.platizioglobal.com` | Invitation links land nowhere without it. `supabase/config.toml` mirrors this, but the hosted project does not read that file. |

## Layout

```
src/
├── lib/         supabase.ts · rpc.ts (one wrapper per RPC) · types.ts · taxonomy.ts · useAsync.ts
├── auth/        AuthProvider (session + whoami) · route guards
├── components/  AppShell · DataTable · Chip · ConfirmDialog · Toast · RelativeTime
├── screens/     Login · Dashboard · TicketQueue · TicketDetail
│                Enquiries · EnquiryDetail · Calendar · Outbox
└── styles/      tokens.css (mirrored brand values) · console.css
```

`src/lib/types.ts` is hand-mirrored from the SQL projections rather than generated: the RPCs
return `jsonb` built by `jsonb_build_object`, so there is no table type for `supabase gen types`
to read. Each interface names the migration it came from.

`styles/tokens.css` and `lib/taxonomy.ts` are deliberate copies of files in the repository root.
This app deploys from `admin/` as its own Vercel project and cannot import across the root; both
copies say so at the top.
