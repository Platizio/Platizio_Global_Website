-- 0001_enums.sql — state-machine value sets, and the shared infrastructure schema.
--
-- Enums are used only where the value set is part of the state machine: adding
-- or removing a value is a code change, because triggers, RLS policies and the
-- Edge Functions all branch on these values. The support taxonomy (categories
-- and subcategories) is deliberately NOT an enum — support categories drift,
-- and changing one must not require a migration. See 0002_taxonomy.sql.

-- ---------------------------------------------------------------------------
-- Schemas
-- ---------------------------------------------------------------------------
--
-- `private` is never added to the PostgREST exposed-schema list, so nothing in
-- it is reachable over the API at any key. Infrastructure that supports the
-- public tables but is not part of the record lives here (rate-limit counters,
-- operational config, cron helpers).
create schema if not exists private;

revoke all on schema private from anon, authenticated;
grant usage on schema private to service_role;

-- ---------------------------------------------------------------------------
-- Ticket state
-- ---------------------------------------------------------------------------
--
-- Two status columns, not one. The internal status is what the queue is sorted
-- and measured by; the customer status is what a requester is ever shown. They
-- move independently on purpose — "waiting on our broker partner" is real
-- internal state that a customer should see only as "in progress", and
-- collapsing them would leak counterparty workflow into a public status page.

create type public.ticket_status_internal as enum (
  'NEW',
  'TRIAGED',
  'IN_PROGRESS',
  'WAITING_ON_CUSTOMER',
  'WAITING_ON_BROKER',
  'RESOLVED',
  'CLOSED',
  'SPAM'
);

create type public.ticket_status_customer as enum (
  'RECEIVED',
  'IN_PROGRESS',
  'WAITING_ON_YOU',
  'RESOLVED',
  'CLOSED'
);

-- Stored uppercase and separate from the label the form shows, so renaming
-- "Urgent" in the UI is not a data migration.
create type public.ticket_priority as enum (
  'LOW',
  'NORMAL',
  'URGENT'
);

-- ---------------------------------------------------------------------------
-- Grievance state
-- ---------------------------------------------------------------------------
--
-- Mirrors the published escalation ladder on /help/grievance, which is itself
-- reproduced from Terms & Conditions §23 and Privacy Policy §19. Do not add a
-- stage here that does not exist in those documents.
create type public.complaint_stage as enum (
  'RAISED',
  'ACKNOWLEDGED',
  'UNDER_REVIEW',
  'RESOLVED',
  'CLOSED',
  'ESCALATED_ARBITRATION'
);

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------
--
-- GRIEVANCE_OFFICER is not a seniority level, it is the named role in T&C §23.
-- Only it may close a complaint; see the guard trigger in 0008_staff_roles.sql.
create type public.staff_role as enum (
  'AGENT',
  'SUPERVISOR',
  'GRIEVANCE_OFFICER',
  'ADMIN'
);

-- ---------------------------------------------------------------------------
-- Outbox
-- ---------------------------------------------------------------------------
create type public.notification_status as enum (
  'PENDING',
  'SENDING',
  'SENT',
  'FAILED',
  'CANCELLED'
);

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Every function in this schema sets an empty search_path and fully qualifies
-- its references. Without it a role that can create objects in a schema earlier
-- in the search path can shadow a table name and change what a SECURITY
-- DEFINER function operates on.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at is
  'Generic updated_at stamp. Attached BEFORE UPDATE on every table carrying that column.';
