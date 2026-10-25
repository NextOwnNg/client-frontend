import { http, HttpResponse, type RequestHandler } from 'msw'
import { apiBaseUrl } from '@/lib/env'
import { authDb, authLimits } from '@/mocks/db/auth'
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

const isNigerianMobile = (phone: unknown): phone is string =>
  typeof phone === 'string' && /^\+234[789]\d{9}$/.test(phone)

/** Server-side checks for `PATCH /me`; the client validates too, but this is the authority (PRD §5). */
function validateUpdate(body: MeUpdate): Record<string, string> {
  const errors: Record<string, string> = {}
  if (body.displayName !== undefined) {
    const name = body.displayName?.trim() ?? ''
    if (name.length < 2 || name.length > 40) errors.displayName = 'Use 2 to 40 characters.'
  }
  if (body.areaId != null && !runtimeConfig.areas.some((a) => a.id === body.areaId)) {
    errors.areaId = 'Choose an area from the list.'
  }
  if (body.acceptTerms) {
    if (!body.acceptTerms.version) errors.terms = 'Agree to the terms to continue.'
    if (body.acceptTerms.adult !== true) errors.adult = 'Confirm that you are 18 or older.'
  }
  return errors
}

export const authHandlers: RequestHandler[] = [
  http.post(`${API}/auth/otp/request`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure

    const { phone } = (await request.json()) as { phone?: unknown }
    if (!isNigerianMobile(phone)) return invalid({ phone: 'Enter a Nigerian mobile number.' })

    // The same answer whether or not the number has an account (FE-AUT-03)
    const result = authDb.requestCode(phone)
    if (!result.ok) {
      return error(429, 'RATE_LIMITED', 'Too many requests', { retryAfter: result.retryAfterSeconds })
    }
    return HttpResponse.json({ resendAfterSeconds: authLimits.resendAfterSeconds }, { status: 202 })
  }),

  http.post(`${API}/auth/otp/verify`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure

    const { phone, code } = (await request.json()) as { phone?: unknown; code?: unknown }
    if (!isNigerianMobile(phone) || typeof code !== 'string') return invalid({ code: 'Enter the 6-digit code.' })

    const result = authDb.verify(phone, code)
    if (result.ok) return HttpResponse.json({ user: result.user, isNew: result.isNew })
    if (result.reason === 'locked') {
      return error(429, 'RATE_LIMITED', 'Too many attempts', { retryAfter: result.retryAfterSeconds })
    }
    return result.reason === 'expired'
      ? error(422, 'OTP_EXPIRED', 'The code has expired')
      : error(422, 'OTP_INVALID', 'The code does not match')
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
    return me ? HttpResponse.json<Me>(me) : authRequired()
  }),

  http.patch(`${API}/me`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure
    if (!authDb.current()) return authRequired()

    const body = (await request.json()) as MeUpdate
    const errors = validateUpdate(body)
    if (Object.keys(errors).length) return invalid(errors)

    const { acceptTerms, ...changes } = body
    const me = authDb.update({
      ...changes,
      ...(changes.displayName && { displayName: changes.displayName.trim() }),
      ...(acceptTerms && { onboarded: true }),
    })
    return HttpResponse.json<Me>(me)
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
