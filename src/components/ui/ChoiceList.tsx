import { Check } from 'lucide-react'
import { Checkbox, CheckboxGroup, Label, Radio, RadioGroup } from 'react-aria-components'
import { choiceRow } from '@/components/ui/control-styles'
import { cx } from '@/lib/cx'

type Option<T extends string> = { value: T; label: string }

const row = choiceRow
const legend = 'mb-1 text-compact font-semibold text-ink'

/** The square tick shared by every checkbox. */
export function CheckMark({ checked, invalid = false }: { checked: boolean; invalid?: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'flex size-5 shrink-0 items-center justify-center rounded-small border transition-colors duration-120',
        checked
          ? 'border-action bg-action text-action-foreground'
          : invalid
            ? 'border-danger bg-surface'
            : 'border-border bg-surface',
      )}
    >
      {checked && <Check className="size-3.5" strokeWidth={3} />}
    </span>
  )
}

/**
 * Compact checkbox list for filter panels: 44px rows, real checkbox semantics.
 * `single`: ticking one unticks the others, and ticking it again clears the choice.
 */
export function CheckList<T extends string>({
  label,
  options,
  value,
  onChange,
  single = false,
}: {
  label: string
  options: Option<T>[]
  value: T[]
  onChange: (value: T[]) => void
  single?: boolean
}) {
  function handleChange(next: string[]) {
    const ticked = next.find((v) => !value.includes(v as T))
    // In single mode keep only the box just ticked; an untick leaves the (now empty or shorter) list as is
    onChange((single && ticked !== undefined ? [ticked] : next) as T[])
  }

  return (
    <CheckboxGroup value={value} onChange={handleChange} className="flex flex-col">
      <Label className={legend}>{label}</Label>
      {options.map((o) => (
        <Checkbox key={o.value} value={o.value} className={row}>
          {({ isSelected }) => (
            <>
              <CheckMark checked={isSelected} />
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
