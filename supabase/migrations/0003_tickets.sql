-- 0003_tickets.sql — the record: tickets, the conversation thread, and complaints.
--
-- Everything a support request is lives here. The rules that matter are written
-- as CHECK constraints and triggers rather than as application validation,
-- because Supabase Studio runs as `service_role`, which bypasses RLS but not
-- constraints and not triggers. A rule written only in an Edge Function is a
-- rule that does not apply to the people with the most access.
--
-- Two forward references are resolved in later migrations, and both are called
-- out where they occur:
--   * assigned_agent_id / author_staff_id get their foreign keys in 0008, once
--     staff_users exists.
--   * first_response_due_at / resolution_due_at are filled by a trigger and
--     made NOT NULL in 0009, once the business-hours calendar exists.

-- ---------------------------------------------------------------------------
-- Ticket reference
-- ---------------------------------------------------------------------------
--
-- One sequence for all time, with the year read from the insert timestamp —
-- not a sequence per year, which would need a DDL job every January and would
-- fail silently if that job were ever missed.
--
-- Generated inside the insert transaction, so it is concurrency-safe with no
-- application-side locking: nextval() is atomic and never hands the same value
-- to two sessions.
--
-- This does leak volume: anyone holding two references can subtract them. That
-- is accepted, and it is why the reference must never be used as an ordering or
-- counting signal anywhere public.
create sequence public.ticket_ref_seq;

