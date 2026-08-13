-- 0027_contact_enquiries.sql — the enquiry form gets a table of its own.
--
-- ContactModal has been posting to Web3Forms since before any of this existed.
-- The decision recorded at src/components/ContactModal.tsx:1-9 was that it must
-- not move into `tickets`, and the reasoning is worth repeating because it
-- shapes everything below:
--
--   An enquiry is not a support request. Putting it in `tickets` would place it
--   in the queue support is measured on, and start the published "24 hours on
--   business days" clock against a promise the site has never made for sales
--   enquiries. That would manufacture an obligation nobody agreed to, and it
--   would corrupt the SLA figures the whole ticketing system exists to make
--   provable — the numbers would silently include work that was never in scope.
--
-- So: its own table, its own status set, its own retention, and its own timing
-- which is explicitly internal and must never be published.
--
-- Two things this migration is careful about:
--
--   1. **The team must keep getting told.** Today Web3Forms emails the inbox.
--      Moving the transport without moving that notification would lose leads
--      silently — the form would keep saying "thank you" while nobody was
--      reading anything. 0028 queues an internal alert in the same transaction
--      as the row, and the acknowledgement to the customer separately.
--
--   2. **No customer-facing reference.** Tickets have one because a customer
--      needs to quote it. An enquirer does not, and the brief warned that a
--      sequence hands anyone holding two references an estimate of volume.
--      enquiry_ref exists for staff to say "enquiry 41" to each other and is
--      never sent to the customer — see 0028, where it appears in the internal
--      alert and not in the acknowledgement.

