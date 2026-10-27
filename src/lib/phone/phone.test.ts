import { describe, expect, it } from 'vitest'
import { formatPhoneDisplay, formatPhoneInput, normalisePhone } from '@/lib/phone/phone'

describe('normalisePhone', () => {
  it.each(['0803 123 4567', '803-123-4567', '+234 803 123 4567', '2348031234567', '08031234567'])(
    'normalises %s to E.164',
    (input) => {
      expect(normalisePhone(input)).toEqual({ ok: true, e164: '+2348031234567' })
    },
  )

  it('rejects numbers that are not Nigerian mobiles', () => {
    expect(normalisePhone('012345678')).toEqual({ ok: false })
    expect(normalisePhone('01 234 5678')).toEqual({ ok: false })
    expect(normalisePhone('')).toEqual({ ok: false })
  })
})

describe('formatPhoneDisplay', () => {
  it('groups an E.164 number for reading', () => {
    expect(formatPhoneDisplay('+2348031234567')).toBe('+234 803 123 4567')
  })
})

describe('formatPhoneInput', () => {
  it.each([
    ['8', '8'],
    ['803', '803'],
    ['8031', '803 1'],
    ['803123', '803 123'],
    ['8031234', '803 123 4'],
    ['8031234567', '803 123 4567'],
    ['0803', '0803'],
    ['08031', '0803 1'],
    ['08031234567', '0803 123 4567'],
  ])('groups %s as %s while typing, like the placeholder', (typed, shown) => {
    expect(formatPhoneInput(typed)).toBe(shown)
  })

  it('drops the country code from a pasted international number', () => {
    expect(formatPhoneInput('+234 803 123 4567')).toBe('803 123 4567')
    expect(formatPhoneInput('2348031234567')).toBe('803 123 4567')
  })

  it('ignores separators people type and stops at a full number', () => {
    expect(formatPhoneInput('803-123-4567')).toBe('803 123 4567')
    expect(formatPhoneInput('80312345678999')).toBe('803 123 4567')
    expect(formatPhoneInput('080312345678')).toBe('0803 123 4567')
  })
})
