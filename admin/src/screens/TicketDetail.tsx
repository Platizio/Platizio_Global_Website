import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { PageHead } from '../components/AppShell'
import {
  Chip,
  NotificationChip,
  PriorityChip,
  SlaChip,
  SourceChip,
  StatusChip,
  TICKET_STATUSES,
  TICKET_STATUS_LABEL,
} from '../components/Chip'
import { ConfirmDialog, useConfirm } from '../components/ConfirmDialog'
import { EmptyState } from '../components/DataTable'
import { Time, formatBytes, formatDateTime } from '../components/RelativeTime'
import { useToast } from '../components/Toast'
import * as api from '../lib/rpc'
import { categoryLabel, subcategoryLabel } from '../lib/taxonomy'
import { useAsync } from '../lib/useAsync'
import type { TicketAttachment, TicketStatusInternal } from '../lib/types'

/**
 * One ticket, and everything you can do to it.
 *
 * A single staff_ticket_detail() call returns the ticket, its thread, its
 * attachments, its audit trail, its consent record, its grievance and every
 * email queued about it. Nothing on this screen fetches separately except the
 * agent list and the attachment access log, both of which are optional extras.
 *
 * Layout is thread-left, controls-right. The controls are on the right because
 * they are used once or twice per ticket while the thread is read continuously.
 */

/**
 * What the customer will see, previewed before the change is made.
 *
 * Mirrors public.derive_customer_status() in 0017. Duplicated knowingly and
 * only for the preview line in the confirm dialog — the value actually stored
 * is whatever the trigger computes, and what is displayed afterwards comes
 * back from the RPC. If the two ever disagree, the database is right.
 */
const CUSTOMER_VIEW: Record<TicketStatusInternal, string> = {
  NEW: 'Received',
  TRIAGED: 'Received',
  IN_PROGRESS: 'In progress',
  WAITING_ON_BROKER: 'In progress',
  WAITING_ON_CUSTOMER: 'Waiting on you',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  SPAM: 'unchanged — a spam move does not tell them anything',
}

