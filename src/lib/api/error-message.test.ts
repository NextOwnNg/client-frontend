import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/api-error'
import {
  errorMessage,
  errorReason,
  fieldError,
  fieldErrorsOf,
  inputProblem,
  isMissingOrPrivate,
  isNotFound,
  isRefused,
  isRetryable,
  isSignedOut,
  waitSeconds,
} from '@/lib/api/error-message'

const http = (status: number, code: string, extra: Partial<ConstructorParameters<typeof ApiError>[0]> = {}) =>
  new ApiError({ kind: 'http', status, code, message: 'from server', ...extra })
const offline = new ApiError({ kind: 'network', code: 'UNKNOWN', message: 'Network error' })

const failed = 'Your comment wasn’t posted.'

describe('errorMessage', () => {
  it('uses the server’s own wording for a field it rejected', () => {
    const error = http(422, 'VALIDATION_ERROR', { fieldErrors: { body: 'Keep it under 500 characters.' } })
    expect(errorMessage(error, failed)).toBe('Keep it under 500 characters.')
    expect(errorMessage(error, failed, { field: 'caption' })).toBe(`${failed} Try again.`)
  })

  it('says what was wrong with the input for codes that are about the input', () => {
    expect(errorMessage(http(422, 'OTP_INVALID'), failed)).toBe(
      "That code doesn't match. Check the text message and try again.",
    )
    expect(errorMessage(http(415, 'UNSUPPORTED_FORMAT'), failed)).toBe('This file type isn’t supported.')
  })

  it('asks people to wait, never for less than a minute', () => {
    expect(errorMessage(http(429, 'RATE_LIMITED'), failed)).toBe(
      `${failed} That’s a lot in a short time. Wait a minute, then try again.`,
    )
    expect(errorMessage(http(429, 'RATE_LIMITED', { retryAfterSeconds: 30 }), failed)).toBe(
      `${failed} That’s a lot in a short time. Wait a minute, then try again.`,
    )
    expect(errorMessage(http(429, 'RATE_LIMITED', { retryAfterSeconds: 300 }), failed)).toBe(
      `${failed} That’s a lot in a short time. Wait 5 minutes, then try again.`,
    )
  })

  it('points to the connection when the request never arrived', () => {
    expect(errorMessage(offline, failed)).toBe(`${failed} Check your connection and try again.`)
    expect(errorMessage(new Error('boom'), failed)).toBe(`${failed} Check your connection and try again.`)
  })

  it('says it’s on our side for server failures', () => {
    expect(errorMessage(http(503, 'SERVER_ERROR'), failed)).toBe(
      `${failed} Something went wrong on our side. Try again in a moment.`,
    )
  })

  it('explains a refusal without blaming the person', () => {
    expect(errorMessage(http(403, 'FORBIDDEN'), failed)).toBe(`${failed} Your account can’t do this right now.`)
  })

  it('falls back for anything else, and works without the first sentence', () => {
    expect(errorMessage(http(409, 'SOMETHING_NEW'), failed)).toBe(`${failed} Try again.`)
    expect(errorMessage(offline)).toBe('Check your connection and try again.')
  })
})

describe('the pieces screens act on', () => {
  it('gives the server’s field messages, or nothing', () => {
    const error = http(422, 'VALIDATION_ERROR', { fieldErrors: { displayName: 'Use 2 to 40 characters.' } })
    expect(fieldErrorsOf(error)).toEqual({ displayName: 'Use 2 to 40 characters.' })
    expect(fieldError(error, 'displayName')).toBe('Use 2 to 40 characters.')
    expect(fieldError(error, 'areaId')).toBeNull()
    expect(fieldErrorsOf(http(422, 'VALIDATION_ERROR', { fieldErrors: {} }))).toBeUndefined()
    expect(fieldErrorsOf(null)).toBeUndefined()
  })

  it('finds a problem with the input, from fields or input codes', () => {
    expect(inputProblem(http(422, 'OTP_EXPIRED'))).toBe(
      'That code has expired. Send a new code and use the latest one.',
    )
    expect(inputProblem(http(503, 'SERVER_ERROR'))).toBeNull()
  })

  it('says how long to wait only when told to wait', () => {
    expect(waitSeconds(http(429, 'RATE_LIMITED', { retryAfterSeconds: 90 }))).toBe(90)
    expect(waitSeconds(http(429, 'RATE_LIMITED'))).toBe(60)
    expect(waitSeconds(http(503, 'SERVER_ERROR'))).toBeUndefined()
  })

  it('recognises a signed-out session and a missing resource', () => {
    expect(isSignedOut(http(401, 'AUTH_REQUIRED'))).toBe(true)
    expect(isSignedOut(offline)).toBe(false)
    expect(isNotFound(http(404, 'NOT_FOUND'))).toBe(true)
  })

  it('gives just the reason, for banners that have their own title', () => {
    expect(errorReason(http(503, 'SERVER_ERROR'))).toBe('Something went wrong on our side. Try again in a moment.')
  })

  it('treats “not found” and “not yours” alike, so nothing is revealed', () => {
    expect(isMissingOrPrivate(http(404, 'NOT_FOUND'))).toBe(true)
    expect(isMissingOrPrivate(http(403, 'FORBIDDEN'))).toBe(true)
    expect(isMissingOrPrivate(http(503, 'SERVER_ERROR'))).toBe(false)
  })

  it('recognises a refusal as things stand', () => {
    expect(isRefused(http(403, 'FORBIDDEN'))).toBe(true)
    expect(isRefused(http(409, 'INVALID_STATE'))).toBe(true)
    expect(isRefused(http(422, 'VALIDATION_ERROR'))).toBe(false)
  })

  it('retries only what might work a second time', () => {
    expect(isRetryable(offline)).toBe(true)
    expect(isRetryable(http(503, 'SERVER_ERROR'))).toBe(true)
    expect(isRetryable(http(404, 'NOT_FOUND'))).toBe(false)
  })
})
