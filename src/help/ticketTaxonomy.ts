// Support taxonomy for the /help/raise intake form.
//
// These fields mirror the Ticket entity in the Help & Support data model
// (category, subcategory, subject, description, priority, consentGiven) so
// that the form's shape is already the shape a real ticketing backend will
// expect. Only the transport in ./api/support.ts changes when one exists.
//
// Every category and subcategory carries a one-line `description`. It is
// surfaced as a native tooltip on hover and, for touch and keyboard users who
// get no hover, inline beneath the control once selected.

export interface TicketSubcategory {
  /** Doubles as the submitted value — it is what a human reads in the inbox. */
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
      { label: 'Account opening', description: 'Signing up, or getting stuck partway through the onboarding steps.' },
      { label: 'KYC documents or verification', description: 'Documents rejected, still pending, or details that do not match your PAN.' },
      { label: 'Profile or address update', description: 'Changing your name, address, email, mobile or other account details.' },
      { label: 'Nominee or beneficiary', description: 'Adding, changing or removing the nominee on your account.' },
      { label: 'Account closure', description: 'Closing your account and moving out any remaining holdings or cash.' },
    ],
  },

  {
    id: 'funding',
    label: 'Funding & Remittance',
    description: 'Sending money under LRS, TCS charges, and funds that have not arrived.',
    faqAnchor: 'funding',
    subcategories: [
      { label: 'Adding funds / LRS remittance', description: 'How to send money to your account, and what your bank will ask for.' },
      { label: 'Funds not credited', description: 'Money has left your bank but has not appeared in your account.' },
      { label: 'TCS query', description: 'Tax Collected at Source on your remittance — rate, amount or refund.' },
      { label: 'Bank, NRE or NRO question', description: 'Which bank account you can remit from, given your residency status.' },
    ],
  },

  {
    id: 'trading',
    label: 'Trading & Orders',
    description: 'Placing and cancelling orders, fractional shares, dividends and corporate actions.',
    faqAnchor: 'trading',
    subcategories: [
      { label: 'Order not executed', description: 'An order was rejected, expired, or never filled as expected.' },
      { label: 'Order cancellation', description: 'Cancelling an open order, or an order that cancelled unexpectedly.' },
      { label: 'Fractional shares', description: 'Buying, selling or transferring part-shares, and how they are priced.' },
      { label: 'Dividends or corporate actions', description: 'Dividends, splits, mergers and spin-offs on shares you hold.' },
    ],
  },

  {
    id: 'withdrawals',
    label: 'Withdrawals',
    description: 'Taking money out, settlement timing, and the bank account it goes to.',
    faqAnchor: 'withdrawals',
    subcategories: [
      { label: 'Withdrawal not received', description: 'A withdrawal was processed but has not reached your bank.' },
      { label: 'Settlement or unsettled cash', description: 'Cash from a sale that cannot be withdrawn yet because it is still settling.' },
      { label: 'Bank account for withdrawal', description: 'Adding or changing the bank account your withdrawals are sent to.' },
    ],
  },

  {
    id: 'reports-tax',
    label: 'Statements, Reports & Tax',
    description: 'Statements, trade confirmations, profit and loss, and documents your CA needs.',
    faqAnchor: 'portfolio-reports',
    subcategories: [
      { label: 'Statement or trade confirmation', description: 'Getting an account statement or a confirmation for a specific trade.' },
      { label: 'Profit & Loss report', description: 'Realised and unrealised gains for a financial year, and figures that look wrong.' },
      { label: 'Tax documents (Schedule FA, Form 67)', description: 'Foreign asset disclosure, foreign tax credit, and dividend withholding summaries.' },
    ],
  },

  {
    id: 'transfers',
    label: 'Transferring Securities',
    description: 'Moving holdings in or out of Platizio, including ESOPs and RSUs.',
    faqAnchor: 'transfers',
    subcategories: [
      { label: 'Transfer in from another broker', description: 'Bringing existing US holdings across to your Platizio account.' },
      { label: 'Transfer out to another broker', description: 'Moving your holdings from Platizio to a different broker.' },
      { label: 'ESOP / RSU transfer', description: 'Moving vested employer shares from a plan administrator to your account.' },
    ],
  },

  {
    id: 'platform',
    label: 'Platform & Login',
    description: 'Signing in, OTPs, app or website problems, and notification settings.',
    faqAnchor: 'managing-account',
    subcategories: [
      {
        label: 'Login, password or OTP',
        // The warning is folded into the description because this is exactly
        // where someone might otherwise paste a live code into the form.
        description: 'Trouble signing in or receiving your OTP. Never send us the code or your password.',
      },
      { label: 'App or website issue', description: 'Errors, pages not loading, or something behaving incorrectly.' },
      { label: 'Notifications', description: 'Alerts and emails you are not getting, or want to stop receiving.' },
    ],
  },

  {
    id: 'other',
    label: 'Something else',
    description: 'Anything that does not fit the categories above.',
    subcategories: [
      { label: 'General query', description: 'A question or request that none of the other categories cover.' },
    ],
  },
]

export const PRIORITIES = ['Low', 'Normal', 'Urgent'] as const
export type Priority = (typeof PRIORITIES)[number]

export const getCategory = (id: string): TicketCategory | undefined =>
  CATEGORIES.find((c) => c.id === id)

/** Subcategories are identified by label, which is also the submitted value. */
export const getSubcategory = (
  categoryId: string,
  label: string
): TicketSubcategory | undefined =>
  getCategory(categoryId)?.subcategories.find((s) => s.label === label)
