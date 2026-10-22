import { useState, type ReactNode } from 'react'
import { TextField } from '@/components/ui/TextField'
import { formatNairaInput, nairaParseMessages, parseNairaInput } from '@/lib/money/money'

type MoneyFieldProps = {
  label: string
  /** Amount in kobo, or null when empty or invalid. */
  value: number | null
  onChange: (kobo: number | null) => void
  hint?: ReactNode
  /** An error from the form (e.g. "Enter more than ₦0"); parse errors are handled here. */
  error?: string | null
  placeholder?: string
}

/** Whole-naira amount input. Emits integer kobo; never rounds what the person typed (PRD §7.1). */
export function MoneyField({ label, value, onChange, hint, error, placeholder = '0' }: MoneyFieldProps) {
  const [text, setText] = useState(() => (value === null ? '' : formatNairaInput(value)))
  const [parseError, setParseError] = useState<string | null>(null)

  function handleChange(next: string) {
    setText(next)
    const parsed = parseNairaInput(next)
    if (parsed.ok) {
      setParseError(null)
      onChange(parsed.kobo)
    } else {
      onChange(null)
      // Show format problems only once the person has finished typing (on blur), except clearing.
      if (parsed.error === 'empty') setParseError(null)
    }
  }

  function handleBlur() {
    const parsed = parseNairaInput(text)
    if (parsed.ok) {
      setText(formatNairaInput(parsed.kobo))
      setParseError(null)
    } else if (parsed.error !== 'empty') {
      setParseError(nairaParseMessages[parsed.error])
    }
  }

  return (
    <TextField
      label={label}
      hint={hint}
      error={parseError ?? error}
      prefix="₦"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      className="tabular"
    />
  )
}
