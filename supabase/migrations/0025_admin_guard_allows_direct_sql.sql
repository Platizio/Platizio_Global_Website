-- 0025_admin_guard_allows_direct_sql.sql — I broke the bootstrap in 0021.
--
-- 0021 put private.require_admin() in front of provision_staff_user(), which
-- until then had no guard at all. The guard accepts two callers: a JWT whose
-- role is service_role, or an active staff member holding ADMIN.
--
-- Neither of those describes the Supabase SQL editor. A direct database session
-- — Studio, psql, the management API — connects as `postgres` and sets no
-- request.jwt.claims at all, so it fell through to require_staff(), where
-- auth.uid() is null, and got:
--
--   This action requires a signed-in staff account
--
-- Which is a baffling thing to be told by a SQL editor, and it broke the one
-- path that has to work before any of the others can: creating the very first
-- admin. The Edge Function added alongside it needs an ADMIN to authorise it or
-- the service key to be presented over HTTP, so with this guard in place and no
-- admin yet, there was no way in.
--
-- The fix is to recognise the claimless case. An empty request.jwt.claims means
-- the call did not arrive through PostgREST — every API request has claims,
-- including anonymous ones, which carry role = anon. So no claims means a
-- direct connection, and a direct connection already required the database
-- password. Somebody holding that can drop this function; gating them behind it
-- protects nothing and only breaks the tools.
--
-- It returns null rather than a uuid, so the audit trail records the session
-- honestly as 'sql:postgres' instead of attributing the change to a person.

create or replace function private.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_claims jsonb;
begin
  begin
    v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    v_claims := null;
  end;

  -- No claims: a direct database session, which already holds more authority
  -- than this guard could withhold.
  if v_claims is null then
    return null;
  end if;

  -- The service key, over HTTP. This is how invite-staff bootstraps the first
  -- admin and how a break-glass script gets in.
  if v_claims ->> 'role' = 'service_role' then
    return null;
  end if;

  -- Anything else arrived as a person, and has to be an active admin.
  return private.require_staff(array['ADMIN']::public.staff_role[]);
end;
$$;
