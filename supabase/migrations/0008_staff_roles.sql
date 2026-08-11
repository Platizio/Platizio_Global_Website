-- 0008_staff_roles.sql — staff identity, roles, and the JWT hook that carries them.
--
-- Roles go into app_metadata and never into user_metadata. user_metadata is
-- writable by the user it belongs to, so a support agent who could put a role
-- there could promote themselves to Grievance Officer and close their own
-- complaints. app_metadata is writable only by the service key and by this
-- hook, which runs as supabase_auth_admin.

create table public.staff_users (
  id        uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email     text not null unique,
  -- Deactivation rather than deletion: a departed agent's name still has to
  -- resolve on the tickets they handled, and on the trail rows they wrote.
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint staff_users_name_len    check (char_length(full_name) between 2 and 120),
  constraint staff_users_email_shape check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint staff_users_email_lower check (email = lower(email))
);

create trigger staff_users_updated_at
  before update on public.staff_users
  for each row execute function public.set_updated_at();

create table public.user_roles (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.staff_role not null,
  granted_by uuid references auth.users (id),
  granted_at timestamptz not null default now(),

  unique (user_id, role)
);

comment on table public.user_roles is
  'Source of truth for staff authorisation. The JWT hook copies it into app_metadata; triggers read it directly.';

create index user_roles_role_idx on public.user_roles (role);

-- ---------------------------------------------------------------------------
-- Deferred foreign keys from 0003
-- ---------------------------------------------------------------------------
--
-- Declared here rather than in 0003 only because staff_users did not exist yet.
-- on delete restrict: a staff row with open work attached must be deactivated,
-- not deleted, or the tickets lose their owner silently.
alter table public.tickets
  add constraint tickets_assigned_agent_fk
  foreign key (assigned_agent_id) references public.staff_users (id) on delete restrict;

alter table public.ticket_messages
  add constraint ticket_messages_author_fk
  foreign key (author_staff_id) references public.staff_users (id) on delete restrict;

alter table public.complaints
  add constraint complaints_closed_by_fk
  foreign key (closed_by) references public.staff_users (id) on delete restrict;

create index tickets_assigned_agent_idx on public.tickets (assigned_agent_id)
  where assigned_agent_id is not null;

-- ---------------------------------------------------------------------------
-- Custom access token hook
-- ---------------------------------------------------------------------------
--
-- Runs before a token is issued. Must be enabled in the dashboard under
-- Authentication → Hooks → Customize Access Token (JWT) Claims, pointing at
-- public.custom_access_token_hook — creating the function is not enough.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb;
  roles  text[];
begin
  -- Only active staff carry roles. Deactivating someone therefore empties their
  -- claims on their next token refresh without anyone having to revoke rows.
  select coalesce(array_agg(ur.role::text order by ur.role::text), array[]::text[])
    into roles
  from public.user_roles ur
  join public.staff_users su on su.id = ur.user_id
  where ur.user_id = (event ->> 'user_id')::uuid
    and su.is_active;

  claims := event -> 'claims';

  if jsonb_typeof(claims -> 'app_metadata') is distinct from 'object' then
    claims := jsonb_set(claims, '{app_metadata}', '{}'::jsonb, true);
  end if;

  claims := jsonb_set(claims, '{app_metadata,platizio_roles}', to_jsonb(roles), true);

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from anon, authenticated, public;

-- The hook runs as supabase_auth_admin, which is not the tables' owner and so
-- is subject to the RLS enabled in 0010. The matching read policies are in that
-- file with the rest.
grant select on table public.user_roles  to supabase_auth_admin;
grant select on table public.staff_users to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Reading roles in policies
-- ---------------------------------------------------------------------------
--
-- These read the JWT, not the table, because a policy runs on every row of
-- every query and a table lookup there is a join nobody asked for. The cost is
-- staleness: a revoked role stays live until the token refreshes. That is
-- acceptable for read policies, and it is exactly why the complaint-closure
-- guard below reads user_roles directly instead.

create or replace function public.staff_roles()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case
    when jsonb_typeof(auth.jwt() -> 'app_metadata' -> 'platizio_roles') = 'array'
      then auth.jwt() -> 'app_metadata' -> 'platizio_roles'
    else '[]'::jsonb
  end;
$$;

create or replace function public.has_staff_role(required public.staff_role)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.staff_roles() ? required::text;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select jsonb_array_length(public.staff_roles()) > 0;
$$;

-- ---------------------------------------------------------------------------
-- T&C §23: only the Grievance Officer closes a complaint
-- ---------------------------------------------------------------------------
--
-- Reads user_roles rather than the JWT: this is an authorisation decision with
-- a regulator on the other end of it, and a token minted before a role was
-- revoked must not be able to make it.
--
-- Note what the auth.uid() check implies. A Studio session has no resolvable
-- actor, so it cannot close a complaint at all — not "should not", cannot. That
-- is deliberate, and it is why the staff app has to exist before the complaint
-- workflow ships, and why complaints are not in this slice.

create or replace function public.guard_complaint_close()
returns trigger
language plpgsql
-- Definer so the role lookup succeeds whatever the caller can read.
security definer
set search_path = ''
as $$
begin
  if new.stage = 'CLOSED' and old.stage is distinct from 'CLOSED' then
    if auth.uid() is null then
      raise exception 'Closing a complaint requires an authenticated user'
        using errcode = 'insufficient_privilege';
    end if;

    if not exists (
      select 1
      from public.user_roles ur
      join public.staff_users su on su.id = ur.user_id
      where ur.user_id = auth.uid()
        and ur.role = 'GRIEVANCE_OFFICER'
        and su.is_active
    ) then
      raise exception 'Only the Grievance Officer may close a complaint'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

create trigger complaints_guard_close
  before update on public.complaints
  for each row execute function public.guard_complaint_close();
