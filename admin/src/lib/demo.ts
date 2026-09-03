import type {
  AttachmentOpen,
  Dashboard,
  EnquiryDetail,
  EnquiryRow,
  HolidayCalendar,
  OutboxRow,
  TicketDetail,
  TicketRow,
  WhoAmI,
} from './types'

/**
 * Demo mode — fixtures, no backend.
 *
 * Exists for one reason: the console cannot be looked at until a Supabase
 * project is wired up and a staff account exists in it, and neither of those
 * is a five-second job. This lets the screens be reviewed first.
 *
 * It is NOT a test double and nothing here is verified against the real RPCs.
 * The fixtures are hand-written to match the projections in
 * supabase/migrations/…0019 and 0031, and they will drift the moment those
 * change. A screen that works here can still be wrong against the database —
 * only the round trip in a browser against a real project proves anything.
 *
 * Gated on `import.meta.env.DEV` as well as the flag, so a production build
 * folds the constant to `false` and drops every branch that reads it. It cannot
 * be switched on in a deployed console by setting an environment variable.
 */
export const DEMO = import.meta.env.DEV && import.meta.env.VITE_DEMO === '1'

/* ── Relative timestamps ─────────────────────────────────────────────────── */

const HOUR = 3600_000
const now = Date.now()
const ago = (hours: number) => new Date(now - hours * HOUR).toISOString()
const ahead = (hours: number) => new Date(now + hours * HOUR).toISOString()

const ME = '11111111-1111-4111-8111-111111111111'
const PRIYA = '22222222-2222-4222-8222-222222222222'

export const DEMO_ME: WhoAmI = {
  signedIn: true,
  userId: ME,
  email: 'demo@platizio.test',
  fullName: 'Demo Admin',
  isActive: true,
  roles: ['AGENT', 'SUPERVISOR', 'GRIEVANCE_OFFICER', 'ADMIN'],
  isStaff: true,
  // Every capability on, so every screen is reachable. Role gating is one of
  // the things this mode cannot show you — see the note in the banner.
  can: {
    viewQueue: true,
    reply: true,
    setStatus: true,
    openAttachments: true,
    viewAccessLog: true,
    administerStaff: true,
    editCalendar: true,
  },
  tokenRoles: ['AGENT', 'SUPERVISOR', 'GRIEVANCE_OFFICER', 'ADMIN'],
}

/* ── Tickets ─────────────────────────────────────────────────────────────── */