create or replace function public.set_ticket_ref()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.ticket_ref is null then
    new.ticket_ref := 'PG-'
      || to_char(now() at time zone 'Asia/Kolkata', 'YYYY')
      || '-' || lpad(nextval('public.ticket_ref_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- tickets
-- ---------------------------------------------------------------------------

create table public.tickets (
  id                uuid primary key default gen_random_uuid(),
  ticket_ref        text not null unique,

  -- Sent by the browser, one per form session. A slow network that makes the
  -- customer press Send twice produces one ticket, not two: the second insert
  -- collides here and create-ticket returns the original reference. Nullable
  -- only so a staff-created ticket does not have to invent one.
  idempotency_key   text unique,

  -- Requester ------------------------------------------------------------
  requester_name         text not null,
  requester_email        text not null,
  -- Raw as typed, and normalised to digits. The raw form is what the customer
  -- will recognise if we quote it back; the digits are what a lookup can match
  -- when they type it differently the second time.
  requester_mobile_raw   text not null,
  requester_mobile_digits text not null,

  -- Classification -------------------------------------------------------
  category_id    text not null references public.ticket_categories (id) on update cascade,
  subcategory_id text not null,
  priority       public.ticket_priority not null default 'NORMAL',

  -- Body -----------------------------------------------------------------
  subject     text not null,
  description text not null,

  -- State ----------------------------------------------------------------
  status_internal public.ticket_status_internal not null default 'NEW',
  status_customer public.ticket_status_customer not null default 'RECEIVED',
  assigned_agent_id uuid,   -- FK added in 0008_staff_roles.sql

  -- SLA ------------------------------------------------------------------
  -- Computed on insert from the business-hours calendar and then stored, so a
  -- later calendar edit cannot silently move a deadline that has already been
  -- promised. Filled and made NOT NULL in 0009_business_hours.sql.
  first_response_due_at timestamptz,
  resolution_due_at     timestamptz,
  first_response_at     timestamptz,
  resolved_at           timestamptz,
  closed_at             timestamptz,
  first_response_breached boolean not null default false,
  resolution_breached     boolean not null default false,
  sla_warned_at         timestamptz,

  -- Intake provenance ----------------------------------------------------
  source            text not null default 'web',
  submitted_ip      inet,
  submitted_user_agent text,
  -- False when the request was accepted without a verified Turnstile token,
  -- which create-ticket permits only while no TURNSTILE_SECRET_KEY is
  -- configured. Persisted rather than logged so the gap is visible in the data
  -- and countable, not buried in function logs that roll over.
  captcha_verified  boolean not null default false,
  -- Set by finalize-ticket. Null means the browser never came back: either the
  -- customer closed the tab mid-upload or someone called create-ticket
  -- directly. The orphan sweep in 0011 works off this.
  finalized_at      timestamptz,

  -- Retention ------------------------------------------------------------
  -- Privacy Policy §9: support records are kept 5 years "unless a longer period
  -- is required for compliance, audit, legal proceedings or dispute
  -- resolution". legal_hold is that exception, and the purge job honours it.
  legal_hold        boolean not null default false,
  legal_hold_reason text,
  retention_expires_at timestamptz not null default (now() + interval '5 years'),
  -- Deliberately a separate column from the ticket's own expiry: whether
  -- attachments are kept for 12 months or the full 5 years is an open
  -- compliance decision, and it must be settleable with an UPDATE rather than
  -- a migration. Defaults to the ticket's retention until that call is made.
  attachment_retention_expires_at timestamptz not null default (now() + interval '5 years'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- The composite target guarantees the subcategory belongs to the category.
  constraint tickets_subcategory_fk
    foreign key (category_id, subcategory_id)
    references public.ticket_subcategories (category_id, id) on update cascade,

  -- Server-side length and shape limits. The browser enforces minimums for a
  -- helpful error message and no maximum at all; these are the actual bounds.
  constraint tickets_ref_format      check (ticket_ref ~ '^PG-[0-9]{4}-[0-9]{6}$'),
  constraint tickets_name_len        check (char_length(requester_name) between 2 and 120),
  constraint tickets_email_len       check (char_length(requester_email) between 6 and 254),
  constraint tickets_email_shape     check (requester_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint tickets_email_lowercase check (requester_email = lower(requester_email)),
  constraint tickets_mobile_digits   check (requester_mobile_digits ~ '^[0-9]{8,15}$'),
  constraint tickets_mobile_raw_len  check (char_length(requester_mobile_raw) between 8 and 32),
  constraint tickets_subject_len     check (char_length(subject) between 4 and 200),
  constraint tickets_description_len check (char_length(description) between 20 and 5000),
  constraint tickets_source          check (source in ('web', 'email', 'phone', 'staff')),
  constraint tickets_hold_reason     check (not legal_hold or legal_hold_reason is not null),
  -- A closed ticket must have a closing timestamp, and vice versa. Without
  -- this, a Studio edit that flips the status but not the stamp would leave the
  -- retention clock anchored to the wrong date.
  constraint tickets_closed_stamp
    check ((status_internal = 'CLOSED') = (closed_at is not null))
);

comment on table public.tickets is
  'Support requests raised through /help/raise. Personal data; see Privacy Policy §9 for retention.';
comment on column public.tickets.idempotency_key is
  'Per-form-session UUID from the browser. Unique, so a double submit returns the first ticket.';
comment on column public.tickets.attachment_retention_expires_at is
  'Open compliance decision: 12 months vs the full 5 years. Separate column so the two can diverge.';

-- Both are lookup keys for the customer-facing status page in a later slice.
-- lower(requester_email) rather than the column itself because the column is
-- already stored lowercased but the index has to survive that constraint being
-- relaxed for staff-created tickets.
create index tickets_requester_email_idx on public.tickets (lower(requester_email));
create index tickets_created_at_idx      on public.tickets (created_at desc);
create index tickets_queue_idx           on public.tickets (status_internal, priority, created_at)
  where status_internal not in ('CLOSED', 'SPAM');
create index tickets_first_response_due_idx on public.tickets (first_response_due_at)
  where first_response_at is null;
create index tickets_retention_idx       on public.tickets (retention_expires_at)
  where legal_hold = false;
create index tickets_unfinalized_idx     on public.tickets (created_at)
  where finalized_at is null;

create trigger tickets_set_ref
  before insert on public.tickets
  for each row execute function public.set_ticket_ref();

create trigger tickets_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

-- Closing a ticket re-anchors its retention clock. Privacy Policy §9 counts the
-- 5 years "from the date of communication or account closure", not from the
-- date the ticket happened to be opened.
create or replace function public.reanchor_ticket_retention()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.closed_at is not null and old.closed_at is distinct from new.closed_at then
    new.retention_expires_at := new.closed_at + interval '5 years';
    if new.attachment_retention_expires_at > new.closed_at + interval '5 years' then
      new.attachment_retention_expires_at := new.closed_at + interval '5 years';
    end if;
  end if;
  return new;
end;
$$;

create trigger tickets_reanchor_retention
  before update on public.tickets
  for each row execute function public.reanchor_ticket_retention();

-- ---------------------------------------------------------------------------
-- ticket_messages — the conversation thread
-- ---------------------------------------------------------------------------
--
-- Modelled now, written in a later slice. It is here because the thread decides
-- the shape of first_response_at and of the customer-facing status page, and
-- retrofitting it would have forced a second look at both.

create table public.ticket_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.tickets (id) on delete cascade,

  -- Exactly one of these identifies the author. A staff message has a staff id;
  -- a customer message has neither and is attributed to the ticket's requester.
  author_staff_id uuid,   -- FK added in 0008_staff_roles.sql
  author_kind text not null check (author_kind in ('CUSTOMER', 'STAFF', 'SYSTEM')),

  body text not null,
  -- An internal note is never rendered to the customer and never emailed. It is
  -- a column rather than a separate table so that a note and a reply cannot
  -- drift out of chronological order.
  is_internal_note boolean not null default false,

  created_at timestamptz not null default now(),

  constraint ticket_messages_body_len check (char_length(body) between 1 and 20000),
  constraint ticket_messages_author
    check ((author_kind = 'STAFF') = (author_staff_id is not null)),
  constraint ticket_messages_note_is_staff
    check (not is_internal_note or author_kind <> 'CUSTOMER')
);

create index ticket_messages_ticket_idx on public.ticket_messages (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- complaints
-- ---------------------------------------------------------------------------
--
-- A complaint is the grievance escalation of a ticket, not a second kind of
-- ticket: the ticket keeps the correspondence, this row keeps the regulated
-- clock and the closure control.
--
-- Modelled now, worked in a later slice. Closure is gated to the Grievance
-- Officer by a trigger added in 0008 — which also means closure cannot be done
-- from Studio at all, because a Studio session has no resolvable actor. That is
-- deliberate, and it is why the staff app has to exist before this ships.

create sequence public.complaint_ref_seq;

create table public.complaints (
  id            uuid primary key default gen_random_uuid(),
  complaint_ref text not null unique,
  -- on delete restrict, not cascade: the complaint is the longer-lived record,
  -- and the retention purge must not be able to remove a ticket out from under
  -- an open grievance. The purge clears expired complaints first and simply
  -- skips any ticket still carrying one.
  ticket_id     uuid not null unique references public.tickets (id) on delete restrict,

  stage public.complaint_stage not null default 'RAISED',

  -- T&C §23 / Privacy Policy §19: acknowledged within 24 hours, addressed
  -- within 15 working days. Both computed from the calendar in 0009.
  acknowledgement_due_at timestamptz,
  resolution_due_at      timestamptz,
  acknowledged_at        timestamptz,
  resolved_at            timestamptz,
  closed_at              timestamptz,
  closed_by              uuid,
  closure_summary        text,

  legal_hold           boolean not null default false,
  retention_expires_at timestamptz not null default (now() + interval '5 years'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint complaints_ref_format check (complaint_ref ~ '^PG-GRV-[0-9]{4}-[0-9]{6}$'),
  constraint complaints_closed_stamp
    check ((stage = 'CLOSED') = (closed_at is not null)),
  -- A closure with no author and no reasoning is not a closure anyone can audit.
  constraint complaints_closure_attributed
    check (closed_at is null or (closed_by is not null and closure_summary is not null))
);

create or replace function public.set_complaint_ref()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.complaint_ref is null then
    new.complaint_ref := 'PG-GRV-'
      || to_char(now() at time zone 'Asia/Kolkata', 'YYYY')
      || '-' || lpad(nextval('public.complaint_ref_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger complaints_set_ref
  before insert on public.complaints
  for each row execute function public.set_complaint_ref();

create trigger complaints_updated_at
  before update on public.complaints
  for each row execute function public.set_updated_at();

create index complaints_stage_idx     on public.complaints (stage, created_at);
create index complaints_retention_idx on public.complaints (retention_expires_at)
  where legal_hold = false;
