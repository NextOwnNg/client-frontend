import { TextField } from '@/components/ui/TextField'

/**
 * One input for the 6-digit code (FE-AUT-02): one label for screen readers, the phone's code autofill,
 * and pasted spaces or dashes cleaned away. It never submits by itself.
 */
export function CodeField({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (code: string) => void
  error?: string | null
}) {
  return (
    <TextField
      label="6-digit code"
      error={error}
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="••••••"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      className="tabular text-center text-h3 tracking-[0.4em] placeholder:tracking-[0.4em]"
    />
  )
}