const TICKETS: TicketRow[] = [
  {
    id: 't-1',
    ticketRef: 'PG-2026-000118',
    subject: 'My withdrawal has not arrived after nine days',
    requesterName: 'Rohit Sharma',
    requesterEmail: 'rohit.sharma@example.com',
    categoryId: 'withdrawals',
    subcategoryId: 'withdrawal-not-received',
    priority: 'URGENT',
    statusInternal: 'IN_PROGRESS',
    statusCustomer: 'IN_PROGRESS',
    assignedAgentId: ME,
    assignedAgentName: 'Demo Admin',
    createdAt: ago(58),
    firstResponseDueAt: ago(50),
    firstResponseAt: ago(52),
    resolutionDueAt: ago(6),
    resolvedAt: null,
    firstResponseState: 'MET',
    resolutionState: 'BREACHED',
    hasComplaint: true,
    complaintRef: 'PG-GRV-2026-000004',
    legalHold: false,
    attachmentCount: 2,
  },
  {
    id: 't-2',
    ticketRef: 'PG-2026-000121',
    subject: 'LRS remittance shows as sent but balance is unchanged',
    requesterName: 'Ananya Iyer',
    requesterEmail: 'ananya.iyer@example.com',
    categoryId: 'funding',
    subcategoryId: 'funds-not-credited',
    priority: 'URGENT',
    statusInternal: 'NEW',
    statusCustomer: 'RECEIVED',
    assignedAgentId: null,
    assignedAgentName: null,
    createdAt: ago(9),
    firstResponseDueAt: ago(1),
    firstResponseAt: null,
    resolutionDueAt: ahead(31),
    resolvedAt: null,
    firstResponseState: 'BREACHED',
    resolutionState: 'DUE',
    hasComplaint: false,
    complaintRef: null,
    legalHold: false,
    attachmentCount: 1,
  },
  {
    id: 't-3',
    ticketRef: 'PG-2026-000122',
    subject: 'W-8BEN rejected — says name does not match',
    requesterName: 'Karthik Menon',
    requesterEmail: 'k.menon@example.com',
    categoryId: 'account-kyc',
    subcategoryId: 'kyc-documents',
    priority: 'NORMAL',
    statusInternal: 'WAITING_ON_CUSTOMER',
    statusCustomer: 'WAITING_ON_YOU',
    assignedAgentId: PRIYA,
    assignedAgentName: 'Priya Nair',
    createdAt: ago(30),
    firstResponseDueAt: ago(22),
    firstResponseAt: ago(26),
    resolutionDueAt: ahead(10),
    resolvedAt: null,
    firstResponseState: 'MET',
    resolutionState: 'DUE',
    hasComplaint: false,
    complaintRef: null,
    legalHold: false,
    attachmentCount: 0,
  },
  {
    id: 't-4',
    ticketRef: 'PG-2026-000123',
    subject: 'Where do I find my Schedule FA statement?',
    requesterName: 'Meera Joshi',
    requesterEmail: 'meera.joshi@example.com',
    categoryId: 'reports-tax',
    subcategoryId: 'tax-documents',
    priority: 'LOW',
    statusInternal: 'RESOLVED',
    statusCustomer: 'RESOLVED',
    assignedAgentId: ME,
    assignedAgentName: 'Demo Admin',
    createdAt: ago(74),
    firstResponseDueAt: ago(66),
    firstResponseAt: ago(70),
    resolutionDueAt: ahead(4),
    resolvedAt: ago(20),
    firstResponseState: 'MET',
    resolutionState: 'MET',
    hasComplaint: false,
    complaintRef: null,
    legalHold: false,
    attachmentCount: 0,
  },
  {
    id: 't-5',
    ticketRef: 'PG-2026-000124',
    subject: 'App will not send the OTP to my new number',
    requesterName: 'Sandeep Rao',
    requesterEmail: 'sandeep.rao@example.com',
    categoryId: 'platform',
    subcategoryId: 'login-password-otp',
    priority: 'NORMAL',
    statusInternal: 'TRIAGED',
    statusCustomer: 'RECEIVED',
    assignedAgentId: null,
    assignedAgentName: null,
    createdAt: ago(4),
    firstResponseDueAt: ahead(4),
    firstResponseAt: null,
    resolutionDueAt: ahead(36),
    resolvedAt: null,
    firstResponseState: 'DUE',
    resolutionState: 'DUE',
    hasComplaint: false,
    complaintRef: null,
    legalHold: false,
    attachmentCount: 0,
  },
  {
    id: 't-6',
    ticketRef: 'PG-2026-000125',
    subject: 'Fractional share order was cancelled without warning',
    requesterName: 'Divya Kulkarni',
    requesterEmail: 'divya.k@example.com',
    categoryId: 'trading',
    subcategoryId: 'order-cancellation',
    priority: 'NORMAL',
    statusInternal: 'WAITING_ON_BROKER',
    statusCustomer: 'IN_PROGRESS',
    assignedAgentId: PRIYA,
    assignedAgentName: 'Priya Nair',
    createdAt: ago(46),
    firstResponseDueAt: ago(38),
    firstResponseAt: ago(36),
    resolutionDueAt: ahead(2),
    resolvedAt: null,
    firstResponseState: 'LATE',
    resolutionState: 'DUE',
    hasComplaint: false,
    complaintRef: null,
    legalHold: true,
    attachmentCount: 1,
  },
  /*
   * Two closed tickets, so the Closed tab and the dashboard's status table have
   * something behind them. They exist because making the status rows clickable
   * exposed the gap: byStatus said twelve were closed and the queue held none,
   * so the count was a number you could click into nothing.
   */
  {
    id: 't-7',
    ticketRef: 'PG-2026-000112',
    subject: 'How do I download my trade confirmations?',
    requesterName: 'Nikhil Verma',
    requesterEmail: 'nikhil.verma@example.com',
    categoryId: 'reports-tax',
    subcategoryId: 'statement-trade-confirmation',
    priority: 'LOW',
    statusInternal: 'CLOSED',
    statusCustomer: 'CLOSED',
    assignedAgentId: ME,
    assignedAgentName: 'Demo Admin',
    createdAt: ago(24 * 9),
    firstResponseDueAt: ago(24 * 9 - 8),
    firstResponseAt: ago(24 * 9 - 3),
    resolutionDueAt: ago(24 * 8),
    resolvedAt: ago(24 * 8 - 4),
    firstResponseState: 'MET',
    resolutionState: 'MET',
    hasComplaint: false,
    complaintRef: null,
    legalHold: false,
    attachmentCount: 0,
  },
  {
    id: 't-8',
    ticketRef: 'PG-2026-000109',
    subject: 'Duplicate charge on my funding transfer',
    requesterName: 'Farah Sheikh',
    requesterEmail: 'farah.sheikh@example.com',
    categoryId: 'funding',
    subcategoryId: 'add-funds-lrs',
    priority: 'NORMAL',
    statusInternal: 'CLOSED',
    statusCustomer: 'CLOSED',
    assignedAgentId: PRIYA,
    assignedAgentName: 'Priya Nair',
    createdAt: ago(24 * 14),
    firstResponseDueAt: ago(24 * 14 - 8),
    firstResponseAt: ago(24 * 14 - 9),
    resolutionDueAt: ago(24 * 12),
    resolvedAt: ago(24 * 12 - 6),
    firstResponseState: 'LATE',
    resolutionState: 'MET',
    hasComplaint: false,
    complaintRef: null,
    legalHold: false,
    attachmentCount: 1,
  },
  /*
   * Six more open tickets, so the queue is lopsided rather than one-per-bucket.
   * Six equal bars say nothing about a backlog; "most of it is waiting on the
   * broker" is the thing the partition exists to show, and a fixture set that
   * cannot express it cannot be used to judge the screen.
   *
   * They are generated rather than written out because nothing distinguishes
   * them but the reference — inventing six more plausible support stories would
   * be six more things to read and no more information.
   */
  /*
   * Six more open tickets, so the queue is lopsided rather than one per bucket.
   * Six equal bars say nothing about a backlog; "most of it is waiting on the
   * broker" is what the partition exists to show, and a fixture set that cannot
   * express that cannot be used to judge the screen.
   *
   * Written out rather than generated, and that is deliberate. A helper called
   * from module scope — `Array.from(…)`, or an IIFE — is a call esbuild keeps
   * for its possible side effects even after the array it feeds is dropped, so
   * every filler name ended up in the production bundle. Both were tried and
   * both leaked. A plain array literal is pure data and tree-shakes with the
   * rest of the fixtures. Verbose beats leaky.
   */
  {
    id: 't-b0',
    ticketRef: 'PG-2026-000130',
    subject: 'Broker has not confirmed my transfer',
    requesterName: 'Kabir Menon',
    requesterEmail: 'kabir.menon@example.com',
    categoryId: 'account',
    subcategoryId: 'statements',
    priority: 'NORMAL',
    statusInternal: 'WAITING_ON_BROKER',
    statusCustomer: 'IN_PROGRESS',
    assignedAgentId: null,
    assignedAgentName: null,
    createdAt: ago(12),
    firstResponseDueAt: ahead(4),
    firstResponseAt: ago(6),
    resolutionDueAt: ahead(30),
    resolvedAt: null,
    firstResponseState: 'MET',
    resolutionState: 'DUE',
    hasComplaint: false,
    complaintRef: null,
    legalHold: false,
    attachmentCount: 0,
  },
  {
    id: 't-b1',
    ticketRef: 'PG-2026-000131',
    subject: 'Dividend credited at the wrong rate',
    requesterName: 'Isha Rao',
    requesterEmail: 'isha.rao@example.com',
    categoryId: 'account',
    subcategoryId: 'statements',
    priority: 'NORMAL',
    statusInternal: 'WAITING_ON_BROKER',
    statusCustomer: 'IN_PROGRESS',
    assignedAgentId: null,
    assignedAgentName: null,
    createdAt: ago(15),
    firstResponseDueAt: ahead(5),
    firstResponseAt: ago(7),
    resolutionDueAt: ahead(31),
    resolvedAt: null,
    firstResponseState: 'MET',
    resolutionState: 'DUE',
    hasComplaint: false,
    complaintRef: null,
    legalHold: false,
    attachmentCount: 0,
  },
  {
    id: 't-b2',
    ticketRef: 'PG-2026-000132',
    subject: 'Corporate action not reflected in holdings',
    requesterName: 'Neel Verma',
    requesterEmail: 'neel.verma@example.com',
    categoryId: 'account',
    subcategoryId: 'statements',
    priority: 'NORMAL',
    statusInternal: 'WAITING_ON_BROKER',
    statusCustomer: 'IN_PROGRESS',
    assignedAgentId: null,
    assignedAgentName: null,
    createdAt: ago(18),
    firstResponseDueAt: ahead(6),
    firstResponseAt: ago(8),
    resolutionDueAt: ahead(32),
    resolvedAt: null,
    firstResponseState: 'MET',
    resolutionState: 'DUE',
    hasComplaint: false,
    complaintRef: null,
    legalHold: false,
    attachmentCount: 0,
  },
  {
    id: 't-b3',
    ticketRef: 'PG-2026-000133',
    subject: 'Transfer stuck with the receiving broker',
    requesterName: 'Tara Joshi',
    requesterEmail: 'tara.joshi@example.com',
    categoryId: 'account',
    subcategoryId: 'statements',
    priority: 'NORMAL',
    statusInternal: 'WAITING_ON_BROKER',
    statusCustomer: 'IN_PROGRESS',
    assignedAgentId: null,
    assignedAgentName: null,
    createdAt: ago(21),
    firstResponseDueAt: ahead(7),
    firstResponseAt: ago(9),
    resolutionDueAt: ahead(33),
    resolvedAt: null,
    firstResponseState: 'MET',
    resolutionState: 'DUE',
    hasComplaint: false,
    complaintRef: null,
    legalHold: false,
    attachmentCount: 0,
  },
  {
    id: 't-b4',
    ticketRef: 'PG-2026-000134',
    subject: 'Statement does not match my trades',
    requesterName: 'Omar Sheikh',
    requesterEmail: 'omar.sheikh@example.com',
    categoryId: 'account',
    subcategoryId: 'statements',
    priority: 'NORMAL',
    statusInternal: 'NEW',
    statusCustomer: 'RECEIVED',
    assignedAgentId: null,
    assignedAgentName: null,
    createdAt: ago(24),
    firstResponseDueAt: ahead(8),
    firstResponseAt: null,
    resolutionDueAt: ahead(34),
    resolvedAt: null,
    firstResponseState: 'DUE',
    resolutionState: 'DUE',
    hasComplaint: false,
    complaintRef: null,
    legalHold: false,
    attachmentCount: 0,
  },
  {
    id: 't-b5',
    ticketRef: 'PG-2026-000135',
    subject: 'Cannot download my annual tax statement',
    requesterName: 'Riya Das',
    requesterEmail: 'riya.das@example.com',
    categoryId: 'account',
    subcategoryId: 'statements',
    priority: 'NORMAL',
    statusInternal: 'NEW',
    statusCustomer: 'RECEIVED',
    assignedAgentId: null,
    assignedAgentName: null,
    createdAt: ago(27),
    firstResponseDueAt: ahead(9),
    firstResponseAt: null,
    resolutionDueAt: ahead(35),
    resolvedAt: null,
    firstResponseState: 'DUE',
    resolutionState: 'DUE',
    hasComplaint: false,
    complaintRef: null,
    legalHold: false,
    attachmentCount: 0,
  },
]

