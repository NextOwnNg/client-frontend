import { SearchX } from 'lucide-react'
import { PlainButton } from '@/components/ui/Button'
import { ListingRowSkeleton, ListingTileSkeleton } from '@/components/ui/Skeletons'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useListings } from '@/features/listings/api'
import { ListingRow, ListingTile } from '@/features/listings/components/ListingCards'
import type { ListingFilters } from '@/features/listings/filters'
import { useAutoLoad } from '@/hooks/useAutoLoad'
import { breakpoints, useMediaQuery } from '@/hooks/useMediaQuery'
import { cx } from '@/lib/cx'

const grid = 'grid grid-cols-1 gap-3 tablet:grid-cols-2 tablet:gap-4 desktop:grid-cols-3'

/**
 * Explore results (UX-02): rows on phones (the direction's horizontal row), tiles from 768px.
 * Every state leaves a next step: clear filters, retry, or load more.
 */
export function Results({ filters, onClearFilters }: { filters: ListingFilters; onClearFilters: () => void }) {
  const tiles = useMediaQuery(breakpoints.tablet)
  const query = useListings(filters)
  const {
    data,
    isPending,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    isPlaceholderData,
  } = query
  const loadMore = useAutoLoad(
    () => void fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage && !isFetchNextPageError,
  )

  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading items" className={grid}>
        {Array.from({ length: 6 }, (_, i) =>
          tiles ? <ListingTileSkeleton key={i} /> : <ListingRowSkeleton key={i} />,
        )}
      </div>
    )
  }

  if (isError && !data) {
    return <ErrorState title="We couldn't load items" onRetry={() => void refetch()} />
  }

  const items = data.pages.flatMap((p) => p.items)
  const total = data.pages[0]?.total ?? items.length
  const filtered = Object.values({ ...filters, sort: undefined }).some((v) =>
    Array.isArray(v) ? v.length > 0 : v !== undefined,
  )

  if (items.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={filtered ? 'No items match your search' : 'Nothing listed here yet'}
        body={
          filtered
            ? 'Try fewer filters or another area. New items are listed every day.'
            : 'Be the first to list something in this area, or look across the whole city.'
        }
        action={
          filtered ? (
            <PlainButton variant="secondary" onClick={onClearFilters}>
              Clear filters
            </PlainButton>
          ) : undefined
        }
      />
    )
  }

  return (
    <section aria-labelledby="results-heading" className="flex flex-col gap-4">
      <h2 id="results-heading" className="sr-only">
        Results
      </h2>
      <p id="results-count" role="status" className="tabular text-compact text-muted">
        {total} {total === 1 ? 'item' : 'items'} · newest first
      </p>
      <ul
        aria-label="Results"
        className={cx(grid, 'transition-opacity duration-200', isPlaceholderData && 'opacity-60')}
      >
        {items.map((listing, i) => (
          <li key={listing.id} className="min-w-0">
            {tiles ? (
              <ListingTile listing={listing} priority={i < 4} />
            ) : (
              <ListingRow listing={listing} priority={i < 3} />
            )}
          </li>
        ))}
      </ul>
      {isFetchingNextPage && (
        <div aria-hidden className={grid}>
          {Array.from({ length: 3 }, (_, i) =>
            tiles ? <ListingTileSkeleton key={i} /> : <ListingRowSkeleton key={i} />,
          )}
        </div>
      )}
      {isFetchNextPageError ? (
        <div role="alert" className="flex flex-col items-center gap-2 py-4 text-center">
          <p className="text-compact text-muted">We couldn't load more items. The ones above are still up to date.</p>
          <PlainButton variant="secondary" onClick={() => void fetchNextPage()}>
            Try again
          </PlainButton>
        </div>
      ) : (
        hasNextPage &&
        !isFetchingNextPage && (
          <div ref={loadMore} className="flex justify-center py-2">
            <PlainButton variant="secondary" onClick={() => void fetchNextPage()}>
              Show more
            </PlainButton>
          </div>
        )
      )}
    </section>
  )
}
