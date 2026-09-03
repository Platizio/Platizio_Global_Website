-- Tests for 0031 — the staff enquiry desk and the outbox.
--
-- The first staff-session tests in this project. 0028–0030 all exercise paths
-- reached with the service key, where auth.uid() is null and every guard is
-- bypassed. Nothing had ever driven private.require_staff() from a test, which
-- means the guards on 21 existing RPCs were unproven too.
--
-- A staff session is simulated the way PostgREST creates one: set
-- request.jwt.claims for the transaction. That changes what auth.uid() returns
-- without changing the database role, so these tests prove the *guards*, not
-- the GRANTs — a superuser bypasses ACLs. The grants are asserted separately at
-- the bottom by reading them out of the catalog, which is the only way to check
-- them from a session that ignores them.

begin;

select plan(24);

-- ── Fixtures ────────────────────────────────────────────────────────────────
--
-- staff_users.id is a foreign key onto auth.users, so a real auth row has to
-- exist first. instance_id and the aud/role pair are what Supabase's own
-- seeding writes; everything else on auth.users is nullable.

create temporary table t_ids (k text primary key, v uuid) on commit drop;

insert into t_ids (k, v) values
  ('agent', '11111111-1111-4111-8111-111111111111'),
  ('admin', '22222222-2222-4222-8222-222222222222');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', v, 'authenticated', 'authenticated',
       k || '@platizio.test', '', now(), now(), now()
from t_ids;

insert into public.staff_users (id, full_name, email)
select v, initcap(k) || ' Tester', k || '@platizio.test' from t_ids;

insert into public.user_roles (user_id, role)
select v, case when k = 'admin' then 'ADMIN' else 'AGENT' end::public.staff_role
from t_ids;

-- Two enquiries through the real intake path, before any session exists —
-- which is how they actually arrive.

select public.create_contact_enquiry(jsonb_build_object(
  'idempotencyKey', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'fullName',       'Queue Tester',
  'email',          'queue@example.com',
  'phoneRaw',       '+91 98765 43210',
  'phoneDigits',    '919876543210',
  'interestId',     'us-stocks',
  'message',        'Please tell me about opening an account.',
  'consent', jsonb_build_object(
    'text',    'I agree that Platizio Global may use the details above to contact me.',
    'version', '2026-08-14',
    'url',     'https://platizioglobal.com/privacy')
));

-- The literal per-cent sign is the point of this row, not decoration.
select public.create_contact_enquiry(jsonb_build_object(
  'idempotencyKey', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'fullName',       'Percent Tester',
  'email',          'percent@example.com',
  'phoneRaw',       '+91 91234 56789',
  'phoneDigits',    '919123456789',
  'interestId',     'us-stocks',
  'message',        'I want to move 50% of my portfolio abroad.',
  'consent', jsonb_build_object(
    'text',    'I agree that Platizio Global may use the details above to contact me.',
    'version', '2026-08-14',
    'url',     'https://platizioglobal.com/privacy')
));

insert into t_ids (k, v)
select 'enquiry', id from public.contact_enquiries where email = 'queue@example.com';

-- ── 1. No session at all ────────────────────────────────────────────────────
--
-- This is the state a direct database session is in, and the state an
-- unauthenticated PostgREST call arrives in. Either way require_staff must bite
-- before a single row is read.

select throws_ok(
  $$ select public.staff_enquiry_queue() $$,
  '42501',
  null,
  'staff_enquiry_queue refuses a caller with no session'
);

-- ── The agent signs in ──────────────────────────────────────────────────────

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","email":"agent@platizio.test"}',
  true
);

select is(
  (public.staff_enquiry_queue() ->> 'total')::int,
  2,
  'the default queue shows both open enquiries'
);

select is(
  (select r ->> 'enquiryRef'
     from jsonb_array_elements(public.staff_enquiry_queue() -> 'rows') r
    where r ->> 'email' = 'queue@example.com'),
  (select enquiry_ref from public.contact_enquiries where email = 'queue@example.com'),
  'and projects the PG-ENQ reference'
);

select is(
  (public.staff_enquiry_detail((select v from t_ids where k = 'enquiry')) -> 'enquiry' ->> 'email'),
  'queue@example.com',
  'staff_enquiry_detail returns the right enquiry'
);

select is(
  jsonb_array_length(
    public.staff_enquiry_detail((select v from t_ids where k = 'enquiry')) -> 'notes'),
  0,
  'and it starts with no notes'
);

-- ── Notes are appended, never edited ────────────────────────────────────────

select lives_ok(
  $$ select public.staff_add_enquiry_note(
       (select v from t_ids where k = 'enquiry'),
       'Called and left a voicemail.') $$,
  'staff_add_enquiry_note writes a note'
);

select is(
  jsonb_array_length(
    public.staff_enquiry_detail((select v from t_ids where k = 'enquiry')) -> 'notes'),
  1,
  'and the detail view shows it'
);

-- ── Status moves, and what the trigger owns ─────────────────────────────────
--
-- staff_set_enquiry_status writes `status` and nothing else. If these stamps
-- appear, stamp_enquiry_status did its job and the two are not duplicating
-- each other's arithmetic.

select lives_ok(
  $$ select public.staff_set_enquiry_status(
       (select v from t_ids where k = 'enquiry'),
       'CONTACTED'::public.enquiry_status,
       'Spoke to them, sending the account opening link.') $$,
  'an enquiry can be moved to CONTACTED'
);