const TICKET_DETAILS: Record<string, TicketDetail> = {
  't-1': {
    ticket: {
      ...TICKETS[0],
      description:
        'I requested a withdrawal of USD 4,200 on the 8th and the app still shows it as processing. My bank has no record of an incoming transfer. I have attached the confirmation screen and my bank statement for the period.',
      requesterMobile: '+91 98200 41122',
      categoryLabel: 'Withdrawals',
      subcategoryLabel: 'Withdrawal not received',
      source: 'chatbot',
      captchaVerified: true,
      closedAt: null,
      legalHoldReason: null,
      retentionExpiresAt: ahead(24 * 365 * 5),
      attachmentRetentionExpiresAt: ahead(24 * 365 * 5),
    },
    messages: [
      {
        id: 'm-1',
        authorKind: 'STAFF',
        authorName: 'Demo Admin',
        body: 'Thanks for the detail, Rohit — I can see the instruction on our side and it has left us. I am raising it with our broker partner and will come back to you by tomorrow.',
        isInternal: false,
        createdAt: ago(52),
      },
      {
        id: 'm-2',
        authorKind: 'STAFF',
        authorName: 'Demo Admin',
        body: 'ViewTrade reference VT-88213 opened. They are asking for the intermediary bank details before they will trace it.',
        isInternal: true,
        createdAt: ago(51),
      },
      {
        id: 'm-3',
        authorKind: 'CUSTOMER',
        authorName: 'Rohit Sharma',
        body: 'It has now been nine days. This is money I need for a payment this week. I would like this treated as a formal complaint.',
        isInternal: false,
        createdAt: ago(8),
      },
    ],
    attachments: [
      {
        id: 'a-1',
        filename: 'withdrawal-confirmation.png',
        declaredMime: 'image/png',
        verifiedMime: 'image/png',
        bytes: 284_120,
        state: 'VERIFIED',
        rejection: null,
        uploadedAt: ago(58),
      },
      {
        id: 'a-2',
        filename: 'bank-statement-march.pdf',
        declaredMime: 'application/pdf',
        verifiedMime: 'application/pdf',
        bytes: 1_204_880,
        state: 'VERIFIED',
        rejection: null,
        uploadedAt: ago(58),
      },
    ],
    history: [
      {
        id: 'h-1',
        fromInternal: null,
        toInternal: 'NEW',
        fromCustomer: null,
        toCustomer: 'RECEIVED',
        actorLabel: 'api:service_role',
        note: null,
        changedAt: ago(58),
      },
      {
        id: 'h-2',
        fromInternal: 'NEW',
        toInternal: 'TRIAGED',
        fromCustomer: 'RECEIVED',
        toCustomer: 'RECEIVED',
        actorLabel: 'demo@platizio.test',
        note: null,
        changedAt: ago(55),
      },
      {
        id: 'h-3',
        fromInternal: 'TRIAGED',
        toInternal: 'IN_PROGRESS',
        fromCustomer: 'RECEIVED',
        toCustomer: 'IN_PROGRESS',
        actorLabel: 'demo@platizio.test',
        note: 'Raised with ViewTrade, awaiting trace.',
        changedAt: ago(52),
      },
    ],
    consent: {
      purpose: 'SUPPORT_REQUEST',
      consentText:
        'I agree that Platizio Global may use the details above to respond to this request, as described in the Privacy Policy.',
      policyVersion: '2026-08-13',
      grantedAt: ago(58),
      withdrawnAt: null,
    },
    complaint: {
      id: 'c-1',
      complaintRef: 'PG-GRV-2026-000004',
      stage: 'UNDER_REVIEW',
      acknowledgementDueAt: ahead(2),
      acknowledgedAt: ago(7),
      resolutionDueAt: ahead(96),
      resolvedAt: null,
      closedAt: null,
      closureSummary: null,
      closedByName: null,
      acknowledgementState: 'MET',
      resolutionState: 'DUE',
    },
    notifications: [
      {
        template: 'ticket_acknowledgement',
        toEmail: 'rohit.sharma@example.com',
        subject: '[PG-2026-000118] We have your support request',
        status: 'SENT',
        attempts: 1,
        lastError: null,
        sentAt: ago(58),
        createdAt: ago(58),
      },
      {
        template: 'ticket_reply',
        toEmail: 'rohit.sharma@example.com',
        subject: 'Re: [PG-2026-000118] My withdrawal has not arrived',
        status: 'SENT',
        attempts: 1,
        lastError: null,
        sentAt: ago(52),
        createdAt: ago(52),
      },
      {
        template: 'complaint_acknowledgement',
        toEmail: 'rohit.sharma@example.com',
        subject: '[PG-GRV-2026-000004] We have registered your grievance',
        status: 'FAILED',
        attempts: 5,
        lastError: 'Resend: 422 domain platizio.com is not verified',
        sentAt: null,
        createdAt: ago(7),
      },
    ],
  },
}

