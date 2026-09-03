import { describe, expect, it } from 'vitest'
import { OPEN_STATUSES, buildPartition } from './partition'

describe('buildPartition', () => {
  it('returns all six buckets when byStatus omits most of them', () => {
    // staff_dashboard() builds byStatus with jsonb_object_agg over a GROUP BY,
    // so a status with no tickets is ABSENT, not zero. This is the whole reason
    // this function exists rather than Object.keys(byStatus).map(...).
    const buckets = buildPartition({ NEW: 3 })

    expect(buckets).toHaveLength(6)
    expect(buckets.map((b) => b.status)).toEqual(OPEN_STATUSES)
    expect(buckets.find((b) => b.status === 'TRIAGED')?.count).toBe(0)
  })

  it('never includes CLOSED or SPAM, even when byStatus carries them', () => {
    const buckets = buildPartition({ NEW: 1, CLOSED: 400, SPAM: 90 })
    const statuses = buckets.map((b) => b.status)

    expect(statuses).not.toContain('CLOSED')
    expect(statuses).not.toContain('SPAM')
  })

  it('shares are proportional and sum to 100', () => {
    const buckets = buildPartition({ NEW: 1, TRIAGED: 1, IN_PROGRESS: 2 })

    expect(buckets.find((b) => b.status === 'IN_PROGRESS')?.share).toBe(50)
    expect(buckets.find((b) => b.status === 'NEW')?.share).toBe(25)
    expect(buckets.reduce((sum, b) => sum + b.share, 0)).toBeCloseTo(100)
  })

  it('gives every bucket a zero share when nothing is open, rather than NaN', () => {
    const buckets = buildPartition({})

    expect(buckets).toHaveLength(6)
    for (const bucket of buckets) {
      expect(bucket.count).toBe(0)
      expect(bucket.share).toBe(0)
    }
  })

  it('survives a missing byStatus entirely', () => {
    expect(buildPartition(undefined)).toHaveLength(6)
  })

  it('links carry both status and view', () => {
    // status is what filters; view only decides which tab reads as active on
    // arrival. Sending status alone filters correctly and highlights the wrong
    // tab.
    const broker = buildPartition({ WAITING_ON_BROKER: 2 }).find(
      (b) => b.status === 'WAITING_ON_BROKER',
    )

    expect(broker?.to).toBe('/tickets?view=all&status=WAITING_ON_BROKER')
  })

  it('labels come from the chip vocabulary, so the strip and the chips agree', () => {
    const buckets = buildPartition({})

    expect(buckets[0].label).toBe('Unopened')
    expect(buckets[1].label).toBe('Opened')
  })

  it('tones the unopened bucket and the two waiting buckets, nothing else', () => {
    const byTone = Object.fromEntries(buildPartition({}).map((b) => [b.status, b.tone]))

    expect(byTone.NEW).toBe('new')
    expect(byTone.WAITING_ON_CUSTOMER).toBe('waiting')
    expect(byTone.WAITING_ON_BROKER).toBe('waiting')
    expect(byTone.IN_PROGRESS).toBe('plain')
    expect(byTone.RESOLVED).toBe('plain')
  })

  it('total is the sum of the six, which is what open must equal', () => {
    // The disjointness check: sum(buckets) === staff_dashboard().open.
    const buckets = buildPartition({ NEW: 2, WAITING_ON_BROKER: 4, CLOSED: 11 })

    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(6)
  })
})