select isnt(
  (select first_contacted_at from public.contact_enquiries where email = 'queue@example.com'),
  null,
  'and the trigger stamps first_contacted_at'
);

select throws_ok(
  $$ select public.staff_set_enquiry_status(
       (select v from t_ids where k = 'enquiry'),
       'CLOSED'::public.enquiry_status,
       null) $$,
  '22023',
  null,
  'closing an enquiry without saying how it ended is refused'
);

select lives_ok(
  $$ select public.staff_set_enquiry_status(
       (select v from t_ids where k = 'enquiry'),
       'CONVERTED'::public.enquiry_status,
       'Account opened, handed to onboarding.') $$,
  'and succeeds with a note'
);

select is(
  (select outcome_note from public.contact_enquiries where email = 'queue@example.com'),
  'Account opened, handed to onboarding.',
  'the outcome note is stored on the row'
);

-- Three years from closure, not from arrival. 0027 sets the shorter clock for
-- enquiries deliberately; a re-anchor that silently used the ticket rule would
-- keep marketing data two years too long.
select ok(
  (select closed_at is not null
            and retention_expires_at between closed_at + interval '3 years' - interval '1 minute'
                                         and closed_at + interval '3 years' + interval '1 minute'
     from public.contact_enquiries where email = 'queue@example.com'),
  'and retention re-anchors to three years from closure'
);

select is(
  (public.staff_enquiry_queue() ->> 'total')::int,
  1,
  'a converted enquiry drops out of the default queue'
);

-- ── LIKE escaping ───────────────────────────────────────────────────────────
--
-- A bare per-cent sign is the sharpest version of this test. Escaped, the
-- pattern matches only text containing a literal '%'. Unescaped it becomes
-- '%%%', which matches every row — so a regression here doubles the count
-- rather than changing it subtly.

select is(
  (public.staff_enquiry_queue(
     '{"q":"%","status":["NEW","CONTACTED","QUALIFIED","CONVERTED","CLOSED","SPAM"]}'::jsonb
   ) ->> 'total')::int,
  1,
  'searching for a per-cent sign matches only the enquiry containing one'
);

-- ── Outbox ──────────────────────────────────────────────────────────────────

select ok(
  (select count(*) from jsonb_array_elements(
     public.staff_outbox('{"status":["PENDING","SENDING","FAILED","SENT"],"limit":100}'::jsonb) -> 'rows'
   ) r where r ->> 'template' = 'enquiry_acknowledgement') >= 1,
  'staff_outbox surfaces the queued enquiry acknowledgement'
);

select throws_ok(
  $$ select public.staff_retry_notification(
       (select id from public.notifications order by created_at limit 1)) $$,
  '42501',
  null,
  'an AGENT cannot retry a notification'
);

-- ── The admin signs in ──────────────────────────────────────────────────────

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","email":"admin@platizio.test"}',
  true
);

select throws_ok(
  $$ select public.staff_retry_notification(
       (select id from public.notifications where status = 'PENDING' order by created_at limit 1)) $$,
  '22023',
  null,
  'and even an ADMIN cannot retry something that has not failed'
);

-- Force one row to the state a genuinely undeliverable email reaches.
update public.notifications
   set status = 'FAILED', attempts = max_attempts, last_error = 'test: mailbox unavailable'
 where id = (select id from public.notifications order by created_at limit 1);

select is(
  (select public.staff_retry_notification(
     (select id from public.notifications where status = 'FAILED' order by created_at limit 1)
   ) ->> 'status'),
  'PENDING',
  'a FAILED notification can be re-queued by an ADMIN'
);

-- The reset matters as much as the status change: complete_notification only
-- marks a row FAILED once attempts >= max_attempts, so a retry that left the
-- counter alone would fail permanently again on its first error.
select is(
  (select attempts from public.notifications where last_error = 'test: mailbox unavailable'),
  0,
  'and its attempt counter is reset so the retry is not immediately fatal'
);

-- ── Dashboard ───────────────────────────────────────────────────────────────

select is(
  (public.staff_dashboard() ->> 'openEnquiries')::int,
  1,
  'staff_dashboard counts the remaining open enquiry'
);

select ok(
  public.staff_dashboard() ? 'holidayCoverage'
    and public.staff_dashboard() ? 'outboxFailed'
    and public.staff_dashboard() ? 'enquiriesOverdueFollowUp',
  'and keeps every key 0023 published while adding the enquiry ones'
);

-- ── Grants ──────────────────────────────────────────────────────────────────
--
-- Read from the catalog rather than exercised, because this session is a
-- superuser and would sail through a missing revoke. The failure being guarded
-- is specific: Postgres grants EXECUTE to PUBLIC by default, so revoking from
-- `anon, authenticated` alone leaves the default grant in force and the
-- function reachable by anyone holding the anon key — which ships in the site
-- bundle.

select ok(
  not has_function_privilege('anon', 'public.staff_enquiry_queue(jsonb)', 'EXECUTE'),
  'anon cannot execute staff_enquiry_queue'
);

select ok(
  not has_function_privilege('anon', 'public.staff_retry_notification(uuid)', 'EXECUTE'),
  'anon cannot execute staff_retry_notification'
);

select * from finish();

rollback;
