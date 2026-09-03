import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { PageHead } from '../components/AppShell'
import { Chip } from '../components/Chip'
import { formatDateTime } from '../components/RelativeTime'
import { buildAttention } from '../lib/attention'
import { buildPartition } from '../lib/partition'
import { dashboard, enquiryQueue, outbox, ticketQueue } from '../lib/rpc'
import { greeting, summarise } from '../lib/summary'
import { useAsync } from '../lib/useAsync'

/**
 * The morning screen: one partition and one list.
 *
 * The partition counts — six buckets, every open ticket in exactly one, so no
 * bucket can restate another under a different name. The list names — every
 * urgent thing as a row saying which ticket, which enquiry, which email, rather
 * than as a count that overlapped three other counts.
 *
 * There is no arithmetic between them. One counts, the other names.
 *
 * All the shaping lives in lib/partition.ts and lib/attention.ts, and it lives
 * there because the bugs this screen was rebuilt to fix were arithmetic bugs,
 * and arithmetic inside JSX cannot be tested.
 */

const POLL_MS = 60_000
const CAP = 5

export default function Dashboard() {
  const { data, error, initial, reload } = useAsync(dashboard, [], { pollMs: POLL_MS })
  const { me } = useAuth()

  // Three sources, all read-only and all `stable`, polled once a minute. The
  // filters are the ones each screen's own urgent tab already sends.
  const lateTickets = useAsync(() => ticketQueue({ slaOnly: true, sort: 'due', limit: CAP }), [], {
    pollMs: POLL_MS,
  })
  const lateEnquiries = useAsync(
    () => enquiryQueue({ overdueOnly: true, sort: 'target', limit: CAP }),
    [],
    { pollMs: POLL_MS },
  )
  const failedEmail = useAsync(() => outbox({ status: ['FAILED'], limit: CAP }), [], {
    pollMs: POLL_MS,
  })

  const firstName = (me?.fullName ?? '').trim().split(' ')[0]
  const hello = greeting(new Date())

  const buckets = buildPartition(data?.byStatus)
  const attention = buildAttention({
    tickets: lateTickets.data,
    enquiries: lateEnquiries.data,
    emails: failedEmail.data,
  })

  const sourceError = lateTickets.error ?? lateEnquiries.error ?? failedEmail.error

  return (
    <>
      <PageHead
        title={firstName ? `${hello}, ${firstName}` : hello}
        /* Both are needed: the sentence reports how many *tickets* are past a
           deadline, and only the slaOnly queue knows that. Adding the two
           breach counters double-counts any ticket that has blown both. */
        lede={data && lateTickets.data ? summarise(data, lateTickets.data.total) : 'Loading…'}
        actions={
          <button type="button" className="btn btn-sm" onClick={reload}>
            Refresh
          </button>
        }
      />

      {error && (
        <div className="banner banner-danger" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {initial && !data ? (
        /* Shaped like the panel it becomes. A loading state that does not
           resemble the loaded one makes the page jump when it arrives. */
        <div className="card" aria-busy="true">
          <div className="bars">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div className="bar-row" key={i}>
                <div className="skeleton" style={{ width: '60%' }} />
                <div className="skeleton" style={{ height: 6, marginTop: 8 }} />
              </div>
            ))}
          </div>
        </div>
      ) : data ? (
        <div className="dash-split">
          <section aria-labelledby="dash-status">
            <h2 id="dash-status" className="eyebrow">
              Open tickets by status
            </h2>
            <div className="card">
              <div className="bars">
                {buckets.map((bucket) => (
                  <Link
                    key={bucket.status}
                    className={`bar-row tone-${bucket.tone}${bucket.count === 0 ? ' is-zero' : ''}`}
                    to={bucket.to}
                  >
                    <span className="bar-top">
                      {bucket.label}
                      <span className="bar-count">{bucket.count.toLocaleString()}</span>
                    </span>
                    {/* Decoration: the count beside it is the accessible value,
                        and a screen reader reading out a percentage of a
                        partition it cannot see adds nothing. */}
                    <span className="bar-track" aria-hidden="true">
                      <span className="bar-fill" style={{ width: `${bucket.share}%` }} />
                    </span>
                  </Link>
                ))}
              </div>
              {/* No total. A total is the sum of the six rows above it — the
                  exact duplication this screen was rebuilt to remove. */}
              <div className="card-note">
                Closed and spam are not counted here. Counts as of{' '}
                {formatDateTime(data.generatedAt)}.
              </div>
            </div>
          </section>

          {/*
            The point of the whole screen. The bars say how many; this says
            which, so the first thing seen each morning is the work rather than
            a number to go and reconstruct. It takes the assistant's treatment
            from /help — navy bar, steady emerald dot, elevation — because it is
            the one panel the screen exists to serve.
          */}
          <section className="card is-primary-panel" aria-labelledby="dash-attention">
            <div className="panel-bar">
              <span className="panel-bar-dot" aria-hidden="true" />
              <h2 id="dash-attention" className="panel-bar-title">
                Needs attention
              </h2>
              <span className="panel-bar-actions">
                {attention.total > attention.shown
                  ? `${attention.shown} of ${attention.total}`
                  : attention.total > 0
                    ? `${attention.total} item${attention.total === 1 ? '' : 's'}`
                    : ''}
              </span>
            </div>

            {sourceError ? (
              <div className="empty">
                <h3>Could not load this</h3>
                <p>{sourceError}</p>
              </div>
            ) : attention.items.length === 0 ? (
              <div className="empty">
                <h3>Nothing needs attention</h3>
                <p>This is the panel you want to be empty.</p>
              </div>
            ) : (
              <ul className="attn-list">
                {attention.items.map((item) => (
                  <li className="attn-row" key={item.key}>
                    {/* The kind becomes a link only where its source was
                        truncated — a "see all" that leads to the same rows
                        already on screen is worse than no link at all. */}
                    {item.kindTo ? (
                      <Link
                        className="attn-kind"
                        to={item.kindTo}
                        title={`See everything under ${item.kind.toLowerCase()}`}
                      >
                        {item.kind}
                      </Link>
                    ) : (
                      <span className="attn-kind">{item.kind}</span>
                    )}
                    <span className="attn-body">
                      <Link to={item.to}>{item.title}</Link>
                      <span className="attn-meta" title={item.meta}>
                        {item.meta}
                      </span>
                    </span>
                    <Chip tone={item.tone} dot={item.tone === 'danger'}>
                      {item.note}
                    </Chip>
                  </li>
                ))}
              </ul>
            )}

            {/*
              Kept from the old Email section. A queue draining every minute is
              not news, but one that never drains looks exactly like a working
              one until somebody asks why a customer heard nothing.
            */}
            {data.outboxPending > 20 && (
              <div className="card-note">
                A lot of mail is sitting queued. If it never drains, the usual cause is the Vault
                secrets <code>project_url</code> and <code>service_role_key</code> being unset — the
                cron job logs that it is skipping and returns, so a valid Resend key still sends
                nothing.
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  )
}
