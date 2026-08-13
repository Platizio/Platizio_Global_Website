-- 0009_business_hours.sql — the business-hours calendar and real business-day arithmetic.
--
-- The site publishes "within 24 hours on business days" for a first response
-- and "1–5 days" to resolve, against Monday–Friday 09:00–17:00 IST. None of
-- that is expressible as now() + interval '24 hours': a ticket raised at 16:30
-- on a Friday would come due on Saturday, when nobody is working, and would be
-- counted as breached on Monday morning before anyone had a chance to touch it.
--
-- So: a calendar, and a function that walks it.

-- ---------------------------------------------------------------------------
-- The calendar
-- ---------------------------------------------------------------------------

-- ISO weekday numbering, 1 = Monday … 7 = Sunday, to match extract(isodow).
create table public.business_hours (
  weekday    smallint primary key check (weekday between 1 and 7),
  opens_at   time not null,
  closes_at  time not null,
  is_working boolean not null default true,

  constraint business_hours_window check (closes_at > opens_at)
);

create table public.business_holidays (
  holiday_date date primary key,
  label        text not null,

  constraint business_holidays_label_len check (char_length(label) between 2 and 120)
);

comment on table public.business_hours is
  'Weekly working window in Asia/Kolkata. Read by add_business_time() when computing SLA deadlines.';
comment on table public.business_holidays is
  'Dated closures on top of the weekly window. Deliberately incomplete — see the seed note below.';

insert into public.business_hours (weekday, opens_at, closes_at, is_working) values
  (1, '09:00', '17:00', true),   -- Monday
  (2, '09:00', '17:00', true),
  (3, '09:00', '17:00', true),
  (4, '09:00', '17:00', true),
  (5, '09:00', '17:00', true),   -- Friday
  (6, '09:00', '17:00', false),  -- Saturday
  (7, '09:00', '17:00', false)   -- Sunday
on conflict (weekday) do update set
  opens_at   = excluded.opens_at,
  closes_at  = excluded.closes_at,
  is_working = excluded.is_working;

-- Seeded with the three fixed-date national holidays only. Every other Indian
-- public holiday moves with the lunar calendar, and which of them the support
-- desk actually closes on is an operational decision, not one to guess at here:
-- a wrong date in this table silently moves a published deadline.
--
-- Whoever owns the queue fills the rest in. Until they do, the calendar
-- under-counts closures, which makes deadlines earlier than they need to be —
-- the safe direction to be wrong in.
insert into public.business_holidays (holiday_date, label) values
  ('2026-08-15', 'Independence Day'),
  ('2026-10-02', 'Gandhi Jayanti'),
  ('2027-01-26', 'Republic Day'),
  ('2027-08-15', 'Independence Day'),
  ('2027-10-02', 'Gandhi Jayanti')
on conflict (holiday_date) do nothing;

-- ---------------------------------------------------------------------------
-- add_business_time()
-- ---------------------------------------------------------------------------
--
-- STABLE, not IMMUTABLE: it reads two tables, so it cannot promise the same
-- answer forever. The immutability that actually matters is achieved a
-- different way — due dates are computed once on insert and stored, so editing
-- the calendar next year cannot move a deadline that was already promised to
-- somebody.
--
-- All arithmetic is done on naive local timestamps in Asia/Kolkata and
-- converted back at the end, so a working day means 09:00–17:00 as a person in
-- the office experiences it, whatever the server's timezone is.

create or replace function public.add_business_time(from_ts timestamptz, work_interval interval)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  tz constant text := 'Asia/Kolkata';
  cursor_local timestamp;
  remaining    interval := work_interval;
  day_date     date;
  win          record;
  day_open     timestamp;
  day_close    timestamp;
  available    interval;
  guard        integer := 0;
