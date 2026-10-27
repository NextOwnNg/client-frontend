import { toApiError } from '@/lib/api/api-error'

function wait(seconds?: number) {
  if (!seconds) return 'a minute'
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.ceil(seconds / 60)
  return minutes === 1 ? 'a minute' : `${minutes} minutes`
}

/**
 * Turns any failed request into one sentence a person can act on, so screens don't check status codes
 * themselves. `failed` says what didn't happen ("Your comment wasn’t posted."); the reason and the next step
 * are added here. A field the server rejected comes back in the server's own words instead. Pass `field`
 * to accept only that field's message.
 */
export function errorMessage(error: unknown, failed: string, { field }: { field?: string } = {}): string {
  const e = toApiError(error)

  const fieldErrors = e.fieldErrors ?? {}
  const own = field ? fieldErrors[field] : Object.values(fieldErrors)[0]
  if (own) return own

  if (e.kind === 'network' || e.kind === 'timeout') return `${failed} Check your connection and try again.`
  if (e.status === 429 || e.code === 'RATE_LIMITED') {
    return `${failed} You’re going a bit fast. Wait ${wait(e.retryAfterSeconds)}, then try again.`
  }
  if (e.status !== undefined && e.status >= 500) {
    return `${failed} Something went wrong on our side. Try again in a moment.`
  }
  if (e.status === 403) return `${failed} Your account can’t do this right now.`
  return `${failed} Try again.`
}
