-- 0023_holiday_calendar.sql — the calendar the SLA is measured against.
--
-- business_holidays currently holds five rows: Republic Day, Independence Day
-- and Gandhi Jayanti across 2026 and 2027. Those are the dates that are fixed
-- by statute and can be written down years ahead without checking anything.
--
-- Every other Indian market holiday moves — Diwali, Holi, the two Eids,
-- Janmashtami, Guru Nanak Jayanti — and their dates come from the exchange
-- circular each year, not from arithmetic. This migration does *not* guess
-- them, and that is a deliberate choice rather than an omission:
--
--   A missing holiday makes the SLA tighter than it should be. We promise a
--   first response sooner than the calendar really allows, and occasionally
--   look late against our own clock on a day the office was shut.
--
--   A wrongly-added holiday makes the SLA looser. We quietly give ourselves an
--   extra day the customer was never told about, and the published promise
--   stops being the promise being measured.
--
-- The first error is embarrassing. The second is the one that makes a
-- published SLA untrue, which is the whole thing this system exists to avoid.
-- So the calendar errs short, and the missing dates get loaded from the
-- exchange list rather than from memory.
--
-- What this migration adds instead of guesses:
--   · the fixed-date holidays that were still missing
--   · staff_set_holidays(), so a year's list is one paste, not 15 INSERTs
--   · staff_holiday_calendar(), to see what is actually loaded
--   · a coverage figure on the dashboard, so a thin calendar is visible
--     rather than being discovered by a customer
--
-- One operational consequence worth stating plainly: due dates are computed
-- and stored when a ticket is created (that is how 0009 makes them immutable).
-- Loading a holiday changes the SLA of tickets raised *after* it is loaded and
-- nothing already in the queue. Load the year before the year starts.

-- ---------------------------------------------------------------------------
-- The fixed-date ones that were missing
-- ---------------------------------------------------------------------------

insert into public.business_holidays (holiday_date, label) values
  ('2026-01-26', 'Republic Day'),
  ('2026-12-25', 'Christmas Day'),
  ('2027-12-25', 'Christmas Day')
on conflict (holiday_date) do nothing;

-- ---------------------------------------------------------------------------
-- private.holiday_coverage — is the calendar thin?
-- ---------------------------------------------------------------------------
--
-- A count, not a verdict. India's exchanges publish roughly 13-16 trading
-- holidays a year; well under ten in the coming twelve months means the
-- variable-date list has not been loaded. It is a heuristic and it is labelled
-- as one — it cannot tell a genuinely quiet year from a forgotten circular,
-- only that somebody should look.

create or replace function private.holiday_coverage()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'next12Months', (
      select count(*) from public.business_holidays
       where holiday_date >= (now() at time zone 'Asia/Kolkata')::date
         and holiday_date <  (now() at time zone 'Asia/Kolkata')::date + interval '12 months'
    ),
    'lastLoadedDate', (select max(holiday_date) from public.business_holidays),
    'looksThin', (
      select count(*) < 8 from public.business_holidays
       where holiday_date >= (now() at time zone 'Asia/Kolkata')::date
         and holiday_date <  (now() at time zone 'Asia/Kolkata')::date + interval '12 months'
    ),
    'note', 'Indian exchanges publish roughly 13-16 holidays a year. Fewer than 8 loaded for the next twelve months usually means the variable-date list (Diwali, Holi, the Eids) has not been taken from the exchange circular yet. Due dates are stored at ticket creation, so loading a holiday only affects tickets raised afterwards.'
  );
$$;

-- ---------------------------------------------------------------------------
-- staff_set_holidays — load a year in one call
-- ---------------------------------------------------------------------------
--
-- Replaces the whole year rather than merging, because the failure mode of a
-- merge is a stale date nobody can find: last year's Diwali sitting in the
-- table, silently extending one SLA a year, with no way to tell it apart from
-- a date somebody meant to add.
--
-- Refuses to blank a year. Passing an empty list is far more likely to be a
-- caller bug than a genuine statement that a year has no holidays, and the
-- damage is invisible until an SLA lands on Diwali.

