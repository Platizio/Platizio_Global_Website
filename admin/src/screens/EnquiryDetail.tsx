import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { PageHead } from '../components/AppShell'
import {
  Chip,
  ENQUIRY_STATUSES,
  ENQUIRY_STATUS_LABEL,
  EnquiryChip,
  NotificationChip,
  SourceChip,
} from '../components/Chip'
import { ConfirmDialog, useConfirm } from '../components/ConfirmDialog'
import { EmptyState } from '../components/DataTable'
import { Time, formatDateTime } from '../components/RelativeTime'
import { useToast } from '../components/Toast'
import * as api from '../lib/rpc'
import { useAsync } from '../lib/useAsync'
import type { EnquiryStatus } from '../lib/types'

/**
 * One sales enquiry.
 *
 * Much lighter than a ticket, and that asymmetry is the point. There is no
 * customer-visible thread here: the conversation happens on the phone or in
 * someone's mail client, and `enquiry_notes` is only the append-only record of
 * what was said. Nothing on this screen emails the enquirer.
 */

/** Statuses that end the enquiry. The RPC requires a note for all three. */
const TERMINAL: EnquiryStatus[] = ['CONVERTED', 'CLOSED', 'SPAM']

export default function EnquiryDetail() {
  const { id = '' } = useParams()
  const toast = useToast()
  const { me, can } = useAuth()
  const { spec, confirm, close } = useConfirm()

  const detail = useAsync(() => api.enquiryDetail(id), [id])

  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  if (detail.error) {
    return (
      <>
        <PageHead title="Enquiry" />
        <div className="card">
          <EmptyState title="Could not open that enquiry">{detail.error}</EmptyState>
        </div>
      </>
    )
  }

  if (!detail.data) {
    return (
      <>
        <PageHead title="Enquiry" />
        <div className="card card-body stack" aria-busy="true">
          <div className="skeleton" style={{ width: '40%' }} />
          <div className="skeleton" style={{ width: '75%' }} />
        </div>
      </>
    )
  }

  const { enquiry, notes, consent, notifications } = detail.data

  const act = async (work: () => Promise<unknown>, success: string) => {
    try {
      await work()
      toast.ok(success)
      detail.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That did not work.')
    }
  }

  const saveNote = async () => {
    const body = note.trim()
    if (!body) return
    setSaving(true)
    try {
      await api.addEnquiryNote(id, body)
      setNote('')
      toast.ok('Note saved.')
      detail.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The note did not save.')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = (next: EnquiryStatus) => {
    if (next === enquiry.status) return
    const terminal = TERMINAL.includes(next)

    confirm({
      title: `Move to ${ENQUIRY_STATUS_LABEL(next)}?`,
      tone: next === 'SPAM' || next === 'CLOSED' ? 'danger' : 'primary',
      confirmLabel: `Set ${ENQUIRY_STATUS_LABEL(next)}`,
      // The RPC refuses a terminal move without one, so asking here saves a
      // round trip that only ever comes back as an error.
      requireNote: terminal,
      noteLabel: terminal ? 'How did this end?' : 'Note (optional)',
      noteHint: 'Saved to the enquiry. Nothing is emailed to the enquirer.',
      minNote: 3,
      body: (
        <div className="stack">
          <p>
            {enquiry.enquiryRef} moves from <strong>{ENQUIRY_STATUS_LABEL(enquiry.status)}</strong>{' '}
            to <strong>{ENQUIRY_STATUS_LABEL(next)}</strong>.
          </p>
          {enquiry.status === 'NEW' && (
            <p className="small">Moving off New records that first contact has been made.</p>
          )}
          {terminal && (
            <p className="small">
              This closes the enquiry and restarts its three-year retention clock from today.
            </p>
          )}
        </div>
      ),
      onConfirm: (text) =>
        act(
          () => api.setEnquiryStatus(id, next, text || undefined),
          `${enquiry.enquiryRef} updated.`,
        ),
    })
  }

  return (
    <>
      <PageHead
        title={enquiry.fullName}
        lede={
          <span className="chip-row">
            <span className="mono strong">{enquiry.enquiryRef}</span>
            <EnquiryChip status={enquiry.status} />
            <SourceChip source={enquiry.source} />
            {enquiry.followUpOverdue && <Chip tone="warn">Past follow-up target</Chip>}
          </span>
        }
        actions={
          <>
            <Link className="btn btn-sm" to="/enquiries">
              Back to enquiries
            </Link>
            <button type="button" className="btn btn-sm" onClick={detail.reload}>
              Refresh
            </button>
          </>
        }
      />

      <div className="detail">
        <div className="detail-main">
          <section className="card">
            <div className="card-head">
              <h2>What they asked</h2>
              <span className="card-head-actions muted small">
                <Time iso={enquiry.createdAt} />
              </span>
            </div>
            <div className="card-body">
              {enquiry.message ? (
                <p className="msg-body">{enquiry.message}</p>
              ) : (
                <p className="muted small">They left no message — only their contact details.</p>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Notes</h2>
              <span className="card-head-actions muted small">
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}
              </span>
            </div>

            {notes.length === 0 ? (
              <EmptyState title="No notes yet">
                Record what was said on the call here. Notes cannot be edited or deleted once
                saved.
              </EmptyState>
            ) : (
              <div className="thread">
                {notes.map((entry) => (
                  <article key={entry.id} className="msg">
                    <header className="msg-head">
                      <span className="msg-author">{entry.authorName}</span>
                      <span className="spacer" />
                      <Time iso={entry.createdAt} relativeFirst />
                    </header>
                    <div className="msg-body">{entry.body}</div>
                  </article>
                ))}
              </div>
            )}

            <div className="composer">
              <label className="visually-hidden" htmlFor="enquiry-note">
                Add a note
              </label>
              <textarea
                id="enquiry-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Called them, left a voicemail. Trying again on Thursday."
                disabled={saving}
              />
              <div className="composer-foot">
                <span className="composer-hint">
                  Internal only, and append-only — nothing here is emailed to the enquirer.
                </span>
                <span className="spacer" />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void saveNote()}
                  disabled={saving || note.trim().length === 0}
                >
                  {saving ? 'Saving…' : 'Add note'}
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="detail-rail">
          <section className="card">
            <div className="card-head">
              <h2>Contact</h2>
            </div>
            <div className="card-body">
              <dl className="meta-list">
                <dt>Name</dt>
                <dd>{enquiry.fullName}</dd>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>
                </dd>
                <dt>Phone</dt>
                <dd>
                  <a href={`tel:${enquiry.phone.replace(/\s/g, '')}`}>{enquiry.phone}</a>
                </dd>
                <dt>Interested in</dt>
                <dd>{enquiry.interestLabel ?? '—'}</dd>
                <dt>Received</dt>
                <dd className="small">{formatDateTime(enquiry.createdAt)}</dd>
              </dl>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Handling</h2>
            </div>
            <div className="card-body stack">
              <div className="field">
                <label htmlFor="e-status">Status</label>
                <select
                  id="e-status"
                  value={enquiry.status}
                  onChange={(event) => changeStatus(event.target.value as EnquiryStatus)}
                >
                  {ENQUIRY_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {ENQUIRY_STATUS_LABEL(status)}
                    </option>
                  ))}
                </select>
              </div>

              {enquiry.outcomeNote && (
                <p className="small muted">Outcome: {enquiry.outcomeNote}</p>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Follow-up</h2>
            </div>
            <div className="card-body">
              <dl className="meta-list">
                <dt>Internal target</dt>
                <dd className="small">{formatDateTime(enquiry.followUpTargetAt)}</dd>
                <dt>First contacted</dt>
                <dd className="small">{formatDateTime(enquiry.firstContactedAt)}</dd>
                {enquiry.closedAt && (
                  <>
                    <dt>Finished</dt>
                    <dd className="small">{formatDateTime(enquiry.closedAt)}</dd>
                  </>
                )}
              </dl>
            </div>
            <div className="card-note">
              A working target for us, not a promise to them. Enquiries carry no published
              response time — never quote this date to an enquirer.
            </div>
          </section>

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
                  </dl>
                  <p className="small muted" style={{ marginTop: 10 }}>
                    “{consent.consentText}”
                  </p>
                </>
              ) : (
                <p className="small muted">No consent record against this enquiry.</p>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Emails</h2>
            </div>
            <div className="card-body">
              {notifications.length === 0 ? (
                <p className="small muted">
                  Nothing was emailed. The acknowledgement is queued when the enquiry arrives, so
                  an empty list here usually means the outbox never drained.
                </p>
              ) : (
                <div className="stack">
                  {notifications.map((notification, index) => (
                    <div key={`${notification.template}-${index}`} className="inline">
                      <NotificationChip status={notification.status} />
                      <span className="small">{notification.template.replace(/_/g, ' ')}</span>
                      <span className="spacer" />
                      <span className="small muted">
                        <Time iso={notification.sentAt ?? notification.createdAt} relativeFirst />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Retention</h2>
            </div>
            <div className="card-body">
              <dl className="meta-list">
                <dt>Held until</dt>
                <dd className="small">{formatDateTime(enquiry.retentionExpiresAt)}</dd>
              </dl>
              <p className="small muted" style={{ marginTop: 8 }}>
                Three years, not the five a support ticket gets. An enquiry that went nowhere is a
                marketing record.
              </p>
            </div>
          </section>
        </aside>
      </div>

      <ConfirmDialog spec={spec} onClose={close} />
    </>
  )
}
