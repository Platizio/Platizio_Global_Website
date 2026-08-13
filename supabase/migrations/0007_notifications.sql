-- 0007_notifications.sql — the email outbox.
--
-- A mail failure must never fail ticket creation. The customer pressed Send;
-- whether Resend is reachable in that half second is not their problem and must
-- not cost them their request. So intake writes a row here inside the same
-- transaction as the ticket, and a worker drains it afterwards.
--
-- The row carries the finished email, rendered at enqueue time, rather than a
-- template name and a bag of variables for the worker to interpolate. Two
-- reasons: the outbox is then a record of what was actually sent and not a
-- promise about what a current template would produce, so editing the wording
-- next year cannot rewrite what a customer received last year; and the worker
-- reduces to a sender, which is the part most likely to fail and the part least
-- helped by also holding presentation logic.

create table public.notifications (
  id        uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets (id) on delete cascade,

  channel  text not null default 'email' check (channel in ('email')),
  -- Kept for grouping and for answering "did every ticket get an ack" without
  -- parsing subject lines. Not used to render anything.
  template text not null,

  to_email text not null,
  reply_to text,

  subject   text not null,
  body_text text not null,
  body_html text,

  status   public.notification_status not null default 'PENDING',
  attempts integer not null default 0,
  -- Five tries across a widening backoff. Past that the failure is structural —
  -- an unverified domain, a rejected key — and further retries are noise that
  -- hides it rather than progress towards fixing it.
  max_attempts    integer not null default 5,
  next_attempt_at timestamptz not null default now(),
  last_error      text,

  provider            text,
  provider_message_id text,

  -- Stops a double send when finalize-ticket is retried: 'ack:<ticket_id>' is
  -- already present, so the second insert collides instead of queueing a second
  -- acknowledgement for the same ticket.
  dedupe_key text unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at    timestamptz,

  constraint notifications_template
    check (template in ('ticket_acknowledgement', 'ticket_reply', 'sla_internal_alert')),
  constraint notifications_to_email_shape
    check (to_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint notifications_subject_len check (char_length(subject) between 3 and 300),
  constraint notifications_body_len    check (char_length(body_text) between 10 and 100000),
  constraint notifications_attempts    check (attempts >= 0 and attempts <= max_attempts),
  constraint notifications_sent_stamp  check ((status = 'SENT') = (sent_at is not null))
);

comment on table public.notifications is
  'Transactional email outbox. Written inside the intake transaction; drained by the drain-outbox worker.';
comment on column public.notifications.dedupe_key is
  'Unique. Makes enqueueing idempotent, so a retried finalize cannot send a second acknowledgement.';

-- The partial index is the worker's entire query plan: the oldest due pending
-- rows. Partial so that the eventually-large population of SENT rows never
-- enters it.
create index notifications_due_idx on public.notifications (next_attempt_at)
  where status = 'PENDING';
create index notifications_ticket_idx on public.notifications (ticket_id, created_at);
-- A row left in SENDING is a worker that died mid-send. The reaper in 0011
-- works off this.
create index notifications_stuck_idx on public.notifications (updated_at)
  where status = 'SENDING';

create trigger notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();
