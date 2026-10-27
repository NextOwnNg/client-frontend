import { toApiError, type ApiErrorCode } from '@/lib/api/api-error'

// The yes/no checks live apart so first-load code (session, query retries) doesn't carry the wording
export { isMissingOrPrivate, isNotFound, isRefused, isRetryable, isSignedOut } from '@/lib/api/error-checks'

/**
 * The one place that reads a failed request (PRD §4.4). Screens ask questions in words ("is it a field
 * problem?", "how long to wait?") and get sentences back, instead of checking status codes themselves.
 */

/** Codes that mean something was wrong with what the person entered: the message is the whole story. */
const inputMessages: Partial<Record<ApiErrorCode, string>> = {
  OTP_INVALID: "That code doesn't match. Check the text message and try again.",
  OTP_EXPIRED: 'That code has expired. Send a new code and use the latest one.',
  UNSUPPORTED_FORMAT: 'This file type isn’t supported.',
  FILE_TOO_LARGE: 'This photo is over 10 MB.',
}

/** The server's message for each field it rejected, or undefined if it named none. */
export function fieldErrorsOf(error: unknown): Record<string, string> | undefined {
  if (!error) return undefined
  const fields = toApiError(error).fieldErrors
  return fields && Object.keys(fields).length > 0 ? fields : undefined
}

export function fieldError(error: unknown, field: string): string | null {
  return fieldErrorsOf(error)?.[field] ?? null
}

/** What was wrong with the input, from a field the server named or a code about the input; else null. */
export function inputProblem(error: unknown, field?: string): string | null {
  if (!error) return null
  const fields = fieldErrorsOf(error)
  const own = field ? fields?.[field] : fields && Object.values(fields)[0]
  return own ?? inputMessages[toApiError(error).code as ApiErrorCode] ?? null
}

/** Seconds to wait when the server says to slow down (a minute if it doesn't say); undefined otherwise. */
export function waitSeconds(error: unknown): number | undefined {
  const e = toApiError(error)
  if (e.status !== 429 && e.code !== 'RATE_LIMITED') return undefined
  return e.retryAfterSeconds ?? 60
}

/** "a minute", "5 minutes": never less than a minute, so it doesn't read as "try now". */
export function waitText(seconds = 60): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60))
  return minutes === 1 ? 'a minute' : `${minutes} minutes`
}

/** Why it failed and what to do next, in one or two short sentences. */
export function errorReason(error: unknown): string {
  const e = toApiError(error)
  if (e.kind === 'network' || e.kind === 'timeout') return 'Check your connection and try again.'
  const wait = waitSeconds(e)
  if (wait !== undefined) return `That’s a lot in a short time. Wait ${waitText(wait)}, then try again.`
  if (e.status !== undefined && e.status >= 500) return 'Something went wrong on our side. Try again in a moment.'
  if (e.status === 403) return 'Your account can’t do this right now.'
  return 'Try again.'
}

/**
 * Any failed request as a sentence a person can act on. `failed` says what didn't happen ("Your comment
 * wasn’t posted."); the reason and the next step are added here. A problem with the input comes back in its
 * own words instead. Pass `field` to accept only that field's message.
 */
export function errorMessage(error: unknown, failed?: string, { field }: { field?: string } = {}): string {
  return inputProblem(error, field) ?? [failed, errorReason(error)].filter(Boolean).join(' ')
}
