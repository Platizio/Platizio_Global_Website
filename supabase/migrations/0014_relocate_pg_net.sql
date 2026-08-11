-- 0014_relocate_pg_net.sql — move pg_net out of the public schema.
--
-- Raised by Supabase's own security advisor after 0011 landed
-- (lint 0014_extension_in_public).
--
-- `create extension pg_net` with no schema clause registers the extension
-- against `public`, which is the schema PostgREST exposes. In this particular
-- case nothing was actually reachable — pg_net creates its own `net` schema and
-- puts every function and table there, so the count of pg_net objects in public
-- was zero. But "the extension is registered somewhere exposed and happens to
-- put nothing there" is a fact about pg_net's current install script, not a
-- property anyone should be relying on, and it is not worth re-deriving at the
-- next upgrade.
--
-- pg_net is not relocatable, so ALTER EXTENSION ... SET SCHEMA is refused and
-- the only route is drop and recreate. That is safe here:
--   * net.http_post is called from private.invoke_edge_function, which is
--     plpgsql and resolves its references at execution time, not at creation.
--   * the cron jobs hold SQL as text, so they have no dependency to break.
--   * net._http_response is a rolling log of past responses, not a record.
--
-- The functions stay in `net` either way. Only the registration moves.

do $$
begin
  if exists (
    select 1 from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_net' and n.nspname <> 'extensions'
  ) then
    drop extension pg_net;
    create extension pg_net with schema extensions;
  end if;
end $$;
