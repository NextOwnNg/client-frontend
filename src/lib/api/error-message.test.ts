import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/api-error'
import { errorMessage } from '@/lib/api/error-message'

const http = (status: number, code: string, extra: Partial<ConstructorParameters<typeof ApiError>[0]> = {}) =>
  new ApiError({ kind: 'http', status, code, message: 'from server', ...extra })

const failed = 'Your comment wasn’t posted.'

describe('errorMessage', () => {
  it('uses the server’s own wording for a field it rejected', () => {
    const error = http(422, 'VALIDATION_ERROR', { fieldErrors: { body: 'Keep it under 500 characters.' } })
    expect(errorMessage(error, failed)).toBe('Keep it under 500 characters.')
    expect(errorMessage(error, failed, { field: 'caption' })).toBe(`${failed} Try again.`)
  })

  it('asks people to slow down, with the wait when the server gives one', () => {
    expect(errorMessage(http(429, 'RATE_LIMITED'), failed)).toBe(
      `${failed} You’re going a bit fast. Wait a minute, then try again.`,
    )
    expect(errorMessage(http(429, 'RATE_LIMITED', { retryAfterSeconds: 30 }), failed)).toBe(
      `${failed} You’re going a bit fast. Wait 30 seconds, then try again.`,
    )
    expect(errorMessage(http(429, 'RATE_LIMITED', { retryAfterSeconds: 300 }), failed)).toBe(
      `${failed} You’re going a bit fast. Wait 5 minutes, then try again.`,
    )
  })

  it('points to the connection when the request never arrived', () => {
    const error = new ApiError({ kind: 'network', code: 'UNKNOWN', message: 'Network error' })
    expect(errorMessage(error, failed)).toBe(`${failed} Check your connection and try again.`)
  })

  it('says it’s on our side for server failures', () => {
    expect(errorMessage(http(503, 'SERVER_ERROR'), failed)).toBe(
      `${failed} Something went wrong on our side. Try again in a moment.`,
    )
  })

  it('explains a refusal without blaming the person', () => {
    expect(errorMessage(http(403, 'FORBIDDEN'), failed)).toBe(`${failed} Your account can’t do this right now.`)
  })

  it('falls back for anything else, including non-API errors', () => {
    expect(errorMessage(new Error('boom'), failed)).toBe(`${failed} Check your connection and try again.`)
    expect(errorMessage(http(409, 'SOMETHING_NEW'), failed)).toBe(`${failed} Try again.`)
  })
})
