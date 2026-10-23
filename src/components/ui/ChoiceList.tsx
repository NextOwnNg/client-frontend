import { Check } from 'lucide-react'
import { Checkbox, CheckboxGroup, Label, Radio, RadioGroup } from 'react-aria-components'
import { cx } from '@/lib/cx'

type Option<T extends string> = { value: T; label: string }

const row =
  'group flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-1 text-body text-ink outline-none data-focus-visible:ring-2 data-focus-visible:ring-focus data-disabled:cursor-not-allowed data-disabled:text-muted'
const legend = 'mb-1 text-compact font-semibold text-ink'

/** Compact multi-select list for filter panels: 44px rows, real checkbox semantics. */
export function CheckList<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Option<T>[]
  value: T[]
  onChange: (value: T[]) => void
}) {
  return (
    <CheckboxGroup value={value} onChange={(v) => onChange(v as T[])} className="flex flex-col">
      <Label className={legend}>{label}</Label>
      {options.map((o) => (
        <Checkbox key={o.value} value={o.value} className={row}>
          {({ isSelected }) => (
            <>
              <span
                aria-hidden
                className={cx(
                  'flex size-5 shrink-0 items-center justify-center rounded-small border transition-colors duration-120',
                  isSelected ? 'border-action bg-action text-action-foreground' : 'border-border bg-surface',
                )}
              >
                {isSelected && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              {o.label}
            </>
          )}
        </Checkbox>
      ))}
    </CheckboxGroup>
  )
}

/** Compact single-select list for filter panels. */
export function RadioList<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <RadioGroup value={value} onChange={(v) => onChange(v as T)} className="flex flex-col">
      <Label className={legend}>{label}</Label>
      {options.map((o) => (
        <Radio key={o.value} value={o.value} className={row}>
          {({ isSelected }) => (
            <>
              <span
                aria-hidden
                className={cx(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-120',
                  isSelected ? 'border-action' : 'border-border',
                )}
              >
                {isSelected && <span className="size-2.5 rounded-full bg-action" />}
              </span>
              {o.label}
            </>
          )}
        </Radio>
      ))}
    </RadioGroup>
  )
}