-- ---------------------------------------------------------------------------
-- Status
-- ---------------------------------------------------------------------------
--
-- Deliberately not the ticket status enum. An enquiry is not triaged, does not
-- wait on a broker, and is never "resolved" — it is contacted, and then it
-- either becomes a customer or it does not. Sharing the enum would have meant
-- either meaningless values on one side or a shared vocabulary that fits
-- neither, and it would have tempted a future reader into a shared queue.

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'public' and t.typname = 'enquiry_status') then
    create type public.enquiry_status as enum (
      'NEW',
      'CONTACTED',
      'QUALIFIED',
      'CONVERTED',
      'CLOSED',
      'SPAM'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Interests
-- ---------------------------------------------------------------------------
--
-- A lookup table rather than a CHECK constraint, matching ticket_categories in
-- 0002: adding "Mutual Funds" to the dropdown next quarter should be an INSERT
-- that a non-developer can make, not a migration.

create table if not exists public.enquiry_interests (
  id       text primary key,
  label    text not null,
  position integer not null default 0,
  is_active boolean not null default true,

  constraint enquiry_interests_id_slug check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint enquiry_interests_label_len check (char_length(label) between 2 and 80)
);

insert into public.enquiry_interests (id, label, position) values
  ('us-stocks',        'US Stocks',        1),
  ('us-etfs',          'US ETFs',          2),
  ('account-opening',  'Account Opening',  3),
  ('platform-support', 'Platform Support', 4),
  ('general-query',    'General Query',    5)
on conflict (id) do update set label = excluded.label, position = excluded.position;

create sequence if not exists public.enquiry_ref_seq;

create or replace function public.set_enquiry_ref()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.enquiry_ref is null then
    new.enquiry_ref := 'PG-ENQ-'
      || to_char(now() at time zone 'Asia/Kolkata', 'YYYY')
      || '-' || lpad(nextval('public.enquiry_ref_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- The table
-- ---------------------------------------------------------------------------

create table if not exists public.contact_enquiries (
  id          uuid primary key default gen_random_uuid(),
  enquiry_ref text not null unique,

  -- Same collapse-the-double-submit mechanism as tickets: the form mints one
  -- per session and a replay collides here instead of creating a second lead.
  idempotency_key text unique,

  full_name    text not null,
  email        text not null,
  phone_raw    text not null,
  phone_digits text not null,

  interest_id text references public.enquiry_interests (id),
  message     text,

  status       public.enquiry_status not null default 'NEW',
  assigned_to  uuid references public.staff_users (id) on delete set null,

  -- INTERNAL ONLY. This is a working target for the team, not a promise, and it
  -- must never appear in customer-facing copy, in the published SLA, or in any
  -- report that is shown outside the firm. It exists so an enquiry cannot sit
  -- unnoticed for a fortnight, and for no other reason. The column is named at
  -- length precisely so that nobody surfaces it by accident.
  internal_follow_up_target_at timestamptz,
  first_contacted_at           timestamptz,
  closed_at                    timestamptz,
  outcome_note                 text,

  source              text not null default 'web' check (source in ('web', 'phone', 'referral', 'staff')),
  submitted_ip        inet,
  submitted_user_agent text,
  captcha_verified    boolean not null default false,

  -- Three years, not the five that Privacy Policy §9 sets for support records.
  -- A support ticket may be evidence in a dispute about a trade; a sales
  -- enquiry that went nowhere is a marketing record, and DPDP's storage
  -- limitation principle says keep it only as long as the purpose needs it.
  -- Converting to a customer is what makes the longer clock apply, and that
  -- record lives in the brokerage system rather than here.
  retention_expires_at timestamptz not null default (now() + interval '3 years'),
  legal_hold           boolean not null default false,
  legal_hold_reason    text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint contact_enquiries_ref_format check (enquiry_ref ~ '^PG-ENQ-[0-9]{4}-[0-9]{6}$'),
  constraint contact_enquiries_name_len   check (char_length(full_name) between 2 and 120),
  constraint contact_enquiries_email_len  check (char_length(email) between 6 and 254),
  constraint contact_enquiries_email_lowercase check (email = lower(email)),
  constraint contact_enquiries_email_shape
    check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint contact_enquiries_phone_raw_len check (char_length(phone_raw) between 8 and 32),
  constraint contact_enquiries_phone_digits check (phone_digits ~ '^[0-9]{8,15}$'),
  constraint contact_enquiries_message_len  check (message is null or char_length(message) <= 5000),
  constraint contact_enquiries_closed_stamp
    check ((status in ('CONVERTED', 'CLOSED', 'SPAM')) = (closed_at is not null)),
  constraint contact_enquiries_hold_reason
    check ((not legal_hold) or legal_hold_reason is not null),
  constraint contact_enquiries_outcome_len
    check (outcome_note is null or char_length(outcome_note) between 3 and 2000)
);

comment on table public.contact_enquiries is
  'Sales enquiries from ContactModal. Deliberately separate from tickets: enquiries carry no published SLA and must never enter the support queue the SLA is measured on.';
comment on column public.contact_enquiries.internal_follow_up_target_at is
  'INTERNAL working target. Never publish this, never report it as an SLA, and never quote it to an enquirer.';

create index if not exists contact_enquiries_open_idx
  on public.contact_enquiries (internal_follow_up_target_at, created_at)
  where status in ('NEW', 'CONTACTED', 'QUALIFIED');
create index if not exists contact_enquiries_email_idx on public.contact_enquiries (email);
create index if not exists contact_enquiries_assigned_idx on public.contact_enquiries (assigned_to)
  where status in ('NEW', 'CONTACTED', 'QUALIFIED');

drop trigger if exists contact_enquiries_ref on public.contact_enquiries;
create trigger contact_enquiries_ref
  before insert on public.contact_enquiries
  for each row execute function public.set_enquiry_ref();

drop trigger if exists contact_enquiries_updated_at on public.contact_enquiries;
create trigger contact_enquiries_updated_at
  before update on public.contact_enquiries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- The internal follow-up target
-- ---------------------------------------------------------------------------
--
-- Computed once, on insert, and stored — the same reasoning as the ticket SLA
-- in 0009. add_business_time() is STABLE rather than IMMUTABLE because it reads
-- a calendar table, so a computed column would be re-evaluated against whatever
-- the calendar says today. Storing it means a holiday loaded next month cannot
-- retroactively move a target that was already set.
--
-- Two business days, i.e. 16 working hours. Slacker than support's 8 on
-- purpose: an enquiry has no promise attached, and setting an aggressive
-- internal target on unpromised work is how internal targets start being
-- treated as real deadlines and then leak into customer-facing copy.

create or replace function public.set_enquiry_follow_up_target()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.internal_follow_up_target_at is null then
    new.internal_follow_up_target_at :=
      public.add_business_time(coalesce(new.created_at, now()), interval '16 hours');
  end if;
  return new;
end;
$$;

drop trigger if exists contact_enquiries_follow_up on public.contact_enquiries;
create trigger contact_enquiries_follow_up
  before insert on public.contact_enquiries
  for each row execute function public.set_enquiry_follow_up_target();

-- ---------------------------------------------------------------------------
-- Status stamping
-- ---------------------------------------------------------------------------

create or replace function public.stamp_enquiry_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> 'NEW' and old.status = 'NEW' then
    new.first_contacted_at := coalesce(new.first_contacted_at, now());
  end if;

  if new.status in ('CONVERTED', 'CLOSED', 'SPAM') then
    new.closed_at := coalesce(new.closed_at, now());
  else
    new.closed_at := null;
  end if;

  -- Closing re-anchors retention, same as tickets in 0003. Three years from the
  -- last contact, not from whenever the form happened to be filled in.
  if new.closed_at is not null and old.closed_at is distinct from new.closed_at then
    new.retention_expires_at := new.closed_at + interval '3 years';
  end if;

  return new;
end;
$$;

drop trigger if exists contact_enquiries_stamp on public.contact_enquiries;
create trigger contact_enquiries_stamp
  before update on public.contact_enquiries
  for each row execute function public.stamp_enquiry_status();

-- ---------------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------------
--
-- Append-only, like ticket_messages. There is no customer-visible thread here —
-- every note is internal, because the enquiry conversation happens on the phone
-- or in a mail client and this is only the record of it.

create table if not exists public.enquiry_notes (
  id          uuid primary key default gen_random_uuid(),
  enquiry_id  uuid not null references public.contact_enquiries (id) on delete cascade,
  author_id   uuid references public.staff_users (id) on delete set null,
  author_label text not null,
  body        text not null,
  created_at  timestamptz not null default now(),

  constraint enquiry_notes_body_len check (char_length(body) between 1 and 5000)
);

create index if not exists enquiry_notes_enquiry_idx on public.enquiry_notes (enquiry_id, created_at);

create or replace function public.reject_enquiry_note_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('platizio.retention_purge', true), '') = 'on'
     and tg_op = 'DELETE' then
    return old;
  end if;
  raise exception 'enquiry_notes is append-only; % is not permitted', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists enquiry_notes_no_update on public.enquiry_notes;
create trigger enquiry_notes_no_update
  before update on public.enquiry_notes
  for each row execute function public.reject_enquiry_note_mutation();

drop trigger if exists enquiry_notes_no_delete on public.enquiry_notes;
create trigger enquiry_notes_no_delete
  before delete on public.enquiry_notes
  for each row execute function public.reject_enquiry_note_mutation();

-- ---------------------------------------------------------------------------
-- The outbox learns about enquiries
-- ---------------------------------------------------------------------------
--
-- notifications.ticket_id was already nullable, so an enquiry email would have
-- inserted cleanly with no subject at all — and then nothing could answer "did
-- this enquiry get its acknowledgement" without parsing subject lines, and a
-- purged enquiry would leave its mail behind. A second nullable key with a
-- mutual-exclusion check fixes both: every row belongs to exactly one subject,
-- or to none in the case of a pure internal alert.

alter table public.notifications
  add column if not exists enquiry_id uuid references public.contact_enquiries (id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_one_subject;
alter table public.notifications add constraint notifications_one_subject
  check (not (ticket_id is not null and enquiry_id is not null));

create index if not exists notifications_enquiry_idx
  on public.notifications (enquiry_id, created_at)
  where enquiry_id is not null;

alter table public.notifications drop constraint if exists notifications_template;
alter table public.notifications add constraint notifications_template check (
  template = any (array[
    'ticket_acknowledgement',
    'ticket_reply',
    'ticket_resolved',
    'sla_internal_alert',
    'status_link',
    'complaint_acknowledgement',
    'complaint_closure',
    'enquiry_acknowledgement',
    'enquiry_internal_alert'
  ])
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
--
-- Same posture as every other table in this schema: anon gets nothing, not read
-- and not insert. Intake goes through a SECURITY DEFINER RPC called by an Edge
-- Function holding the service key, so the browser never carries a credential
-- that can write here.

alter table public.contact_enquiries enable row level security;
alter table public.enquiry_notes     enable row level security;
alter table public.enquiry_interests enable row level security;

drop policy if exists "staff read enquiries" on public.contact_enquiries;
create policy "staff read enquiries"
  on public.contact_enquiries for select to authenticated
  using (public.is_staff());

drop policy if exists "staff read enquiry notes" on public.enquiry_notes;
create policy "staff read enquiry notes"
  on public.enquiry_notes for select to authenticated
  using (public.is_staff());

-- The interest list is the only thing here a browser legitimately reads: the
-- dropdown has to render. It is a list of five product names and discloses
-- nothing about anybody.
drop policy if exists "anyone reads enquiry interests" on public.enquiry_interests;
create policy "anyone reads enquiry interests"
  on public.enquiry_interests for select to anon, authenticated
  using (is_active);

revoke all on public.contact_enquiries from anon, authenticated;
revoke all on public.enquiry_notes     from anon, authenticated;
revoke all on public.enquiry_interests from anon, authenticated;

grant select on public.contact_enquiries to authenticated;
grant select on public.enquiry_notes     to authenticated;
grant select on public.enquiry_interests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Retention
-- ---------------------------------------------------------------------------
--
-- Extends private.purge_expired_records() from 0011. Enquiries under legal hold
-- survive, exactly as tickets do. The consent record attached to an enquiry
-- cascades with it, and enquiry_notes cascade too — the append-only trigger
-- lets a DELETE through only while platizio.retention_purge is set, which this
-- function does before it starts.
--
-- consent_records gains a second key first, because the purge below reads it.
-- Without the column, an enquiry's consent row would carry a null ticket_id and
-- be caught by the orphan branch of that purge the moment its own three years
-- elapsed — deleting the evidence of consent while the enquiry it belongs to
-- was still live. The order here matters: plpgsql resolves column names at
-- first execution, so the function would have created cleanly and failed on the
-- first nightly run.

alter table public.consent_records
  add column if not exists enquiry_id uuid references public.contact_enquiries (id) on delete cascade;

alter table public.consent_records drop constraint if exists consent_records_one_subject;
alter table public.consent_records add constraint consent_records_one_subject
  check (not (ticket_id is not null and enquiry_id is not null));

create index if not exists consent_records_enquiry_idx
  on public.consent_records (enquiry_id)
  where enquiry_id is not null;

create or replace function private.purge_expired_records()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  gone_complaints integer := 0;
  gone_tickets    integer := 0;
  gone_enquiries  integer := 0;
  gone_consent    integer := 0;
  gone_ratelimit  integer := 0;
begin
  perform set_config('platizio.retention_purge', 'on', true);

  delete from public.complaints c
   where c.legal_hold = false
     and c.retention_expires_at < now()
     and not exists (
       select 1 from public.tickets t
       where t.id = c.ticket_id and t.legal_hold
     );
  get diagnostics gone_complaints = row_count;

  delete from public.tickets t
   where t.legal_hold = false
     and t.retention_expires_at < now()
     and not exists (select 1 from public.complaints c where c.ticket_id = t.id);
  get diagnostics gone_tickets = row_count;

  delete from public.contact_enquiries e
   where e.legal_hold = false
     and e.retention_expires_at < now();
  get diagnostics gone_enquiries = row_count;

  delete from public.consent_records
   where ticket_id is null
     and enquiry_id is null
     and retention_expires_at < now();
  get diagnostics gone_consent = row_count;

  delete from private.rate_limit_hits
   where window_start < now() - interval '2 days';
  get diagnostics gone_ratelimit = row_count;

  perform set_config('platizio.retention_purge', 'off', true);

  return jsonb_build_object(
    'complaints', gone_complaints,
    'tickets', gone_tickets,
    'enquiries', gone_enquiries,
    'consentRecords', gone_consent,
    'rateLimitRows', gone_ratelimit
  );
end;
$$;
