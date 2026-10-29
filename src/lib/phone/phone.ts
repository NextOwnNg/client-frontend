/** Nigerian mobile numbers: +234 followed by 10 national digits starting 7, 8 or 9 (PRD FE-AUT-01). */

export type PhoneResult = { ok: true; e164: string } | { ok: false }

export function normalisePhone(input: string): PhoneResult {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('234')) digits = digits.slice(3)
  else if (digits.startsWith('0')) digits = digits.slice(1)

  if (!/^[789]\d{9}$/.test(digits)) return { ok: false }
  return { ok: true, e164: `+234${digits}` }
}

/** `+2348031234567` → `"+234 803 123 4567"` */
export function formatPhoneDisplay(e164: string): string {
  const national = e164.replace(/^\+234/, '')
  return `+234 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`
}

/** The national digits someone is typing: a pasted `+234` is dropped, and a leading 0 is kept (up to 11 digits). */
export function phoneInputDigits(input: string): string {
  let digits = input.replace(/\D/g, '')
  // Nigerian mobiles start 7, 8 or 9, so a leading 234 with more after it is the country code
  if (digits.startsWith('234') && digits.length > 3) digits = digits.slice(3)
  return digits.slice(0, digits.startsWith('0') ? 11 : 10)
}

/** Groups a number as it's typed, like the placeholder: `803 123 4567`, or `0803 123 4567` with the leading 0. */
export function formatPhoneInput(input: string): string {
  const digits = phoneInputDigits(input)
  const first = digits.startsWith('0') ? 4 : 3
  return [digits.slice(0, first), digits.slice(first, first + 3), digits.slice(first + 3)].filter(Boolean).join(' ')
}
