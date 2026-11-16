import { describe, expect, it } from 'vitest'
import { isApiError } from '@/lib/api/api-error'
import { apiClient } from '@/lib/api/client'
import { mockAuth, SAMPLE_CODE, SAMPLE_MEMBER_EMAIL, SAMPLE_PASSWORD } from '@/mocks/db/auth'
import type { ListingSummary, Me, Paginated, PublicProfile } from '@/types/api'

const NEW_EMAIL = 'ada@example.com'
const PASSWORD = 'correct horse'

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

const signUp = (email: string, password = PASSWORD) => apiClient.post('/auth/signup', { email, password })
const verify = (email: string, code: string) =>
  apiClient.post<{ user: Me; isNew: boolean }>('/auth/email/verify', { email, code })
const signIn = (email: string, password: string) => apiClient.post<{ user: Me }>('/auth/login', { email, password })

async function signInNew() {
  await signUp(NEW_EMAIL)
  return (await verify(NEW_EMAIL, SAMPLE_CODE)).data
}

describe('mock auth API', () => {
  it('starts an account with a 60 second resend wait', async () => {
    const res = await signUp(NEW_EMAIL)

    expect(res.status).toBe(202)
    expect(res.data).toEqual({ resendAfterSeconds: 60 })
  })

  it('answers sign-up the same way for a known and an unknown email', async () => {
    const known = await signUp(SAMPLE_MEMBER_EMAIL)
    const unknown = await signUp(NEW_EMAIL)

    expect(known.status).toBe(unknown.status)
    expect(known.data).toEqual(unknown.data)
  })

  it('rejects a malformed email and a short password', async () => {
    const error = await fail(signUp('not-an-email', 'short'))

    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.fieldErrors?.email).toBeTruthy()
    expect(error.fieldErrors?.password).toBeTruthy()
  })

  it('rate-limits the fourth code for one email within 10 minutes', async () => {
    await signUp(NEW_EMAIL)
    for (let i = 0; i < 2; i++) await apiClient.post('/auth/email/resend', { email: NEW_EMAIL })
    const error = await fail(apiClient.post('/auth/email/resend', { email: NEW_EMAIL }))

    expect(error.status).toBe(429)
    expect(error.code).toBe('RATE_LIMITED')
    expect(error.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('rejects a wrong code, then locks the code after five wrong tries', async () => {
    await signUp(NEW_EMAIL)
    const wrong = await fail(verify(NEW_EMAIL, '000000'))
    expect(wrong.status).toBe(422)
    expect(wrong.code).toBe('OTP_INVALID')

    for (let i = 0; i < 3; i++) await fail(verify(NEW_EMAIL, '000000'))
    const locked = await fail(verify(NEW_EMAIL, '000000'))
    expect(locked.status).toBe(429)
    expect(locked.code).toBe('RATE_LIMITED')

    // Even the right code is refused once locked
    expect((await fail(verify(NEW_EMAIL, SAMPLE_CODE))).status).toBe(429)
  })

  it('reports an expired code', async () => {
    await signUp(NEW_EMAIL)
    mockAuth.expireCodes()
    const error = await fail(verify(NEW_EMAIL, SAMPLE_CODE))

    expect(error.code).toBe('OTP_EXPIRED')
  })

  it('confirms a new email as a signed-in account that still needs onboarding', async () => {
    const { user, isNew } = await signInNew()

    expect(isNew).toBe(true)
    expect(user).toMatchObject({ email: NEW_EMAIL, onboarded: false, phoneLast4: null })
    expect((await apiClient.get<Me>('/me')).data.id).toBe(user.id)
  })

  it('signs the sample member in with their password', async () => {
    const { data } = await signIn(SAMPLE_MEMBER_EMAIL, SAMPLE_PASSWORD)

    expect(data.user.onboarded).toBe(true)
    expect(data.user.displayName).toBe('Tolu A.')
    expect(JSON.stringify(data)).not.toContain(SAMPLE_PASSWORD)
  })

  it('refuses a wrong password and an unknown email the same way', async () => {
    const wrong = await fail(signIn(SAMPLE_MEMBER_EMAIL, 'wrong password'))
    const unknown = await fail(signIn('nobody@example.com', 'wrong password'))

    expect(wrong.status).toBe(401)
    expect(wrong.code).toBe('INVALID_CREDENTIALS')
    expect(unknown.code).toBe(wrong.code)
  })

  it('asks for the email to be confirmed before signing in, only once the password is right', async () => {
    await signUp(NEW_EMAIL)

    expect((await fail(signIn(NEW_EMAIL, 'wrong password'))).code).toBe('INVALID_CREDENTIALS')
    expect((await fail(signIn(NEW_EMAIL, PASSWORD))).code).toBe('EMAIL_UNVERIFIED')
  })

  it('slows down repeated wrong passwords', async () => {
    for (let i = 0; i < 5; i++) await fail(signIn(SAMPLE_MEMBER_EMAIL, 'wrong password'))

    expect((await fail(signIn(SAMPLE_MEMBER_EMAIL, SAMPLE_PASSWORD))).status).toBe(429)
  })

  it('resets a password with an emailed code and signs the member in', async () => {
    const asked = await apiClient.post('/auth/password/forgot', { email: SAMPLE_MEMBER_EMAIL })
    const unknown = await apiClient.post('/auth/password/forgot', { email: 'nobody@example.com' })
    expect(asked.data).toEqual(unknown.data)

    const { data } = await apiClient.post<{ user: Me }>('/auth/password/reset', {
      email: SAMPLE_MEMBER_EMAIL,
      code: SAMPLE_CODE,
      password: 'a new password',
    })
    expect(data.user.email).toBe(SAMPLE_MEMBER_EMAIL)
    expect((await fail(signIn(SAMPLE_MEMBER_EMAIL, SAMPLE_PASSWORD))).code).toBe('INVALID_CREDENTIALS')
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
    expect(missing.fieldErrors?.phone).toBeTruthy()

    const { data } = await apiClient.patch<Me>('/me', {
      displayName: 'Ada',
      phone: '+2348031234567',
      areaId: 'north',
      interests: ['phones'],
      marketingOptIn: false,
      acceptTerms: { version: '2026-10', adult: true },
    })
    expect(data).toMatchObject({
      displayName: 'Ada',
      phoneLast4: '4567',
      areaId: 'north',
      onboarded: true,
      marketingOptIn: false,
    })
    expect(JSON.stringify(data)).not.toContain('+234')
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

  it('serves a public profile without any email or phone details', async () => {
    const { data } = await apiClient.get<PublicProfile>('/users/u-tolu')

    expect(data).toMatchObject({ id: 'u-tolu', displayName: 'Tolu A.', emailConfirmed: true, reviewCount: 12 })
    expect(data.memberSince).toBeTruthy()
    expect(JSON.stringify(data)).not.toMatch(/phone|\+234|@|email(?!Confirmed)/i)
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
