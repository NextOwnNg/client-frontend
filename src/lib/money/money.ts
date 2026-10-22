/** All API money is integer kobo (PRD §7.1). The pilot shows and accepts whole naira only. */

const KOBO_PER_NAIRA = 100
const MAX_NAIRA = 1_000_000_000

const nairaFormatter = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 })

/** `28_500_000` → `"₦285,000"` */
export function formatNaira(kobo: number): string {
  return `₦${nairaFormatter.format(Math.trunc(kobo / KOBO_PER_NAIRA))}`
}

/** Whole naira with grouping and no symbol, for input fields: `120_000_000` → `"1,200,000"` */
export function formatNairaInput(kobo: number): string {
  return nairaFormatter.format(Math.trunc(kobo / KOBO_PER_NAIRA))
}

export function nairaToKobo(naira: number): number {
  return naira * KOBO_PER_NAIRA
}

export function koboToNaira(kobo: number): number {
  return Math.trunc(kobo / KOBO_PER_NAIRA)
}

export type NairaParseError = 'empty' | 'invalid' | 'decimal' | 'too_large'
export type NairaParseResult = { ok: true; kobo: number } | { ok: false; error: NairaParseError }

/** Parses what a person types into a money field. Never rounds: decimals are rejected with a reason. */
export function parseNairaInput(input: string): NairaParseResult {
  const cleaned = input.replace(/[₦,\s]/g, '')
  if (cleaned === '') return { ok: false, error: 'empty' }
  if (/^\d+\.\d*$/.test(cleaned)) return { ok: false, error: 'decimal' }
  if (!/^\d+$/.test(cleaned)) return { ok: false, error: 'invalid' }

  const naira = Number(cleaned)
  if (naira > MAX_NAIRA) return { ok: false, error: 'too_large' }
  return { ok: true, kobo: nairaToKobo(naira) }
}

export const nairaParseMessages: Record<NairaParseError, string> = {
  empty: 'Enter an amount.',
  invalid: 'Use numbers only.',
  decimal: 'Use whole naira, without kobo.',
  too_large: 'That amount is too large.',
}