/** Everything not hand-written above gets a reasonable detail built from its row. */
function detailFor(id: string): TicketDetail {
  const canned = TICKET_DETAILS[id]
  if (canned) return canned

  const row = TICKETS.find((t) => t.id === id) ?? TICKETS[0]
  return {
    ticket: {
      ...row,
      description:
        'This is demo data. The real description arrives from tickets.description, written by the customer through the guided assistant at /help.',
      requesterMobile: '+91 98000 00000',
      categoryLabel: null,
      subcategoryLabel: null,
      source: 'web',
      captchaVerified: false,
      closedAt: null,
      legalHoldReason: row.legalHold ? 'Retained pending a regulator query.' : null,
      retentionExpiresAt: ahead(24 * 365 * 5),
      attachmentRetentionExpiresAt: ahead(24 * 365 * 5),
    },
    messages:
      row.firstResponseAt === null
        ? []
        : [
            {
              id: `${id}-m1`,
              authorKind: 'STAFF',
              authorName: row.assignedAgentName ?? 'Demo Admin',
              body: 'Thanks for getting in touch — I am looking into this now and will come back to you shortly.',
              isInternal: false,
              createdAt: row.firstResponseAt,
            },
          ],
    attachments:
      row.attachmentCount > 0
        ? [
            {
              id: `${id}-a1`,
              filename: 'screenshot.png',
              declaredMime: 'image/png',
              verifiedMime: 'image/png',
              bytes: 190_000,
              state: 'VERIFIED',
              rejection: null,
              uploadedAt: row.createdAt,
            },
          ]
        : [],
    history: [
      {
        id: `${id}-h1`,
        fromInternal: null,
        toInternal: 'NEW',
        fromCustomer: null,
        toCustomer: 'RECEIVED',
        actorLabel: 'api:service_role',
        note: null,
        changedAt: row.createdAt,
      },
    ],
    consent: {
      purpose: 'SUPPORT_REQUEST',
      consentText:
        'I agree that Platizio Global may use the details above to respond to this request, as described in the Privacy Policy.',
      policyVersion: '2026-08-13',
      grantedAt: row.createdAt,
      withdrawnAt: null,
    },
    complaint: null,
    notifications: [
      {
        template: 'ticket_acknowledgement',
        toEmail: row.requesterEmail,
        subject: `[${row.ticketRef}] We have your support request`,
        status: 'SENT',
        attempts: 1,
        lastError: null,
        sentAt: row.createdAt,
        createdAt: row.createdAt,
      },
    ],
  }
}

