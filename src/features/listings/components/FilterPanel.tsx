import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { CheckList } from '@/components/ui/ChoiceList'
import { MoneyField } from '@/components/ui/MoneyField'
import { Sheet } from '@/components/ui/Sheet'
import { useListings } from '@/features/listings/api'
import {
  defaultFilters,
  modeLabels,
  priceDisabled,
  serializeFilters,
  validatePrice,
  type ListingFilters,
  type ModeFilter,
} from '@/features/listings/filters'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { ItemCondition, RuntimeConfig } from '@/types/api'

const conditionOptions: { value: ItemCondition; label: string }[] = [
  { value: 'LIKE_NEW', label: 'Like new' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'FOR_PARTS', label: 'For parts' },
]

const modeOptions = (['CASH', 'SWAP', 'QUICK_SELL'] as ModeFilter[]).map((value) => ({
  value,
  label: modeLabels[value],
}))

const kobo = (naira?: number) => (naira === undefined ? null : naira * 100)
const naira = (kobo: number | null) => (kobo === null ? undefined : Math.round(kobo / 100))

export const priceErrorMessage = 'The minimum is more than the maximum.'

function PriceRange({
  filters,
  onChange,
  resetKey,
}: {
  filters: ListingFilters
  onChange: (next: ListingFilters) => void
  resetKey: number
}) {
  const disabled = priceDisabled(filters)
  const invalid = validatePrice(filters.priceMin, filters.priceMax) === 'min_gt_max'

  return (
    <fieldset className="flex flex-col gap-2" key={resetKey}>
      <legend className="mb-1 text-compact font-semibold text-ink">Price</legend>
      <div className="grid grid-cols-2 items-start gap-3">
        <MoneyField
          label="Minimum price"
          visibleLabel="Minimum"
          placeholder="Any"
          value={kobo(filters.priceMin)}
          onChange={(v) => onChange({ ...filters, priceMin: naira(v) })}
          disabled={disabled}
        />
        <MoneyField
          label="Maximum price"
          visibleLabel="Maximum"
          placeholder="Any"
          value={kobo(filters.priceMax)}
          onChange={(v) => onChange({ ...filters, priceMax: naira(v) })}
          disabled={disabled}
          error={invalid && !disabled ? priceErrorMessage : null}
        />
      </div>
      {disabled && <p className="text-compact text-muted">Swap-only listings have no asking price.</p>}
    </fieldset>
  )
}

/** Every filter in one column (UX-03). Used inside the phone sheet and as the desktop rail. */
export function FilterPanel({
  filters,
  onChange,
  config,
  resetKey = 0,
}: {
  filters: ListingFilters
  onChange: (next: ListingFilters) => void
  config?: RuntimeConfig
  resetKey?: number
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Areas and categories work the same way: tick one, or none for all */}
      <CheckList
        label="Area"
        options={(config?.areas ?? []).map((a) => ({ value: a.id, label: a.name }))}
        value={filters.areas}
        onChange={(areas) => onChange({ ...filters, areas })}
        single
      />
      <CheckList
        label="Category"
        options={(config?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
        value={filters.categories}
        onChange={(categories) => onChange({ ...filters, categories })}
        single
      />
      <CheckList
        label="Trade type"
        options={modeOptions}
        value={filters.modes}
        onChange={(modes) => onChange({ ...filters, modes })}
      />
      <PriceRange filters={filters} onChange={onChange} resetKey={resetKey} />
      <CheckList
        label="Condition"
        options={conditionOptions}
        value={filters.conditions}
        onChange={(conditions) => onChange({ ...filters, conditions })}
      />
      <p className="text-compact text-muted">Results are sorted newest first.</p>
    </div>
  )
}

/**
 * Phone filters (UX-03): changes stay in a draft until "Show N results", which previews the real count.
 * Closing without applying discards the draft.
 */
export function FilterSheet({
  open,
  onOpenChange,
  filters,
  onApply,
  config,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: ListingFilters
  onApply: (next: ListingFilters) => void
  config?: RuntimeConfig
}) {
  const [draft, setDraft] = useState(filters)
  const [resetKey, setResetKey] = useState(0)
  const [openedWith, setOpenedWith] = useState(filters)

  // Start each opening from what's applied now
  if (open && openedWith !== filters) {
    setOpenedWith(filters)
    setDraft(filters)
    setResetKey((k) => k + 1)
  }

  const invalid = validatePrice(draft.priceMin, draft.priceMax) !== null && !priceDisabled(draft)
  const preview = useDebouncedValue(draft, 250)
  const { data, isFetching } = useListings(preview, { enabled: open && !invalid })
  const total = data?.pages[0]?.total
  const settled = !isFetching && preview === draft && total !== undefined

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Filters"
      footer={
        <div className="flex w-full items-center gap-3">
          <Button
            variant="tertiary"
            onPress={() => {
              setDraft({ ...defaultFilters, q: draft.q })
              setResetKey((k) => k + 1)
            }}
          >
            Reset
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            isDisabled={invalid}
            onPress={() => {
              onApply(draft)
              onOpenChange(false)
            }}
          >
            <span className="tabular">
              {settled && !invalid ? `Show ${total} ${total === 1 ? 'result' : 'results'}` : 'Show results'}
            </span>
          </Button>
        </div>
      }
    >
      <FilterPanel filters={draft} onChange={setDraft} config={config} resetKey={resetKey} />
    </Sheet>
  )
}

const sameFilters = (a: ListingFilters, b: ListingFilters) =>
  serializeFilters(a).toString() === serializeFilters(b).toString()

/**
 * Desktop rail: applies changes after a short pause instead of on every keystroke, and picks up changes
 * made elsewhere (chips, search) without interrupting typing.
 */
export function FilterRail({
  filters,
  onChange,
  config,
}: {
  filters: ListingFilters
  onChange: (next: ListingFilters) => void
  config?: RuntimeConfig
}) {
  const [draft, setDraft] = useState(filters)
  const [seen, setSeen] = useState(filters)
  const [resetKey, setResetKey] = useState(0)

  if (seen !== filters) {
    setSeen(filters)
    if (!sameFilters(filters, draft)) {
      setDraft(filters)
      setResetKey((k) => k + 1)
    }
  }

  const settled = useDebouncedValue(draft, 300)
  useEffect(() => {
    if (settled !== draft || validatePrice(draft.priceMin, draft.priceMax)) return
    if (!sameFilters(draft, filters)) onChange(draft)
  }, [settled, draft, filters, onChange])

  return (
    <aside aria-label="Filters" className="sticky top-24 flex max-h-[calc(100dvh-7rem)] flex-col overflow-y-auto pr-2">
      <h2 className="mb-4 text-h3 text-ink">Filters</h2>
      <FilterPanel filters={draft} onChange={setDraft} config={config} resetKey={resetKey} />
    </aside>
  )
}
