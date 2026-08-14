# Platizio Global — Frontend Overview, Backend Architecture and Activation Plan

**Date:** 2026-08-14
**Status:** Approved for implementation
**Complements:** `2026-08-13-help-centre-design.md` — that spec designs the help centre; this one covers the whole backend and sequences what ships first
**Supabase project:** `qtjnlkobvnhhgsnyufzv` — "Platizio Support (Mumbai)", `ap-south-1`

---

## Context

The request was to review the frontend, choose a backend suitable for this environment, name the technologies, and design the architecture.

The review turned up something that changes the shape of the answer: **the backend already exists and is live.** Supabase project `qtjnlkobvnhhgsnyufzv` — "Platizio Support (Mumbai)", `ap-south-1`, Postgres 17.6, `ACTIVE_HEALTHY` — holds 27 migrations (~5,100 lines of SQL), 20 tables, ~69 functions and 8 Deno edge functions. The vendored copy in `supabase/` matches production exactly: same 27 migration versions, same 8 functions, zero drift.

Two facts explain why it looks like there is no backend:

1. **Every operational table has 0 rows.** Only reference data is seeded — 8 ticket categories, 26 subcategories, 7 `business_hours` rows, 8 holidays, 5 `enquiry_interests`. `tickets`, `complaints`, `consent_records`, `notifications`, `staff_users` are all empty. Nothing has ever been written.
2. **`main` does not contain it.** `origin/main` is at `329230d`; the entire backend plus the `/help` centre arrived in one commit, `a132fa7` (65 files, +10,686/−599), which sits unmerged on this branch.