/* ── Enquiries ───────────────────────────────────────────────────────────── */

const ENQUIRIES: EnquiryRow[] = [
  {
    id: 'e-1',
    enquiryRef: 'PG-ENQ-2026-000031',
    fullName: 'Vikram Desai',
    email: 'vikram.desai@example.com',
    phone: '+91 99870 11234',
    interestId: 'us-stocks',
    interestLabel: 'US stocks and ETFs',
    status: 'NEW',
    assignedToId: null,
    assignedToName: null,
    source: 'web',
    createdAt: ago(29),
    firstContactedAt: null,
    closedAt: null,
    followUpTargetAt: ago(5),
    followUpOverdue: true,
    noteCount: 0,
  },
  {
    id: 'e-2',
    enquiryRef: 'PG-ENQ-2026-000032',
    fullName: 'Sneha Pillai',
    email: 'sneha.pillai@example.com',
    phone: '+91 98450 66789',
    interestId: 'us-stocks',
    interestLabel: 'US stocks and ETFs',
    status: 'CONTACTED',
    assignedToId: ME,
    assignedToName: 'Demo Admin',
    source: 'web',
    createdAt: ago(50),
    firstContactedAt: ago(44),
    closedAt: null,
    followUpTargetAt: ahead(18),
    followUpOverdue: false,
    noteCount: 2,
  },
  {
    id: 'e-3',
    enquiryRef: 'PG-ENQ-2026-000033',
    fullName: 'Arjun Bhatt',
    email: 'arjun.bhatt@example.com',
    phone: '+91 90040 55512',
    interestId: null,
    interestLabel: null,
    status: 'QUALIFIED',
    assignedToId: PRIYA,
    assignedToName: 'Priya Nair',
    source: 'referral',
    createdAt: ago(120),
    firstContactedAt: ago(110),
    closedAt: null,
    followUpTargetAt: ahead(6),
    followUpOverdue: false,
    noteCount: 4,
  },
]

