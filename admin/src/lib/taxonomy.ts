/**
 * Ticket taxonomy — labels for the filter bar and the queue.
 *
 * Copied from ../../../src/content/support/taxonomy.ts, which is itself a
 * committed snapshot of public.ticket_categories and ticket_subcategories in
 * project qtjnlkobvnhhgsnyufzv. Two hops from the source, so worth saying why
 * it is copied rather than read:
 *
 *   - Reading it from the database means selecting from ticket_categories,
 *     whose RLS policy is `is_staff()` — which resolves roles from the JWT.
 *     With the custom_access_token_hook disabled that returns zero rows, and a
 *     filter dropdown that is silently empty is worse than a stale one.
 *   - This app deploys from admin/ as its own Vercel project, so it cannot
 *     import across the repo root.
 *
 * Only ids and labels are needed here. Drift shows up as a filter option whose
 * label is out of date, never as a mis-filed ticket: the id is what travels,
 * and support_nodes carries a composite foreign key that rejects a pair the
 * database does not recognise.
 */

export interface TicketCategory {
  id: string
  label: string
}

export interface TicketSubcategory {
  id: string
  categoryId: string
  label: string
}

export const TICKET_CATEGORIES: TicketCategory[] = [
  { id: 'account-kyc', label: 'Account & KYC' },
  { id: 'funding', label: 'Funding & Remittance' },
  { id: 'trading', label: 'Trading & Orders' },
  { id: 'withdrawals', label: 'Withdrawals' },
  { id: 'transfers', label: 'Transferring Securities' },
  { id: 'reports-tax', label: 'Statements, Reports & Tax' },
  { id: 'platform', label: 'Platform & Login' },
  { id: 'other', label: 'Something else' },
]

export const TICKET_SUBCATEGORIES: TicketSubcategory[] = [
  { id: 'account-closure', categoryId: 'account-kyc', label: 'Account closure' },
  { id: 'account-opening', categoryId: 'account-kyc', label: 'Account opening' },
  { id: 'kyc-documents', categoryId: 'account-kyc', label: 'KYC documents or verification' },
  { id: 'nominee', categoryId: 'account-kyc', label: 'Nominee or beneficiary' },
  { id: 'profile-update', categoryId: 'account-kyc', label: 'Profile or address update' },

  { id: 'add-funds-lrs', categoryId: 'funding', label: 'Adding funds / LRS remittance' },
  { id: 'bank-nre-nro', categoryId: 'funding', label: 'Bank, NRE or NRO question' },
  { id: 'funds-not-credited', categoryId: 'funding', label: 'Funds not credited' },
  { id: 'tcs-query', categoryId: 'funding', label: 'TCS query' },

  { id: 'dividends-corporate-actions', categoryId: 'trading', label: 'Dividends or corporate actions' },
  { id: 'fractional-shares', categoryId: 'trading', label: 'Fractional shares' },
  { id: 'order-cancellation', categoryId: 'trading', label: 'Order cancellation' },
  { id: 'order-not-executed', categoryId: 'trading', label: 'Order not executed' },

  { id: 'settlement-unsettled-cash', categoryId: 'withdrawals', label: 'Settlement or unsettled cash' },
  { id: 'withdrawal-bank-account', categoryId: 'withdrawals', label: 'Bank account for withdrawal' },
  { id: 'withdrawal-not-received', categoryId: 'withdrawals', label: 'Withdrawal not received' },

  { id: 'esop-rsu-transfer', categoryId: 'transfers', label: 'ESOP / RSU transfer' },
  { id: 'transfer-in', categoryId: 'transfers', label: 'Transfer in from another broker' },
  { id: 'transfer-out', categoryId: 'transfers', label: 'Transfer out to another broker' },

  { id: 'pnl-report', categoryId: 'reports-tax', label: 'Profit & Loss report' },
  { id: 'statement-trade-confirmation', categoryId: 'reports-tax', label: 'Statement or trade confirmation' },
  { id: 'tax-documents', categoryId: 'reports-tax', label: 'Tax documents (Schedule FA, Form 67)' },

  { id: 'app-website-issue', categoryId: 'platform', label: 'App or website issue' },
  { id: 'login-password-otp', categoryId: 'platform', label: 'Login, password or OTP' },
  { id: 'notifications', categoryId: 'platform', label: 'Notifications' },

  { id: 'general-query', categoryId: 'other', label: 'General query' },
]

/** Lookups, so a queue row holding only an id can still show a label. */
export const CATEGORY_LABEL = new Map(TICKET_CATEGORIES.map((c) => [c.id, c.label]))
export const SUBCATEGORY_LABEL = new Map(TICKET_SUBCATEGORIES.map((s) => [s.id, s.label]))

/** Falls back to the raw id: an unknown id means this snapshot is stale, and
 *  showing the id is more useful to whoever has to fix it than showing a dash. */
export function categoryLabel(id?: string | null): string {
  if (!id) return '—'
  return CATEGORY_LABEL.get(id) ?? id
}

export function subcategoryLabel(id?: string | null): string {
  if (!id) return '—'
  return SUBCATEGORY_LABEL.get(id) ?? id
}
