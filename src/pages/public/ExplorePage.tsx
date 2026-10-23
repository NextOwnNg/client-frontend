import { lazy, Suspense, useCallback, useState } from 'react'
import { Seo } from '@/components/seo/Seo'
import { ActiveChips, CategoryRail, ChipRow, FiltersButton, ModeToggles } from '@/features/listings/components/FilterChips'
import { Results } from '@/features/listings/components/Results'
import { SearchBox } from '@/features/listings/components/SearchBox'
import { canonicalSearch, defaultFilters } from '@/features/listings/filters'
import { useUrlFilters } from '@/features/listings/use-url-filters'
import { breakpoints, useMediaQuery } from '@/hooks/useMediaQuery'
import { siteOrigin } from '@/lib/seo/origin'

// The filter panel (React Aria lists, money fields, the sheet) loads when it's needed: on desktop with the
// rail, on phones when Filters is tapped. Keeps a phone's first Explore load light.
const loadFilterPanel = () => import('@/features/listings/components/FilterPanel')
const FilterRail = lazy(() => loadFilterPanel().then((m) => ({ default: m.FilterRail })))
const FilterSheet = lazy(() => loadFilterPanel().then((m) => ({ default: m.FilterSheet })))

/** UX-02/03 Explore and filters. All state lives in the URL, so Back from a listing restores it. */
export function ExplorePage() {
  const { filters, setFilters, config } = useUrlFilters()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMounted, setSheetMounted] = useState(false)
  const desktop = useMediaQuery(breakpoints.desktop)
  const clear = useCallback(() => setFilters({ ...defaultFilters }), [setFilters])
  const categoryName = config?.categories.find((c) => c.id === filters.category)?.name

  return (
    <>
      <Seo
        title={categoryName ? `${categoryName} for sale or swap` : 'Explore items'}
        description="Browse items near you that you can buy, swap, or swap with cash added. Every listing shows its condition and defects."
        canonical={`${siteOrigin()}/explore${canonicalSearch(filters)}`}
      />

      <div className="desktop:grid desktop:grid-cols-[15rem_minmax(0,1fr)] desktop:gap-10">
        {desktop && (
          <Suspense fallback={<div aria-hidden />}>
            <FilterRail filters={filters} onChange={setFilters} config={config} />
          </Suspense>
        )}

        <div className="flex min-w-0 flex-col gap-4">
          <h1 className="text-h2 text-ink desktop:text-h1">Explore items</h1>
          <SearchBox
            key={filters.q ?? ''}
            defaultValue={filters.q}
            onSearch={(q) => setFilters({ ...filters, q: q || undefined })}
            onCategory={(category) => setFilters({ ...filters, q: undefined, category })}
            className="desktop:max-w-xl"
          />

          {!desktop && (
            <div className="flex flex-col gap-2">
              <CategoryRail filters={filters} config={config} />
              <ChipRow label="Trade type">
                <FiltersButton
                  filters={filters}
                  onPress={() => {
                    setSheetMounted(true)
                    setSheetOpen(true)
                  }}
                  onPreload={loadFilterPanel}
                />
                <span aria-hidden className="my-2 w-px shrink-0 bg-border" />
                <ModeToggles filters={filters} onChange={setFilters} />
              </ChipRow>
            </div>
          )}

          <ActiveChips filters={filters} config={config} onChange={setFilters} />
          <Results filters={filters} onClearFilters={clear} />
        </div>
      </div>

      {!desktop && sheetMounted && (
        <Suspense fallback={null}>
          <FilterSheet open={sheetOpen} onOpenChange={setSheetOpen} filters={filters} onApply={setFilters} config={config} />
        </Suspense>
      )}
    </>
  )
}
