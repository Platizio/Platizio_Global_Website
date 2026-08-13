-- 0006_attachments.sql — attachment records and the private bucket they point at.
--
-- Files never pass through an Edge Function. create-ticket hands back short-
-- lived signed upload URLs scoped to one ticket's folder, the browser PUTs
-- straight to Storage, and finalize-ticket confirms what landed. Three 5 MB
-- files through a Deno function would be wasteful and would push against
-- request limits for no gain, and a signed URL tied to an already-created
-- ticket cannot be farmed by an anonymous caller the way an open upload
-- endpoint can.
--
-- The browser's extension check is not a control. It reads the filename and
-- never the bytes, so a .pdf that is a shell script passes it. The real gate is
-- finalize-ticket reading the file's leading bytes out of Storage, plus the
-- bucket's own size and MIME limits below.

-- ---------------------------------------------------------------------------
-- The bucket
-- ---------------------------------------------------------------------------
--
-- Private. There is no policy on storage.objects for anon in 0010, which with
-- RLS enabled means anon cannot read, list or write an object at any path —
-- uploads work only through a signed token, which authorises exactly one path.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-attachments',
  'ticket-attachments',
  false,
  5242880,                                              -- 5 MB, matching the form's own limit
  array['application/pdf', 'image/png', 'image/jpeg']   -- matching ATTACHMENT_ACCEPT
)
on conflict (id) do update set
  public            = excluded.public,
  file_size_limit   = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- ticket_attachments
-- ---------------------------------------------------------------------------

create table public.ticket_attachments (
  id        uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,

  bucket_id    text not null default 'ticket-attachments',
  -- <ticket_id>/<attachment_id>-<sanitised name>. The ticket id prefix is what
  -- makes a signed upload token unable to reach another ticket's folder.
  storage_path text not null unique,

  original_filename text not null,

  -- What the browser said it was, kept alongside what the bytes actually are.
  -- Storing both means a mismatch is visible after the fact and countable, and
  -- it is the signal that someone is probing the upload path.
  declared_mime  text not null,
  verified_mime  text,
  declared_bytes bigint not null,
  verified_bytes bigint,

  -- PENDING  — signed URL issued, nothing confirmed
  -- VERIFIED — object present, leading bytes match an allowed type
  -- REJECTED — object present but not what it claimed; object deleted
  -- MISSING  — finalize ran and the object was not there
  verification_state text not null default 'PENDING'
    check (verification_state in ('PENDING', 'VERIFIED', 'REJECTED', 'MISSING')),
  rejection_reason text,

  created_at  timestamptz not null default now(),
  uploaded_at timestamptz,

  constraint ticket_attachments_filename_len
    check (char_length(original_filename) between 1 and 255),
  constraint ticket_attachments_declared_mime
    check (declared_mime in ('application/pdf', 'image/png', 'image/jpeg')),
  constraint ticket_attachments_size
    check (declared_bytes > 0 and declared_bytes <= 5242880),
  constraint ticket_attachments_verified_size
    check (verified_bytes is null or (verified_bytes > 0 and verified_bytes <= 5242880)),
  constraint ticket_attachments_verified_stamp
    check ((verification_state = 'VERIFIED') = (uploaded_at is not null)),
  constraint ticket_attachments_rejection_reason
    check ((verification_state in ('REJECTED', 'MISSING')) = (rejection_reason is not null)),
  constraint ticket_attachments_path_under_ticket
    check (storage_path like ticket_id::text || '/%')
);

comment on table public.ticket_attachments is
  'One row per file offered at intake. verified_mime is read from the bytes in Storage, not from the browser.';

create index ticket_attachments_ticket_idx  on public.ticket_attachments (ticket_id);
create index ticket_attachments_pending_idx on public.ticket_attachments (created_at)
  where verification_state = 'PENDING';

-- ---------------------------------------------------------------------------
-- No more than the form offers
-- ---------------------------------------------------------------------------
--
-- The form allows three files. A CHECK constraint cannot count sibling rows, so
-- this is a trigger — and being a trigger it also holds for a service_role
-- caller, which is the whole point.

create or replace function public.enforce_attachment_limit()
returns trigger
language plpgsql
-- Definer so the count is of every sibling row, not only the ones the caller
-- happens to be able to see through RLS.
security definer
set search_path = ''
as $$
declare
  existing integer;
begin
  select count(*) into existing
  from public.ticket_attachments
  where ticket_id = new.ticket_id;

  if existing >= 3 then
    raise exception 'a ticket may carry at most 3 attachments'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger ticket_attachments_limit
  before insert on public.ticket_attachments
  for each row execute function public.enforce_attachment_limit();
