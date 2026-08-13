-- 0028_enquiry_intake_api.sql — what the enquiry form is allowed to make happen.
--
-- One RPC, called by the create-enquiry Edge Function holding the service key.
-- Same shape as create_support_ticket in 0012 and for the same reason: the
-- browser never carries a credential that can write to the table, and the whole
-- write — enquiry, consent record, acknowledgement, internal alert — lands in
-- one transaction or not at all.
--
-- The failure mode this migration cares most about is not a database error. It
-- is the enquiry that saves perfectly and that nobody ever reads. Web3Forms'
-- single virtue was that a submission went straight into a human's inbox;
-- replacing it with a row in a table that no one is watching would be a
-- regression dressed as an upgrade. So the internal alert is queued in the same
-- transaction as the row, and when it cannot be — no recipient configured — the
-- RPC says so in its return value rather than succeeding quietly.

-- ---------------------------------------------------------------------------
-- The acknowledgement
-- ---------------------------------------------------------------------------
--
-- Deliberately promises no timeline. The site does not publish one for
-- enquiries and this email must not invent one; "shortly" and "as soon as
-- possible" are the same invention in softer words. It says what was received
-- and who it went to, and stops.
--
-- It also does one thing the old transport could not: it points anyone who
-- actually has a support problem at /help/raise. "Platform Support" is an
-- option in the enquiry dropdown, so support requests genuinely do arrive
-- here — and a support request that comes in through the sales form gets no
-- reference, no SLA and no audit trail. Telling them the right door is cheaper
-- than discovering later that the queue everyone measures was missing a slice
-- of its own traffic.

