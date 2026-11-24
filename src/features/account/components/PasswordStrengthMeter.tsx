import { passwordStrength, type PasswordStrength } from '@/features/account/password-strength'
import { cx } from '@/lib/cx'

const levels: Record<Exclude<PasswordStrength, 'empty'>, { filled: number; bar: string; label: string }> = {
  short: { filled: 1, bar: 'bg-muted', label: 'Keep going: 8 characters or more' },
  weak: { filled: 1, bar: 'bg-danger', label: 'Weak: easy to guess' },
  fair: { filled: 2, bar: 'bg-warning', label: 'Fair: a few more characters would help' },
  good: { filled: 3, bar: 'bg-action', label: 'Good' },
  strong: { filled: 4, bar: 'bg-success', label: 'Strong' },
}


export function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = passwordStrength(password)
  if (strength === 'empty') return null
  const level = levels[strength]

  return (
    <span className="flex flex-col gap-1.5 pt-1">
      <span aria-hidden className="grid grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={cx(
              'h-1 rounded-full transition-colors duration-200 ease-out',
              segment <= level.filled ? level.bar : 'bg-cloud',
            )}
          />
        ))}
      </span>
      <span className="text-compact text-muted">
        <span className="sr-only">Password strength: </span>
        {level.label}
      </span>
    </span>
  )
}
