import { http, HttpResponse, type RequestHandler } from 'msw'
import { apiBaseUrl } from '@/lib/env'
import { authDb, authLimits } from '@/mocks/db/auth'
import { mediaDb } from '@/mocks/db/media'
import { trustDb } from '@/mocks/db/trust'
import { runtimeConfig } from '@/mocks/fixtures/config'
import { network } from '@/mocks/handlers/network'
import type { Me, MeUpdate } from '@/types/api'

const API = apiBaseUrl

const error = (
  status: number,
  code: string,
  message: string,
  extra: { fieldErrors?: object; retryAfter?: number } = {},
) =>
  HttpResponse.json(
    { code, message, ...(extra.fieldErrors && { field_errors: extra.fieldErrors }) },
    { status, headers: extra.retryAfter ? { 'Retry-After': String(extra.retryAfter) } : undefined },
  )

const authRequired = () => error(401, 'AUTH_REQUIRED', 'Sign in to continue')
const invalid = (fieldErrors: Record<string, string>) =>
  error(422, 'VALIDATION_ERROR', 'Check the highlighted fields', { fieldErrors })

/** `/me` as the client sees it: with any appeal the member has made (ruling R7-5). */
const withAppeal = (me: Me): Me => {
  const appeal = trustDb.appealOf(me.id)
  return appeal ? { ...me, appeal } : me
}

const isNigerianMobile = (phone: unknown): phone is string =>
  typeof phone === 'string' && /^\+234[789]\d{9}$/.test(phone)

const normaliseEmail = (email: unknown) => (typeof email === 'string' ? email.trim().toLowerCase() : '')
const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const isNewPassword = (password: unknown): password is string =>
  typeof password === 'string' && password.length >= 8 && password.length <= 128

const emailRule = 'Enter an email address, like ada@example.com.'
const passwordRule = 'Use at least 8 characters.'

const codeSent = () => HttpResponse.json({ resendAfterSeconds: authLimits.resendAfterSeconds }, { status: 202 })
const slowDown = (retryAfter: number, message = 'Too many requests') =>
  error(429, 'RATE_LIMITED', message, { retryAfter })

/** A failed code check, the same way for every code (sign-up and password reset). */
function codeProblem(result: { reason: 'invalid' | 'expired' | 'locked' | 'unconfirmed'; retryAfterSeconds?: number }) {
  if (result.reason === 'locked') return slowDown(result.retryAfterSeconds ?? 600, 'Too many attempts')
  return result.reason === 'invalid'
    ? error(422, 'OTP_INVALID', 'The code does not match')
    : error(422, 'OTP_EXPIRED', 'The code has expired')
}

/** Server-side checks for `PATCH /me`; the client validates too, but this is the authority (PRD §5). */
function validateUpdate(body: MeUpdate): Record<string, string> {
  const errors: Record<string, string> = {}
  if (body.displayName !== undefined) {
    const name = body.displayName?.trim() ?? ''
    if (name.length < 2 || name.length > 40) errors.displayName = 'Use 2 to 40 characters.'
  }
  if (body.phone !== undefined && !isNigerianMobile(body.phone)) {
    errors.phone = 'Enter a Nigerian mobile number, like 0803 123 4567.'
  }
  if (body.areaId != null && !runtimeConfig.areas.some((a) => a.id === body.areaId)) {
    errors.areaId = 'Choose an area from the list.'
  }
  if (body.acceptTerms) {
    if (!body.acceptTerms.version) errors.terms = 'Agree to the terms to continue.'
    if (body.acceptTerms.adult !== true) errors.adult = 'Confirm that you are 18 or older.'
    // Onboarding can't finish without a contact phone
    if (body.phone === undefined && !authDb.hasPhone()) errors.phone = 'Enter your phone number.'
  }
  return errors
}