create or replace function private.render_enquiry_acknowledgement(p_enquiry_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  e         record;
  subject   text;
  body_text text;
  body_html text;
begin
  select ce.full_name, ce.email, ce.message, i.label as interest_label
    into e
  from public.contact_enquiries ce
  left join public.enquiry_interests i on i.id = ce.interest_id
  where ce.id = p_enquiry_id;

  if not found then
    raise exception 'no such enquiry: %', p_enquiry_id;
  end if;

  subject := 'We have your enquiry — Platizio Global';

  body_text := format(
    E'Hi %s,\n\n'
    || E'Thank you for getting in touch. Your enquiry has reached our team and '
    || E'someone will contact you about it.\n\n'
    || E'%s'
    || E'If what you actually need is help with an existing account — a login problem, '
    || E'a transaction query, a document request — please raise it at\n'
    || E'https://platizioglobal.com/help/raise instead. Requests raised there get a\n'
    || E'reference number you can track and a published response time. This enquiry\n'
    || E'form does not.\n\n'
    || E'---\n'
    || E'We will never ask you for your password, your OTP or your full card details.\n\n'
    || E'Platizio Global\n'
    || E'supportglobal@platizio.com  ·  +91 92898 37100\n',
    split_part(trim(e.full_name), ' ', 1),
    case when e.interest_label is null then ''
         else 'You told us you were interested in: ' || e.interest_label || E'\n\n' end
  );

  body_html := format(
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;'
    || 'font-size:15px;line-height:1.6;color:#1a1a1a;max-width:560px">'
    || '<p>Hi %s,</p>'
    || '<p>Thank you for getting in touch. Your enquiry has reached our team and '
    || 'someone will contact you about it.</p>'
    || '%s'
    || '<p>If what you actually need is help with an existing account — a login problem, '
    || 'a transaction query, a document request — please raise it at '
    || '<a href="https://platizioglobal.com/help/raise">platizioglobal.com/help/raise</a> '
    || 'instead. Requests raised there get a reference number you can track and a '
    || 'published response time. This enquiry form does not.</p>'
    || '<hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0">'
    || '<p style="color:#666;font-size:13px">We will never ask you for your password, '
    || 'your OTP or your full card details.</p>'
    || '<p style="color:#666;font-size:13px">Platizio Global<br>'
    || '<a href="mailto:supportglobal@platizio.com">supportglobal@platizio.com</a> · +91 92898 37100</p>'
    || '</div>',
    private.html_escape(split_part(trim(e.full_name), ' ', 1)),
    case when e.interest_label is null then ''
         else '<p>You told us you were interested in: <strong>'
              || private.html_escape(e.interest_label) || '</strong></p>' end
  );

  return jsonb_build_object(
    'toEmail',  e.email,
    'subject',  subject,
    'bodyText', body_text,
    'bodyHtml', body_html
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- The internal alert
-- ---------------------------------------------------------------------------
--
-- This is the one that replaces what Web3Forms did. It carries the enquirer's
-- details in full because the person reading it is about to phone them, and it
-- carries the reference and the internal target so the desk can find the row.
--
-- Text only, no HTML: it goes to a colleague, not a customer, and a plain body
-- is easier to forward and to quote in a reply.

create or replace function private.render_enquiry_internal_alert(p_enquiry_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  e       record;
  v_to    text := coalesce(
    private.get_secret('enquiry_alert_email'),
    private.get_secret('sla_alert_email')
  );
begin
  if v_to is null then
    return null;
  end if;

  select ce.enquiry_ref, ce.full_name, ce.email, ce.phone_raw, ce.message,
         ce.internal_follow_up_target_at, ce.captcha_verified,
         i.label as interest_label
    into e
  from public.contact_enquiries ce
  left join public.enquiry_interests i on i.id = ce.interest_id
  where ce.id = p_enquiry_id;

  if not found then
    raise exception 'no such enquiry: %', p_enquiry_id;
  end if;

  return jsonb_build_object(
    'toEmail', v_to,
    'replyTo', e.email,
    'subject', 'New enquiry: ' || e.full_name || ' — ' || coalesce(e.interest_label, 'General'),
    'bodyText', format(
      E'A new enquiry came in through the website.\n\n'
      || E'Reference: %s\n'
      || E'Name:      %s\n'
      || E'Email:     %s\n'
      || E'Phone:     %s\n'
      || E'Interest:  %s\n'
      || E'Captcha:   %s\n\n'
      || E'Message:\n%s\n\n'
      || E'Internal follow-up target: %s IST.\n'
      || E'That target is internal. It is not a promise made to the enquirer and must\n'
      || E'not be quoted to them or reported as an SLA.\n\n'
      || E'Reply to this email and it goes to the enquirer directly.\n',
      e.enquiry_ref,
      e.full_name,
      e.email,
      e.phone_raw,
      coalesce(e.interest_label, 'not specified'),
      case when e.captcha_verified then 'verified' else 'NOT VERIFIED' end,
      coalesce(nullif(trim(e.message), ''), '(none given)'),
      to_char(e.internal_follow_up_target_at at time zone 'Asia/Kolkata', 'DD Mon YYYY HH24:MI')
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- create_contact_enquiry
-- ---------------------------------------------------------------------------
--
-- Returns `internalAlertQueued`. The Edge Function logs loudly when that is
-- false, and staff_dashboard() counts the enquiries it happened to, because an
-- enquiry nobody is told about is the failure this whole slice exists to
-- prevent — and a silent one is worse than a loud one.

create or replace function public.create_contact_enquiry(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id        uuid;
  v_ref       text;
  v_existing  record;
  v_idem      text := nullif(trim(payload ->> 'idempotencyKey'), '');
  v_email     text := lower(trim(payload ->> 'email'));
  v_phone_raw text := trim(payload ->> 'phone');
  v_interest  text := nullif(trim(payload ->> 'interestId'), '');
  v_message   text := nullif(trim(payload ->> 'message'), '');
  v_ip        inet;
  v_mail      jsonb;
  v_alert     jsonb;
  v_alerted   boolean := false;
begin
  if v_idem is null then
    raise exception 'idempotencyKey is required'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Replay of a submission already accepted. Return the same answer rather
  -- than creating a second lead for one person pressing the button twice.
  select id, enquiry_ref into v_existing
    from public.contact_enquiries where idempotency_key = v_idem;
  if found then
    return jsonb_build_object(
      'enquiryId', v_existing.id,
      'enquiryRef', v_existing.enquiry_ref,
      'replayed', true,
      'internalAlertQueued', exists (
        select 1 from public.notifications
         where enquiry_id = v_existing.id and template = 'enquiry_internal_alert'
      )
    );
  end if;

  -- An interest that is not on the list is dropped rather than refused. It is
  -- an optional dropdown; losing the customer's submission because the client
  -- sent a stale slug after somebody renamed one would be a poor trade.
  if v_interest is not null
     and not exists (select 1 from public.enquiry_interests where id = v_interest) then
    v_interest := null;
  end if;

  begin
    v_ip := nullif(trim(payload ->> 'clientIp'), '')::inet;
  exception when others then
    v_ip := null;
  end;

  insert into public.contact_enquiries (
    idempotency_key, full_name, email, phone_raw, phone_digits,
    interest_id, message, source, submitted_ip, submitted_user_agent,
    captcha_verified
  ) values (
    v_idem,
    trim(payload ->> 'fullName'),
    v_email,
    v_phone_raw,
    regexp_replace(v_phone_raw, '[^0-9]', '', 'g'),
    v_interest,
    v_message,
    'web',
    v_ip,
    left(nullif(trim(payload ->> 'userAgent'), ''), 500),
    coalesce((payload ->> 'captchaVerified')::boolean, false)
  )
  returning id, enquiry_ref into v_id, v_ref;

  -- The consent record, with the sentence the person actually read. Purpose is
  -- CONTACT_ENQUIRY and not SUPPORT_REQUEST: Privacy Policy §6 requires consent
  -- to be specific to a purpose, and agreeing to be contacted about a product
  -- is not agreeing to have a support ticket handled.
  insert into public.consent_records (
    enquiry_id, subject_email, purpose, consent_text, policy_version, policy_url,
    ip, user_agent, retention_expires_at
  ) values (
    v_id,
    v_email,
    'CONTACT_ENQUIRY',
    payload -> 'consent' ->> 'text',
    payload -> 'consent' ->> 'version',
    coalesce(payload -> 'consent' ->> 'url', 'https://platizioglobal.com/privacy'),
    v_ip,
    left(nullif(trim(payload ->> 'userAgent'), ''), 500),
    now() + interval '3 years'
  );

  v_mail := private.render_enquiry_acknowledgement(v_id);
  insert into public.notifications
    (enquiry_id, template, to_email, reply_to, subject, body_text, body_html, dedupe_key)
  values (
    v_id, 'enquiry_acknowledgement',
    v_mail ->> 'toEmail', 'supportglobal@platizio.com',
    v_mail ->> 'subject', v_mail ->> 'bodyText', v_mail ->> 'bodyHtml',
    'enquiry-ack:' || v_id::text
  )
  on conflict (dedupe_key) do nothing;

  v_alert := private.render_enquiry_internal_alert(v_id);
  if v_alert is not null then
    insert into public.notifications
      (enquiry_id, template, to_email, reply_to, subject, body_text, dedupe_key)
    values (
      v_id, 'enquiry_internal_alert',
      v_alert ->> 'toEmail', v_alert ->> 'replyTo',
      v_alert ->> 'subject', v_alert ->> 'bodyText',
      'enquiry-alert:' || v_id::text
    )
    on conflict (dedupe_key) do nothing;
    v_alerted := found;
  end if;

  return jsonb_build_object(
    'enquiryId', v_id,
    'enquiryRef', v_ref,
    'replayed', false,
    'internalAlertQueued', v_alerted
  );
end;
$$;

revoke all on function public.create_contact_enquiry(jsonb) from public, anon, authenticated;
grant execute on function public.create_contact_enquiry(jsonb) to service_role;

revoke all on function private.render_enquiry_acknowledgement(uuid) from public, anon, authenticated;
revoke all on function private.render_enquiry_internal_alert(uuid) from public, anon, authenticated;
