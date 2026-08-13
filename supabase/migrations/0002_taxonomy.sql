-- 0002_taxonomy.sql — the support taxonomy, as data rather than as types.
--
-- Categories and subcategories are lookup tables, not enums, because they will
-- drift: support learns what people actually write in and re-cuts the list.
-- That must be an INSERT, not a migration and a redeploy.
--
-- Seeded from src/help/ticketTaxonomy.ts (8 categories, 26 subcategories). The
-- ids here and the ids there are the same strings and are the contract between
-- the form and this database — they are what crosses the wire, never the label.
-- Renaming a label is now a cosmetic change on both sides; changing an id is a
-- data migration and needs one written.

create table public.ticket_categories (
  id          text        primary key,
  label       text        not null,
  description text        not null,
  faq_anchor  text,
  sort_order  integer     not null,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint ticket_categories_id_slug   check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint ticket_categories_label_len check (char_length(label) between 2 and 80)
);

create table public.ticket_subcategories (
  id          text        primary key,
  category_id text        not null references public.ticket_categories (id) on update cascade,
  label       text        not null,
  description text        not null,
  sort_order  integer     not null,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint ticket_subcategories_id_slug   check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint ticket_subcategories_label_len check (char_length(label) between 2 and 80),

  -- Redundant against the primary key on its own, but it gives tickets a
  -- composite foreign-key target: (category_id, subcategory_id). Without it a
  -- ticket could name a valid category and a valid subcategory that do not
  -- belong together, and nothing in the database would object.
  constraint ticket_subcategories_category_pair unique (category_id, id)
);

create index ticket_subcategories_category_idx
  on public.ticket_subcategories (category_id, sort_order);

create trigger ticket_categories_updated_at
  before update on public.ticket_categories
  for each row execute function public.set_updated_at();

create trigger ticket_subcategories_updated_at
  before update on public.ticket_subcategories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------
--
-- Idempotent: re-running updates the copy without disturbing is_active, so a
-- category that support has retired stays retired across a re-seed.

insert into public.ticket_categories (id, label, description, faq_anchor, sort_order) values
  ('account-kyc',  'Account & KYC',
   'Opening an account, KYC documents, profile changes, nominees and closure.',
   'getting-started',   1),
  ('funding',      'Funding & Remittance',
   'Sending money under LRS, TCS charges, and funds that have not arrived.',
   'funding',           2),
  ('trading',      'Trading & Orders',
   'Placing and cancelling orders, fractional shares, dividends and corporate actions.',
   'trading',           3),
  ('withdrawals',  'Withdrawals',
   'Taking money out, settlement timing, and the bank account it goes to.',
   'withdrawals',       4),
  ('reports-tax',  'Statements, Reports & Tax',
   'Statements, trade confirmations, profit and loss, and documents your CA needs.',
   'portfolio-reports', 5),
  ('transfers',    'Transferring Securities',
   'Moving holdings in or out of Platizio, including ESOPs and RSUs.',
   'transfers',         6),
  ('platform',     'Platform & Login',
   'Signing in, OTPs, app or website problems, and notification settings.',
   'managing-account',  7),
  ('other',        'Something else',
   'Anything that does not fit the categories above.',
   null,                8)
on conflict (id) do update set
  label       = excluded.label,
  description = excluded.description,
  faq_anchor  = excluded.faq_anchor,
  sort_order  = excluded.sort_order;

insert into public.ticket_subcategories (id, category_id, label, description, sort_order) values
  -- Account & KYC
  ('account-opening',              'account-kyc', 'Account opening',
   'Signing up, or getting stuck partway through the onboarding steps.', 1),
  ('kyc-documents',                'account-kyc', 'KYC documents or verification',
   'Documents rejected, still pending, or details that do not match your PAN.', 2),
  ('profile-update',               'account-kyc', 'Profile or address update',
   'Changing your name, address, email, mobile or other account details.', 3),
  ('nominee',                      'account-kyc', 'Nominee or beneficiary',
   'Adding, changing or removing the nominee on your account.', 4),
  ('account-closure',              'account-kyc', 'Account closure',
   'Closing your account and moving out any remaining holdings or cash.', 5),

  -- Funding & Remittance
  ('add-funds-lrs',                'funding', 'Adding funds / LRS remittance',
   'How to send money to your account, and what your bank will ask for.', 1),
  ('funds-not-credited',           'funding', 'Funds not credited',
   'Money has left your bank but has not appeared in your account.', 2),
  ('tcs-query',                    'funding', 'TCS query',
   'Tax Collected at Source on your remittance — rate, amount or refund.', 3),
  ('bank-nre-nro',                 'funding', 'Bank, NRE or NRO question',
   'Which bank account you can remit from, given your residency status.', 4),

  -- Trading & Orders
  ('order-not-executed',           'trading', 'Order not executed',
   'An order was rejected, expired, or never filled as expected.', 1),
  ('order-cancellation',           'trading', 'Order cancellation',
   'Cancelling an open order, or an order that cancelled unexpectedly.', 2),
  ('fractional-shares',            'trading', 'Fractional shares',
   'Buying, selling or transferring part-shares, and how they are priced.', 3),
  ('dividends-corporate-actions',  'trading', 'Dividends or corporate actions',
   'Dividends, splits, mergers and spin-offs on shares you hold.', 4),

  -- Withdrawals
  ('withdrawal-not-received',      'withdrawals', 'Withdrawal not received',
   'A withdrawal was processed but has not reached your bank.', 1),
  ('settlement-unsettled-cash',    'withdrawals', 'Settlement or unsettled cash',
   'Cash from a sale that cannot be withdrawn yet because it is still settling.', 2),
  ('withdrawal-bank-account',      'withdrawals', 'Bank account for withdrawal',
   'Adding or changing the bank account your withdrawals are sent to.', 3),

  -- Statements, Reports & Tax
  ('statement-trade-confirmation', 'reports-tax', 'Statement or trade confirmation',
   'Getting an account statement or a confirmation for a specific trade.', 1),
  ('pnl-report',                   'reports-tax', 'Profit & Loss report',
   'Realised and unrealised gains for a financial year, and figures that look wrong.', 2),
  ('tax-documents',                'reports-tax', 'Tax documents (Schedule FA, Form 67)',
   'Foreign asset disclosure, foreign tax credit, and dividend withholding summaries.', 3),

  -- Transferring Securities
  ('transfer-in',                  'transfers', 'Transfer in from another broker',
   'Bringing existing US holdings across to your Platizio account.', 1),
  ('transfer-out',                 'transfers', 'Transfer out to another broker',
   'Moving your holdings from Platizio to a different broker.', 2),
  ('esop-rsu-transfer',            'transfers', 'ESOP / RSU transfer',
   'Moving vested employer shares from a plan administrator to your account.', 3),

  -- Platform & Login
  ('login-password-otp',           'platform', 'Login, password or OTP',
   'Trouble signing in or receiving your OTP. Never send us the code or your password.', 1),
  ('app-website-issue',            'platform', 'App or website issue',
   'Errors, pages not loading, or something behaving incorrectly.', 2),
  ('notifications',                'platform', 'Notifications',
   'Alerts and emails you are not getting, or want to stop receiving.', 3),

  -- Something else
  ('general-query',                'other', 'General query',
   'A question or request that none of the other categories cover.', 1)
on conflict (id) do update set
  category_id = excluded.category_id,
  label       = excluded.label,
  description = excluded.description,
  sort_order  = excluded.sort_order;
