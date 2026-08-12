-- 0020_attachment_access.sql — someone looked at a customer's passport.
--
-- 0006 put attachments in a private bucket and 0010 gave staff a storage
-- SELECT policy over it. That is correct as far as it goes: the documents are
-- not public, and the people who need them can reach them.
--
-- What it does not do is leave a record. A support agent can enumerate every
-- object in ticket-attachments and download every address proof, bank
-- statement and government ID the firm has ever received, and afterwards there
-- is nothing anywhere that says they did. For ordinary attachments that would
-- be untidy. For KYC-grade documents it is the one thing this whole system was
-- built to avoid — the brief's complaint about Web3Forms was precisely that
-- these files went somewhere unaccountable.
--
-- So the storage policy narrows to ADMIN break-glass, and normal access goes
-- through staff_open_attachment(), which writes an append-only log row before
-- it hands back a path. The log is enforced by removing the alternative, not
-- by asking callers to be well-behaved: an agent who tries to sign a URL
-- directly now gets nothing back from storage.
--
-- The Edge Function in supabase/functions/staff-attachment is what turns the
-- returned path into a 60-second signed URL, using the service key. That step
-- has to sit outside the database because Postgres cannot mint storage
-- signatures.

-- ---------------------------------------------------------------------------
-- The log
-- ---------------------------------------------------------------------------
--
-- attachment_id and actor_id carry no foreign key, deliberately, and the
-- filename is denormalised beside the first of them. Two reasons, and the
-- second is the load-bearing one:
--
--   1. Attachments are purged at 12 months while the ticket lives 5 years. A
--      log that died with the document would lose the record of who read it
--      before the record stopped mattering. The record outlives the file.
--
--   2. Any referential action would be fatal here. ON DELETE SET NULL is
--      executed as a real UPDATE against this table, and this table refuses
--      UPDATE by trigger — so confirm_attachments_swept(), which deletes
--      attachment rows with no retention GUC set, would start failing the
--      moment the first 12-month sweep ran. Append-only and ON DELETE SET NULL
--      cannot both be true of the same column.
--
-- ticket_id does keep its foreign key, ON DELETE CASCADE, because a cascade
-- DELETE is a DELETE — and purge_expired_records() sets
-- platizio.retention_purge before it runs, which is the one key that opens the
-- trigger. When retention finally takes the ticket it takes this too.

create table if not exists public.attachment_access_log (
  id                  bigint generated always as identity primary key,
  attachment_id       uuid,
  ticket_id           uuid not null references public.tickets (id) on delete cascade,
  attachment_filename text not null,
  actor_id            uuid,
  actor_label         text not null,
  reason              text,
  client_ip           inet,
  user_agent          text,
  accessed_at         timestamptz not null default now(),

  constraint attachment_access_log_reason_len
    check (reason is null or (char_length(reason) between 3 and 500)),
  constraint attachment_access_log_ua_len
    check (user_agent is null or char_length(user_agent) <= 500)
);

create index if not exists attachment_access_log_ticket_idx
  on public.attachment_access_log (ticket_id, accessed_at desc);
create index if not exists attachment_access_log_actor_idx
  on public.attachment_access_log (actor_id, accessed_at desc);

comment on table public.attachment_access_log is
  'Append-only record of every staff read of a ticket attachment. Written by '
  'staff_open_attachment(); cannot be updated or deleted except by the '
  'retention purge.';

-- ---------------------------------------------------------------------------
-- Append-only, by trigger
-- ---------------------------------------------------------------------------
--
-- Same shape as 0004's history guard, and for the same reason: service_role
-- bypasses RLS but is not a superuser, so it cannot drop a trigger on a table
-- owned by postgres. An audit trail that Studio can quietly edit is not an
-- audit trail. The retention purge gets through by setting a transaction-local
-- GUC, which is a deliberate hole with exactly one key.

create or replace function public.reject_attachment_access_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('platizio.retention_purge', true), '') = 'on'
     and tg_op = 'DELETE' then
    return old;
  end if;

  raise exception
    'attachment_access_log is append-only; % is not permitted', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists attachment_access_log_no_update on public.attachment_access_log;
create trigger attachment_access_log_no_update
  before update on public.attachment_access_log
  for each row execute function public.reject_attachment_access_mutation();

drop trigger if exists attachment_access_log_no_delete on public.attachment_access_log;
create trigger attachment_access_log_no_delete
  before delete on public.attachment_access_log
  for each row execute function public.reject_attachment_access_mutation();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
--
-- Readable by the roles with a supervisory reason to ask "who has been in this
-- customer's file" — supervisors, the grievance officer, admins. An ordinary
-- agent writes to it constantly and never needs to read it, and letting the
-- watched read the watchlist is how you find out which reads go unnoticed.
--
-- No INSERT policy for anyone. Rows arrive only through the SECURITY DEFINER
-- function below.

