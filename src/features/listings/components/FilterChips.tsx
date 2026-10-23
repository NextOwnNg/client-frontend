import { Check, SlidersHorizontal, Timer, X } from 'lucide-react'
import { Link } from 'react-router'
import {
  activeChips,
  countPanelFilters,
  defaultFilters,
  modeLabels,
  serializeFilters,
  type ListingFilters,
  type ModeFilter,
} from '@/features/listings/filters'
import { cx } from '@/lib/cx'
import type { RuntimeConfig } from '@/types/api'

// Hover (mouse only): the chip lifts 1px onto a soft shadow and its edge turns Teal; pressing settles it back.
// transform + shadow only, 120ms, so a pass across the rail never feels laggy.
const chipBase =
  'inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-compact font-medium whitespace-nowrap outline-none transition-[background-color,border-color,color,transform,box-shadow] duration-120 ease-out pointer-fine:hover:-translate-y-px pointer-fine:hover:shadow-card active:translate-y-0 active:scale-[0.97] active:shadow-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2'
const chipOff = 'border-border bg-surface text-ink pointer-fine:hover:border-action/60 pointer-fine:hover:text-action'
const chipOn = 'border-action bg-mint text-action pointer-fine:hover:border-action'

/** A horizontal row that scrolls on phones and bleeds to the screen edge, so it reads as "more this way". */
export function ChipRow({ label, as = 'div', className, children }: { label?: string; as?: 'div' | 'nav'; className?: string; children: React.ReactNode }) {
  const Tag = as
  return (
    <Tag
      aria-label={label}
      className={cx('-mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] tablet:-mx-6 tablet:px-6 [&::-webkit-scrollbar]:hidden', className)}
    >
      {children}
    </Tag>
  )
}

const modes: ModeFilter[] = ['CASH', 'SWAP', 'QUICK_SELL']

/** For sale · Open to swap · Quick Sell toggles. They widen each other, so several can be on. */
export function ModeToggles({ filters, onChange }: { filters: ListingFilters; onChange: (next: ListingFilters) => void }) {
  return (
    <>
      {modes.map((mode) => {
        const on = filters.modes.includes(mode)
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={on}
            onClick={() => onChange({ ...filters, modes: on ? filters.modes.filter((m) => m !== mode) : [...filters.modes, mode] })}
            className={cx(chipBase, on ? chipOn : chipOff)}
          >
            {on ? (
              <Check aria-hidden className="size-4" strokeWidth={2.5} />
            ) : (
              mode === 'QUICK_SELL' && <Timer aria-hidden className="size-4 text-warning" />
            )}
            {modeLabels[mode]}
          </button>
        )
      })}
    </>
  )
}

export function FiltersButton({ filters, onPress, onPreload }: { filters: ListingFilters; onPress: () => void; onPreload?: () => void }) {
  const count = countPanelFilters(filters)
  return (
    <button
      type="button"
      onClick={onPress}
      onPointerEnter={onPreload}
      onTouchStart={onPreload}
      onFocus={onPreload}
      className={cx(chipBase, count ? chipOn : chipOff)}
    >
      <SlidersHorizontal aria-hidden className="size-4" />
      Filters
      {count > 0 && (
        <span className="tabular -mr-1 flex size-5 items-center justify-center rounded-full bg-action text-caption text-action-foreground">
          {count}
          <span className="sr-only"> active</span>
        </span>
      )}
    </button>
  )
}

/** Category shortcuts as links, so each category view is a real, shareable URL. */
export function CategoryRail({ filters, config }: { filters: ListingFilters; config?: RuntimeConfig }) {
  const href = (category?: string) => {
    const query = serializeFilters({ ...filters, category }).toString()
    return query ? `/explore?${query}` : '/explore'
  }
  const items = [{ id: undefined, name: 'All' }, ...(config?.categories ?? [])]

  return (
    <ChipRow as="nav" label="Categories">
      {items.map((c) => {
        const on = filters.category === c.id
        return (
          <Link
            key={c.id ?? 'all'}
            to={href(c.id)}
            preventScrollReset
            aria-current={on ? 'page' : undefined}
            className={cx(chipBase, on ? 'border-ink bg-ink text-paper pointer-fine:hover:bg-ink/90' : chipOff)}
          >
            {c.name}
          </Link>
        )
      })}
    </ChipRow>
  )
}

/**
 * Removable chips for what's applied. Below 1024px the category rail and mode toggles already show their own
 * state, so those chips only appear on desktop.
 */
export function ActiveChips({
  filters,
  config,
  onChange,
}: {
  filters: ListingFilters
  config?: RuntimeConfig
  onChange: (next: ListingFilters) => void
}) {
  const chips = activeChips(filters, config)
  if (chips.length === 0) return null
  const desktopOnly = (key: string) => key === 'category' || key.startsWith('mode-')
  const phoneCount = chips.filter((c) => !desktopOnly(c.key)).length

  return (
    <div className={cx('flex flex-wrap items-center gap-2', phoneCount === 0 && 'max-desktop:hidden')}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          aria-label={`Remove filter: ${chip.label}`}
          onClick={() => onChange(chip.remove())}
          className={cx(
            // Hover reads as "remove": Teal ring, and the × turns Ink and grows slightly
            'group inline-flex h-8 max-w-full cursor-pointer items-center gap-1 rounded-full bg-cloud pr-1.5 pl-3 text-compact text-ink ring-1 ring-border outline-none transition-[box-shadow,background-color,transform] duration-120 ease-out active:scale-[0.97] pointer-fine:hover:bg-surface pointer-fine:hover:ring-action/60 focus-visible:ring-2 focus-visible:ring-focus',
            // 32px chips keep a 44px hit area through their padding box on touch
            'relative after:absolute after:-inset-y-1.5 after:inset-x-0',
            desktopOnly(chip.key) && 'max-desktop:hidden',
          )}
        >
          <span className="truncate">{chip.label}</span>
          <X aria-hidden className="size-4 shrink-0 text-muted transition-[color,transform] duration-120 ease-out pointer-fine:group-hover:scale-110 pointer-fine:group-hover:text-ink" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...defaultFilters })}
        className="relative h-8 cursor-pointer rounded-control px-2 text-compact font-semibold text-action underline-offset-4 outline-none after:absolute after:-inset-y-1.5 after:inset-x-0 hover:underline focus-visible:ring-2 focus-visible:ring-focus"
      >
        Clear all
      </button>
    </div>
  )
}
