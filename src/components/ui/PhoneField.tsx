import { useState, type ReactNode } from 'react'
import { TextField } from '@/components/ui/TextField'
import { normalisePhone } from '@/lib/phone/phone'

type PhoneFieldProps = {
  /** Initial national digits as typed; the field owns its text after mount. */
  value: string
  onChange: (e164: string | null) => void
  error?: string | null
  /** Replaces the default privacy hint; `null` hides it when the page explains it more fully. */
  hint?: ReactNode
}

/** Nigerian mobile number with a fixed +234 prefix (PRD FE-AUT-01). */
export function PhoneField({
  value,
  onChange,
  error,
  hint = "We'll text you a 6-digit code. Your number is never shown on your profile.",
}: PhoneFieldProps) {
  const [text, setText] = useState(value)

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
      onChange={(e) => {
        setText(e.target.value)
        const result = normalisePhone(e.target.value)
        onChange(result.ok ? result.e164 : null)
      }}
    />
  )
}
