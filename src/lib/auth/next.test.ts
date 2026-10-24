import { describe, expect, it } from 'vitest'
import { loginPath, safeNext } from '@/lib/auth/next'

describe('safeNext', () => {
  it('keeps a same-origin path with its query and hash', () => {
    expect(safeNext('/listings/iphone-12?intent=save')).toBe('/listings/iphone-12?intent=save')
    expect(safeNext('/offers/new?listing=l-1#terms')).toBe('/offers/new?listing=l-1#terms')
  })

  it.each([
    ['//evil.com'],
    ['https://evil.com'],
    ['/\\evil.com'],
    ['/\t/evil.com'],
    ['javascript:alert(1)'],
    ['evil.com'],
    [''],
    [null],
    [undefined],
  ])('falls back to home for %j', (raw) => {
    expect(safeNext(raw)).toBe('/')
  })

  it('never sends someone back into the sign-in flow', () => {
    expect(safeNext('/login?next=/me')).toBe('/')
    expect(safeNext('/verify')).toBe('/')
    expect(safeNext('/onboarding')).toBe('/')
  })
})

describe('loginPath', () => {
  it('carries the return path as an encoded next parameter', () => {
    expect(loginPath('/listings/x?intent=save')).toBe('/login?next=%2Flistings%2Fx%3Fintent%3Dsave')
  })
})