function enquiryDetailFor(id: string): EnquiryDetail {
  const row = ENQUIRIES.find((e) => e.id === id) ?? ENQUIRIES[0]
  return {
    enquiry: {
      ...row,
      message:
        'I already invest in Indian equities and want to add US exposure. How long does account opening take, and what does the LRS side involve?',
      outcomeNote: null,
      captchaVerified: true,
      legalHold: false,
      legalHoldReason: null,
      retentionExpiresAt: ahead(24 * 365 * 3),
    },
    notes:
      row.noteCount === 0
        ? []
        : [
            {
              id: `${id}-n1`,
              authorName: 'Demo Admin',
              authorLabel: 'demo@platizio.test',
              body: 'Called, no answer. Left a voicemail and sent the account opening guide by email.',
              createdAt: ago(44),
            },
            {
              id: `${id}-n2`,
              authorName: 'Demo Admin',
              authorLabel: 'demo@platizio.test',
              body: 'Spoke to them. Wants to start with about USD 5,000. Walked through the W-8BEN and the TCS position. Sending the onboarding link.',
              createdAt: ago(20),
            },
          ],
    consent: {
      purpose: 'CONTACT_ENQUIRY',
      consentText:
        'I agree that Platizio Global may use the details above to contact me about its services.',
      policyVersion: '2026-08-14',
      grantedAt: row.createdAt,
      withdrawnAt: null,
    },
    notifications: [
      {
        template: 'enquiry_acknowledgement',
        toEmail: row.email,
        subject: `[${row.enquiryRef}] Thanks for getting in touch`,
        status: 'SENT',
        attempts: 1,
        lastError: null,
        sentAt: row.createdAt,
        createdAt: row.createdAt,
      },
    ],
  }
}

/* ── Everything else ─────────────────────────────────────────────────────── */


