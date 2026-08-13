-- 0010_rls.sql — every row-level policy in the system, in one file.
--
-- Scattering policies across the migrations that create their tables makes the
-- one question worth asking — "what can an anonymous caller reach?" — an
-- eleven-file read. This is the file to review end to end before deploying, and
-- the check most worth doing by hand afterwards: a policy that is too
-- permissive is invisible until it is exploited.
--
-- The shape of it:
--
--   anon           nothing. Not read, not insert, on any table. Intake goes
--                  through an Edge Function holding the service key, so the
--                  browser never carries a credential that can write a ticket.
--   authenticated  staff only, and only what their role in the JWT allows.
--   service_role   bypasses RLS entirely. That is not a hole this file can
--                  close — see 0004 for what does still hold against it
--                  (triggers and constraints, which service_role cannot
--                  disable because it does not own the tables).
--   supabase_auth_admin
--                  reads user_roles and staff_users, and nothing else, so the
--                  JWT hook in 0008 can run.

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
--
-- Enabled before any policy is written, so there is no window in which a table
-- exists with RLS off. With RLS on and no policy, the answer is no.

alter table public.ticket_categories     enable row level security;
alter table public.ticket_subcategories  enable row level security;
alter table public.tickets               enable row level security;
alter table public.ticket_messages       enable row level security;
alter table public.ticket_status_history enable row level security;
alter table public.ticket_attachments    enable row level security;
alter table public.consent_records       enable row level security;
alter table public.complaints            enable row level security;
alter table public.notifications         enable row level security;
alter table public.staff_users           enable row level security;
alter table public.user_roles            enable row level security;
alter table public.business_hours        enable row level security;
alter table public.business_holidays     enable row level security;

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------
--
-- RLS decides which rows; GRANT decides whether the table is addressable at
-- all. Doing both means a policy accidentally written as `using (true)` in some
-- future migration still cannot expose these tables to anon, because anon has
-- no privilege on them to exercise.

revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Functions need the revoke aimed at PUBLIC, not at anon. EXECUTE is granted to
-- PUBLIC by default when a function is created, and every role inherits it —
-- so `revoke ... from anon` removes a grant anon was never separately holding
-- and leaves it able to execute. Revoke from PUBLIC, then grant back by name.
revoke all on all functions in schema public from public, anon, authenticated;

-- And for objects added by later migrations, so this does not have to be
-- remembered each time.
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from public;

-- service_role inherits from PUBLIC too, so it has just lost EXECUTE along with
-- everyone else. It is the role the Edge Functions hold and it needs all of it.
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant execute on functions to service_role;

grant select on
  public.ticket_categories,
  public.ticket_subcategories,
  public.tickets,
  public.ticket_messages,
  public.ticket_status_history,
  public.ticket_attachments,
  public.consent_records,
  public.complaints,
  public.notifications,
  public.staff_users,
  public.user_roles,
  public.business_hours,
  public.business_holidays
to authenticated;

grant insert, update on public.tickets     to authenticated;
grant insert          on public.ticket_messages to authenticated;
grant update          on public.complaints to authenticated;
grant insert, update, delete on
  public.ticket_categories,
  public.ticket_subcategories,
  public.business_hours,
  public.business_holidays,
  public.staff_users,
  public.user_roles
to authenticated;

-- The three JWT readers are called from inside policies, so the role being
-- filtered has to be able to execute them.
grant execute on function public.staff_roles()                        to authenticated;
grant execute on function public.is_staff()                           to authenticated;
grant execute on function public.has_staff_role(public.staff_role)    to authenticated;

-- ---------------------------------------------------------------------------
-- Taxonomy and calendar — readable by any staff member, writable by admins
-- ---------------------------------------------------------------------------
--
-- Not readable by anon: the form ships its own copy of the taxonomy in the
-- bundle, so there is nothing for an anonymous caller to need here. The
-- calendar is readable by staff because add_business_time() runs as the caller
-- when a staff member creates a ticket by hand.

create policy "staff read categories" on public.ticket_categories
  for select to authenticated using ((select public.is_staff()));

create policy "admins write categories" on public.ticket_categories
  for all to authenticated
  using ((select public.has_staff_role('ADMIN')))
  with check ((select public.has_staff_role('ADMIN')));

create policy "staff read subcategories" on public.ticket_subcategories
  for select to authenticated using ((select public.is_staff()));

create policy "admins write subcategories" on public.ticket_subcategories
  for all to authenticated
  using ((select public.has_staff_role('ADMIN')))
  with check ((select public.has_staff_role('ADMIN')));

create policy "staff read business hours" on public.business_hours
  for select to authenticated using ((select public.is_staff()));

create policy "admins write business hours" on public.business_hours
  for all to authenticated
  using ((select public.has_staff_role('ADMIN')))
  with check ((select public.has_staff_role('ADMIN')));

create policy "staff read business holidays" on public.business_holidays
  for select to authenticated using ((select public.is_staff()));

