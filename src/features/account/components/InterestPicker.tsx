import { Check } from 'lucide-react'
import { chipBase, chipOff, chipOn } from '@/components/ui/control-styles'
import { cx } from '@/lib/cx'
import type { Category } from '@/types/api'

/** Optional interests as toggle chips (UX-09). They order what someone sees first; they never filter anything out. */
export function InterestPicker({
  categories,
  value,
  onChange,
  labelledBy,
}: {
  categories: Category[]
  value: string[]
  onChange: (value: string[]) => void
  labelledBy: string
}) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const on = value.includes(c.id)
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((id) => id !== c.id) : [...value, c.id])}
            className={cx(chipBase, on ? chipOn : chipOff)}
          >
            {on && <Check aria-hidden className="size-4" strokeWidth={2.5} />}
            {c.name}
          </button>
        )
      })}
    </div>
  )
}
