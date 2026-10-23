import { conditionLabel } from '@/lib/copy/status'
import { formatNaira } from '@/lib/money/money'
import type { ItemCondition, RuntimeConfig } from '@/types/api'

/** "For sale", "Open to swap" and "Quick Sell" widen each other; a listing matching any of them is shown. */
export type ModeFilter = 'CASH' | 'SWAP' | 'QUICK_SELL'

/** Explore and Home search state (PRD FE-EXP-01). Prices are whole naira; the API takes naira too. */
export type ListingFilters = {
  q?: string
  category?: string
  area?: string
  modes: ModeFilter[]
  priceMin?: number
  priceMax?: number
  conditions: ItemCondition[]
  sort: 'recent'
}

export type FilterIssue = 'min_gt_max'

export const defaultFilters: ListingFilters = { modes: [], conditions: [], sort: 'recent' }

export const modeLabels: Record<ModeFilter, string> = {
  CASH: 'For sale',
  SWAP: 'Open to swap',
  QUICK_SELL: 'Quick Sell',
}

const modeSlugs: Record<ModeFilter, string> = { CASH: 'cash', SWAP: 'swap', QUICK_SELL: 'quick-sell' }
const conditionSlugs: Record<ItemCondition, string> = {
  LIKE_NEW: 'like-new',
  GOOD: 'good',
  FAIR: 'fair',
  FOR_PARTS: 'for-parts',
}

function fromSlugs<T extends string>(value: string | null, slugs: Record<T, string>): T[] {
  const bySlug = new Map(Object.entries(slugs).map(([key, slug]) => [slug, key as T]))
  const out: T[] = []
  for (const part of (value ?? '').split(',')) {
    const key = bySlug.get(part.trim().toLowerCase())
    if (key && !out.includes(key)) out.push(key)
  }
  return out
}

function nairaParam(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined
}

export function validatePrice(min?: number, max?: number): FilterIssue | null {
  return min !== undefined && max !== undefined && min > max ? 'min_gt_max' : null
}

/** Swap-only listings have no asking price, so a price range can't apply to a swap-only search. */
export function priceDisabled(filters: ListingFilters): boolean {
  return filters.modes.length === 1 && filters.modes[0] === 'SWAP'
}

/**
 * Reads filters from the URL. Hand-edited or stale links never break the page: unknown values are dropped,
 * and an unknown category or area is dropped once the pilot config has loaded.
 */
export function parseFilters(
  params: URLSearchParams,
  config?: RuntimeConfig,
): { filters: ListingFilters; issues: FilterIssue[] } {
  const q = params.get('q')?.trim() || undefined
  let category = params.get('category') || undefined
  let area = params.get('area') || undefined
  if (config && category && !config.categories.some((c) => c.id === category)) category = undefined
  if (config && area && !config.areas.some((a) => a.id === area)) area = undefined

  const filters: ListingFilters = {
    q,
    category,
    area,
    modes: fromSlugs(params.get('mode'), modeSlugs),
    priceMin: nairaParam(params.get('min')),
    priceMax: nairaParam(params.get('max')),
    conditions: fromSlugs(params.get('condition'), conditionSlugs),
    sort: 'recent',
  }
  const issue = validatePrice(filters.priceMin, filters.priceMax)
  return { filters, issues: issue ? [issue] : [] }
}

export function serializeFilters(filters: ListingFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.category) params.set('category', filters.category)
  if (filters.area) params.set('area', filters.area)
  if (filters.modes.length) params.set('mode', filters.modes.map((m) => modeSlugs[m]).join(','))
  if (filters.priceMin !== undefined) params.set('min', String(filters.priceMin))
  if (filters.priceMax !== undefined) params.set('max', String(filters.priceMax))
  if (filters.conditions.length) params.set('condition', filters.conditions.map((c) => conditionSlugs[c]).join(','))
  return params
}

/** API query for GET /listings. An invalid or inapplicable price range is left out rather than sent. */
export function toApiParams(filters: ListingFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (filters.q) params.q = filters.q
  if (filters.category) params.category = filters.category
  if (filters.area) params.area = filters.area
  if (filters.modes.length) params.mode = filters.modes.join(',')
  if (filters.conditions.length) params.condition = filters.conditions.join(',')
  if (!priceDisabled(filters) && !validatePrice(filters.priceMin, filters.priceMax)) {
    if (filters.priceMin !== undefined) params.price_min = filters.priceMin
    if (filters.priceMax !== undefined) params.price_max = filters.priceMax
  }
  params.sort = filters.sort
  return params
}

export type FilterChip = { key: string; label: string; remove: () => ListingFilters }

const naira = (amount: number) => formatNaira(amount * 100)

function priceLabel(min?: number, max?: number): string | null {
  if (min !== undefined && max !== undefined) return `${naira(min)} – ${naira(max)}`
  if (min !== undefined) return `From ${naira(min)}`
  if (max !== undefined) return `Up to ${naira(max)}`
  return null
}

/** Removable chips for every active filter, in the order the panel shows them. */
export function activeChips(filters: ListingFilters, config?: RuntimeConfig): FilterChip[] {
  const chips: FilterChip[] = []
  if (filters.q) chips.push({ key: 'q', label: `“${filters.q}”`, remove: () => ({ ...filters, q: undefined }) })
  if (filters.category) {
    const name = config?.categories.find((c) => c.id === filters.category)?.name ?? filters.category
    chips.push({ key: 'category', label: name, remove: () => ({ ...filters, category: undefined }) })
  }
  if (filters.area) {
    const name = config?.areas.find((a) => a.id === filters.area)?.name ?? filters.area
    chips.push({ key: 'area', label: name, remove: () => ({ ...filters, area: undefined }) })
  }
  for (const mode of filters.modes) {
    chips.push({
      key: `mode-${mode}`,
      label: modeLabels[mode],
      remove: () => ({ ...filters, modes: filters.modes.filter((m) => m !== mode) }),
    })
  }
  const price = priceLabel(filters.priceMin, filters.priceMax)
  if (price)
    chips.push({ key: 'price', label: price, remove: () => ({ ...filters, priceMin: undefined, priceMax: undefined }) })
  for (const condition of filters.conditions) {
    chips.push({
      key: `condition-${condition}`,
      label: conditionLabel(condition),
      remove: () => ({ ...filters, conditions: filters.conditions.filter((c) => c !== condition) }),
    })
  }
  return chips
}

/** Number shown on the "Filters" button: everything set in the panel, but not the search text. */
export function countPanelFilters(filters: ListingFilters): number {
  return (
    (filters.category ? 1 : 0) +
    (filters.area ? 1 : 0) +
    filters.modes.length +
    (filters.priceMin !== undefined || filters.priceMax !== undefined ? 1 : 0) +
    filters.conditions.length
  )
}

/** Explore's canonical keeps only category and area (PRD §4.2), so filter permutations aren't indexed. */
export function canonicalSearch(filters: ListingFilters): string {
  const params = new URLSearchParams()
  if (filters.category) params.set('category', filters.category)
  if (filters.area) params.set('area', filters.area)
  const query = params.toString()
  return query ? `?${query}` : ''
}
