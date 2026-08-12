-- 0017_staff_workflow.sql — the agent side: identity, assignment, status, replies.
--
-- Everything up to here was the customer half. The tables an agent works in
-- (ticket_messages, assigned_agent_id, first_response_at) existed from 0003 but
-- nothing could write them, and there was no way to *be* staff at all — so the
-- policies in 0010 had never been exercised by anything holding a role.
--
-- TWO PATHS, ON PURPOSE
--
-- A staff member can change a ticket two ways, and both are legitimate:
--
--   the RPCs here     assignment, status, replies. They do the things a bare
--                     UPDATE cannot: stamp first_response_at, queue the
--                     customer's email, keep the two status columns in step.
--   a direct edit     Studio, as service_role. Still audited by the trigger in
--                     0004, still subject to every constraint. It just does not
--                     send anything or stamp anything the trigger cannot.
--
-- The second path exists because the team has to be able to work before the
-- admin app is built. It is not a hole — it is the honest consequence of
-- shipping the database first, and the trail records it either way.
--
-- WHY THESE RPCs CHECK ROLES THEMSELVES
--
-- They are SECURITY DEFINER and granted to `authenticated`, because they write
-- to public.notifications, which has no INSERT policy for anyone. That means
-- any signed-in user can call them, and the check inside is the entire
-- boundary. So require_staff() reads user_roles directly rather than the JWT:
-- these are writes, and a token minted before a role was revoked must not carry
-- one.

-- ---------------------------------------------------------------------------
-- The gate
-- ---------------------------------------------------------------------------

create or replace function private.require_staff(p_required public.staff_role[] default null)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- No resolvable actor. A Studio session lands here, which is why Studio uses
  -- direct table edits rather than these functions.
  if v_uid is null then
    raise exception 'This action requires a signed-in staff account'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.staff_users su where su.id = v_uid and su.is_active
  ) then
    raise exception 'This action requires an active staff account'
      using errcode = 'insufficient_privilege';
  end if;

  if p_required is not null and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_uid and ur.role = any (p_required)
  ) then
    raise exception 'This action requires one of these roles: %',
      array_to_string(p_required::text[], ', ')
      using errcode = 'insufficient_privilege';
  end if;

  return v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Provisioning the first staff account
-- ---------------------------------------------------------------------------
--
-- Creating the auth user itself needs the Auth admin API, so it is done in the
-- dashboard (Authentication → Users → Add user). This turns that user into
-- staff in one call, from the SQL editor:
--
--   select public.provision_staff_user(
--     '<uuid from the dashboard>', 'Anuj Pal', 'anuj@platizio.com',
--     array['ADMIN','GRIEVANCE_OFFICER']::public.staff_role[]);
--
-- Deliberately not an Edge Function. An invite endpoint would be a new public
-- surface whose whole job is creating privileged accounts, and for a desk this
-- size it would be used a handful of times ever.