export const authHandlers: RequestHandler[] = [
  http.post(`${API}/auth/signup`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure

    const body = (await request.json()) as { email?: unknown; password?: unknown }
    const email = normaliseEmail(body.email)
    const errors: Record<string, string> = {}
    if (!isEmail(email)) errors.email = emailRule
    if (!isNewPassword(body.password)) errors.password = passwordRule
    if (Object.keys(errors).length) return invalid(errors)

    // The same answer whether or not the email has an account (FE-AUT-03)
    const result = authDb.signUp(email, body.password as string)
    return result.ok ? codeSent() : slowDown(result.retryAfterSeconds)
  }),

  http.post(`${API}/auth/email/resend`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure

    const email = normaliseEmail(((await request.json()) as { email?: unknown }).email)
    if (!isEmail(email)) return invalid({ email: emailRule })
    const result = authDb.resendSignUpCode(email)
    return result.ok ? codeSent() : slowDown(result.retryAfterSeconds)
  }),

  http.post(`${API}/auth/email/verify`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure

    const body = (await request.json()) as { email?: unknown; code?: unknown }
    const email = normaliseEmail(body.email)
    if (!isEmail(email) || typeof body.code !== 'string') return invalid({ code: 'Enter the 6-digit code.' })

    const result = authDb.verifyEmail(email, body.code)
    return result.ok ? HttpResponse.json({ user: result.user, isNew: result.isNew }) : codeProblem(result)
  }),

  http.post(`${API}/auth/login`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure

    const body = (await request.json()) as { email?: unknown; password?: unknown }
    const email = normaliseEmail(body.email)
    if (!isEmail(email)) return invalid({ email: emailRule })
    if (typeof body.password !== 'string' || !body.password) return invalid({ password: 'Enter your password.' })

    const result = authDb.signIn(email, body.password)
    if (result.ok) return HttpResponse.json({ user: result.user })
    if (result.reason === 'locked') return slowDown(result.retryAfterSeconds, 'Too many attempts')
    // Only after the right password, so it says nothing about whether an email has an account
    if (result.reason === 'unconfirmed') return error(403, 'EMAIL_UNVERIFIED', 'Confirm your email first')
    return error(401, 'INVALID_CREDENTIALS', 'The email or password is wrong')
  }),

  http.post(`${API}/auth/password/forgot`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure

    const email = normaliseEmail(((await request.json()) as { email?: unknown }).email)
    if (!isEmail(email)) return invalid({ email: emailRule })
    const result = authDb.forgotPassword(email)
    return result.ok ? codeSent() : slowDown(result.retryAfterSeconds)
  }),

  http.post(`${API}/auth/password/reset`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure

    const body = (await request.json()) as { email?: unknown; code?: unknown; password?: unknown }
    const email = normaliseEmail(body.email)
    if (!isNewPassword(body.password)) return invalid({ password: passwordRule })
    if (!isEmail(email) || typeof body.code !== 'string') return invalid({ code: 'Enter the 6-digit code.' })

    const result = authDb.resetPassword(email, body.code, body.password)
    return result.ok ? HttpResponse.json({ user: result.user }) : codeProblem(result)
  }),

  http.post(`${API}/auth/logout`, async () => {
    const failure = await network()
    if (failure) return failure
    authDb.signOut()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/me`, async () => {
    const failure = await network()
    if (failure) return failure
    const me = authDb.current()
    return me ? HttpResponse.json<Me>(withAppeal(me)) : authRequired()
  }),

  http.patch(`${API}/me`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure
    if (!authDb.current()) return authRequired()

    const body = (await request.json()) as MeUpdate
    const errors = validateUpdate(body)
    if (Object.keys(errors).length) return invalid(errors)

    const { acceptTerms, avatarId, ...changes } = body
    // A profile photo must be one the member uploaded (FE-SET-01); null removes it
    if (avatarId && !(await mediaDb.get(avatarId))) return invalid({ avatarId: 'Upload the photo again.' })
    const me = authDb.update({
      ...changes,
      ...(avatarId !== undefined && { avatarUrl: avatarId ? `${API}/media/${avatarId}` : undefined }),
      ...(changes.displayName && { displayName: changes.displayName.trim() }),
      ...(acceptTerms && { onboarded: true }),
    })
    return HttpResponse.json<Me>(withAppeal(me!))
  }),

  http.post(`${API}/me/delete-request`, async () => {
    const failure = await network()
    if (failure) return failure
    const me = authDb.current()
    if (!me) return authRequired()

    const requestedAt = me.deletionRequestedAt ?? new Date().toISOString()
    if (!me.deletionRequestedAt) authDb.update({ deletionRequestedAt: requestedAt })
    const reference = `NX-DEL-${me.id.slice(-4).toUpperCase()}${new Date(requestedAt).getUTCDate()}`
    return HttpResponse.json({ reference, requestedAt }, { status: 202 })
  }),
]
