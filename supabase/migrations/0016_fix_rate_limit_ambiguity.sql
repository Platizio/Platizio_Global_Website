-- 0016_fix_rate_limit_ambiguity.sql — the rate limiter never ran.
--
-- public.rate_limit_consume declared a variable named `window_start` and then
-- wrote to a column named `window_start`. PL/pgSQL cannot tell which is meant
-- and refuses the statement outright:
--
--   42702: column reference "window_start" is ambiguous
--
-- So every call raised, and had done since 0012. It went unnoticed because of
-- how the callers handle that error, and the two behaved differently:
--
--   create-ticket      logs and continues, by design — losing a genuine support
--                      request because a counter was unavailable is worse than
--                      not throttling one. So intake worked perfectly and was
--                      completely unthrottled.
--   request-status-link fails closed, because it sends mail. So it returned 503
--                      for every request, which is how this was finally found.
--
-- Worth naming the lesson: the fail-open branch turned a hard error into
-- silence. It is still the right behaviour for intake, but it means the metric
-- that would have caught this — "how often does the rate limiter error" — is
-- the one nobody was looking at.
--
-- The fix is a rename. Every local now carries a v_ prefix so a column can
-- never shadow one again, and the insert aliases the table so the conflict
-- target is unambiguous on both sides.

create or replace function public.rate_limit_consume(
  p_bucket text,
  p_limit  integer,
  p_window interval
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_seconds double precision := extract(epoch from p_window);
  v_window_start   timestamptz;
  v_hits           integer;
begin
  if p_bucket is null or p_limit is null or v_window_seconds is null or v_window_seconds <= 0 then
    raise exception 'rate_limit_consume requires a bucket, a limit and a positive window';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / v_window_seconds) * v_window_seconds
  );

  insert into private.rate_limit_hits as r (bucket, window_start, hits)
  values (p_bucket, v_window_start, 1)
  on conflict (bucket, window_start)
    do update set hits = r.hits + 1
  returning r.hits into v_hits;

  return jsonb_build_object(
    'allowed', v_hits <= p_limit,
    'hits',    v_hits,
    'limit',   p_limit,
    'resetAt', v_window_start + p_window
  );
end;
$$;

revoke all on function public.rate_limit_consume(text, integer, interval)
  from public, anon, authenticated;
grant execute on function public.rate_limit_consume(text, integer, interval)
  to service_role;
