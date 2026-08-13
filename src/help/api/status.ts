// Transport for the customer status page.
//
// Two calls, both anonymous: ask for a link by email, and exchange the token
// from that link for the tickets it covers. There is no session — the token in
// the URL is the whole credential, it came by email, and it dies in 30 minutes.
//
// Note what is deliberately absent: any way to look a ticket up by its
// reference. References are sequential, so that endpoint would let anyone read
// every customer's request by counting upwards.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '') ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const isStatusLookupAvailable = (): boolean =>
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

const NETWORK_FAILURE = 'Network error. Please check your connection and try again.'
const GENERIC_FAILURE = 'Something went wrong. Please try again.'

export interface StatusAttachment {
  filename: string
  received: boolean
}

export interface StatusTicket {
  ticketRef: string
  subject: string
  categoryLabel: string
  subcategoryLabel: string
  status: string
  raisedAt: string
  updatedAt: string
  attachments: StatusAttachment[]
}

export type RequestLinkResult =
  | { status: 'sent'; message: string }
  | { status: 'error'; message: string }

export type LookupResult =
  | { status: 'ok'; email: string; tickets: StatusTicket[] }
  /** The link is dead — expired, or never valid. Same outcome either way. */
  | { status: 'expired' }
  | { status: 'error'; message: string }

async function post<T>(name: string, body: unknown, extra?: HeadersInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        ...(extra ?? {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const payload = await res.json().catch(() => ({})) as { error?: string }
    if (!res.ok) throw new StatusFailure(payload.error || GENERIC_FAILURE)
    return payload as T
  } finally {
    clearTimeout(timer)
  }
}

/** Carries a message already safe to show a customer. */
class StatusFailure extends Error {}

export async function requestStatusLink(
  email: string,
  turnstileToken?: string | null,
): Promise<RequestLinkResult> {
  if (!isStatusLookupAvailable()) {
    return { status: 'error', message: 'Request tracking is not available yet.' }
  }
  try {
    const data = await post<{ ok: boolean; message: string }>(
      'request-status-link',
      { email },
      turnstileToken ? { 'x-turnstile-token': turnstileToken } : undefined,
    )
    return { status: 'sent', message: data.message }
  } catch (error) {
    if (error instanceof StatusFailure) return { status: 'error', message: error.message }
    return { status: 'error', message: NETWORK_FAILURE }
  }
}

export async function lookupStatus(token: string): Promise<LookupResult> {
  if (!isStatusLookupAvailable()) {
    return { status: 'error', message: 'Request tracking is not available yet.' }
  }
  try {
    const data = await post<{ valid: boolean; email?: string; tickets?: StatusTicket[] }>(
      'lookup-status',
      { token },
    )
    if (!data.valid) return { status: 'expired' }
    return { status: 'ok', email: data.email ?? '', tickets: data.tickets ?? [] }
  } catch (error) {
    if (error instanceof StatusFailure) return { status: 'error', message: error.message }
    return { status: 'error', message: NETWORK_FAILURE }
  }
}

// --- Presentation --------------------------------------------------------
//
// The wire carries the enum; the words live here. Support can reword any of
// these without a migration, which is the same reason the taxonomy separates
// ids from labels.

export const STATUS_COPY: Record<string, { label: string; detail: string; tone: string }> = {
  RECEIVED: {
    label: 'Received',
    detail: 'We have your request and it is with our support team.',
    tone: 'neutral',
  },
  IN_PROGRESS: {
    label: 'In progress',
    detail: 'Someone is working on this now.',
    tone: 'active',
  },
  WAITING_ON_YOU: {
    label: 'Waiting on you',
    detail: 'We have replied and need something back before we can carry on. Check your email.',
    tone: 'waiting',
  },
  RESOLVED: {
    label: 'Resolved',
    detail: 'We believe this is sorted. If it is not, reply to our email and we will reopen it.',
    tone: 'done',
  },
  CLOSED: {
    label: 'Closed',
    detail: 'This request is closed.',
    tone: 'done',
  },
}

export const statusCopy = (status: string) =>
  STATUS_COPY[status] ?? { label: status, detail: '', tone: 'neutral' }

/**
 * Business hours are IST and the acknowledgement email quotes IST, so the page
 * does too. Showing a customer in Dubai their ticket time in Gulf time would
 * silently disagree with the email sitting in their inbox.
 */
export function formatIst(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date) + ' IST'
}
