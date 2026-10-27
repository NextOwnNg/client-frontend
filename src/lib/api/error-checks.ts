import { toApiError } from '@/lib/api/api-error'

/** Yes/no questions about a failed request, for code that decides what to do next (see `error-message`). */

/** The session ended: the sign-in prompt takes over, so screens show nothing of their own. */
export const isSignedOut = (error: unknown) => toApiError(error).status === 401

export const isNotFound = (error: unknown) => toApiError(error).status === 404

/** It doesn't exist, or it isn't the reader's: pages say "couldn't find" for both, so nothing is revealed. */
export const isMissingOrPrivate = (error: unknown) => [403, 404].includes(toApiError(error).status ?? 0)

/** The server said no to this action as things stand (not allowed, or the state moved on). */
export const isRefused = (error: unknown) => [403, 409].includes(toApiError(error).status ?? 0)

/** A read worth trying again: the request didn't arrive or the server failed. Never a 4xx (PRD §4.4). */
export function isRetryable(error: unknown) {
  const { status } = toApiError(error)
  return status === undefined || status >= 500
}
