import { describe, expect, it } from 'vitest'
import { formatNaira, koboToNaira, nairaToKobo, parseNairaInput } from '@/lib/money/money'

describe('formatNaira', () => {
  it('formats kobo as whole naira with grouping', () => {
    expect(formatNaira(28_500_000)).toBe('₦285,000')
  })

  it('formats zero and very large amounts', () => {
    expect(formatNaira(0)).toBe('₦0')
    expect(formatNaira(10_000_000_000)).toBe('₦100,000,000')
  })
})

describe('parseNairaInput', () => {
  it('accepts the naira sign, commas and spaces', () => {
    expect(parseNairaInput('₦1,200,000')).toEqual({ ok: true, kobo: 120_000_000 })
    expect(parseNairaInput(' 350 000 ')).toEqual({ ok: true, kobo: 35_000_000 })
  })

  it('rejects empty, non-numeric, decimal and oversized input', () => {
    expect(parseNairaInput('')).toEqual({ ok: false, error: 'empty' })
    expect(parseNairaInput('12a')).toEqual({ ok: false, error: 'invalid' })
    expect(parseNairaInput('1200.50')).toEqual({ ok: false, error: 'decimal' })
    expect(parseNairaInput('₦1,200,000.50')).toEqual({ ok: false, error: 'decimal' })
    expect(parseNairaInput('2,000,000,000')).toEqual({ ok: false, error: 'too_large' })
  })
})

describe('naira and kobo conversion', () => {
  it('converts with integer maths', () => {
    expect(nairaToKobo(285_000)).toBe(28_500_000)
    expect(koboToNaira(28_500_000)).toBe(285_000)
  })
})
