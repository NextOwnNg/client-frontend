import { useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { TextField } from '@/components/ui/TextField'
import { formatPhoneInput, normalisePhone, phoneInputDigits } from '@/lib/phone/phone'

type PhoneFieldProps = {
  /** Initial national digits as typed; the field owns its text after mount. */
  value: string
  onChange: (e164: string | null) => void
  error?: string | null
  /** Replaces the default privacy hint; `null` hides it when the page explains it more fully. */
  hint?: ReactNode
}

const countDigits = (text: string) => text.replace(/\D/g, '').length

/** Where the caret goes in `formatted` so that `digits` digits sit before it. */
function caretAfter(formatted: string, digits: number) {
  if (digits <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]!) && ++seen === digits) return i + 1
  }
  return formatted.length
}

/**
 * Nigerian mobile number with a fixed +234 prefix (PRD FE-AUT-01). It's spaced like the placeholder as it's
 * typed or pasted, and the caret stays with the digit being edited.
 */
export function PhoneField({
  value,
  onChange,
  error,
  hint = "We'll text you a 6-digit code. Your number is never shown on your profile.",
}: PhoneFieldProps) {
  const [text, setText] = useState(() => formatPhoneInput(value))
  const input = useRef<HTMLInputElement | null>(null)
  const caret = useRef<number | null>(null)

  // After the reformatted text renders, put the caret back beside the digit being edited
  useLayoutEffect(() => {
    if (caret.current === null || !input.current) return
    if (document.activeElement === input.current) input.current.setSelectionRange(caret.current, caret.current)
    caret.current = null
  }, [text])

  function change(e: ChangeEvent<HTMLInputElement>) {
    input.current = e.target
    const typed = e.target.value
    const at = e.target.selectionStart ?? typed.length
    let digitsBefore = countDigits(typed.slice(0, at))
    let digits = typed.replace(/\D/g, '')

    // Backspace over a space removes no digit; take the digit before it, so the caret doesn't get stuck
    if (digits === text.replace(/\D/g, '') && typed.length < text.length && digitsBefore > 0) {
      digits = digits.slice(0, digitsBefore - 1) + digits.slice(digitsBefore)
      digitsBefore -= 1
    }
    // A pasted country code isn't shown, so it doesn't count towards the caret either
    const national = phoneInputDigits(digits)
    if (digits.length - national.length >= 3 && digits.startsWith('234')) digitsBefore -= 3

    const formatted = formatPhoneInput(national)
    caret.current = caretAfter(formatted, Math.min(digitsBefore, national.length))
    setText(formatted)
    const result = normalisePhone(national)
    onChange(result.ok ? result.e164 : null)
  }

  return (
    <TextField
      label="Phone number"
      hint={hint}
      error={error}
      prefix="+234"
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      placeholder="803 123 4567"
      value={text}
      onChange={change}
    />
  )
}