So the backend is not missing — it is **disconnected and unshipped**. `src/lib/supportChat.ts:89` gates every call on `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, neither of which is set, so every support request silently degrades to a `mailto:` draft. The file's own header says so: *"This is the state today."*

This plan therefore optimises for **activation**: get what exists into production, correctly and safely, before building anything new.

---

## Part 1 — Frontend overview

### What it is

A marketing, education and lead-generation site for Platizio Global — a service that lets Indian retail investors buy US stocks and ETFs under the RBI's Liberalised Remittance Scheme, through a GIFT City / IFSCA-regulated structure, with execution and custody by ViewTrade. The site does **not** host trading; every "Start Investing" CTA points off-site to `TRADING_PLATFORM_URL` (`src/constants.ts:1`).

Revenue line, from `src/pages/Pricing.tsx`: brokerage at 0.29% per transaction (USD 1 minimum). Account opening, KYC and charting are free.

### Stack

| Layer | Choice |
|---|---|
| Framework | React 18.3, no Next.js |
| Language | TypeScript 5.9, `strict: true`, `noEmit` (tsc is a typecheck gate) |
| Build | Vite 5.4 + `@vitejs/plugin-react` |
| Router | react-router-dom 6.30 |
| Head/SEO | react-helmet-async 3 |
| Styling | One hand-written stylesheet — `css/styles.css`, 4,687 lines, CSS custom properties. **No Tailwind, no CSS Modules, no UI kit.** |
| 3D | `cobe` (WebGL globe) |
| Images | `sharp`, build-time only |
| Hosting | Vercel, static output |
| Tests / lint / CI | **None.** No ESLint, no Prettier, no Vitest, no test file, no `.github/` directory. |

Five runtime dependencies total. This is a deliberately small surface and worth keeping that way.

### The defining architectural feature: build-time prerendering

`npm run build` = `validate:support && tsc && node scripts/prerender.mjs`. That script runs a Vite client build, builds an SSR bundle from `src/entry-server.tsx`, `renderToString`s **every route in `src/routes.ts`**, and writes real HTML to `dist/<route>/index.html`. 49 pages are prerendered; 48 go in the sitemap.

It carries two hard build guards that are genuinely load-bearing:

```js
if (!head.includes('<title')) throw new Error(`${route.path} produced no <title> …`)
if (route.path !== '/404' && html.includes('notfound-code')) throw new Error(`${route.path} fell through to <NotFound/> …`)
```

With no tests and no CI, `npm run build` is the *entire* quality gate. Anything that weakens it costs more than it looks.

**Consequence for the backend:** there is no server runtime on the public site. Vercel serves static files. Any dynamic behaviour must come from a separately hosted API — which is exactly why a BaaS fits here.

### Structure

```
src/
├── entry-client.tsx / entry-server.tsx   hydrate-or-mount; render(url) → {html, head}
├── App.tsx · routes.ts                   14 route elements; RouteEntry[] prerender manifest
├── pages/          (14)                  Home, Products, Pricing, Media, About, FAQs, Help, …
├── components/     (11 + Globe/ + support/)
├── articles/       registry.ts (30 articles) · topics.ts (7 hubs) · content/*.ts
├── content/        faqs.tsx (71 answers) · support/tree.ts (111 nodes) · taxonomy.ts
├── context/        AppContext.tsx — the only context (contact-modal state)
└── lib/            supportChat.ts — the only network layer
```

No `hooks/`, no `utils/`, no state library, no data-fetching library. Helpers live beside their consumers.

Content is all git-tracked TypeScript. `src/content/faqs.tsx` and `src/content/support/tree.ts` share the same 71-answer corpus by id reference with no duplication, validated at build time by `scripts/validate-support-content.mjs`. That is a well-built content architecture and should be preserved as-is.

### The three forms, and where they go today

| Form | File | Today |
|---|---|---|
| Contact / enquiry modal | `src/components/ContactModal.tsx` | POSTs to **Web3Forms**, access key hardcoded at line 13. Emails the team; nothing is persisted. |
| Support ticket | `src/components/support/RequestForm.tsx` (`kind='TICKET'`) | `submitTicket()` → **`mailto:` draft**, because env is unset |
| Callback request | same file (`kind='CALLBACK'`) | `submitCallback()` → **`mailto:` draft**, no endpoint exists at all |

No login, no protected routes, no admin UI, no analytics of any kind.

---

## Part 2 — The backend that already exists

Live in `qtjnlkobvnhhgsnyufzv`, vendored to `supabase/`, drift-free.

**20 tables** — `tickets`, `ticket_messages`, `ticket_categories`/`ticket_subcategories`, `ticket_attachments`, `ticket_status_history`, `ticket_access_tokens`, `complaints`, `consent_records`, `notifications`, `staff_users`, `user_roles`, `staff_role_audit`, `attachment_access_log`, `business_hours`, `business_holidays`, `contact_enquiries`, `enquiry_interests`, `enquiry_notes`, plus `private.rate_limit_hits`. RLS on all of them.

**~69 functions**, including a complete staff API: `staff_ticket_queue`, `staff_ticket_detail`, `staff_dashboard`, `staff_directory`, `staff_assign_ticket`, `staff_set_status`, `staff_post_reply`, `staff_raise_complaint`, `staff_set_complaint_stage`, `staff_close_complaint`, `staff_open_attachment`, `staff_attachment_access_history`, `staff_list_accounts`, `staff_set_roles`, `staff_set_active`, `staff_set_holidays`, `staff_holiday_calendar`, `staff_whoami`, `provision_staff_user`.

**8 edge functions** (Deno, all `verify_jwt = true`) — `create-ticket`, `finalize-ticket`, `request-status-link`, `lookup-status`, `staff-attachment`, `invite-staff`, `drain-outbox`, `sweep-storage`, over `_shared/{cors,supabase,tokens,turnstile,validation}.ts`.

**Compliance machinery already built** — append-only `ticket_status_history` and `attachment_access_log`; versioned, IP/UA-stamped `consent_records`; a SEBI-style grievance flow gated on `GRIEVANCE_OFFICER`; SLA clocks via `add_business_time()` respecting the weekly window and holiday calendar; retention purge and SLA sweep on `pg_cron`; `custom_access_token_hook` injecting `platizio_roles` into the JWT.

The `private` schema is deliberately excluded from PostgREST so internal helpers cannot be reached over the API. `enable_signup = false`. Storage is a private bucket with a 5 MiB limit and magic-number verification of uploaded bytes.

`supabase/config.toml` states the intent plainly: *"For an IFSCA-regulated entity that history is the point: it is how you establish which behaviour was live on which date."*

### What is genuinely not built

- No staff UI whatsoever — 21 RPCs with no client
- No customer status page — `request-status-link` and `lookup-status` are live but unreachable
- No write path to `contact_enquiries` — migration 0027 built the table, enum, ref generator and seeds, but there is no RPC and no edge function that inserts
- `callback_requests`, `support_nodes`, `faq_articles`/`faq_chunks`, `chat_*`, `chat_escalation_grants`, `support-chat` — all designed in `docs/superpowers/specs/2026-08-13-help-centre-design.md`, none built
- No tests at any layer, no CI

---

## Part 3 — Platform decision

**Stay on Supabase.** Confirmed, not defaulted to.

1. **The public site has no server runtime.** It is static prerendered HTML on Vercel. A BaaS with edge functions is the natural complement; standing up a VM or container API means new ops surface for a small team.
2. **`ap-south-1` keeps customer PII in India** — material for an IFSCA-regulated entity.
3. **RLS is the authorisation model.** ~40 policies plus `custom_access_token_hook` already encode who may read what, enforced by the database. Moving to a separate API tier relocates that into application code and loses the guarantee.
4. **The migration history is the compliance artefact**, by explicit design.
5. ~5,100 lines of SQL already deployed. Rewriting is pure cost with no user-visible gain.

Rejected: a dedicated Node/NestJS or Python API (loses RLS, adds ops, duplicates working code); Vercel serverless functions (fragments the security model across two vendors, and there is no existing server context to extend).

---

## Part 4 — Target architecture

```
 PUBLIC VISITOR
      │
      ▼
 ┌──────────────────────────────────────────────┐
 │ Vercel — platizioglobal.com                  │
 │ Static prerendered React, 49 routes          │
 │ No server runtime                            │
 └───────────────┬──────────────────────────────┘
                 │  fetch + anon key + x-turnstile-token
                 │  CORS allowlist — _shared/cors.ts
                 ▼
 ┌──────────────────────────────────────────────┐
 │ Supabase Edge Functions (Deno) · ap-south-1  │
 │ verify_jwt: true                             │
 │  create-ticket · finalize-ticket             │
 │  request-status-link · lookup-status         │
 │  create-enquiry                       [new]  │
 └───────────────┬──────────────────────────────┘
                 │ service_role
                 ▼
 ┌──────────────────────────────────────────────┐
 │ Postgres 17 · RLS on every table             │
 │  intake RPCs · staff_* RPCs                  │
 │  audit · consent · SLA · retention           │
 └──┬──────────────┬───────────────┬────────────┘
    │ pg_cron      │ pg_net        │ Storage
    ▼              ▼               ▼
 sweep_sla    drain-outbox    ticket-attachments
 purge        → Resend        (private, signed URLs)
 requeue

 STAFF MEMBER
      │  Supabase Auth (email+password, signup disabled)
      │  JWT carries app_metadata.platizio_roles
      ▼
 ┌──────────────────────────────────────────────┐
 │ /staff SPA — Vite, this repo, own Vercel     │
 │ project → staff.platizioglobal.com           │
 └───────────────┬──────────────────────────────┘
                 │ authenticated JWT
                 ▼  PostgREST /rest/v1/rpc/*
           staff_* RPCs → require_staff()
```

**Two trust zones, deliberately different transports.**

Anonymous intake goes through **edge functions** because it needs work PostgREST cannot do: Turnstile verification, IP and email rate limiting, signed upload URL minting, magic-number checking of uploaded bytes. Staff traffic goes **straight to PostgREST**, because every `staff_*` RPC already calls `require_staff()` internally and RLS backs it — an intermediary would add latency and a second place for authorisation to drift.

---

## Part 5 — Technologies

### Public site — no change

React 18.3 · TypeScript 5.9 · Vite 5.4 · react-router-dom 6.30 · react-helmet-async 3 · plain CSS (`css/styles.css`) · cobe · sharp · custom prerender → Vercel static.

### Staff console — new

Same React 18 / TypeScript / Vite baseline, so there is one toolchain and no new learning curve. Reuse the design tokens already in `css/styles.css`; no UI kit.

**Add `@supabase/supabase-js`, for the staff app only.** It is needed for session management — token refresh, PKCE, storage — which is easy to get subtly wrong by hand. The public site keeps raw `fetch` and stays dependency-light, because it must survive `renderToString` during prerender.

### Backend

Supabase on `ap-south-1`: Postgres 17.6 · PostgREST · Deno edge functions · Supabase Auth (email/password, signup disabled, `custom_access_token_hook`) · Supabase Storage (private bucket, 5 MiB, signed URLs) · `pg_cron` (5 jobs) · `pg_net`.

### Third-party

Resend (transactional email via `drain-outbox`) · Cloudflare Turnstile (captcha) · Vercel (two projects).

### Tooling to add

Vitest + jsdom + `@testing-library/react` (frontend) · pgTAP via `supabase test db` (database) · `deno test` (edge functions) · GitHub Actions CI.

---

## Part 6 — Plan

### Phase A — Merge and de-risk

Nothing user-visible; this closes the gap between the repo and reality.

- Open the PR for `a132fa7` onto `main`. Note `origin/main` is 1 commit behind and that commit is the whole backend.
- Add `.github/workflows/ci.yml` running `npm run build` — it already chains `validate:support`, `tsc` and the two prerender guards, so it is the strongest gate available today.
- Confirm no drift before adding anything: `npx supabase db reset`, then `npx supabase db diff --linked` reports empty.
- Add Vitest + jsdom + testing-library; one smoke test per new module thereafter.

### Phase B — Fix the `source` defect (blocking)

Verified, not inferred:

- `supabase/migrations/20260811054159_0003_tickets.sql:65` — `constraint tickets_source check (source in ('web','email','phone','staff'))`. `'chatbot'` is absent. The constraint is named **`tickets_source`**, not `tickets_source_check`; a `drop constraint if exists tickets_source_check` silently no-ops.
- `supabase/migrations/20260811092715_0012_intake_api.sql:211` — `create_support_ticket` inserts the literal `'web'`.
- `supabase/functions/_shared/validation.ts` — `parseTicketIntent` never parses `source` at all, so the frontend's `source: 'chatbot'` (`src/lib/supportChat.ts:151`) is discarded before it reaches the database.

Net effect: every ticket raised from the assistant would be recorded as `'web'`, and any deflection metric built on `source` would be quietly false.

New migration `0028_ticket_source_chatbot.sql`:
- Drop and recreate `tickets_source` including `'chatbot'`, using the correct constraint name.
- Change `create_support_ticket` to read `payload->>'source'`, whitelist against the same four-plus-one set, default `'web'`.
- Add `source` to `parseTicketIntent` with a whitelist, rejecting anything else.
- pgTAP test that **inserts a real `source='chatbot'` row**. A `WHERE false` test never evaluates a CHECK and passes vacuously.

### Phase C — Turn the lights on

Vercel env (public site): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

Supabase function secrets: `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `MAIL_FROM`, `ALLOWED_ORIGINS`, `SITE_URL`.

`TURNSTILE_SECRET_KEY` matters more than it looks. `supabase/functions/_shared/turnstile.ts:12-17` returns `{ok: true, verified: false}` when the secret is unset — it **fails open**. Setting the frontend env vars without also setting the secret and sending the token leaves a public intake endpoint protected by rate limits alone (10/hr per IP, 5/hr per email). Conversely, setting the secret without wiring the client makes every submission 403, because `create-ticket/index.ts:30` reads `x-turnstile-token` and the client never sends one. **Both halves ship together or neither does.**

- Port `src/help/useTurnstile.ts` (143 lines) from branch `claude/support-ticketing-supabase-tg5akd`; render the widget in `RequestForm.tsx` and pass the token through `submitTicket`.
- Verify end-to-end: a real submission produces a real `PG-` reference, a row in `tickets`, a `consent_records` row, and a queued acknowledgement email that `drain-outbox` actually sends.

### Phase D — Contact form onto `contact_enquiries`

The table is ready and unused: `enquiry_ref` (`PG-ENQ-YYYY-NNNNNN`), an `enquiry_status` enum, `enquiry_notes`, 3-year retention, and `enquiry_interests` pre-seeded with the exact five options the modal offers. Only the write path is missing — `20260813083647_0027_contact_enquiries.sql` grants `select` and nothing else.

- New migration: `create_contact_enquiry(payload jsonb)`, service-role only, following the `create_support_ticket` conventions (`security definer`, `set search_path = ''`, fully-qualified names, revoke from `PUBLIC` — not from `anon, authenticated`, which revokes nothing).
- New edge function `create-enquiry`, mirroring `create-ticket`: preflight → validate → Turnstile → `rate_limit_consume` → RPC.
- Point `ContactModal.tsx` at it. Retire Web3Forms and **rotate the key committed at `ContactModal.tsx:13`** — it is in git history and in every shipped bundle.

Enquiries stay separate from tickets by design: they carry no published SLA and must never enter the queue the SLA is measured on.

### Phase E — Staff console

A Vite SPA at `staff/`, built and deployed as its own Vercel project on `staff.platizioglobal.com`, sharing this repo and its CI but not the static marketing build. It is excluded from `src/routes.ts`, from prerendering, and disallowed in `robots.txt`.

Salvage from `claude/support-ticketing-supabase-tg5akd`:
- `src/admin/api/desk.ts` (285 lines) — typed wrappers over every `staff_*` RPC, passing the database's own refusals through verbatim ("This action requires one of these roles: GRIEVANCE_OFFICER" is written for the reader and leaks nothing about the schema)
- `src/admin/api/types.ts` (429 lines) — the RPC payload and response types

Replace `src/admin/api/session.ts` (263 hand-rolled lines against `/auth/v1`) with `@supabase/supabase-js` auth.

Screens: sign-in · dashboard (`staff_dashboard`) · queue with filters (`staff_ticket_queue`) · ticket detail with reply, status and assignment · complaints with stage and close · attachment viewer via the `staff-attachment` function · staff admin (invite, roles, deactivate) for `ADMIN` only.

Two things to respect: signed attachment URLs live about a minute and are logged against the caller's name **before** issue, so never store or re-log them; and status-history notes are append-only and go into a regulatory file, so the UI should say so at the point of writing.

### Phase F — Customer status page

`request-status-link` and `lookup-status` are already live and unreachable. Add `/help/status`, salvaging `src/help/api/status.ts` (163 lines) from the same branch. Magic-link only — `ticket_access_tokens` stores `sha256(token)`, never the token. Prerendered with `sitemap: false`.

### Out of scope, named for sequencing

The `2026-08-13-help-centre-design.md` extension phases: `support-chat` edge function, `support_nodes`, the pgvector/RRF FAQ knowledge base, escalation grants, `callback_requests` and the staff callback queue, and the `support_content_gaps` analytics view. Worth doing, but only once real tickets are flowing — Phase 4 of that spec is explicitly the honest milestone, and it needs traffic data this system has never produced.

---

## Verification

1. **No drift** — `npx supabase db reset` rebuilds clean; `npx supabase db diff --linked` is empty. Run before and after Phase B.
2. **Content invariants** — `node scripts/validate-support-content.mjs` still passes. It regex-scrapes `src/content/faqs.tsx` at exact 8-space indentation, so reformatting that file breaks the build.
3. **Frontend build** — `npm run build`, then `npm run preview` (the Vercel-accurate static server; `vite preview` lies because it applies SPA fallback).
4. **Database** — `npx supabase test db`, including the `source='chatbot'` test that inserts a real row.
5. **Edge functions** — `deno test` on validation and Turnstile paths.
6. **Ticket round trip, in a browser** — walk the assistant to a leaf, raise a ticket with one PDF attachment. Confirm via MCP: a `tickets` row with `source='chatbot'` and a `PG-` ref; a `consent_records` row with verbatim text and version; a `ticket_attachments` row whose `verified_mime` was read from the bytes; a `notifications` row that `drain-outbox` moved to sent.
7. **Turnstile bites** — submit with the widget bypassed and confirm a 403, not a silent accept.
8. **Enquiry round trip** — submit the contact modal, confirm a `contact_enquiries` row with a `PG-ENQ-` ref and no corresponding `tickets` row.
9. **Staff round trip** — sign in, claim from the queue, post a customer-visible reply, confirm the email is queued and the first-response SLA clock stops; open an attachment and confirm the `attachment_access_log` row was written before the URL was issued.
10. **Authorisation** — confirm a non-`GRIEVANCE_OFFICER` cannot close a complaint, and that the refusal text is the database's own.
11. **Rate limits** — 11 submissions from one IP inside an hour; the 11th returns 429.

---

## Open items for you

- **Second Supabase project.** `volmpsvzrbzialnrrqjk` — "Platizio's Project" — sits in `ap-southeast-1` (Singapore) with two empty tables, `net_worth_submissions` and `accreditation_submissions`. For an IFSCA entity that is a data-residency question. It holds no data today, so deleting it is cheap; leaving it is a decision someone should make on purpose.
- **`PRD.pdf` and `FAQs.pdf`** at the repo root have never been read into the codebase. The help-centre spec flags them as possibly holding requirements the extracted content misses. No PDF text extraction is available in this environment, so someone should read them before the support tree is frozen.
- **Compliance sign-off** on the consent string currently hardcoded at `src/lib/supportChat.ts:156-161`, version `2026-08-13`. It is stored verbatim on every ticket, so changing it later means a new version, not an edit.
- **Three stale remote branches** — `claude/seo-stock-content-qqlk8m`, `claude/support-ticketing-supabase-tg5akd`, `feature/help-and-support`. Delete after Phase E salvages what it needs.
