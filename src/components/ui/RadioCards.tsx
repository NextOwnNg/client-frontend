import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Label, Radio, RadioGroup, Text } from 'react-aria-components'
import { cx } from '@/lib/cx'

export type RadioCardOption<T extends string> = {
  value: T
  title: string
  description?: ReactNode
  icon?: ReactNode
  disabled?: boolean
  disabledReason?: string
}

type RadioCardsProps<T extends string> = {
  label: string
  options: RadioCardOption<T>[]
  value: T | null
  onChange: (value: T) => void
  hideLabel?: boolean
  columns?: 1 | 2 | 3
}

/** Single-choice cards with real radio semantics (arrow keys move and select). */
export function RadioCards<T extends string>({ label, options, value, onChange, hideLabel, columns = 1 }: RadioCardsProps<T>) {
  return (
    <RadioGroup value={value} onChange={(v) => onChange(v as T)} className="flex flex-col gap-2">
      <Label className={hideLabel ? 'sr-only' : 'text-compact font-medium text-ink'}>{label}</Label>
      <div className={cx('grid gap-2', columns === 2 && 'tablet:grid-cols-2', columns === 3 && 'tablet:grid-cols-3')}>
        {options.map((option) => (
          <Radio
            key={option.value}
            value={option.value}
            isDisabled={option.disabled}
            className={({ isSelected, isFocusVisible, isDisabled, isPressed }) =>
              cx(
                'group relative flex min-h-14 cursor-pointer gap-3 rounded-control border bg-surface p-4 text-left outline-none',
                'transition-[border-color,background-color,transform] duration-120 ease-out',
                isSelected ? 'border-action bg-mint/50 shadow-[inset_0_0_0_1px_var(--nx-teal)]' : 'border-border',
                isFocusVisible && 'ring-2 ring-focus ring-offset-2',
                isPressed && !isDisabled && 'scale-[0.99]',
                isDisabled && 'cursor-not-allowed bg-cloud',
              )
            }
          >
            {({ isSelected, isDisabled }) => (
              <>
                {option.icon && <span className={cx('mt-0.5 shrink-0', isDisabled ? 'text-muted' : 'text-action')}>{option.icon}</span>}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cx('text-body font-semibold', isDisabled ? 'text-muted' : 'text-ink')}>{option.title}</span>
                  {option.description && <Text slot="description" className="text-compact text-muted">{option.description}</Text>}
                  {isDisabled && option.disabledReason && (
                    <span className="mt-1 text-compact text-muted">{option.disabledReason}</span>
                  )}
                </span>
                <span
                  aria-hidden
                  className={cx(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-120',
                    isSelected ? 'border-action bg-action text-action-foreground' : 'border-border bg-surface',
                  )}
                >
                  {isSelected && <Check className="size-3.5" strokeWidth={3} />}
                </span>
              </>
            )}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  )
}