create or replace function public.staff_set_holidays(
  p_year      integer,
  p_holidays  jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor   uuid := private.require_admin();
  v_removed integer;
  v_added   integer;
begin
  if p_year is null or p_year < 2020 or p_year > 2100 then
    raise exception 'p_year must be a four-digit year between 2020 and 2100';
  end if;

  if jsonb_typeof(p_holidays) <> 'array' or jsonb_array_length(p_holidays) = 0 then
    raise exception
      'Pass a non-empty array of {date, label}. Clearing a year outright is almost always a mistake; delete individual dates if that is really what you mean.'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Every date must fall inside the year being replaced. Without this, one
  -- mistyped year in the payload writes a date into a year the caller thinks
  -- they are not touching, and the next load of *that* year silently reverts it.
  if exists (
    select 1
      from jsonb_array_elements(p_holidays) e
     where extract(year from (e ->> 'date')::date) <> p_year
  ) then
    raise exception 'Every date must fall in %; the payload contains at least one that does not', p_year
      using errcode = 'invalid_parameter_value';
  end if;

  -- Caught here rather than by the table's length check, because the CHECK
  -- constraint's message names a column and says nothing about which of the
  -- fifteen dates in the paste was the bad one.
  if exists (
    select 1
      from jsonb_array_elements(p_holidays) e
     where coalesce(char_length(trim(e ->> 'label')), 0) < 2
  ) then
    raise exception 'Every holiday needs a label of at least two characters'
      using errcode = 'invalid_parameter_value';
  end if;

  delete from public.business_holidays
   where extract(year from holiday_date) = p_year;
  get diagnostics v_removed = row_count;

  -- DISTINCT ON, because two entries sharing a date would make one INSERT try
  -- to touch the same row twice and Postgres refuses that outright — a
  -- duplicated line in a pasted list should not be a hard error.
  insert into public.business_holidays (holiday_date, label)
  select distinct on (d) d, lbl
    from (
      select (e ->> 'date')::date as d, trim(e ->> 'label') as lbl
        from jsonb_array_elements(p_holidays) e
    ) parsed
   order by d, lbl
  on conflict (holiday_date) do update set label = excluded.label;
  get diagnostics v_added = row_count;

  return jsonb_build_object(
    'year',    p_year,
    'removed', v_removed,
    'loaded',  v_added,
    'actor',   public.current_actor_label()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- staff_holiday_calendar — what is actually loaded
-- ---------------------------------------------------------------------------

create or replace function public.staff_holiday_calendar(
  p_year integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.require_staff();
  v_year  integer := coalesce(p_year, extract(year from (now() at time zone 'Asia/Kolkata'))::integer);
begin
  return jsonb_build_object(
    'year', v_year,
    'holidays', coalesce((
      select jsonb_agg(jsonb_build_object(
               'date',    h.holiday_date,
               'label',   h.label,
               'weekday', to_char(h.holiday_date, 'Dy')
             ) order by h.holiday_date)
        from public.business_holidays h
       where extract(year from h.holiday_date) = v_year
    ), '[]'::jsonb),
    'businessHours', coalesce((
      select jsonb_agg(jsonb_build_object(
               'weekday',   b.weekday,
               'opensAt',   b.opens_at,
               'closesAt',  b.closes_at,
               'isWorking', b.is_working
             ) order by b.weekday)
        from public.business_hours b
    ), '[]'::jsonb),
    'coverage', private.holiday_coverage()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- The dashboard surfaces it
-- ---------------------------------------------------------------------------
--
-- Identical to 0019 apart from the last key. A thin calendar that nobody is
-- shown is a thin calendar that stays thin until a customer notices.

create or replace function public.staff_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.require_staff();
begin
  return jsonb_build_object(
    'open', (
      select count(*) from public.tickets
       where status_internal not in ('CLOSED', 'SPAM')
    ),
    'unassigned', (
      select count(*) from public.tickets
       where status_internal not in ('CLOSED', 'SPAM') and assigned_agent_id is null
    ),
    'mine', (
      select count(*) from public.tickets
       where status_internal not in ('CLOSED', 'SPAM') and assigned_agent_id = v_actor
    ),
    'awaitingFirstResponse', (
      select count(*) from public.tickets
       where first_response_at is null and status_internal not in ('CLOSED', 'SPAM')
    ),
    'firstResponseBreached', (
      select count(*) from public.tickets
       where first_response_at is null
         and first_response_due_at is not null
         and now() > first_response_due_at
         and status_internal not in ('CLOSED', 'SPAM')
    ),
    'resolutionBreached', (
      select count(*) from public.tickets
       where resolved_at is null
         and resolution_due_at is not null
         and now() > resolution_due_at
         and status_internal not in ('CLOSED', 'SPAM')
    ),
    'byStatus', coalesce((
      select jsonb_object_agg(status_internal, n)
        from (select status_internal, count(*) as n
                from public.tickets group by status_internal) s
    ), '{}'::jsonb),
    'openComplaints', (
      select count(*) from public.complaints where stage <> 'CLOSED'
    ),
    'complaintsBreached', (
      select count(*) from public.complaints
       where stage <> 'CLOSED'
         and resolution_due_at is not null
         and now() > resolution_due_at
         and resolved_at is null
    ),
    'outboxPending', (
      select count(*) from public.notifications where status in ('PENDING', 'SENDING')
    ),
    'outboxFailed', (
      select count(*) from public.notifications where status = 'FAILED'
    ),
    'holidayCoverage', private.holiday_coverage(),
    'generatedAt', now()
  );
end;
$$;

revoke all on function public.staff_set_holidays(integer, jsonb) from public, anon;
revoke all on function public.staff_holiday_calendar(integer) from public, anon;

grant execute on function public.staff_set_holidays(integer, jsonb)  to authenticated, service_role;
grant execute on function public.staff_holiday_calendar(integer)     to authenticated, service_role;