const OUTBOX: OutboxRow[] = [
  {
    id: 'n-1',
    template: 'complaint_acknowledgement',
    toEmail: 'rohit.sharma@example.com',
    subject: '[PG-GRV-2026-000004] We have registered your grievance',
    status: 'FAILED',
    attempts: 5,
    maxAttempts: 5,
    nextAttemptAt: ago(1),
    lastError: 'Resend: 422 domain platizio.com is not verified',
    provider: 'resend',
    sentAt: null,
    createdAt: ago(7),
    ticketId: 't-1',
    ticketRef: 'PG-2026-000118',
    enquiryId: null,
    enquiryRef: null,
  },
  {
    id: 'n-2',
    template: 'ticket_acknowledgement',
    toEmail: 'ananya.iyer@example.com',
    subject: '[PG-2026-000121] We have your support request',
    status: 'PENDING',
    attempts: 0,
    maxAttempts: 5,
    nextAttemptAt: ago(9),
    lastError: null,
    provider: null,
    sentAt: null,
    createdAt: ago(9),
    ticketId: 't-2',
    ticketRef: 'PG-2026-000121',
    enquiryId: null,
    enquiryRef: null,
  },
  {
    id: 'n-3',
    template: 'enquiry_acknowledgement',
    toEmail: 'vikram.desai@example.com',
    subject: '[PG-ENQ-2026-000031] Thanks for getting in touch',
    status: 'PENDING',
    attempts: 0,
    maxAttempts: 5,
    nextAttemptAt: ago(29),
    lastError: null,
    provider: null,
    sentAt: null,
    createdAt: ago(29),
    ticketId: null,
    ticketRef: null,
    enquiryId: 'e-1',
    enquiryRef: 'PG-ENQ-2026-000031',
  },
]


const CALENDAR: HolidayCalendar = {
  year: new Date().getFullYear(),
  holidays: [
    { date: `${new Date().getFullYear()}-01-26`, label: 'Republic Day', weekday: 'Mon' },
    { date: `${new Date().getFullYear()}-03-14`, label: 'Holi', weekday: 'Fri' },
    { date: `${new Date().getFullYear()}-08-15`, label: 'Independence Day', weekday: 'Fri' },
    { date: `${new Date().getFullYear()}-10-02`, label: 'Gandhi Jayanti', weekday: 'Thu' },
  ],
  businessHours: [
    { weekday: 1, opensAt: '09:00:00', closesAt: '17:00:00', isWorking: true },
    { weekday: 2, opensAt: '09:00:00', closesAt: '17:00:00', isWorking: true },
    { weekday: 3, opensAt: '09:00:00', closesAt: '17:00:00', isWorking: true },
    { weekday: 4, opensAt: '09:00:00', closesAt: '17:00:00', isWorking: true },
    { weekday: 5, opensAt: '09:00:00', closesAt: '17:00:00', isWorking: true },
    { weekday: 6, opensAt: '09:00:00', closesAt: '17:00:00', isWorking: false },
    { weekday: 7, opensAt: '09:00:00', closesAt: '17:00:00', isWorking: false },
  ],
  coverage: null,
}

/**
 * Counted from the fixtures rather than written beside them.
 *
 * These used to be maintained by hand and drifted twice. `byStatus` said twelve
 * tickets were closed while the queue held none, which only surfaced when the
 * counts became clickable and one clicked into nothing. And the breach counts
 * feed summarise(), whose sentence the dashboard leans on as its one positive
 * all-clear — so a stale literal made the screen read "two tickets are past a
 * deadline" directly above a panel saying "nothing needs attention". Deriving
 * them makes the dashboard and the queues incapable of disagreeing, and gives
 * the disjointness check one source: the six open buckets must sum to `open`.
 *
 * A FUNCTION, not a top-level const, and that is load-bearing. Rollup cannot
 * prove `.filter()` and `.reduce()` are side-effect-free, so evaluating them at
 * module scope pins TICKETS, ENQUIRIES and OUTBOX into the production bundle —
 * measured, not guessed: it added every fixture name to dist/. Inside a
 * function they are reachable only from demoRpc, which the dead `if (DEMO)`
 * branch already drops.
 */