create policy "admins write business holidays" on public.business_holidays
  for all to authenticated
  using ((select public.has_staff_role('ADMIN')))
  with check ((select public.has_staff_role('ADMIN')));

-- ---------------------------------------------------------------------------
-- Tickets
-- ---------------------------------------------------------------------------
--
-- Any staff member sees the whole queue. That is a deliberate choice for a desk
-- this size — per-agent visibility would mean an unassigned ticket is invisible
-- to everyone, which is how requests get lost. There is no DELETE policy for
-- anyone: tickets leave only through the retention purge.

create policy "staff read tickets" on public.tickets
  for select to authenticated using ((select public.is_staff()));

create policy "staff create tickets" on public.tickets
  for insert to authenticated with check ((select public.is_staff()));

create policy "staff update tickets" on public.tickets
  for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Thread, trail, attachments, consent
-- ---------------------------------------------------------------------------
--
-- Read-mostly by design. UPDATE and DELETE on the thread, the trail and the
-- consent records are refused by trigger in 0004 and 0005 regardless of policy,
-- so the absence of those policies here is belt to that braces rather than the
-- only thing standing in the way.
--
-- Note there is no INSERT policy on ticket_status_history at all, for any role.
-- The only way a row gets in is the SECURITY DEFINER trigger — so a staff
-- member can neither skip the trail nor forge an entry in it.

create policy "staff read messages" on public.ticket_messages
  for select to authenticated using ((select public.is_staff()));

create policy "staff post messages" on public.ticket_messages
  for insert to authenticated
  with check (
    (select public.is_staff())
    and author_kind = 'STAFF'
    and author_staff_id = (select auth.uid())
  );

create policy "staff read status history" on public.ticket_status_history
  for select to authenticated using ((select public.is_staff()));

create policy "staff read attachments" on public.ticket_attachments
  for select to authenticated using ((select public.is_staff()));

-- Consent records are evidence. Staff can read them to answer a data-rights
-- request; nobody writes them by hand.
create policy "staff read consent" on public.consent_records
  for select to authenticated using ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Complaints
-- ---------------------------------------------------------------------------
--
-- The closure gate is the trigger in 0008, not this policy — a policy would
-- only stop the update, and the requirement is that the attempt raises
-- something a person can read.

create policy "staff read complaints" on public.complaints
  for select to authenticated using ((select public.is_staff()));

create policy "staff update complaints" on public.complaints
  for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Outbox
-- ---------------------------------------------------------------------------
--
-- Readable so a supervisor can see whether an acknowledgement went out and why
-- it did not. Not writable: the queue is drained by the worker holding the
-- service key, and a hand-edited attempt counter would make the retry
-- behaviour unexplainable.

create policy "supervisors read notifications" on public.notifications
  for select to authenticated
  using (
    (select public.has_staff_role('SUPERVISOR'))
    or (select public.has_staff_role('ADMIN'))
  );

-- ---------------------------------------------------------------------------
-- Staff and roles
-- ---------------------------------------------------------------------------

create policy "staff read colleagues" on public.staff_users
  for select to authenticated using ((select public.is_staff()));

create policy "admins manage staff" on public.staff_users
  for all to authenticated
  using ((select public.has_staff_role('ADMIN')))
  with check ((select public.has_staff_role('ADMIN')));

-- Everyone can see their own roles; only an admin can see or change anyone
-- else's. Self-service role granting is the failure mode this guards, and it is
-- why there is no policy letting a user write their own row.
create policy "staff read own roles" on public.user_roles
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "admins read all roles" on public.user_roles
  for select to authenticated using ((select public.has_staff_role('ADMIN')));

create policy "admins manage roles" on public.user_roles
  for all to authenticated
  using ((select public.has_staff_role('ADMIN')))
  with check ((select public.has_staff_role('ADMIN')));

-- ---------------------------------------------------------------------------
-- The auth hook's own access
-- ---------------------------------------------------------------------------
--
-- custom_access_token_hook runs as supabase_auth_admin, which does not own
-- these tables and so is filtered by RLS like anyone else. Without these two
-- policies every staff login silently issues a token with no roles in it.

create policy "auth admin reads user roles" on public.user_roles
  as permissive for select to supabase_auth_admin using (true);

create policy "auth admin reads staff users" on public.staff_users
  as permissive for select to supabase_auth_admin using (true);

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
--
-- The bucket is private and gets exactly one policy: staff may read objects in
-- it. No insert policy, for any role — the browser uploads with a signed token
-- issued by create-ticket, which authorises one path and expires, and does not
-- consult RLS. anon therefore cannot list the bucket, cannot read an object,
-- and cannot write to a path it was not handed.

create policy "staff read ticket attachments" on storage.objects
  for select to authenticated
  using (bucket_id = 'ticket-attachments' and (select public.is_staff()));

create policy "admins delete ticket attachments" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ticket-attachments' and (select public.has_staff_role('ADMIN')));
