-- 0005_consent.sql — consent as a record, not a boolean.
--
-- Privacy Policy §6 commits that where the DPDP Act 2023 requires consent, that
-- consent "will be free, specific, informed, unconditional, unambiguous and
-- based on clear affirmative action".
--
-- A `consent_given boolean` proves none of those things. It cannot show what
-- the customer was told, which version of the policy they were told it under,
-- or when. This table stores the sentence they actually agreed to, verbatim,
-- alongside the policy version it pointed at — so that if the wording changes
-- next year, every consent already collected still says what it said.

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),

  -- Nullable: a consent record can outlive or precede the thing it authorised,
  -- and a withdrawal request arrives with no ticket at all.
  ticket_id uuid references public.tickets (id) on delete cascade,

  subject_email text not null,
  purpose       text not null,

  -- Verbatim, as rendered next to the checkbox. Not a key into a table of
  -- wordings — a copy, because the point is what this person was shown.
  consent_text   text not null,
  policy_version text not null,
  policy_url     text not null,

  given_at   timestamptz not null default now(),
  ip         inet,
  user_agent text,

  -- DPDP gives a right to withdraw. Recorded here rather than by deleting the
  -- record: withdrawal is an event with a date, and erasing the original
  -- consent would destroy the evidence that processing was lawful up to it.
  withdrawn_at    timestamptz,
  withdrawal_note text,

  retention_expires_at timestamptz not null default (now() + interval '5 years'),

  constraint consent_records_purpose
    check (purpose in ('SUPPORT_REQUEST', 'GRIEVANCE', 'CONTACT_ENQUIRY')),
  constraint consent_records_email_shape
    check (subject_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint consent_records_text_len
    check (char_length(consent_text) between 20 and 2000),
  constraint consent_records_version_len
    check (char_length(policy_version) between 1 and 40),
  constraint consent_records_withdrawal
    check (withdrawn_at is not null or withdrawal_note is null)
);

comment on table public.consent_records is
  'Verbatim consent text, policy version, time, IP and user agent. Append-only except for withdrawal.';

create index consent_records_ticket_idx  on public.consent_records (ticket_id);
create index consent_records_subject_idx on public.consent_records (lower(subject_email), given_at desc);
create index consent_records_retention_idx
  on public.consent_records (retention_expires_at) where ticket_id is null;

-- ---------------------------------------------------------------------------
-- Immutable except for withdrawal
-- ---------------------------------------------------------------------------
--
-- Comparing the whole row as jsonb minus the withdrawal pair means a column
-- added later is protected by default, which is the direction the mistake
-- should fall in.

create or replace function public.reject_consent_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if coalesce(current_setting('platizio.retention_purge', true), 'off') = 'on' then
      return old;
    end if;
    raise exception 'consent_records may not be deleted; record a withdrawal instead'
      using errcode = 'restrict_violation';
  end if;

  if (to_jsonb(new) - 'withdrawn_at' - 'withdrawal_note')
     is distinct from
     (to_jsonb(old) - 'withdrawn_at' - 'withdrawal_note') then
    raise exception 'consent_records is append-only; only withdrawn_at and withdrawal_note may change'
      using errcode = 'restrict_violation';
  end if;

  if old.withdrawn_at is not null and new.withdrawn_at is distinct from old.withdrawn_at then
    raise exception 'a recorded consent withdrawal may not be altered or reversed'
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

create trigger consent_records_immutable
  before update or delete on public.consent_records
  for each row execute function public.reject_consent_mutation();
