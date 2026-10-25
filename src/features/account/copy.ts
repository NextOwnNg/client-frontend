/** Sign-in and account copy. Neutral by design: nothing here says whether a number has an account (FE-AUT-03). */
export const authCopy = {
  whyPhoneTitle: 'Why your phone number?',
  whyPhone:
    'It keeps your account secure and lets us text you about your trades. It is never shown on your profile, listings or offers.',
  invalidPhone: 'Enter a Nigerian mobile number, like 0803 123 4567.',
  wrongCode: "That code doesn't match. Check the text message and try again.",
  expiredCode: 'That code has expired. Send a new code and use the latest one.',
  incompleteCode: 'Enter all 6 digits.',
  codeResent: 'We sent a new code.',
  phoneConfirmed: 'Phone confirmed',
} as const

/** "4 minutes" from a Retry-After in seconds; never less than a minute, so it doesn't read as "try now". */
export function waitText(seconds = 60): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60))
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
}
