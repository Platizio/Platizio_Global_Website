-- 0004_audit.sql — the status trail, and the triggers that keep it honest.
--
-- Privacy Policy §10 already names "audit logs" among the controls Platizio
-- operates. This is that control for support: every status change on every
-- ticket, whoever made it, including a hand edit in Supabase Studio.
--
-- The reason this is a trigger and not application code is the security model.
-- `service_role` — which is what Studio uses — bypasses Row Level Security, so
-- RLS cannot make this trail complete. It is not a superuser though, and only a
-- table's owner or a superuser can disable a trigger, so as long as these tables
-- stay owned by `postgres` and `service_role` is never granted ownership, a
-- Studio session cannot write a status change without writing a trail row and
-- cannot remove one afterwards. Verify that ownership after applying, rather
-- than assuming it; the check is in supabase/README.md.

-- ---------------------------------------------------------------------------
-- Who did it
-- ---------------------------------------------------------------------------
--
-- auth.uid() answers this for a signed-in staff member and returns null for
-- everything else, which is exactly the case that most needs labelling: a
-- service_role write from an Edge Function and a hand edit in Studio are both
-- "null" and are not the same event.
create or replace function public.current_actor_label()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb;
begin
  begin
    claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    claims := null;
  end;

  if claims ? 'email' then
    return claims ->> 'email';
  end if;
  if claims ? 'role' then
    return 'api:' || (claims ->> 'role');
  end if;

  -- No PostgREST request context at all: a direct database session. The SQL
  -- editor in Studio lands here.
  return 'sql:' || current_user;
end;
$$;

-- ---------------------------------------------------------------------------
-- ticket_status_history
-- ---------------------------------------------------------------------------

create table public.ticket_status_history (
  id            bigint generated always as identity primary key,
  ticket_id     uuid not null references public.tickets (id) on delete cascade,
  from_internal public.ticket_status_internal,
  to_internal   public.ticket_status_internal not null,
  from_customer public.ticket_status_customer,
  to_customer   public.ticket_status_customer not null,
  actor_id      uuid,
  actor_label   text not null,
  note          text,
  changed_at    timestamptz not null default now()
);

comment on table public.ticket_status_history is
  'Append-only. Written by trigger on every status change, including hand edits made as service_role.';

create index ticket_status_history_ticket_idx
  on public.ticket_status_history (ticket_id, changed_at);

-- ---------------------------------------------------------------------------
-- 1. Audit every status change, whoever makes it
-- ---------------------------------------------------------------------------

create or replace function public.log_status_change()
returns trigger
language plpgsql
-- SECURITY DEFINER on purpose. The trail table has no INSERT policy for anyone,
-- so this trigger is the only path a row can enter by — a staff member cannot
-- write a status change without a trail row, and cannot forge one either.
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.status_internal is distinct from old.status_internal
     or new.status_customer is distinct from old.status_customer then
    insert into public.ticket_status_history
      (ticket_id, from_internal, to_internal, from_customer, to_customer, actor_id, actor_label)
    values (
      new.id,
      case when tg_op = 'INSERT' then null else old.status_internal end,
      new.status_internal,
      case when tg_op = 'INSERT' then null else old.status_customer end,
      new.status_customer,
      auth.uid(),
      public.current_actor_label()
    );
  end if;
  return new;
end;
$$;

-- AFTER, not BEFORE. On INSERT the trail row carries a foreign key to the
-- ticket, and on a BEFORE trigger that ticket does not exist yet.
create trigger tickets_log_status_change
  after insert or update on public.tickets
  for each row execute function public.log_status_change();

-- ---------------------------------------------------------------------------
-- 2. The trail is append-only, including for service_role
-- ---------------------------------------------------------------------------
--
-- One exception, and it is narrow. Privacy Policy §9 commits to deleting
-- support records after 5 years, and a trail that outlived every ticket would
-- quietly break that commitment — so the retention purge, and only the
-- retention purge, may remove trail rows, and only as a cascade from the ticket
-- being deleted. It signals itself by setting a transaction-local GUC that the
-- purge function (0011) sets and nothing else does.
--
-- The honest limit: a session holding service_role can set that GUC itself.
-- This trigger is not a defence against a determined operator with the service
-- key — nothing at the database level is. It is a defence against accident,
-- against a careless Studio edit, and against a compromised Edge Function,
-- which is what actually happens. UPDATE has no exception at all.

create or replace function public.reject_history_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('platizio.retention_purge', true), 'off') = 'on' then
    return old;
  end if;

  raise exception 'ticket_status_history is append-only (attempted %)', tg_op
    using errcode = 'restrict_violation';
end;
$$;

create trigger history_immutable
  before update or delete on public.ticket_status_history
  for each row execute function public.reject_history_mutation();

-- ---------------------------------------------------------------------------
-- 3. Thread messages are append-only on the same terms
-- ---------------------------------------------------------------------------
--
-- A support thread that can be edited after the fact is not evidence of what
-- was said. Corrections are made by posting another message.

create or replace function public.reject_message_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('platizio.retention_purge', true), 'off') = 'on' then
    return old;
  end if;

  raise exception 'ticket_messages is append-only (attempted %)', tg_op
    using errcode = 'restrict_violation';
end;
$$;

create trigger ticket_messages_immutable
  before update or delete on public.ticket_messages
  for each row execute function public.reject_message_mutation();