export default function TicketDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { me, can } = useAuth()
  const { spec, confirm, close } = useConfirm()

  const detail = useAsync(() => api.ticketDetail(id), [id])

  const [reply, setReply] = useState('')
  const [internal, setInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [showAccessLog, setShowAccessLog] = useState(false)

  if (detail.error) {
    return (
      <>
        <PageHead title="Ticket" />
        <div className="card">
          <EmptyState title="Could not open that ticket">{detail.error}</EmptyState>
        </div>
      </>
    )
  }

  if (!detail.data) {
    return (
      <>
        <PageHead title="Ticket" />
        <div className="card card-body stack" aria-busy="true">
          <div className="skeleton" style={{ width: '40%' }} />
          <div className="skeleton" style={{ width: '80%' }} />
          <div className="skeleton" style={{ width: '65%' }} />
        </div>
      </>
    )
  }

  // `complaint` is intentionally not destructured. staff_ticket_detail() still
  // returns it, but the console surfaces no grievance workflow: the site has no
  // grievance page, and they are handled outside this system.
  const { ticket, messages, attachments, history, consent, notifications } = detail.data

  const act = async (work: () => Promise<unknown>, success: string) => {
    try {
      await work()
      toast.ok(success)
      detail.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That did not work.')
    }
  }

  const sendReply = async () => {
    const body = reply.trim()
    if (body.length === 0) return
    setSending(true)
    try {
      const result = await api.postReply(id, body, internal)
      setReply('')
      toast.ok(
        result.internal
          ? 'Internal note saved. Nothing was emailed.'
          : result.emailQueued
            ? `Reply sent to ${ticket.requesterEmail}.`
            : 'Reply saved, but no email was queued — check the Outbox.',
      )
      detail.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The reply did not send.')
    } finally {
      setSending(false)
    }
  }

  const changeStatus = (next: TicketStatusInternal) => {
    if (next === ticket.statusInternal) return

    const terminal = next === 'CLOSED'
    const spam = next === 'SPAM'

    confirm({
      title: `Move to ${TICKET_STATUS_LABEL(next)}?`,
      tone: terminal || spam ? 'danger' : 'primary',
      confirmLabel: `Set ${TICKET_STATUS_LABEL(next)}`,
      requireNote: terminal || spam,
      noteLabel: 'Reason for the audit trail',
      noteHint: 'Written to the append-only status history. It is not emailed to the customer.',
      body: (
        <div className="stack">
          <p>
            {ticket.ticketRef} moves from <strong>{TICKET_STATUS_LABEL(ticket.statusInternal)}</strong>{' '}
            to <strong>{TICKET_STATUS_LABEL(next)}</strong>.
          </p>
          <p className="small muted">The customer will see this as: {CUSTOMER_VIEW[next]}.</p>
          {next === 'RESOLVED' && (
            <p className="small">A resolution email is queued to {ticket.requesterEmail}.</p>
          )}
          {terminal && (
            <p className="small">
              Closing stamps the closure time and re-anchors retention to five years from now,
              rather than from when the ticket was raised.
            </p>
          )}
          {spam && (
            <p className="small">
              Spam leaves the customer-facing status where it is and drops the ticket out of the
              queue. It does not delete anything.
            </p>
          )}
        </div>
      ),
      onConfirm: (note) =>
        act(() => api.setTicketStatus(id, next, note || undefined), `${ticket.ticketRef} updated.`),
    })
  }

  const openAttachment = async (attachment: TicketAttachment) => {
    if (attachment.state !== 'VERIFIED') return
    try {
      const opened = await api.openAttachment(attachment.id)
      // The access was logged before this URL existed, and it dies in 60
      // seconds, so there is nothing useful to do but go straight there.
      const win = window.open(opened.url, '_blank', 'noopener,noreferrer')
      if (!win) {
        toast.error('Your browser blocked the download window. Allow pop-ups and try again.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open that file.')
    }
  }

  return (
    <>
      {/*
        Sticky, and carrying every action an agent performs. In the previous
        layout assignment and status sat below the fold under a stack of rail
        cards — the things you do most were the things you scrolled to find.
      */}
      <header className="thead">
        <div className="thead-crumb">
          <Link to="/tickets">Tickets</Link> / <span className="thead-ref">{ticket.ticketRef}</span>
        </div>
        <h1>{ticket.subject}</h1>

        <div className="thead-row">
          <StatusChip status={ticket.statusInternal} />
          <PriorityChip priority={ticket.priority} />
          <SourceChip source={ticket.source} />
          {ticket.legalHold && <Chip tone="warn">Legal hold</Chip>}

          <div className="thead-actions">
            {can('setStatus') && (
              <>
                <label className="visually-hidden" htmlFor="thead-status">
                  Status
                </label>
                <select
                  id="thead-status"
                  className="btn btn-sm"
                  value={ticket.statusInternal}
                  onChange={(event) => changeStatus(event.target.value as TicketStatusInternal)}
                >
                  {TICKET_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {TICKET_STATUS_LABEL(status)}
                    </option>
                  ))}
                </select>
              </>
            )}

            {can('setStatus') && ticket.statusInternal !== 'CLOSED' && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => changeStatus('CLOSED')}
              >
                Close
              </button>
            )}

            <button type="button" className="btn btn-sm" onClick={detail.reload}>
              Refresh
            </button>
          </div>
        </div>

        <div className="sla-strip">
          <div className="sla-box">
            <div className="sla-box-label">First reply</div>
            <div className="sla-box-value">
              <SlaChip state={ticket.firstResponseState} dueAt={ticket.firstResponseDueAt} />
            </div>
            <div className="sla-box-due">{formatDateTime(ticket.firstResponseDueAt)}</div>
          </div>

          <div className="sla-box">
            <div className="sla-box-label">Resolution</div>
            <div className="sla-box-value">
              <SlaChip state={ticket.resolutionState} dueAt={ticket.resolutionDueAt} />
            </div>
            <div className="sla-box-due">{formatDateTime(ticket.resolutionDueAt)}</div>
          </div>
        </div>
      </header>

      <div className="detail">
        <div className="detail-main">
          {/* ── The request as it arrived ─────────────────────────────── */}
          <section className="card">
            <div className="card-head">
              <h2>The request</h2>
              <span className="card-head-actions muted small">
                <Time iso={ticket.createdAt} />
              </span>
            </div>
            <div className="card-body">
              <p className="msg-body">{ticket.description}</p>
            </div>
          </section>

          {/* ── Attachments ───────────────────────────────────────────── */}
          {attachments.length > 0 && (
            <section className="card">
              <div className="card-head">
                <h2>Attachments</h2>
                {can('viewAccessLog') && (
                  <span className="card-head-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setShowAccessLog((prev) => !prev)}
                    >
                      {showAccessLog ? 'Hide access log' : 'Access log'}
                    </button>
                  </span>
                )}
              </div>

              <div className="table-wrap">
                <table className="data">
                  <caption className="visually-hidden">Files attached to this ticket</caption>
                  <thead>
                    <tr>
                      <th scope="col">File</th>
                      <th scope="col">Type</th>
                      <th scope="col">Size</th>
                      <th scope="col">State</th>
                      <th scope="col" />
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.map((attachment) => (
                      <tr key={attachment.id}>
                        <td className="strong">{attachment.filename}</td>
                        <td className="small">
                          {/*
                            declaredMime is what the browser claimed; verifiedMime
                            was read from the stored object's first 16 bytes by
                            finalize-ticket. Showing both makes a mismatch visible
                            rather than something buried in a column nobody reads.
                          */}
                          {attachment.verifiedMime ?? attachment.declaredMime ?? '—'}
                          {attachment.verifiedMime &&
                            attachment.declaredMime &&
                            attachment.verifiedMime !== attachment.declaredMime && (
                              <span className="cell-sub">
                                claimed {attachment.declaredMime}
                              </span>
                            )}
                        </td>
                        <td className="cell-num small">{formatBytes(attachment.bytes)}</td>
                        <td>
                          {attachment.state === 'VERIFIED' ? (
                            <Chip tone="ok">Verified</Chip>
                          ) : attachment.state === 'REJECTED' ? (
                            <Chip tone="danger" title={attachment.rejection ?? undefined}>
                              Rejected
                            </Chip>
                          ) : attachment.state === 'MISSING' ? (
                            <Chip tone="warn">Never uploaded</Chip>
                          ) : (
                            <Chip tone="muted">Pending</Chip>
                          )}
                        </td>
                        <td>
                          {attachment.state === 'VERIFIED' && can('openAttachments') && (
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => void openAttachment(attachment)}
                            >
                              Open
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card-note">
                Opening a file is recorded against your name before the link is created, and the
                link expires after 60 seconds. Only files whose bytes were verified can be opened.
              </div>

              {showAccessLog && <AccessLog ticketId={id} />}
            </section>
          )}


          {/* ── Thread ──────────────────────────────────────────────────
              The console's counterpart to the assistant panel on /help: the
              one surface the whole screen exists to serve. It takes that
              panel's treatment — navy bar, steady emerald dot, and the
              elevation that says which card is the point. */}
          <section className="card is-primary-panel">
            <div className="panel-bar">
              <span className="panel-bar-dot" aria-hidden="true" />
              <h2 className="panel-bar-title">Conversation</h2>
              <span className="panel-bar-actions">
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </span>
            </div>

            {messages.length === 0 ? (
              <EmptyState title="No replies yet">
                The customer has not been answered. The first reply stops the first-response clock.
              </EmptyState>
            ) : (
              <div className="thread">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`msg msg-${message.authorKind}${message.isInternal ? ' msg-internal' : ''}`}
                  >
                    <header className="msg-head">
                      <span className="msg-author">{message.authorName}</span>
                      {message.isInternal ? (
                        <Chip tone="warn">Internal note — not sent</Chip>
                      ) : message.authorKind === 'STAFF' ? (
                        <Chip tone="muted">Emailed to customer</Chip>
                      ) : message.authorKind === 'SYSTEM' ? (
                        <Chip tone="muted">System</Chip>
                      ) : (
                        <Chip tone="info">Customer</Chip>
                      )}
                      <span className="spacer" />
                      <Time iso={message.createdAt} relativeFirst />
                    </header>
                    <div className="msg-body">{message.body}</div>
                  </article>
                ))}
              </div>
            )}

            {can('reply') && (
              <div className="composer">
                <div className="composer-modes" role="group" aria-label="Reply type">
                  <button
                    type="button"
                    className={`composer-mode${!internal ? ' is-active' : ''}`}
                    onClick={() => setInternal(false)}
                    aria-pressed={!internal}
                  >
                    Reply to customer
                  </button>
                  <button
                    type="button"
                    className={`composer-mode${internal ? ' is-active is-internal' : ''}`}
                    onClick={() => setInternal(true)}
                    aria-pressed={internal}
                  >
                    Internal note
                  </button>
                </div>

                <label className="visually-hidden" htmlFor="composer-body">
                  {internal ? 'Internal note' : 'Reply to the customer'}
                </label>
                <textarea
                  id="composer-body"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder={
                    internal
                      ? 'Only staff will ever see this.'
                      : `This is emailed to ${ticket.requesterEmail}.`
                  }
                  disabled={sending}
                />

                <div className="composer-foot">
                  <span className="composer-hint">
                    {internal ? (
                      'Saved to the ticket. No email is sent and the first-response clock keeps running.'
                    ) : ticket.firstResponseAt ? (
                      <>Emailed to {ticket.requesterEmail}.</>
                    ) : (
                      <>
                        Emailed to {ticket.requesterEmail}. This is the first reply, so it stops
                        the first-response clock and moves the ticket to In progress.
                      </>
                    )}
                  </span>
                  <span className="spacer" />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void sendReply()}
                    disabled={sending || reply.trim().length === 0}
                  >
                    {sending ? 'Sending…' : internal ? 'Save note' : 'Send reply'}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── Audit trail ───────────────────────────────────────────── */}
          <section className="card">
            <div className="card-head">
              <h2>History</h2>
            </div>
            {history.length === 0 ? (
              <EmptyState title="No changes yet" />
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <caption className="visually-hidden">Append-only status history</caption>
                  <thead>
                    <tr>
                      <th scope="col">When</th>
                      <th scope="col">Change</th>
                      <th scope="col">By</th>
                      <th scope="col">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((entry) => (
                      <tr key={entry.id}>
                        <td className="small nowrap">
                          <Time iso={entry.changedAt} relativeFirst />
                        </td>
                        <td className="small">
                          {entry.fromInternal ? TICKET_STATUS_LABEL(entry.fromInternal) : 'Raised'}
                          {' → '}
                          <strong>{TICKET_STATUS_LABEL(entry.toInternal)}</strong>
                        </td>
                        <td className="small">{entry.actorLabel}</td>
                        <td className="small muted">{entry.note ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* ── Rail ────────────────────────────────────────────────────── */}
        <aside className="detail-rail">
          <section className="card">
            <div className="card-head">
              <h2>Requester</h2>
            </div>
            <div className="card-body">
              <dl className="meta-list">
                <dt>Name</dt>
                <dd>{ticket.requesterName}</dd>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${ticket.requesterEmail}`}>{ticket.requesterEmail}</a>
                </dd>
                <dt>Mobile</dt>
                <dd>{ticket.requesterMobile}</dd>
                <dt>Category</dt>
                <dd>{ticket.categoryLabel ?? categoryLabel(ticket.categoryId)}</dd>
                <dt>Sub-category</dt>
                <dd>{ticket.subcategoryLabel ?? subcategoryLabel(ticket.subcategoryId)}</dd>
                <dt>Raised</dt>
                <dd>{formatDateTime(ticket.createdAt)}</dd>
              </dl>
            </div>
          </section>

          {/* No owner card: one operator, so every ticket is already theirs. What
              is left is the one thing the status control cannot show on its own —
              the wording the customer sees for whatever state it is in. */}
          <section className="card">
            <div className="card-head">
              <h2>Status</h2>
            </div>
            <div className="card-body">
              <dl className="meta-list">
                <dt>Customer sees</dt>
                <dd>{CUSTOMER_VIEW[ticket.statusInternal]}</dd>
              </dl>
            </div>
            <div className="card-note">
              Both SLA clocks count business hours only, and skip the holidays on the calendar.
            </div>
          </section>

          {/* ── Consent ───────────────────────────────────────────────── */}
          <section className="card">
            <div className="card-head">
              <h2>Consent</h2>
            </div>
            <div className="card-body">
              {consent ? (
                <>
                  <dl className="meta-list">
                    <dt>Purpose</dt>
                    <dd>{consent.purpose}</dd>
                    <dt>Policy</dt>
                    <dd>{consent.policyVersion}</dd>
                    <dt>Given</dt>
                    <dd className="small">{formatDateTime(consent.grantedAt)}</dd>
                    {consent.withdrawnAt && (
                      <>
                        <dt>Withdrawn</dt>
                        <dd className="small">{formatDateTime(consent.withdrawnAt)}</dd>
                      </>
                    )}
                  </dl>
                  <p className="small muted" style={{ marginTop: 10 }}>
                    “{consent.consentText}”
                  </p>
                </>
              ) : (
                <p className="small muted">
                  No consent record. Every ticket raised through the site has one, so this
                  suggests the ticket was created another way.
                </p>
              )}
            </div>
          </section>

          {/* ── Email delivery ────────────────────────────────────────── */}
          <section className="card">
            <div className="card-head">
              <h2>Emails</h2>
            </div>
            {notifications.length === 0 ? (
              <div className="card-body">
                <p className="small muted">Nothing has been emailed about this ticket.</p>
              </div>
            ) : (
              <div className="card-body stack">
                {notifications.map((notification, index) => (
                  <div key={`${notification.template}-${index}`} className="inline">
                    <NotificationChip status={notification.status} />
                    <span className="small">{notification.template.replace(/_/g, ' ')}</span>
                    <span className="spacer" />
                    <span className="small muted">
                      <Time iso={notification.sentAt ?? notification.createdAt} relativeFirst />
                    </span>
                    {notification.lastError && (
                      <span className="small" style={{ color: 'var(--danger)', width: '100%' }}>
                        {notification.lastError}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="card-note">
              <Link to="/outbox">Outbox</Link> shows everything queued across the system.
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Retention</h2>
            </div>
            <div className="card-body">
              <dl className="meta-list">
                <dt>Record until</dt>
                <dd className="small">{formatDateTime(ticket.retentionExpiresAt)}</dd>
                <dt>Files until</dt>
                <dd className="small">{formatDateTime(ticket.attachmentRetentionExpiresAt)}</dd>
                <dt>Verified by captcha</dt>
                <dd>{ticket.captchaVerified ? 'Yes' : 'No'}</dd>
              </dl>
              {ticket.legalHold && (
                <p className="small" style={{ marginTop: 10, color: 'var(--warn)' }}>
                  Legal hold: {ticket.legalHoldReason ?? 'no reason recorded'}. The purge job will
                  not touch this ticket.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <ConfirmDialog spec={spec} onClose={close} />
    </>
  )
}

/** Who has opened this ticket's files, and why they said they needed to. */
function AccessLog({ ticketId }: { ticketId: string }) {
  const log = useAsync(() => api.attachmentAccessHistory(ticketId), [ticketId])

  if (log.error) {
    return (
      <div className="card-body">
        <p className="small" style={{ color: 'var(--danger)' }}>
          {log.error}
        </p>
      </div>
    )
  }

  if (!log.data) {
    return (
      <div className="card-body">
        <div className="skeleton" style={{ width: '60%' }} />
      </div>
    )
  }

  if (log.data.length === 0) {
    return (
      <div className="card-body">
        <p className="small muted">Nobody has opened these files yet.</p>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="data">
        <caption className="visually-hidden">Attachment access log</caption>
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Who</th>
            <th scope="col">File</th>
            <th scope="col">Reason</th>
          </tr>
        </thead>
        <tbody>
          {log.data.map((entry) => (
            <tr key={entry.id}>
              <td className="small nowrap">
                <Time iso={entry.accessedAt} relativeFirst />
              </td>
              <td className="small">{entry.actorName ?? entry.actorLabel}</td>
              <td className="small">{entry.filename}</td>
              <td className="small muted">{entry.reason ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