begin
  if work_interval is null or work_interval < interval '0' then
    raise exception 'add_business_time requires a non-negative interval, got %', work_interval;
  end if;

  cursor_local := from_ts at time zone tz;

  loop
    -- Bounded so that a calendar with every weekday switched off fails loudly
    -- on the next insert instead of spinning a connection forever.
    guard := guard + 1;
    if guard > 400 then
      raise exception 'add_business_time did not converge after 400 days; business_hours has no working day';
    end if;

    day_date := cursor_local::date;

    select bh.opens_at, bh.closes_at, bh.is_working
      into win
    from public.business_hours bh
    where bh.weekday = extract(isodow from day_date)::smallint;

    if not found
       or not win.is_working
       or exists (select 1 from public.business_holidays h where h.holiday_date = day_date) then
      cursor_local := (day_date + 1)::timestamp;
      continue;
    end if;

    day_open  := day_date + win.opens_at;
    day_close := day_date + win.closes_at;

    -- Arrived before opening, or rolled in from a previous day: the clock does
    -- not start until the desk does.
    if cursor_local < day_open then
      cursor_local := day_open;
    end if;

    -- Arrived after closing: nothing left to spend today.
    if cursor_local >= day_close then
      cursor_local := (day_date + 1)::timestamp;
      continue;
    end if;

    available := day_close - cursor_local;

    if remaining <= available then
      return (cursor_local + remaining) at time zone tz;
    end if;

    remaining    := remaining - available;
    cursor_local := (day_date + 1)::timestamp;
  end loop;
end;
$$;

comment on function public.add_business_time is
  'Adds working time to a timestamp, walking business_hours and business_holidays in Asia/Kolkata.';

-- ---------------------------------------------------------------------------
-- SLA targets
-- ---------------------------------------------------------------------------
--
-- READ THIS BEFORE CHANGING A NUMBER. These four constants are the machine
-- reading of promises the site makes in prose, and the mapping is a judgement
-- call that a human should sign off on:
--
--   First response — published as "within 24 hours on business days"
--     (faqData.tsx sp-1, and step 1 of "What happens after you submit").
--     Encoded as 8 business hours, i.e. one full working day.
--
--     "24 hours on business days" has two readings. Read as 24 *business*
--     hours it means three working days, which would let a ticket sit until
--     Wednesday while the page promises 24 hours — the internal clock would be
--     laxer than the public promise, which is the dangerous direction to be
--     wrong in. Read as one working day it is 8 business hours, which is at
--     least as strict as the published promise under either reading. Taken.
--
--     Worked example, and the case this whole file exists for: a ticket raised
--     at 16:30 on a Friday spends 30 minutes of Friday and 7.5 hours of Monday,
--     coming due Monday at 16:30 — never Saturday.
--
--   Resolution — published as "resolved within 1–5 days". Encoded as the outer
--     bound: 5 working days, 40 business hours.
--
--   Grievance acknowledgement and resolution — T&C §23 and Privacy Policy §19:
--     acknowledged within 24 hours, addressed within 15 working days. Encoded
--     as 8 and 120 business hours on the same reading as above.

create or replace function public.set_ticket_due_dates()
returns trigger
language plpgsql
-- Definer so the calendar read succeeds no matter who is inserting: a
-- deadline must not depend on the caller's privileges.
security definer
set search_path = ''
as $$
begin
  if new.first_response_due_at is null then
    new.first_response_due_at := public.add_business_time(new.created_at, interval '8 hours');
  end if;

  if new.resolution_due_at is null then
    new.resolution_due_at := public.add_business_time(new.created_at, interval '40 hours');
  end if;

  return new;
end;
$$;

create trigger tickets_set_due_dates
  before insert on public.tickets
  for each row execute function public.set_ticket_due_dates();

create or replace function public.set_complaint_due_dates()
returns trigger
language plpgsql
-- Definer so the calendar read succeeds no matter who is inserting: a
-- deadline must not depend on the caller's privileges.
security definer
set search_path = ''
as $$
begin
  if new.acknowledgement_due_at is null then
    new.acknowledgement_due_at := public.add_business_time(new.created_at, interval '8 hours');
  end if;

  if new.resolution_due_at is null then
    new.resolution_due_at := public.add_business_time(new.created_at, interval '120 hours');
  end if;

  return new;
end;
$$;

create trigger complaints_set_due_dates
  before insert on public.complaints
  for each row execute function public.set_complaint_due_dates();

-- Now that every insert fills them, the columns declared nullable in 0003 can
-- say what they mean. A ticket without a deadline is a ticket outside the SLA
-- report, which is the one place a null would hide rather than fail.
alter table public.tickets
  alter column first_response_due_at set not null,
  alter column resolution_due_at     set not null;

alter table public.complaints
  alter column acknowledgement_due_at set not null,
  alter column resolution_due_at      set not null;