alter table public.attachment_access_log enable row level security;

drop policy if exists "supervisors read attachment access log" on public.attachment_access_log;
create policy "supervisors read attachment access log"
  on public.attachment_access_log
  for select
  to authenticated
  using (
    public.has_staff_role('SUPERVISOR')
    or public.has_staff_role('GRIEVANCE_OFFICER')
    or public.has_staff_role('ADMIN')
  );

-- ---------------------------------------------------------------------------
-- Narrow the storage policy
-- ---------------------------------------------------------------------------
--
-- Replaces the blanket staff read from 0010. ADMIN keeps direct access as a
-- break-glass path — if the Edge Function is down and a regulator is asking
-- for a document today, somebody has to be able to get it — but that is now a
-- named, small group rather than everyone with a login.

drop policy if exists "staff read ticket attachments" on storage.objects;

drop policy if exists "admins read ticket attachments" on storage.objects;
create policy "admins read ticket attachments"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and public.has_staff_role('ADMIN')
  );

-- ---------------------------------------------------------------------------
-- staff_open_attachment — the only ordinary way in
-- ---------------------------------------------------------------------------
--
-- Returns the coordinates of the object, not the object. The caller (the
-- staff-attachment Edge Function) turns them into a short-lived signed URL.
--
-- Rejects anything not VERIFIED. A PENDING row is a file the customer's
-- browser may never have finished uploading, and a REJECTED one failed the
-- magic-byte check in finalize-ticket — handing either to an agent invites
-- them to open something the system already decided it did not trust.

create or replace function public.staff_open_attachment(
  p_attachment_id uuid,
  p_reason        text default null,
  p_client_ip     text default null,
  p_user_agent    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.require_staff();
  v_row   public.ticket_attachments;
  v_ip    inet;
begin
  select * into v_row
    from public.ticket_attachments
   where id = p_attachment_id;

  if not found then
    raise exception 'no such attachment: %', p_attachment_id
      using errcode = 'no_data_found';
  end if;

  if v_row.verification_state <> 'VERIFIED' then
    raise exception 'attachment % is %, not VERIFIED; there is nothing safe to open',
      p_attachment_id, v_row.verification_state
      using errcode = 'invalid_parameter_value';
  end if;

  -- A malformed forwarded-for header should not cost an agent their document.
  begin
    v_ip := nullif(trim(p_client_ip), '')::inet;
  exception when others then
    v_ip := null;
  end;

  insert into public.attachment_access_log
    (attachment_id, ticket_id, attachment_filename, actor_id, actor_label,
     reason, client_ip, user_agent)
  values (
    v_row.id,
    v_row.ticket_id,
    v_row.original_filename,
    v_actor,
    public.current_actor_label(),
    nullif(trim(p_reason), ''),
    v_ip,
    left(nullif(trim(p_user_agent), ''), 500)
  );

  return jsonb_build_object(
    'attachmentId', v_row.id,
    'ticketId',     v_row.ticket_id,
    'bucketId',     v_row.bucket_id,
    'storagePath',  v_row.storage_path,
    'filename',     v_row.original_filename,
    'mime',         coalesce(v_row.verified_mime, v_row.declared_mime),
    'bytes',        coalesce(v_row.verified_bytes, v_row.declared_bytes)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- staff_attachment_access_history — the supervisory read
-- ---------------------------------------------------------------------------

create or replace function public.staff_attachment_access_history(
  p_ticket_id uuid,
  p_limit     integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.require_staff(
    array['SUPERVISOR','GRIEVANCE_OFFICER','ADMIN']::public.staff_role[]
  );
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 500);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id',         l.id,
             'filename',   l.attachment_filename,
             'actorLabel', l.actor_label,
             'actorName',  su.full_name,
             'reason',     l.reason,
             'clientIp',   host(l.client_ip),
             'accessedAt', l.accessed_at
           ) order by l.accessed_at desc, l.id desc)
    from (
      select * from public.attachment_access_log
       where ticket_id = p_ticket_id
       order by accessed_at desc, id desc
       limit v_limit
    ) l
    left join public.staff_users su on su.id = l.actor_id
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.staff_open_attachment(uuid, text, text, text) from public, anon;
revoke all on function public.staff_attachment_access_history(uuid, integer) from public, anon;

grant execute on function public.staff_open_attachment(uuid, text, text, text)
  to authenticated, service_role;
grant execute on function public.staff_attachment_access_history(uuid, integer)
  to authenticated, service_role;

-- The table itself is never written directly, at any key.
revoke insert, update, delete on public.attachment_access_log from anon, authenticated;
grant select on public.attachment_access_log to authenticated;
