// Support taxonomy for the /help/raise intake form.
//
// These fields mirror the Ticket entity in the Help & Support data model
// (category, subcategory, subject, description, priority, consentGiven) so
// that the form's shape is already the shape a real ticketing backend will
// expect. Only the transport in ./api/support.ts changes when one exists.
//
// Guidance lives here rather than in the page so a new subcategory cannot be
// added without also stating what support needs for it.

export interface TicketSubcategory {
  /** Doubles as the submitted value — it is what a human reads in the inbox. */
  label: string
  /**
   * The specific facts support needs for THIS subcategory. Concrete beats
   * generic: "the UTR number" beats "relevant details". Written so the first
   * reply can be an answer rather than a request for more information.
   */
  detailsToInclude: string[]
  /** Shown as a warning when the subject matter attracts phishing. */
  caution?: string
}

export interface TicketCategory {
  id: string
  label: string
  subcategories: TicketSubcategory[]
  /** Fallback guidance, shown after a category is picked but before a subcategory. */
  detailsToInclude: string[]
  /** Matching FAQ section id on /help. Ids must exist in help/faqData.tsx. */
  faqAnchor?: string
}

export const CATEGORIES: TicketCategory[] = [
  {
    id: 'account-kyc',
    label: 'Account & KYC',
    faqAnchor: 'getting-started',
    detailsToInclude: [
      'The email address and mobile number you signed up with',
      'Which stage you reached before getting stuck',
    ],
    subcategories: [
      {
        label: 'Account opening',
        detailsToInclude: [
          'The email address and mobile number you signed up with',
          'Which step you reached — personal details, tax residency, risk questions, documents, or signature',
          'Any error message shown on screen, word for word',
        ],
      },
      {
        label: 'KYC documents or verification',
        detailsToInclude: [
          'Which document was rejected, and the reason you were given',
          'The date you uploaded it',
          'Whether your name and date of birth match your PAN exactly',
        ],
      },
      {
        label: 'Profile or address update',
        detailsToInclude: [
          'Which detail needs changing, and the correct value',
          'The email address registered on your account',
          'For an address change, the proof of address you can provide',
        ],
      },
      {
        label: 'Nominee or beneficiary',
        detailsToInclude: [
          'Whether you are adding, changing or removing a nominee',
          'The nominee’s full name, date of birth and relationship to you',
          'The email address registered on your account',
        ],
      },
      {
        label: 'Account closure',
        detailsToInclude: [
          'Confirmation that you are writing from your registered email address — closure requests must come from it',
          'Whether you still hold securities or cash that need to be moved out first',
          'Where any remaining balance should be sent',
        ],
      },
    ],
  },

  {
    id: 'funding',
    label: 'Funding & Remittance',
    faqAnchor: 'funding',
    detailsToInclude: [
      'The amount, the date sent, and the sending bank',
      'Your bank reference or UTR number',
    ],
    subcategories: [
      {
        label: 'Adding funds / LRS remittance',
        detailsToInclude: [
          'The amount you want to remit and your sending bank',
          'Whether your bank is one of the integrated partner banks',
          'Whether your bank has asked you for an A2 form or LRS declaration',
        ],
      },
      {
        label: 'Funds not credited',
        detailsToInclude: [
          'The amount, the date sent, and the sending bank',
          'Your bank reference or UTR number for the remittance',
          'Whether your bank has confirmed the money has left your account',
        ],
      },
      {
        label: 'TCS query',
        detailsToInclude: [
          'The financial year, and the total you have remitted under LRS so far in it',
          'The TCS amount you were charged or shown',
          'Whether the remittance was funded by an education or medical loan',
        ],
      },
      {
        label: 'Bank, NRE or NRO question',
        detailsToInclude: [
          'Which account type you plan to remit from — resident, NRE or NRO',
          'Your current residency status for tax purposes',
          'Your bank’s name',
        ],
      },
    ],
  },

  {
    id: 'trading',
    label: 'Trading & Orders',
    faqAnchor: 'trading',
    detailsToInclude: [
      'The ticker symbol, order type, quantity and price',
      'The date and approximate time involved',
    ],
    subcategories: [
      {
        label: 'Order not executed',
        detailsToInclude: [
          'The ticker symbol, order type, quantity and limit price',
          'The date and approximate time you placed the order',
          'Any message shown when the order was rejected or expired',
        ],
      },
      {
        label: 'Order cancellation',
        detailsToInclude: [
          'The ticker symbol and the order reference, if you have it',
          'The date and time the order was placed',
          'Whether it currently shows as open, partially filled or filled',
        ],
      },
      {
        label: 'Fractional shares',
        detailsToInclude: [
          'The ticker symbol and the fractional quantity involved',
          'What you were trying to do — buy, sell, or transfer out',
          'Which figure looks wrong, and what you expected instead',
        ],
      },
      {
        label: 'Dividends or corporate actions',
        detailsToInclude: [
          'The ticker symbol and the type of action — dividend, split, merger or spin-off',
          'The expected record or pay date',
          'The amount or quantity you expected, against what you actually received',
        ],
      },
    ],
  },

  {
    id: 'withdrawals',
    label: 'Withdrawals',
    faqAnchor: 'withdrawals',
    detailsToInclude: [
      'The amount and the date you requested it',
      'The last four digits of the receiving bank account',
    ],
    subcategories: [
      {
        label: 'Withdrawal not received',
        detailsToInclude: [
          'The withdrawal amount and the date you requested it',
          'The last four digits of the receiving bank account',
          'Whether your bank shows a pending or held inward transfer',
        ],
      },
      {
        label: 'Settlement or unsettled cash',
        detailsToInclude: [
          'The ticker you sold and the date of the sale',
          'The amount currently showing as unsettled',
          'The withdrawal amount you are trying to place',
        ],
      },
      {
        label: 'Bank account for withdrawal',
        detailsToInclude: [
          'Whether you are adding a new account or changing an existing one',
          'The account holder name — it must match your own name',
          'The bank, branch and last four digits of the account',
        ],
      },
    ],
  },

  {
    id: 'reports-tax',
    label: 'Statements, Reports & Tax',
    faqAnchor: 'portfolio-reports',
    detailsToInclude: [
      'The financial year or exact date range you need',
      'Which document you need',
    ],
    subcategories: [
      {
        label: 'Statement or trade confirmation',
        detailsToInclude: [
          'The exact date range you need it for',
          'Whether you need a single trade confirmation or a full account statement',
          'Where you got stuck, if you already tried downloading it',
        ],
      },
      {
        label: 'Profit & Loss report',
        detailsToInclude: [
          'The financial year you need',
          'Whether you need realised gains, unrealised, or both',
          'Any figure that looks wrong, with the ticker it relates to',
        ],
      },
      {
        label: 'Tax documents (Schedule FA, Form 67)',
        detailsToInclude: [
          'The assessment year you are filing for',
          'Which document you need — Schedule FA details, Form 67, or a dividend and withholding summary',
          'Whether your Chartered Accountant has asked for a particular format',
        ],
      },
    ],
  },

  {
    id: 'transfers',
    label: 'Transferring Securities',
    faqAnchor: 'transfers',
    detailsToInclude: [
      'The other broker’s name and your account number with them',
      'The tickers and quantities involved',
    ],
    subcategories: [
      {
        label: 'Transfer in from another broker',
        detailsToInclude: [
          'The sending broker’s name and your account number with them',
          'The tickers and quantities you want moved',
          'Whether any of the holdings are fractional — those generally cannot transfer',
        ],
      },
      {
        label: 'Transfer out to another broker',
        detailsToInclude: [
          'The receiving broker’s name and your account number with them',
          'The tickers and quantities you want moved',
          'Whether you want the account closed once the transfer completes',
        ],
      },
      {
        label: 'ESOP / RSU transfer',
        detailsToInclude: [
          'Your employer, and the plan administrator currently holding the shares',
          'The ticker, quantity, and how many shares have vested',
          'Any lock-in, blackout or trading restriction that applies to you',
        ],
      },
    ],
  },

  {
    id: 'platform',
    label: 'Platform & Login',
    faqAnchor: 'managing-account',
    detailsToInclude: [
      'Your device, and your browser or app version',
      'The exact error message shown',
    ],
    subcategories: [
      {
        label: 'Login, password or OTP',
        detailsToInclude: [
          'The email address registered on your account',
          'Whether the OTP arrives at all, and whether you expect it by email or SMS',
          'The exact error message shown when you try to sign in',
        ],
        caution: 'Never include your password or the OTP code itself. Our team will never ask for them.',
      },
      {
        label: 'App or website issue',
        detailsToInclude: [
          'Your device and operating system, and your browser or app version',
          'The exact error message, with a screenshot if you have one',
          'Whether it happens every time, or only sometimes',
        ],
      },
      {
        label: 'Notifications',
        detailsToInclude: [
          'Which notifications are missing, or which you want to stop',
          'Whether you expect them by email, SMS or push',
          'The email address registered on your account',
        ],
      },
    ],
  },

  {
    id: 'other',
    label: 'Something else',
    detailsToInclude: [
      'What you were trying to do, and what got in the way',
      'Any dates, amounts or reference numbers involved',
    ],
    subcategories: [
      {
        label: 'General query',
        detailsToInclude: [
          'What you were trying to do, and what got in the way',
          'Any dates, amounts or reference numbers involved',
          'The email address registered on your account, if this concerns your account',
        ],
      },
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
