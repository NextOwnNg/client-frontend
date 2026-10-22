import { describe, expect, it } from 'vitest'
import { formatWAT, relativeDeadline } from '@/lib/time/time'

const HOUR = 3_600_000
const now = Date.parse('2026-10-22T12:00:00Z')

describe('relativeDeadline', () => {
  it('shows hours under two days', () => {
    expect(relativeDeadline(new Date(now + 18 * HOUR).toISOString(), now).label).toBe('Ends in 18h')
  })

  it('shows days from two days on', () => {
    expect(relativeDeadline(new Date(now + 50 * HOUR).toISOString(), now).label).toBe('Ends in 2 days')
  })

  it('shows minutes in the last hour', () => {
    expect(relativeDeadline(new Date(now + 25 * 60_000).toISOString(), now).label).toBe('Ends in 25 min')
  })

  it('reports past deadlines as ended, never negative', () => {
    expect(relativeDeadline(new Date(now - HOUR).toISOString(), now)).toEqual({
      label: 'Ended',
      ended: true,
      fractionLeft: 0,
    })
  })

  it('reports the fraction of time left against the start', () => {
    const startedAt = new Date(now - 6 * HOUR).toISOString()
    const result = relativeDeadline(new Date(now + 18 * HOUR).toISOString(), now, startedAt)
    expect(result.fractionLeft).toBeCloseTo(0.75)
  })
})

describe('formatWAT', () => {
  it('formats a UTC instant in West Africa Time', () => {
    const text = formatWAT('2026-10-24T17:00:00Z')
    expect(text).toContain('6:00')
    expect(text.toLowerCase()).toContain('pm')
    expect(text).toContain('WAT')
    expect(text).toContain('24 Oct')
  })

  it('crosses midnight correctly in WAT', () => {
    expect(formatWAT('2026-10-24T23:30:00Z')).toContain('25 Oct')
  })

  it('can omit the time', () => {
    expect(formatWAT('2026-10-24T17:00:00Z', { withTime: false })).toBe('Sat 24 Oct')
  })
})