function dashboardFixture(): Dashboard {
  const byStatus = TICKETS.reduce<Partial<Record<TicketRow['statusInternal'], number>>>(
    (acc, t) => ({ ...acc, [t.statusInternal]: (acc[t.statusInternal] ?? 0) + 1 }),
    {},
  )

  return {
    open: TICKETS.filter((t) => t.statusInternal !== 'CLOSED' && t.statusInternal !== 'SPAM')
      .length,
    unassigned: TICKETS.filter((t) => t.assignedAgentId === null).length,
    mine: TICKETS.filter((t) => t.assignedAgentId === ME).length,
    awaitingFirstResponse: TICKETS.filter((t) => t.firstResponseAt === null).length,
    firstResponseBreached: TICKETS.filter((t) => t.firstResponseState === 'BREACHED').length,
    resolutionBreached: TICKETS.filter((t) => t.resolutionState === 'BREACHED').length,
    byStatus,
    openComplaints: 2,
    complaintsBreached: 1,
    outboxPending: OUTBOX.filter((n) => n.status === 'PENDING').length,
    outboxFailed: OUTBOX.filter((n) => n.status === 'FAILED').length,
    newEnquiries: ENQUIRIES.filter((e) => e.status === 'NEW').length,
    openEnquiries: ENQUIRIES.filter((e) => ['NEW', 'CONTACTED', 'QUALIFIED'].includes(e.status))
      .length,
    unassignedEnquiries: ENQUIRIES.filter((e) => e.assignedToId === null).length,
    myEnquiries: ENQUIRIES.filter((e) => e.assignedToId === ME).length,
    enquiriesOverdueFollowUp: ENQUIRIES.filter((e) => e.followUpOverdue).length,
    generatedAt: new Date().toISOString(),
  }
}

/* ── Dispatcher ──────────────────────────────────────────────────────────── */

/** Paging envelope, so the demo screens exercise the same shape as the real ones. */
function page<T>(rows: T[], args: Record<string, unknown>) {
  const payload = (args.payload ?? {}) as { limit?: number; offset?: number }
  const limit = payload.limit ?? 25
  const offset = payload.offset ?? 0
  return { rows: rows.slice(offset, offset + limit), total: rows.length, limit, offset }
}

/**
 * A little latency, so loading states are visible rather than theoretical.
 * Without it every skeleton in the console is dead code you never see.
 */
const settle = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => window.setTimeout(() => resolve(value), 180))

export function demoRpc(fn: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const payload = (args.payload ?? {}) as Record<string, unknown>

  switch (fn) {
    case 'staff_whoami':
      return settle(DEMO_ME)
    case 'staff_dashboard':
      return settle(dashboardFixture())

    case 'staff_ticket_queue': {
      const statuses = (payload.status as string[]) ?? []
      const assignee = payload.assignee as string | undefined
      const q = ((payload.q as string) ?? '').toLowerCase()

      let rows = TICKETS.filter((t) => statuses.length === 0 || statuses.includes(t.statusInternal))
      if (assignee === 'me') rows = rows.filter((t) => t.assignedAgentId === ME)
      if (assignee === 'unassigned') rows = rows.filter((t) => t.assignedAgentId === null)
      if (payload.slaOnly) {
        rows = rows.filter(
          (t) => t.firstResponseState === 'BREACHED' || t.resolutionState === 'BREACHED',
        )
      }
      if (payload.categoryId) rows = rows.filter((t) => t.categoryId === payload.categoryId)
      if (q) {
        rows = rows.filter((t) =>
          [t.ticketRef, t.subject, t.requesterName, t.requesterEmail]
            .join(' ')
            .toLowerCase()
            .includes(q),
        )
      }
      return settle(page(rows, args))
    }

    case 'staff_ticket_detail':
      return settle(detailFor(String(args.p_ticket_id)))

    case 'staff_enquiry_queue': {
      const statuses = (payload.status as string[]) ?? []
      const assignee = payload.assignee as string | undefined
      let rows = ENQUIRIES.filter((e) => statuses.length === 0 || statuses.includes(e.status))
      if (assignee === 'me') rows = rows.filter((e) => e.assignedToId === ME)
      if (assignee === 'unassigned') rows = rows.filter((e) => e.assignedToId === null)
      if (payload.overdueOnly) rows = rows.filter((e) => e.followUpOverdue)
      return settle(page(rows, args))
    }

    case 'staff_enquiry_detail':
      return settle(enquiryDetailFor(String(args.p_enquiry_id)))

    case 'staff_outbox': {
      const statuses = (payload.status as string[]) ?? []
      const rows = OUTBOX.filter((n) => statuses.length === 0 || statuses.includes(n.status))
      return settle(page(rows, args))
    }

    case 'staff_holiday_calendar':
      return settle(CALENDAR)

    // Writes are refused rather than faked. A demo that cheerfully "sends" a
    // reply teaches the wrong thing about a console whose whole job is to send
    // real replies to real customers.
    default:
      return Promise.reject(
        new Error(
          'Demo mode is read-only — this action needs a real database. Point the console at your Supabase project to use it.',
        ),
      )
  }
}

export function demoOpenAttachment(): Promise<AttachmentOpen> {
  return Promise.reject(
    new Error('Demo mode is read-only. Opening a real attachment writes an access-log row first.'),
  )
}

