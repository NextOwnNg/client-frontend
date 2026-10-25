/** Timestamps arrive in UTC and display in West Africa Time (PRD §7.2). */

const TIME_ZONE = 'Africa/Lagos'
const MINUTE = 60_000
const HOUR = 60 * MINUTE

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

/** `"Fri 24 Oct, 6:00 pm WAT"`, or `"Fri 24 Oct"` without the time. */
export function formatWAT(iso: string, { withTime = true }: { withTime?: boolean } = {}): string {
  const date = new Date(iso)
  const day = dateFormatter.format(date).replace(',', '')
  if (!withTime) return day
  return `${day}, ${timeFormatter.format(date).toLowerCase()} WAT`
}

const monthFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, month: 'long', year: 'numeric' })

/** `"March 2026"`, for "Member since". */
export function formatMonthYear(iso: string): string {
  return monthFormatter.format(new Date(iso))
}

export type Deadline = { label: string; ended: boolean; fractionLeft: number }

/**
 * Relative label for a deadline, computed against server-aligned `now`.
 * `fractionLeft` (0–1) drives duration bars; it needs `startedAt` and is 1 without it.
 */
export function relativeDeadline(endsAt: string, now: number, startedAt?: string): Deadline {
  const end = Date.parse(endsAt)
  const remaining = end - now
  if (remaining <= 0) return { label: 'Ended', ended: true, fractionLeft: 0 }

  const total = startedAt ? end - Date.parse(startedAt) : remaining
  const fractionLeft = total > 0 ? Math.min(1, remaining / total) : 0

  let label: string
  if (remaining < HOUR) label = `Ends in ${Math.max(1, Math.ceil(remaining / MINUTE))} min`
  else if (remaining < 48 * HOUR) label = `Ends in ${Math.floor(remaining / HOUR)}h`
  else label = `Ends in ${Math.floor(remaining / (24 * HOUR))} days`

  return { label, ended: false, fractionLeft }
}
