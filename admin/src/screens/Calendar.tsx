import { useEffect, useState } from 'react'
import { PageHead } from '../components/AppShell'
import { Chip } from '../components/Chip'
import { ConfirmDialog, useConfirm } from '../components/ConfirmDialog'
import { EmptyState } from '../components/DataTable'
import { useToast } from '../components/Toast'
import * as api from '../lib/rpc'
import { useAsync } from '../lib/useAsync'
import type { Holiday } from '../lib/types'

/**
 * Business hours and the holiday calendar. ADMIN only.
 *
 * This is the least glamorous screen here and the one with the widest blast
 * radius. `add_business_time()` reads these two tables to compute every due
 * date in the system — the ticket's 8-hour first-response clock, its 40-hour
 * resolution clock, and the grievance's statutory 8 and 120. A missing holiday
 * does not produce an error anywhere; it produces a deadline that lands on a
 * day nobody is working, and an SLA that reports itself breached.
 *
 * Business hours are shown read-only. They are seeded once and changing them
 * shifts every future deadline, which is a decision for a migration and a
 * conversation, not a dropdown.
 */

export default function Calendar() {
  const toast = useToast()
  const { spec, confirm, close } = useConfirm()

  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)

  const calendar = useAsync(() => api.holidayCalendar(year), [year])

  const [draft, setDraft] = useState<Holiday[]>([])
  const [dirty, setDirty] = useState(false)

  // The draft is seeded from whatever the server returned for this year, and
  // only re-seeded when a fresh load arrives — otherwise a poll would discard
  // edits in progress.
  useEffect(() => {
    if (calendar.data) {
      setDraft(calendar.data.holidays)
      setDirty(false)
    }
  }, [calendar.data])

  const addRow = () => {
    setDraft((prev) => [...prev, { date: `${year}-01-01`, label: '', weekday: '' }])
    setDirty(true)
  }

  const update = (index: number, patch: Partial<Holiday>) => {
    setDraft((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
    setDirty(true)
  }

  const remove = (index: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== index))
    setDirty(true)
  }

  const save = () => {
    const cleaned = draft
      .map((row) => ({ date: row.date, label: row.label.trim() }))
      .filter((row) => row.date && row.label)

    const dropped = draft.length - cleaned.length
    const wrongYear = cleaned.filter((row) => !row.date.startsWith(String(year)))

    if (cleaned.length === 0) {
      toast.error(
        'Saving an empty list would clear the year. The database refuses that — remove dates one at a time instead.',
      )
      return
    }

    if (wrongYear.length > 0) {
      toast.error(
        `${wrongYear.length} date${wrongYear.length === 1 ? ' is' : 's are'} not in ${year}. The database rejects the whole save if any of them are.`,
      )
      return
    }

    confirm({
      title: `Replace the ${year} calendar?`,
      confirmLabel: `Save ${cleaned.length} dates`,
      tone: 'danger',
      body: (
        <div className="stack">
          <p>
            This replaces <strong>every</strong> holiday in {year} with the {cleaned.length} below.
            Anything you removed from the list is deleted.
          </p>
          <p className="small">
            These dates feed every SLA clock in the system. A date missing here makes a deadline
            land on a day nobody is working, and the ticket reports itself breached.
          </p>
          {dropped > 0 && (
            <p className="small muted">
              {dropped} incomplete {dropped === 1 ? 'row' : 'rows'} without a label will be
              ignored.
            </p>
          )}
        </div>
      ),
      onConfirm: async () => {
        try {
          const result = await api.setHolidays(year, cleaned)
          toast.ok(`${year} calendar saved — ${result.loaded} dates loaded.`)
          calendar.reload()
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'The calendar did not save.')
          throw err
        }
      },
    })
  }

  return (
    <>
      <PageHead
        title="Calendar"
        lede="Business hours and public holidays. Every SLA deadline in the system is computed against these."
        actions={
          <>
            <label className="visually-hidden" htmlFor="cal-year">
              Year
            </label>
            <select
              id="cal-year"
              className="btn btn-sm"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {[thisYear - 1, thisYear, thisYear + 1].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-sm" onClick={calendar.reload}>
              Reload
            </button>
          </>
        }
      />

      {calendar.error && (
        <div className="banner banner-danger" role="alert">
          <span>{calendar.error}</span>
          <button type="button" className="btn btn-sm" onClick={calendar.reload}>
            Retry
          </button>
        </div>
      )}

      <div className="detail">
        <section className="card detail-main">
          <div className="card-head">
            <h2>Public holidays in {year}</h2>
            <span className="card-head-actions">
              <button type="button" className="btn btn-sm" onClick={addRow}>
                Add a date
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={save}
                disabled={!dirty}
              >
                Save calendar
              </button>
            </span>
          </div>

          {calendar.initial && calendar.loading ? (
            <div className="card-body stack" aria-busy="true">
              <div className="skeleton" style={{ width: '60%' }} />
              <div className="skeleton" style={{ width: '45%' }} />
            </div>
          ) : draft.length === 0 ? (
            <EmptyState title={`No holidays recorded for ${year}`}>
              Every day is treated as a working day. Add the public holidays before the year
              starts, or the SLA clocks will promise replies on days nobody is in.
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <caption className="visually-hidden">Public holidays</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Name</th>
                    <th scope="col">Day</th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {draft.map((holiday, index) => (
                    <tr key={`${holiday.date}-${index}`}>
                      <td>
                        <label className="visually-hidden" htmlFor={`d-${index}`}>
                          Date
                        </label>
                        <input
                          id={`d-${index}`}
                          type="date"
                          value={holiday.date}
                          min={`${year}-01-01`}
                          max={`${year}-12-31`}
                          onChange={(event) => update(index, { date: event.target.value })}
                        />
                      </td>
                      <td>
                        <label className="visually-hidden" htmlFor={`l-${index}`}>
                          Name
                        </label>
                        <input
                          id={`l-${index}`}
                          type="text"
                          value={holiday.label}
                          placeholder="Republic Day"
                          onChange={(event) => update(index, { label: event.target.value })}
                        />
                      </td>
                      <td className="small muted">
                        {holiday.date
                          ? new Date(`${holiday.date}T00:00:00`).toLocaleDateString('en-IN', {
                              weekday: 'short',
                            })
                          : '—'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => remove(index)}
                          aria-label={`Remove ${holiday.label || holiday.date}`}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="card-note">
            Saving replaces the whole year — the list above becomes the calendar exactly as it
            stands. That is how the database works, not a choice this screen makes.
          </div>
        </section>

        <aside className="detail-rail">
          <section className="card">
            <div className="card-head">
              <h2>Business hours</h2>
            </div>
            <div className="card-body">
              {calendar.data?.businessHours?.length ? (
                <dl className="meta-list">
                  {calendar.data.businessHours.map((day) => (
                    <div key={day.weekday} style={{ display: 'contents' }}>
                      <dt>{WEEKDAYS[day.weekday] ?? `Day ${day.weekday}`}</dt>
                      <dd>
                        {day.isWorking ? (
                          <span className="small">
                            {day.opensAt?.slice(0, 5)}–{day.closesAt?.slice(0, 5)}
                          </span>
                        ) : (
                          <Chip tone="muted">Closed</Chip>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="small muted">Not loaded.</p>
              )}
            </div>
            <div className="card-note">
              Read-only here. Changing the working week shifts every future deadline in the
              system, so it belongs in a migration rather than a dropdown.
            </div>
          </section>
        </aside>
      </div>

      <ConfirmDialog spec={spec} onClose={close} />
    </>
  )
}

/**
 * business_hours.weekday is ISO day-of-week, not Postgres's `dow`.
 *
 * add_business_time() looks the row up with `extract(isodow from day_date)`,
 * so Monday is 1 and Sunday is 7 — one off from the `dow` most date code
 * reaches for, where Sunday is 0. Getting this wrong here would label every
 * row with the previous day's name and make a correct calendar look broken.
 */
const WEEKDAYS: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}
