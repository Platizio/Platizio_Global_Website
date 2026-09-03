-- 0031_staff_enquiry_and_outbox_api.sql — the two desks that had no API.
--
-- 0027 built contact_enquiries, enquiry_notes, the ref generator, the status
-- trigger, the follow-up target and the RLS policies. 0029 and 0030 built the
-- write path a browser uses. Nothing was ever built for a person: there is no
-- way to list enquiries, read one, assign one, note one or move its status.
-- The staff RLS policies on those tables have therefore never been exercised.
--
-- notifications has the same gap from the other direction. Every workflow
-- queues mail into it and drain-outbox drains it, but the only staff-facing
-- read is the per-ticket block inside staff_ticket_detail. A FAILED enquiry
-- acknowledgement, or a queue that never drains because the Vault secrets are
-- unset, is invisible to everyone.
--
-- Shapes deliberately mirror 0019: the same {rows,total,limit,offset} envelope,
-- the same camelCase projection, the same live-derived state rather than stored
-- flags. One console reads both, and two envelopes would be two code paths.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enquiry queue
--
-- The LIKE escaping is copied from staff_ticket_queue rather than simplified.
-- An enquirer who writes "50% of my portfolio" in the message field would
-- otherwise turn any search containing it into a match-everything scan.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.staff_enquiry_queue(payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor       uuid := private.require_staff();
  v_status      public.enquiry_status[];
  v_assignee    text := nullif(trim(payload ->> 'assignee'), '');
  v_assignee_id uuid;
  v_unassigned  boolean := false;
  v_interest    text := nullif(trim(payload ->> 'interestId'), '');
  v_overdue     boolean := coalesce((payload ->> 'overdueOnly')::boolean, false);
  v_q           text := nullif(trim(payload ->> 'q'), '');
  v_like        text;
  v_limit       int := least(greatest(coalesce((payload ->> 'limit')::int, 25), 1), 100);
  v_offset      int := greatest(coalesce((payload ->> 'offset')::int, 0), 0);
  v_sort        text := coalesce(nullif(trim(payload ->> 'sort'), ''), 'oldest');
  v_total       bigint;
  v_rows        jsonb;
begin
  if jsonb_typeof(payload -> 'status') = 'array' then
    select array_agg(value::public.enquiry_status)
      into v_status
      from jsonb_array_elements_text(payload -> 'status');
  else
    v_status := array['NEW', 'CONTACTED', 'QUALIFIED']::public.enquiry_status[];
  end if;

  if v_assignee = 'me' then
    v_assignee_id := v_actor;
  elsif v_assignee = 'unassigned' then
    v_unassigned := true;
  elsif v_assignee is not null then
    begin
      v_assignee_id := v_assignee::uuid;
    exception when others then
      raise exception 'assignee must be a uuid, ''me'' or ''unassigned''';
    end;
  end if;

  if v_q is not null then
    v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  with filtered as (
    select e.*
      from public.contact_enquiries e
     where e.status = any (v_status)
       and (v_interest is null or e.interest_id = v_interest)
       and (v_assignee_id is null or e.assigned_to = v_assignee_id)
       and (not v_unassigned or e.assigned_to is null)
       and (
         not v_overdue
         or (e.first_contacted_at is null
             and e.internal_follow_up_target_at is not null
             and now() > e.internal_follow_up_target_at)
       )
       and (
         v_like is null
         or e.enquiry_ref ilike v_like escape '\'
         or e.full_name   ilike v_like escape '\'
         or e.email       ilike v_like escape '\'
         or e.phone_raw   ilike v_like escape '\'
         or e.message     ilike v_like escape '\'
       )
  )
  select
    (select count(*) from filtered),
    coalesce((
      select jsonb_agg((row_to_json(page)::jsonb - 'ord') order by page.ord)
      from (
        select
          row_number() over (
            order by
              case when v_sort = 'newest' then f.created_at end desc,
              case when v_sort = 'oldest' then f.created_at end asc,
              case when v_sort = 'target' then f.internal_follow_up_target_at end asc nulls last,
              f.created_at asc
          ) as ord,
          f.id,
          f.enquiry_ref                  as "enquiryRef",
          f.full_name                    as "fullName",
          f.email,
          f.phone_raw                    as "phone",
          f.interest_id                  as "interestId",
          i.label                        as "interestLabel",
          f.status,
          f.assigned_to                  as "assignedToId",
          sa.full_name                   as "assignedToName",
          f.source,
          f.created_at                   as "createdAt",
          f.first_contacted_at           as "firstContactedAt",
          f.closed_at                    as "closedAt",
          -- Internal working target. Safe on a staff screen, never in an email.
          f.internal_follow_up_target_at as "followUpTargetAt",
          (f.first_contacted_at is null
             and f.internal_follow_up_target_at is not null
             and now() > f.internal_follow_up_target_at) as "followUpOverdue",
          (select count(*) from public.enquiry_notes n where n.enquiry_id = f.id) as "noteCount"
        from filtered f
        left join public.enquiry_interests i  on i.id = f.interest_id
        left join public.staff_users       sa on sa.id = f.assigned_to
        order by ord
        limit v_limit offset v_offset
      ) page
    ), '[]'::jsonb)
  into v_total, v_rows;

  return jsonb_build_object(
    'rows',   v_rows,
    'total',  v_total,
    'limit',  v_limit,
    'offset', v_offset
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Enquiry detail
--
-- Consent is projected as grantedAt from given_at, matching what 0026 settled
-- on for staff_ticket_detail. The column really is given_at; the console should
-- not have to remember which of the two desks names it which way.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.staff_enquiry_detail(p_enquiry_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.require_staff();
  v_out   jsonb;
begin
  select jsonb_build_object(
    'enquiry', jsonb_build_object(
      'id',                e.id,
      'enquiryRef',        e.enquiry_ref,
      'fullName',          e.full_name,
      'email',             e.email,
      'phone',             e.phone_raw,
      'interestId',        e.interest_id,
      'interestLabel',     i.label,
      'message',           e.message,
      'status',            e.status,
      'assignedToId',      e.assigned_to,
      'assignedToName',    sa.full_name,
      'source',            e.source,
      'captchaVerified',   e.captcha_verified,
      'createdAt',         e.created_at,
      'firstContactedAt',  e.first_contacted_at,
      'closedAt',          e.closed_at,
      'outcomeNote',       e.outcome_note,
      'followUpTargetAt',  e.internal_follow_up_target_at,
      'followUpOverdue',   (e.first_contacted_at is null
                             and e.internal_follow_up_target_at is not null
                             and now() > e.internal_follow_up_target_at),
      'legalHold',         e.legal_hold,
      'legalHoldReason',   e.legal_hold_reason,
      'retentionExpiresAt', e.retention_expires_at
    ),

    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id',          n.id,
               'authorName',  coalesce(sn.full_name, n.author_label),
               'authorLabel', n.author_label,
               'body',        n.body,
               'createdAt',   n.created_at
             ) order by n.created_at, n.id)
        from public.enquiry_notes n
        left join public.staff_users sn on sn.id = n.author_id
       where n.enquiry_id = e.id
    ), '[]'::jsonb),

    'consent', (
      select jsonb_build_object(
               'purpose',       cr.purpose,
               'consentText',   cr.consent_text,
               'policyVersion', cr.policy_version,
               'grantedAt',     cr.given_at,
               'withdrawnAt',   cr.withdrawn_at
             )
        from public.consent_records cr
       where cr.enquiry_id = e.id
       order by cr.given_at desc
       limit 1
    ),

    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object(
               'template',  nf.template,
               'toEmail',   nf.to_email,
               'subject',   nf.subject,
               'status',    nf.status,
               'attempts',  nf.attempts,
               'lastError', nf.last_error,
               'sentAt',    nf.sent_at,
               'createdAt', nf.created_at
             ) order by nf.created_at, nf.id)
        from public.notifications nf
       where nf.enquiry_id = e.id
    ), '[]'::jsonb)
  )
  into v_out
  from public.contact_enquiries e
  left join public.enquiry_interests i  on i.id = e.interest_id
  left join public.staff_users       sa on sa.id = e.assigned_to
  where e.id = p_enquiry_id;

  if v_out is null then
    raise exception 'no such enquiry: %', p_enquiry_id using errcode = 'no_data_found';
  end if;

  return v_out;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Enquiry writes
