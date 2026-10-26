import { Star } from 'lucide-react'
import { Label, Radio, RadioGroup } from 'react-aria-components'
import { cx } from '@/lib/cx'

/**
 * 1–5 stars with real radio semantics: arrow keys move the rating, and each star says its number. Stars up
 * to the hovered or chosen one fill, so the choice reads at a glance.
 */
export function StarRating({
  value,
  onChange,
  error,
}: {
  value: number | null
  onChange: (rating: number) => void
  error?: string | null
}) {
  return (
    <RadioGroup
      value={value === null ? null : String(value)}
      onChange={(v) => onChange(Number(v))}
      orientation="horizontal"
      isInvalid={Boolean(error)}
      className="flex flex-col gap-2"
    >
      <Label className="text-compact font-medium text-ink">Your rating</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Radio
            key={n}
            value={String(n)}
            aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
            className={({ isFocusVisible, isPressed }) =>
              cx(
                'flex size-12 cursor-pointer items-center justify-center rounded-control transition-transform duration-120 outline-none',
                isFocusVisible && 'ring-2 ring-focus ring-offset-2',
                isPressed && 'scale-95',
              )
            }
          >
            <Star
              aria-hidden
              className={cx(
                'size-8 transition-colors duration-120',
                value !== null && n <= value ? 'fill-highlight text-highlight' : 'text-border',
              )}
              strokeWidth={1.5}
            />
          </Radio>
        ))}
      </div>
      {error && <p className="text-compact text-danger">{error}</p>}
      {value !== null && <p className="text-compact text-muted">{ratingWords[value - 1]}</p>}
    </RadioGroup>
  )
}

const ratingWords = ['Poor', 'Not great', 'Okay', 'Good', 'Excellent']
