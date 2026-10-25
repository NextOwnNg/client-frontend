import { describe, expect, it } from 'vitest'
import { isApiError } from '@/lib/api/api-error'
import { apiClient } from '@/lib/api/client'
import { mockAuth, SAMPLE_CODE, SAMPLE_MEMBER_PHONE } from '@/mocks/db/auth'
import type { ListingSummary, Me, Paginated, PublicProfile } from '@/types/api'

const NEW_PHONE = '+2348123456789'

const fail = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error('Expected the request to fail')
    },
    (e: unknown) => {
      if (!isApiError(e)) throw e
      return e
    },
  )

const requestCode = (phone: string) => apiClient.post('/auth/otp/request', { phone })
const verify = (phone: string, code: string) =>
  apiClient.post<{ user: Me; isNew: boolean }>('/auth/otp/verify', { phone, code })

async function signInNew() {
  await requestCode(NEW_PHONE)
  return (await verify(NEW_PHONE, SAMPLE_CODE)).data
}

describe('mock auth API', () => {
  it('accepts a code request with a 60 second resend wait', async () => {
    const res = await requestCode(NEW_PHONE)

    expect(res.status).toBe(202)
    expect(res.data).toEqual({ resendAfterSeconds: 60 })
  })

  it('answers the same way for a known and an unknown number', async () => {
    const known = await requestCode(SAMPLE_MEMBER_PHONE)
    const unknown = await requestCode(NEW_PHONE)

    expect(known.data).toEqual(unknown.data)
  })

  it('rate-limits the fourth code request for one number within 10 minutes', async () => {
    for (let i = 0; i < 3; i++) await requestCode(NEW_PHONE)
    const error = await fail(requestCode(NEW_PHONE))

    expect(error.status).toBe(429)
    expect(error.code).toBe('RATE_LIMITED')
    expect(error.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('rejects a number that is not a Nigerian mobile number', async () => {
    const error = await fail(requestCode('+15550001111'))

    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.fieldErrors?.phone).toBeTruthy()
  })

  it('rejects a wrong code, then locks the code after five wrong tries', async () => {
    await requestCode(NEW_PHONE)
    const wrong = await fail(verify(NEW_PHONE, '000000'))
    expect(wrong.status).toBe(422)
    expect(wrong.code).toBe('OTP_INVALID')

    for (let i = 0; i < 3; i++) await fail(verify(NEW_PHONE, '000000'))
    const locked = await fail(verify(NEW_PHONE, '000000'))
    expect(locked.status).toBe(429)
    expect(locked.code).toBe('RATE_LIMITED')

    // Even the right code is refused once locked
    expect((await fail(verify(NEW_PHONE, SAMPLE_CODE))).status).toBe(429)
  })

  it('reports an expired code', async () => {
    await requestCode(NEW_PHONE)
    mockAuth.expireCodes()
    const error = await fail(verify(NEW_PHONE, SAMPLE_CODE))

    expect(error.code).toBe('OTP_EXPIRED')
  })

  it('signs in a new number as a new account that still needs onboarding', async () => {
    const { user, isNew } = await signInNew()

    expect(isNew).toBe(true)
    expect(user.onboarded).toBe(false)
    expect(user.phoneLast4).toBe('6789')
    expect((await apiClient.get<Me>('/me')).data.id).toBe(user.id)
  })

  it('signs in the sample member as an existing, onboarded account', async () => {
    await requestCode(SAMPLE_MEMBER_PHONE)
    const { data } = await verify(SAMPLE_MEMBER_PHONE, SAMPLE_CODE)

    expect(data.isNew).toBe(false)
    expect(data.user.onboarded).toBe(true)
    expect(data.user.displayName).toBe('Tolu A.')
  })

  it('refuses /me before sign-in and after logout', async () => {
    expect((await fail(apiClient.get('/me'))).code).toBe('AUTH_REQUIRED')

    await signInNew()
    await apiClient.post('/auth/logout')

    expect((await fail(apiClient.get('/me'))).status).toBe(401)
  })

  it('records onboarding only with the terms and the 18+ confirmation', async () => {
    await signInNew()

    const missing = await fail(
      apiClient.patch('/me', { displayName: 'Ada', acceptTerms: { version: '2026-10', adult: false } }),
    )
    expect(missing.code).toBe('VALIDATION_ERROR')
    expect(missing.fieldErrors?.adult).toBeTruthy()

    const { data } = await apiClient.patch<Me>('/me', {
      displayName: 'Ada',
      areaId: 'north',
      interests: ['phones'],
      marketingOptIn: false,
      acceptTerms: { version: '2026-10', adult: true },
    })
    expect(data).toMatchObject({ displayName: 'Ada', areaId: 'north', onboarded: true, marketingOptIn: false })
  })

  it('validates the display name', async () => {
    await signInNew()
    const error = await fail(apiClient.patch('/me', { displayName: 'A' }))

    expect(error.fieldErrors?.displayName).toBeTruthy()
  })

  it('takes an account deletion request once and keeps its reference', async () => {
    await signInNew()
    const first = await apiClient.post<{ reference: string }>('/me/delete-request')
    const again = await apiClient.post<{ reference: string }>('/me/delete-request')

    expect(first.status).toBe(202)
    expect(again.data.reference).toBe(first.data.reference)
    expect((await apiClient.get<Me>('/me')).data.deletionRequestedAt).toBeTruthy()
  })

  it('refuses member requests once the session has expired', async () => {
    await signInNew()
    mockAuth.expireSession()

    expect((await fail(apiClient.patch('/me', { displayName: 'Ada' }))).status).toBe(401)
  })

  it('serves a public profile without any phone details', async () => {
    const { data } = await apiClient.get<PublicProfile>('/users/u-tolu')

    expect(data).toMatchObject({ id: 'u-tolu', displayName: 'Tolu A.', phoneConfirmed: true, reviewCount: 12 })
    expect(data.memberSince).toBeTruthy()
    expect(JSON.stringify(data)).not.toMatch(/phone(?!Confirmed)|\+234/i)
  })

  it("lists only a person's active listings", async () => {
    const { data } = await apiClient.get<Paginated<ListingSummary>>('/users/u-tolu/listings')

    expect(data.items.length).toBeGreaterThan(0)
    expect(data.items.every((l) => l.status === 'ACTIVE')).toBe(true)
  })

  it('returns not found for an unknown person', async () => {
    expect((await fail(apiClient.get('/users/u-nobody'))).status).toBe(404)
  })
})
