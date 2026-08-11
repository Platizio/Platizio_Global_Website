// Support taxonomy for the /help/raise intake form.
//
// Every category, subcategory and priority carries a stable `id`. The id is
// what crosses the wire, what the <option value> holds, and what the database
// stores as a foreign key — the label is display text and nothing more.
//
// That separation is the point. Until it existed, a subcategory was identified
// by its label string in three places at once, so editing "TCS query" to "TCS
// and tax queries" was a silent data migration: new tickets would carry the new
// string, old ones the old, and nothing would join them up. Ids are now free to
// stay put while labels are reworded as often as support likes.
//
// The ids here must match supabase/migrations/0002_taxonomy.sql exactly. They
// are a foreign key, so a mismatch is not a silent failure — create-ticket
// returns "That category is no longer available" and the row is refused.
//
// Every category and subcategory also carries a one-line `description`,
// surfaced as a native tooltip on hover and, for touch and keyboard users who
// get no hover, inline beneath the control once selected.

export interface TicketSubcategory {
  /** Stable identifier. Sent to the backend; never shown to anyone. */
  id: string
  /** Display text. Safe to reword. */
  label: string
  /** One line, shown on hover and when selected. Describes what it covers. */
  description: string
}

export interface TicketCategory {
  id: string
  label: string
  description: string
  subcategories: TicketSubcategory[]
  /** Matching FAQ section id on /help. Ids must exist in help/faqData.tsx. */
  faqAnchor?: string
}

export const CATEGORIES: TicketCategory[] = [
  {
    id: 'account-kyc',
    label: 'Account & KYC',
    description: 'Opening an account, KYC documents, profile changes, nominees and closure.',
    faqAnchor: 'getting-started',
    subcategories: [
      { id: 'account-opening', label: 'Account opening', description: 'Signing up, or getting stuck partway through the onboarding steps.' },
      { id: 'kyc-documents', label: 'KYC documents or verification', description: 'Documents rejected, still pending, or details that do not match your PAN.' },
      { id: 'profile-update', label: 'Profile or address update', description: 'Changing your name, address, email, mobile or other account details.' },
      { id: 'nominee', label: 'Nominee or beneficiary', description: 'Adding, changing or removing the nominee on your account.' },
      { id: 'account-closure', label: 'Account closure', description: 'Closing your account and moving out any remaining holdings or cash.' },
    ],
  },

  {
    id: 'funding',
    label: 'Funding & Remittance',
    description: 'Sending money under LRS, TCS charges, and funds that have not arrived.',
    faqAnchor: 'funding',
    subcategories: [
      { id: 'add-funds-lrs', label: 'Adding funds / LRS remittance', description: 'How to send money to your account, and what your bank will ask for.' },
      { id: 'funds-not-credited', label: 'Funds not credited', description: 'Money has left your bank but has not appeared in your account.' },
      { id: 'tcs-query', label: 'TCS query', description: 'Tax Collected at Source on your remittance — rate, amount or refund.' },
      { id: 'bank-nre-nro', label: 'Bank, NRE or NRO question', description: 'Which bank account you can remit from, given your residency status.' },
    ],
  },

  {
    id: 'trading',
    label: 'Trading & Orders',
    description: 'Placing and cancelling orders, fractional shares, dividends and corporate actions.',
    faqAnchor: 'trading',
    subcategories: [
      { id: 'order-not-executed', label: 'Order not executed', description: 'An order was rejected, expired, or never filled as expected.' },
      { id: 'order-cancellation', label: 'Order cancellation', description: 'Cancelling an open order, or an order that cancelled unexpectedly.' },
      { id: 'fractional-shares', label: 'Fractional shares', description: 'Buying, selling or transferring part-shares, and how they are priced.' },
      { id: 'dividends-corporate-actions', label: 'Dividends or corporate actions', description: 'Dividends, splits, mergers and spin-offs on shares you hold.' },
    ],
  },

  {
    id: 'withdrawals',
    label: 'Withdrawals',
    description: 'Taking money out, settlement timing, and the bank account it goes to.',
    faqAnchor: 'withdrawals',
    subcategories: [
      { id: 'withdrawal-not-received', label: 'Withdrawal not received', description: 'A withdrawal was processed but has not reached your bank.' },
      { id: 'settlement-unsettled-cash', label: 'Settlement or unsettled cash', description: 'Cash from a sale that cannot be withdrawn yet because it is still settling.' },
      { id: 'withdrawal-bank-account', label: 'Bank account for withdrawal', description: 'Adding or changing the bank account your withdrawals are sent to.' },
    ],
  },

  {
    id: 'reports-tax',
    label: 'Statements, Reports & Tax',
    description: 'Statements, trade confirmations, profit and loss, and documents your CA needs.',
    faqAnchor: 'portfolio-reports',
    subcategories: [
      { id: 'statement-trade-confirmation', label: 'Statement or trade confirmation', description: 'Getting an account statement or a confirmation for a specific trade.' },
      { id: 'pnl-report', label: 'Profit & Loss report', description: 'Realised and unrealised gains for a financial year, and figures that look wrong.' },
      { id: 'tax-documents', label: 'Tax documents (Schedule FA, Form 67)', description: 'Foreign asset disclosure, foreign tax credit, and dividend withholding summaries.' },
    ],
  },

  {
    id: 'transfers',
    label: 'Transferring Securities',
    description: 'Moving holdings in or out of Platizio, including ESOPs and RSUs.',
    faqAnchor: 'transfers',
    subcategories: [
      { id: 'transfer-in', label: 'Transfer in from another broker', description: 'Bringing existing US holdings across to your Platizio account.' },
      { id: 'transfer-out', label: 'Transfer out to another broker', description: 'Moving your holdings from Platizio to a different broker.' },
      { id: 'esop-rsu-transfer', label: 'ESOP / RSU transfer', description: 'Moving vested employer shares from a plan administrator to your account.' },
    ],
  },

  {
    id: 'platform',
    label: 'Platform & Login',
    description: 'Signing in, OTPs, app or website problems, and notification settings.',
    faqAnchor: 'managing-account',
    subcategories: [
      {
        id: 'login-password-otp',
        label: 'Login, password or OTP',
        // The warning is folded into the description because this is exactly
        // where someone might otherwise paste a live code into the form.
        description: 'Trouble signing in or receiving your OTP. Never send us the code or your password.',
      },
      { id: 'app-website-issue', label: 'App or website issue', description: 'Errors, pages not loading, or something behaving incorrectly.' },
      { id: 'notifications', label: 'Notifications', description: 'Alerts and emails you are not getting, or want to stop receiving.' },
    ],
  },

  {
    id: 'other',
    label: 'Something else',
    description: 'Anything that does not fit the categories above.',
    subcategories: [
      { id: 'general-query', label: 'General query', description: 'A question or request that none of the other categories cover.' },
    ],
  },
]

export interface TicketPriority {
  /** Matches the ticket_priority enum in the database. */
  id: 'LOW' | 'NORMAL' | 'URGENT'
  label: string
}

export const PRIORITIES: TicketPriority[] = [
  { id: 'LOW', label: 'Low' },
  { id: 'NORMAL', label: 'Normal' },
  { id: 'URGENT', label: 'Urgent' },
]

export type Priority = TicketPriority['id']

export const getCategory = (id: string): TicketCategory | undefined =>
  CATEGORIES.find((c) => c.id === id)

export const getSubcategory = (
  categoryId: string,
  subcategoryId: string
): TicketSubcategory | undefined =>
  getCategory(categoryId)?.subcategories.find((s) => s.id === subcategoryId)