create or replace function public.provision_staff_user(
  p_user_id   uuid,
  p_full_name text,
  p_email     text,
  p_roles     public.staff_role[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'No auth user with id %. Create them in the dashboard first.', p_user_id
      using errcode = 'foreign_key_violation';
  end if;

  if p_roles is null or cardinality(p_roles) = 0 then
    raise exception 'A staff user with no roles cannot do anything; pass at least one role';
  end if;

  insert into public.staff_users (id, full_name, email)
  values (p_user_id, trim(p_full_name), v_email)
  on conflict (id) do update
    set full_name = excluded.full_name,
        email     = excluded.email,
        is_active = true;

  insert into public.user_roles (user_id, role, granted_by)
  select p_user_id, r, auth.uid()
  from unnest(p_roles) as r
  on conflict (user_id, role) do nothing;

  return jsonb_build_object(
    'userId', p_user_id,
    'email',  v_email,
    'roles',  (select coalesce(jsonb_agg(ur.role::text order by ur.role::text), '[]'::jsonb)
               from public.user_roles ur where ur.user_id = p_user_id)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Keeping the two status columns in step
-- ---------------------------------------------------------------------------
--
-- status_customer is derived from status_internal, unless the caller set it in
-- the same statement. That removes the failure mode this design was most
-- exposed to: an agent moves a ticket internally, forgets the customer-facing
-- column, and the status page keeps saying "Received" for a week.
--
-- It is also what makes the internal/external split do its job — WAITING_ON_BROKER
-- maps to plain "in progress", so a customer never learns that their query is
-- sitting with a counterparty.
--
-- Being a trigger, it applies to a Studio edit too, which is the whole reason
-- it is one.

create or replace function public.derive_customer_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status_internal is distinct from old.status_internal
     and new.status_customer is not distinct from old.status_customer then
    new.status_customer := case new.status_internal
      when 'NEW'                 then 'RECEIVED'
      when 'TRIAGED'             then 'RECEIVED'
      when 'IN_PROGRESS'         then 'IN_PROGRESS'
      when 'WAITING_ON_BROKER'   then 'IN_PROGRESS'
      when 'WAITING_ON_CUSTOMER' then 'WAITING_ON_YOU'
      when 'RESOLVED'            then 'RESOLVED'
      when 'CLOSED'              then 'CLOSED'
      -- Spam is never shown a status page at all (lookup filters it out), so
      -- the customer-facing value is irrelevant; leave it where it was.
      when 'SPAM'                then old.status_customer
    end::public.ticket_status_customer;
  end if;

  -- Timestamps that the SLA report reads. Set here rather than by each caller,
  -- because a missing resolved_at is invisible until someone asks how long
  -- things take.
  if new.status_internal = 'RESOLVED' and old.status_internal is distinct from 'RESOLVED' then
    new.resolved_at := coalesce(new.resolved_at, now());
  end if;

  if new.status_internal = 'CLOSED' and old.status_internal is distinct from 'CLOSED' then
    new.closed_at := coalesce(new.closed_at, now());
  elsif new.status_internal <> 'CLOSED' and old.status_internal = 'CLOSED' then
    -- Reopened. The CHECK constraint in 0003 pairs status and stamp, so this
    -- has to be cleared or the update is refused.
    new.closed_at := null;
  end if;

  return new;
end;
$$;

-- Named to sort before tickets_set_due_dates and after nothing that matters;
-- BEFORE triggers fire in name order and this one only reads its own row.
create trigger tickets_derive_customer_status
  before update on public.tickets
  for each row execute function public.derive_customer_status();

-- ---------------------------------------------------------------------------
-- The reply email
-- ---------------------------------------------------------------------------

create or replace function private.render_ticket_reply_email(p_ticket_id uuid, p_body text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  t         record;
  subject   text;
  body_text text;
  body_html text;
begin
  select tk.ticket_ref, tk.requester_name, tk.requester_email, tk.subject as ticket_subject
    into t
  from public.tickets tk
  where tk.id = p_ticket_id;

  if not found then
    raise exception 'no such ticket: %', p_ticket_id;
  end if;

  -- The reference leads the subject so that a reply from the customer threads
  -- back to the same ticket in whatever inbox is reading it.
  subject := 'Re: [' || t.ticket_ref || '] ' || t.ticket_subject;

  body_text := format(
    E'Hi %s,\n\n%s\n\n'
    || E'---\n'
    || E'Reference: %s\n'
    || E'Reply to this email and it will reach the same person. You can also check\n'
    || E'the status of your requests at https://platizioglobal.com/help/status\n\n'
    || E'We will never ask you for your password, your OTP or your full card details.\n\n'
    || E'Platizio Global\n'
    || E'supportglobal@platizio.com  ·  +91 92898 37100\n',
    split_part(trim(t.requester_name), ' ', 1),
    p_body,
    t.ticket_ref
  );

  body_html := format(
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;'
    || 'font-size:15px;line-height:1.6;color:#1a1a1a;max-width:560px">'
    || '<p>Hi %s,</p>'
    || '<div>%s</div>'
    || '<hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0">'
    || '<p style="color:#666;font-size:13px">Reference <strong>%s</strong>. Reply to this email '
    || 'and it will reach the same person, or check your requests at '
    || '<a href="https://platizioglobal.com/help/status">platizioglobal.com/help/status</a>.</p>'
    || '<p style="color:#666;font-size:13px">We will never ask you for your password, your OTP '
    || 'or your full card details.</p>'
    || '<p style="color:#666;font-size:13px">Platizio Global<br>'
    || '<a href="mailto:supportglobal@platizio.com">supportglobal@platizio.com</a> · +91 92898 37100</p>'
    || '</div>',
    private.html_escape(split_part(trim(t.requester_name), ' ', 1)),
    -- Escaped, then newlines restored as breaks. An agent types plain text; if
    -- they paste something containing markup it must not become markup.
    replace(private.html_escape(p_body), E'\n', '<br>'),
    private.html_escape(t.ticket_ref)
  );

  return jsonb_build_object(
    'toEmail',  t.requester_email,
    'subject',  subject,
    'bodyText', body_text,
    'bodyHtml', body_html
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Assignment
-- ---------------------------------------------------------------------------

create or replace function public.staff_assign_ticket(p_ticket_id uuid, p_agent_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.require_staff();
  v_agent uuid := coalesce(p_agent_id, v_actor);   -- no argument means "mine"
  v_ref   text;
begin
  if not exists (select 1 from public.staff_users su where su.id = v_agent and su.is_active) then
    raise exception 'Cannot assign to someone who is not an active staff member'
      using errcode = 'foreign_key_violation';
  end if;

  update public.tickets
     set assigned_agent_id = v_agent,
         -- Picking a ticket up IS triage. Leaving it NEW while somebody works
         -- on it makes the queue lie about what is unattended.
         status_internal = case when status_internal = 'NEW' then 'TRIAGED' else status_internal end
   where id = p_ticket_id
  returning ticket_ref into v_ref;

  if v_ref is null then
    raise exception 'no such ticket: %', p_ticket_id using errcode = 'no_data_found';
  end if;

  return jsonb_build_object('ticketRef', v_ref, 'assignedTo', v_agent);
end;
$$;

-- ---------------------------------------------------------------------------
-- Status
-- ---------------------------------------------------------------------------
--
-- The note is carried into the trail row rather than being dropped, because
-- "why did this go back to WAITING_ON_CUSTOMER" is the question a trail exists
-- to answer.

-- The reason travels with the row, via a transaction-local GUC that
-- log_status_change reads as it writes.
--
-- The obvious alternative — write the trail row, then UPDATE its note — cannot
-- work and should not: ticket_status_history refuses every UPDATE, including
-- this one, and weakening that to allow "just the note, just once" would trade
-- an absolute guarantee for a convenience. Passing the note in means the trail
-- row is correct the moment it exists and is never touched again.
--
-- A Studio session can use the same channel:
--   select set_config('platizio.status_note', 'closing per customer email', true);
--   update public.tickets set status_internal = 'CLOSED', closed_at = now() where ...;

create or replace function public.log_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.status_internal is distinct from old.status_internal
     or new.status_customer is distinct from old.status_customer then
    insert into public.ticket_status_history
      (ticket_id, from_internal, to_internal, from_customer, to_customer, actor_id, actor_label, note)
    values (
      new.id,
      case when tg_op = 'INSERT' then null else old.status_internal end,
      new.status_internal,
      case when tg_op = 'INSERT' then null else old.status_customer end,
      new.status_customer,
      auth.uid(),
      public.current_actor_label(),
      nullif(current_setting('platizio.status_note', true), '')
    );
  end if;
  return new;
end;
$$;

create or replace function public.staff_set_status(
  p_ticket_id uuid,
  p_status    public.ticket_status_internal,
  p_note      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.require_staff();
  v_after record;
begin
  perform set_config('platizio.status_note', coalesce(trim(p_note), ''), true);

  update public.tickets
     set status_internal = p_status
   where id = p_ticket_id
  returning ticket_ref, status_internal, status_customer into v_after;

  -- Cleared before returning so the note cannot leak onto an unrelated status
  -- change later in the same transaction.
  perform set_config('platizio.status_note', '', true);

  if v_after is null then
    raise exception 'no such ticket: %', p_ticket_id using errcode = 'no_data_found';
  end if;

  return jsonb_build_object(
    'ticketRef',      v_after.ticket_ref,
    'statusInternal', v_after.status_internal,
    'statusCustomer', v_after.status_customer
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Replying
-- ---------------------------------------------------------------------------
--
-- The one function that closes the SLA loop: posting the first non-internal
-- staff message is what "first response" means, so it is stamped here and
-- nowhere else. Leaving it to a separate call would guarantee it eventually
-- got missed, and the SLA report would quietly measure nothing.

create or replace function public.staff_post_reply(
  p_ticket_id uuid,
  p_body      text,
  p_internal  boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor    uuid := private.require_staff();
  v_ticket   public.tickets;
  v_message  uuid;
  v_mail     jsonb;
  v_queued   boolean := false;
  v_first    boolean := false;
begin
  if p_body is null or char_length(trim(p_body)) = 0 then
    raise exception 'A reply needs a body';
  end if;

  select * into v_ticket from public.tickets where id = p_ticket_id;
  if not found then
    raise exception 'no such ticket: %', p_ticket_id using errcode = 'no_data_found';
  end if;

  insert into public.ticket_messages (ticket_id, author_staff_id, author_kind, body, is_internal_note)
  values (p_ticket_id, v_actor, 'STAFF', trim(p_body), coalesce(p_internal, false))
  returning id into v_message;

  if coalesce(p_internal, false) then
    -- An internal note is not a response to the customer and must not stop the
    -- first-response clock. That distinction is the entire point of the flag.
    return jsonb_build_object(
      'ticketRef', v_ticket.ticket_ref,
      'messageId', v_message,
      'internal',  true,
      'emailQueued', false
    );
  end if;

  v_first := v_ticket.first_response_at is null;

  -- Moves to IN_PROGRESS, deliberately not WAITING_ON_CUSTOMER. "Waiting on
  -- you" is a claim about what the customer owes us, and plenty of first
  -- replies ("we are looking into this") owe them nothing. An agent who is
  -- genuinely blocked says so with staff_set_status; it must not be inferred.
  update public.tickets
     set first_response_at = coalesce(first_response_at, now()),
         status_internal   = case
           when status_internal in ('NEW', 'TRIAGED') then 'IN_PROGRESS'
           else status_internal
         end
   where id = p_ticket_id;

  v_mail := private.render_ticket_reply_email(p_ticket_id, trim(p_body));

  insert into public.notifications
    (ticket_id, template, to_email, reply_to, subject, body_text, body_html, dedupe_key)
  values (
    p_ticket_id,
    'ticket_reply',
    v_mail ->> 'toEmail',
    'supportglobal@platizio.com',
    v_mail ->> 'subject',
    v_mail ->> 'bodyText',
    v_mail ->> 'bodyHtml',
    -- Keyed on the message, not the ticket: a ticket has many replies, and each
    -- one is a distinct email. Retrying the same insert still collapses.
    'reply:' || v_message::text
  )
  on conflict (dedupe_key) do nothing;

  v_queued := found;

  return jsonb_build_object(
    'ticketRef',      v_ticket.ticket_ref,
    'messageId',      v_message,
    'internal',       false,
    'emailQueued',    v_queued,
    'wasFirstResponse', v_first
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
--
-- To `authenticated`, not service_role only — these are called by a signed-in
-- agent's own session. The role check is inside each one; see the header.

revoke all on function
  public.staff_assign_ticket(uuid, uuid),
  public.staff_set_status(uuid, public.ticket_status_internal, text),
  public.staff_post_reply(uuid, text, boolean)
from public, anon;

grant execute on function
  public.staff_assign_ticket(uuid, uuid),
  public.staff_set_status(uuid, public.ticket_status_internal, text),
  public.staff_post_reply(uuid, text, boolean)
to authenticated, service_role;

-- Bootstrapping is not something a signed-in agent does.
revoke all on function public.provision_staff_user(uuid, text, text, public.staff_role[])
  from public, anon, authenticated;
grant execute on function public.provision_staff_user(uuid, text, text, public.staff_role[])
  to service_role;