-- ─────────────────────────────────────────────────────────────────────────────


create or replace function public.staff_add_enquiry_note(
  p_enquiry_id uuid,
  p_body       text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.require_staff();
  v_ref   text;
  v_note  uuid;
begin
  if p_body is null or char_length(trim(p_body)) = 0 then
    raise exception 'A note needs a body';
  end if;

  select enquiry_ref into v_ref from public.contact_enquiries where id = p_enquiry_id;
  if v_ref is null then
    raise exception 'no such enquiry: %', p_enquiry_id using errcode = 'no_data_found';
  end if;

  insert into public.enquiry_notes (enquiry_id, author_id, author_label, body)
  values (p_enquiry_id, v_actor, public.current_actor_label(), left(trim(p_body), 5000))
  returning id into v_note;

  return jsonb_build_object('enquiryRef', v_ref, 'noteId', v_note);
end;
$$;

-- Status moves. The stamp_enquiry_status trigger owns first_contacted_at,
-- closed_at and the retention re-anchor, so this only writes `status` and lets
-- the trigger keep contact_enquiries_closed_stamp satisfied. Duplicating that
-- arithmetic here is how the two would drift.
--
-- The note is recorded twice on purpose and they are not the same record: an
-- enquiry_notes row is the append-only trail of what happened, outcome_note is
-- the single current answer to "how did this end" that the queue can show
-- without loading the thread. Only terminal states get one, and only when it
-- clears the 3-character CHECK.

create or replace function public.staff_set_enquiry_status(
  p_enquiry_id uuid,
  p_status     public.enquiry_status,
  p_note       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor  uuid := private.require_staff();
  v_note   text := nullif(trim(coalesce(p_note, '')), '');
  v_before public.enquiry_status;
  v_after  record;
begin
  select status into v_before from public.contact_enquiries where id = p_enquiry_id;
  if v_before is null then
    raise exception 'no such enquiry: %', p_enquiry_id using errcode = 'no_data_found';
  end if;

  if p_status in ('CONVERTED', 'CLOSED', 'SPAM')
     and (v_note is null or char_length(v_note) < 3) then
    raise exception 'Closing an enquiry needs a note saying how it ended (at least 3 characters)'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.contact_enquiries
     set status = p_status,
         outcome_note = case
           when p_status in ('CONVERTED', 'CLOSED', 'SPAM') then left(v_note, 2000)
           else outcome_note
         end
   where id = p_enquiry_id
  returning enquiry_ref, status, first_contacted_at, closed_at into v_after;

  if v_note is not null then
    insert into public.enquiry_notes (enquiry_id, author_id, author_label, body)
    values (
      p_enquiry_id,
      v_actor,
      public.current_actor_label(),
      left(format('[%s -> %s] %s', v_before, p_status, v_note), 5000)
    );
  end if;

  return jsonb_build_object(
    'enquiryRef',       v_after.enquiry_ref,
    'status',           v_after.status,
    'firstContactedAt', v_after.first_contacted_at,
    'closedAt',         v_after.closed_at
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Outbox
--
-- Read-only for staff; retry is admin-only because a retry re-sends mail to a
-- customer. Both subject keys are projected so one screen can show ticket and
-- enquiry mail together — notifications_one_subject guarantees at most one of
-- them is set on any row.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.staff_outbox(payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor    uuid := private.require_staff();
  v_status   public.notification_status[];
  v_template text := nullif(trim(payload ->> 'template'), '');
  v_limit    int := least(greatest(coalesce((payload ->> 'limit')::int, 25), 1), 100);
  v_offset   int := greatest(coalesce((payload ->> 'offset')::int, 0), 0);
  v_total    bigint;
  v_rows     jsonb;
begin
  if jsonb_typeof(payload -> 'status') = 'array' then
    select array_agg(value::public.notification_status)
      into v_status
      from jsonb_array_elements_text(payload -> 'status');
  else
    v_status := array['PENDING', 'SENDING', 'FAILED']::public.notification_status[];
  end if;

  with filtered as (
    select n.*
      from public.notifications n
     where n.status = any (v_status)
       and (v_template is null or n.template = v_template)
  )
  select
    (select count(*) from filtered),
    coalesce((
      select jsonb_agg((row_to_json(page)::jsonb - 'ord') order by page.ord)
      from (
        select
          row_number() over (order by f.created_at desc, f.id) as ord,
          f.id,
          f.template,
          f.to_email        as "toEmail",
          f.subject,
          f.status,
          f.attempts,
          f.max_attempts    as "maxAttempts",
          f.next_attempt_at as "nextAttemptAt",
          f.last_error      as "lastError",
          f.provider,
          f.sent_at         as "sentAt",
          f.created_at      as "createdAt",
          f.ticket_id       as "ticketId",
          t.ticket_ref      as "ticketRef",
          f.enquiry_id      as "enquiryId",
          e.enquiry_ref     as "enquiryRef"
        from filtered f
        left join public.tickets           t on t.id = f.ticket_id
        left join public.contact_enquiries e on e.id = f.enquiry_id
        order by ord
        limit v_limit offset v_offset
      ) page
    ), '[]'::jsonb)
  into v_total, v_rows;

  return jsonb_build_object(
    'rows',   v_rows,
    'total',  v_total,
    'limit',  v_limit,
    'offset', v_offset
  );
end;
$$;

-- attempts back to 0 rather than left at max_attempts: complete_notification
-- marks a row FAILED only once attempts >= max_attempts, so a retry that did not
-- reset the counter would fail permanently again on its first error. last_error
-- is kept until something overwrites it — it is the only record of why this row
-- needed a person in the first place.

create or replace function public.staff_retry_notification(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor  uuid := private.require_admin();
  v_status public.notification_status;
begin
  select status into v_status from public.notifications where id = p_id;
  if v_status is null then
    raise exception 'no such notification: %', p_id using errcode = 'no_data_found';
  end if;

  if v_status <> 'FAILED' then
    raise exception 'Only a FAILED notification can be retried; this one is %', v_status
      using errcode = 'invalid_parameter_value';
  end if;

  update public.notifications
     set status          = 'PENDING',
         attempts        = 0,
         next_attempt_at = now()
   where id = p_id;

  return jsonb_build_object('id', p_id, 'status', 'PENDING');
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Dashboard, extended
--
-- Every key from 0023 is preserved verbatim. The console reads the enquiry keys
-- but a caller that does not know about them is unaffected.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.staff_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.require_staff();
begin
  return jsonb_build_object(
    'open', (
      select count(*) from public.tickets
       where status_internal not in ('CLOSED', 'SPAM')
    ),
    'unassigned', (
      select count(*) from public.tickets
       where status_internal not in ('CLOSED', 'SPAM') and assigned_agent_id is null
    ),
    'mine', (
      select count(*) from public.tickets
       where status_internal not in ('CLOSED', 'SPAM') and assigned_agent_id = v_actor
    ),
    'awaitingFirstResponse', (
      select count(*) from public.tickets
       where first_response_at is null and status_internal not in ('CLOSED', 'SPAM')
    ),
    'firstResponseBreached', (
      select count(*) from public.tickets
       where first_response_at is null
         and first_response_due_at is not null
         and now() > first_response_due_at
         and status_internal not in ('CLOSED', 'SPAM')
    ),
    'resolutionBreached', (
      select count(*) from public.tickets
       where resolved_at is null
         and resolution_due_at is not null
         and now() > resolution_due_at
         and status_internal not in ('CLOSED', 'SPAM')
    ),
    'byStatus', coalesce((
      select jsonb_object_agg(status_internal, n)
        from (select status_internal, count(*) as n
                from public.tickets group by status_internal) s
    ), '{}'::jsonb),
    'openComplaints', (
      select count(*) from public.complaints where stage <> 'CLOSED'
    ),
    'complaintsBreached', (
      select count(*) from public.complaints
       where stage <> 'CLOSED'
         and resolution_due_at is not null
         and now() > resolution_due_at
         and resolved_at is null
    ),
    'outboxPending', (
      select count(*) from public.notifications where status in ('PENDING', 'SENDING')
    ),
    'outboxFailed', (
      select count(*) from public.notifications where status = 'FAILED'
    ),
    'holidayCoverage', private.holiday_coverage(),

    'newEnquiries', (
      select count(*) from public.contact_enquiries where status = 'NEW'
    ),
    'openEnquiries', (
      select count(*) from public.contact_enquiries
       where status in ('NEW', 'CONTACTED', 'QUALIFIED')
    ),
    'unassignedEnquiries', (
      select count(*) from public.contact_enquiries
       where status in ('NEW', 'CONTACTED', 'QUALIFIED') and assigned_to is null
    ),
    'myEnquiries', (
      select count(*) from public.contact_enquiries
       where status in ('NEW', 'CONTACTED', 'QUALIFIED') and assigned_to = v_actor
    ),
    -- Deliberately not called a breach. This target is internal and carries no
    -- published SLA; naming it one is how it ends up in a report.
    'enquiriesOverdueFollowUp', (
      select count(*) from public.contact_enquiries
       where status in ('NEW', 'CONTACTED', 'QUALIFIED')
         and first_contacted_at is null
         and internal_follow_up_target_at is not null
         and now() > internal_follow_up_target_at
    ),

    'generatedAt', now()
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes for the two new queues
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists contact_enquiries_queue_idx
  on public.contact_enquiries (status, created_at)
  where status in ('NEW', 'CONTACTED', 'QUALIFIED');

create index if not exists contact_enquiries_assigned_open_idx
  on public.contact_enquiries (assigned_to)
  where status in ('NEW', 'CONTACTED', 'QUALIFIED');

create index if not exists contact_enquiries_follow_up_idx
  on public.contact_enquiries (internal_follow_up_target_at)
  where first_contacted_at is null;

create index if not exists notifications_status_created_idx
  on public.notifications (status, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants
--
-- Revoked from public, not just anon and authenticated: Postgres grants EXECUTE
-- to PUBLIC by default, so revoking only the two named roles leaves the default
-- grant in force and the function reachable.
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on function
  public.staff_enquiry_queue(jsonb),
  public.staff_enquiry_detail(uuid),
  public.staff_add_enquiry_note(uuid, text),
  public.staff_set_enquiry_status(uuid, public.enquiry_status, text),
  public.staff_outbox(jsonb),
  public.staff_retry_notification(uuid)
from public, anon;

grant execute on function
  public.staff_enquiry_queue(jsonb),
  public.staff_enquiry_detail(uuid),
  public.staff_add_enquiry_note(uuid, text),
  public.staff_set_enquiry_status(uuid, public.enquiry_status, text),
  public.staff_outbox(jsonb),
  public.staff_retry_notification(uuid)
to authenticated, service_role;

comment on function public.staff_enquiry_queue(jsonb) is
  'Sales enquiry queue. followUpTargetAt is an internal working target, never an SLA and never quoted to an enquirer.';
comment on function public.staff_retry_notification(uuid) is
  'Admin-only. Re-queues a FAILED outbox row, resetting attempts so complete_notification does not fail it again on the first error.';
